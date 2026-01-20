/**
 * Fragment Composer Service
 *
 * Composes keyboard layouts from fragment definitions and user selections.
 * This enables dynamic layout rendering based on which physical components
 * (e.g., 5-key vs 6-key finger clusters) are installed or selected.
 */

import type { KeyboardInfo, FragmentInstance } from "../types/vial.types";
import { KleService } from "./kle.service";
import { FragmentService } from "./fragment.service";
import { SVALBOARD_LAYOUT } from "../constants/svalboard-layout";

/**
 * A composed key layout entry with position and matrix information
 */
export interface ComposedKeyLayout {
    x: number;
    y: number;
    w: number;
    h: number;
    row: number;
    col: number;
    // Additional KLE properties that may be useful for rendering
    color?: string;
    textColor?: string[];
    labels?: string[];
    rotation_angle?: number;
    rotation_x?: number;
    rotation_y?: number;
}

export class FragmentComposerService {
    constructor(
        private kleService: KleService,
        private fragmentService: FragmentService
    ) {}

    /**
     * Compose a complete keyboard layout from fragment definitions
     *
     * @param kbinfo - Keyboard info with fragments and composition
     * @returns Record keyed by matrix position (row * cols + col)
     */
    composeLayout(kbinfo: KeyboardInfo): Record<number, ComposedKeyLayout> {
        let layout: Record<number, ComposedKeyLayout> = {};

        // Check if keyboard has fragment composition
        if (!kbinfo.composition?.instances || !kbinfo.fragments) {
            return layout;
        }

        const cols = kbinfo.cols;

        for (let idx = 0; idx < kbinfo.composition.instances.length; idx++) {
            const instance = kbinfo.composition.instances[idx];

            // Expand this instance and merge into layout
            const instanceKeys = this.expandInstance(kbinfo, idx, instance, cols);
            Object.assign(layout, instanceKeys);
        }

        // Apply GUI-side placement corrections for thumb clusters
        layout = this.applyPlacementCorrections(layout, kbinfo);

        return layout;
    }

    /**
     * Expand a single fragment instance to key layouts
     */
    private expandInstance(
        kbinfo: KeyboardInfo,
        instanceIdx: number,
        instance: FragmentInstance,
        cols: number
    ): Record<number, ComposedKeyLayout> {
        const layout: Record<number, ComposedKeyLayout> = {};

        // Resolve which fragment to use for this instance
        const fragmentName = this.fragmentService.resolveFragment(kbinfo, instanceIdx, instance);
        if (!fragmentName) {
            return layout;
        }

        // Get fragment definition
        const fragment = kbinfo.fragments?.[fragmentName];
        if (!fragment?.kle) {
            console.warn(`Fragment "${fragmentName}" not found or has no KLE data`);
            return layout;
        }

        // Get placement and matrix map
        const { placement, matrixMap } = this.getPlacementAndMatrixMap(instance, fragmentName);
        if (!placement || !matrixMap) {
            console.warn(`Missing placement or matrix_map for instance "${instance.id}"`);
            return layout;
        }

        // Deserialize fragment KLE data
        let keys;
        try {
            const deserialized = this.kleService.deserialize(fragment.kle as any[]);
            keys = deserialized.keys;
        } catch (e) {
            console.error(`Failed to deserialize KLE for fragment "${fragmentName}":`, e);
            return layout;
        }

        // Map keys to matrix positions with placement offset
        for (let i = 0; i < keys.length && i < matrixMap.length; i++) {
            const key = keys[i];
            const [row, col] = matrixMap[i];
            const matrixPos = row * cols + col;

            layout[matrixPos] = {
                x: key.x + placement.x,
                y: key.y + placement.y,
                w: key.width,
                h: key.height,
                row,
                col,
                // Copy additional properties for rendering
                color: key.color,
                textColor: key.textColor?.filter((c): c is string => c !== undefined),
                labels: key.labels?.filter((l): l is string => l !== undefined),
                rotation_angle: key.rotation_angle,
                rotation_x: key.rotation_x,
                rotation_y: key.rotation_y,
            };
        }

        return layout;
    }

