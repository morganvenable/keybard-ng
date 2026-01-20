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
     * This keeps the internal cluster structure intact (relative key positions from KLE)
     * by applying a SINGLE delta to the entire cluster, preserving all internal spacing.
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

        // Thumb cluster matrix rows for Svalboard
        const thumbClusterRows = [0, 5]; // Row 0 = left thumb, Row 5 = right thumb

        // Group keys by matrix row (each thumb cluster is one group)
        const keysByCluster: Record<number, number[]> = {};
        for (const [matrixPosStr, key] of Object.entries(layout)) {
            const matrixPos = Number(matrixPosStr);
            if (thumbClusterRows.includes(key.row)) {
                if (!keysByCluster[key.row]) {
                    keysByCluster[key.row] = [];
                }
                keysByCluster[key.row].push(matrixPos);
            }
        }

        const correctedLayout = { ...layout };

        // For each thumb cluster, apply ONE delta to ALL keys (preserving internal structure)
        for (const [rowStr, clusterKeys] of Object.entries(keysByCluster)) {
            const row = Number(rowStr);
            if (clusterKeys.length === 0) continue;

            // Find a reference key that exists in SVALBOARD_LAYOUT
            let referenceKey: number | null = null;
            for (const matrixPos of clusterKeys) {
                if (SVALBOARD_LAYOUT[matrixPos]) {
                    referenceKey = matrixPos;
                    break;
                }
            }

            if (referenceKey === null) continue;

            // Calculate ONE delta for the entire cluster
            const fragmentPos = layout[referenceKey];
            const expectedPos = SVALBOARD_LAYOUT[referenceKey];
            const deltaX = expectedPos.x - fragmentPos.x;
            const deltaY = expectedPos.y - fragmentPos.y;

            // Skip if no correction needed
            if (Math.abs(deltaX) < 0.01 && Math.abs(deltaY) < 0.01) continue;

            // Apply the SAME delta to ALL keys in this cluster
            for (const matrixPos of clusterKeys) {
                const key = correctedLayout[matrixPos];
                correctedLayout[matrixPos] = {
                    ...key,
                    x: key.x + deltaX,
                    y: key.y + deltaY,
                };
            }

            console.log(`Thumb cluster row ${row}: applied correction (${deltaX.toFixed(2)}, ${deltaY.toFixed(2)}) to ${clusterKeys.length} keys`);
        }

        return correctedLayout;
    }
}