    /**
     * Get placement offset and matrix map for an instance
     *
     * For fixed instances, these come directly from the instance.
     * For selectable instances, we need to find the matching option.
     */
    private getPlacementAndMatrixMap(
        instance: FragmentInstance,
        fragmentName: string
    ): { placement: { x: number; y: number } | undefined; matrixMap: [number, number][] | undefined } {
        // Fixed instance - values come directly from instance
        if (instance.fragment) {
            return {
                placement: instance.placement,
                matrixMap: instance.matrix_map,
            };
        }

        // Selectable instance - find matching option
        if (instance.fragment_options) {
            const option = instance.fragment_options.find(opt => opt.fragment === fragmentName);
            if (option) {
                return {
                    placement: option.placement,
                    matrixMap: option.matrix_map,
                };
            }
        }

        return { placement: undefined, matrixMap: undefined };
    }

    /**
     * Check if a keyboard has fragment composition defined
     */
    hasFragments(kbinfo: KeyboardInfo): boolean {
        return Boolean(kbinfo.fragments) &&
               Boolean(kbinfo.composition?.instances?.length);
    }

    /**
     * Apply placement corrections to thumb clusters to match GUI-side visual design.
     *
     * Alignment strategy:
     * - Calculate the midline between left and right index clusters
     * - Align left thumb's rightmost key edge symmetrically about midline
     * - Align right thumb's leftmost key edge symmetrically about midline
     *
     * This keeps the internal cluster structure intact while centering thumbs properly.
     *
     * @param layout - The composed layout to correct
     * @param kbinfo - Keyboard info (used to check if Svalboard)
     * @returns Corrected layout with thumb clusters in the right positions
     */
    applyPlacementCorrections(
        layout: Record<number, ComposedKeyLayout>,
        kbinfo: KeyboardInfo
    ): Record<number, ComposedKeyLayout> {
        // Only apply corrections for Svalboard
        const isSvalboard = kbinfo.name?.toLowerCase().includes('svalboard') ||
                           kbinfo.cosmetic?.name?.toLowerCase().includes('svalboard');
        if (!isSvalboard) {
            return layout;
        }

        // Cluster row definitions for Svalboard
        const leftThumbRow = 0;
        const rightThumbRow = 5;
        const leftIndexRow = 1;   // Row containing V key
        const rightIndexRow = 6;  // Row containing M key

        // Group keys by matrix row
        const keysByRow: Record<number, number[]> = {};
        for (const [matrixPosStr, key] of Object.entries(layout)) {
            const matrixPos = Number(matrixPosStr);
            if (!keysByRow[key.row]) {
                keysByRow[key.row] = [];
            }
            keysByRow[key.row].push(matrixPos);
        }

        // Find the midline between left and right index clusters
        // Left index innermost key's right edge, right index innermost key's left edge
        let leftIndexRightEdge = 0;
        let rightIndexLeftEdge = Infinity;

        // Find rightmost edge of left index cluster
        for (const matrixPos of (keysByRow[leftIndexRow] || [])) {
            const key = layout[matrixPos];
            const rightEdge = key.x + key.w;
            if (rightEdge > leftIndexRightEdge) {
                leftIndexRightEdge = rightEdge;
            }
        }

        // Find leftmost edge of right index cluster
        for (const matrixPos of (keysByRow[rightIndexRow] || [])) {
            const key = layout[matrixPos];
            if (key.x < rightIndexLeftEdge) {
                rightIndexLeftEdge = key.x;
            }
        }

        // Calculate midline between index clusters
        const midline = (leftIndexRightEdge + rightIndexLeftEdge) / 2;

        // Find current thumb cluster edges
        let leftThumbRightEdge = 0;
        let rightThumbLeftEdge = Infinity;

        for (const matrixPos of (keysByRow[leftThumbRow] || [])) {
            const key = layout[matrixPos];
            const rightEdge = key.x + key.w;
            if (rightEdge > leftThumbRightEdge) {
                leftThumbRightEdge = rightEdge;
            }
        }

        for (const matrixPos of (keysByRow[rightThumbRow] || [])) {
            const key = layout[matrixPos];
            if (key.x < rightThumbLeftEdge) {
                rightThumbLeftEdge = key.x;
            }
        }

        // Calculate the current thumb cluster midpoint and desired gap
        const currentThumbMidpoint = (leftThumbRightEdge + rightThumbLeftEdge) / 2;
        const thumbGap = rightThumbLeftEdge - leftThumbRightEdge;

        // Calculate deltas to center thumbs about the index midline
        // Keep the same gap between thumbs, just shift to center on midline
        const shiftX = midline - currentThumbMidpoint;

        // Also need Y correction - use SVALBOARD_LAYOUT reference
        let deltaY = 0;
        const leftThumbKeys = keysByRow[leftThumbRow] || [];
        if (leftThumbKeys.length > 0) {
            const refKey = leftThumbKeys.find(pos => SVALBOARD_LAYOUT[pos]);
            if (refKey !== undefined) {
                deltaY = SVALBOARD_LAYOUT[refKey].y - layout[refKey].y;
            }
        }

        // Get resolved fragment names for thumb clusters to detect non-standard variants
        const thumbFragmentNames = this.getThumbFragmentNames(kbinfo);

        const correctedLayout = { ...layout };

        // Apply corrections to both thumb clusters
        for (const row of [leftThumbRow, rightThumbRow]) {
            const clusterKeys = keysByRow[row] || [];
            if (clusterKeys.length === 0) continue;

            // Non-standard thumb variants don't have "thumb" in the fragment name
            // Standard ones are named like "Left thumb cluster (6 keys)"
            const isLeftThumb = row === leftThumbRow;
            const fragmentName = isLeftThumb ? thumbFragmentNames.left : thumbFragmentNames.right;
            const isNonStandardThumb = fragmentName !== null && !fragmentName.toLowerCase().includes('thumb');
            const extraYShift = isNonStandardThumb ? 1 : 0;

            for (const matrixPos of clusterKeys) {
                const key = correctedLayout[matrixPos];
                correctedLayout[matrixPos] = {
                    ...key,
                    x: key.x + shiftX,
                    y: key.y + deltaY + extraYShift,
                };
            }

            console.log(`Thumb cluster row ${row} (${fragmentName}): shifted X by ${shiftX.toFixed(2)}, Y by ${(deltaY + extraYShift).toFixed(2)}${extraYShift ? ' (non-standard, +1u Y)' : ''}`);
        }

        console.log(`Midline: ${midline.toFixed(2)}, thumb gap: ${thumbGap.toFixed(2)}`);

        return correctedLayout;
    }

    /**
     * Get the resolved fragment names for thumb cluster instances
     */
    private getThumbFragmentNames(kbinfo: KeyboardInfo): { left: string | null; right: string | null } {
        const result = { left: null as string | null, right: null as string | null };

        if (!kbinfo.composition?.instances) {
            return result;
        }

        const instances = kbinfo.composition.instances;
        for (let i = 0; i < instances.length; i++) {
            const instance = instances[i];
            const id = instance.id?.toLowerCase() || '';

            // Find thumb cluster instances by their instance ID
            if (id.includes('left') && id.includes('thumb')) {
                result.left = this.fragmentService.resolveFragment(kbinfo, i, instance);
            } else if (id.includes('right') && id.includes('thumb')) {
                result.right = this.fragmentService.resolveFragment(kbinfo, i, instance);
            }
        }

        return result;
    }
}
