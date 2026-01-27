import "./Keyboard.css";

import { getKeyLabel, getKeycodeName } from "@/utils/layers";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { MATRIX_COLS, SVALBOARD_LAYOUT, UNIT_SIZE } from "../constants/svalboard-layout";
import { THUMB_OFFSET_U } from "../constants/keyboard-visuals";

import { useKeyBinding } from "@/contexts/KeyBindingContext";
import type { KeyboardInfo } from "../types/vial.types";
import { Key } from "./Key";
import { useLayoutSettings } from "@/contexts/LayoutSettingsContext";
import { getLabelForKeycode } from "./Keyboards/layouts";
import {
    headerClasses,
    hoverHeaderClasses,
    hoverBackgroundClasses,
    hoverBorderClasses
} from "@/utils/colors";
import { InfoIcon } from "./icons/InfoIcon";
import { usePanels } from "@/contexts/PanelsContext";
import { useChanges } from "@/hooks/useChanges";
import { LayerNameBadge } from "./LayerNameBadge";

interface KeyboardProps {
    keyboard: KeyboardInfo;
    onKeyClick?: (layer: number, row: number, col: number) => void;
    selectedLayer: number;
    setSelectedLayer: (layer: number) => void;
}

/**
 * Main Keyboard component for the Svalboard layout.
 * Renders individual keys, cluster backgrounds, and an information panel.
 */
export const Keyboard: React.FC<KeyboardProps> = ({ keyboard, selectedLayer }) => {
    const {
        selectKeyboardKey,
        selectKeyboardKeyWithSubsection,
        selectedTarget,
        clearSelection,
        hoveredKey,
        assignKeycode
    } = useKeyBinding();

    const { activePanel, itemToEdit } = usePanels();
    const { hasPendingChangeForKey } = useChanges();
    const [showInfoPanel, setShowInfoPanel] = useState(false);

    // Use dynamic keylayout from fragments if available, otherwise fallback to hardcoded layout
    const { keyboardLayout, useFragmentLayout } = useMemo(() => {
        // Priority 1: Use composed keylayout if available (from fragment composition)
        if (keyboard.keylayout && Object.keys(keyboard.keylayout).length > 0) {
            return {
                keyboardLayout: keyboard.keylayout as Record<number, { x: number; y: number; w: number; h: number; row?: number; col?: number }>,
                useFragmentLayout: true,
            };
        }
        // Priority 2: Fallback to hardcoded layout for backward compatibility
        return {
            keyboardLayout: SVALBOARD_LAYOUT,
            useFragmentLayout: false,
        };
    }, [keyboard.keylayout]);

    // Use keyboard's cols if available, otherwise fallback to constant
    const matrixCols = keyboard.cols || MATRIX_COLS;

    const { internationalLayout, keyVariant } = useLayoutSettings();
    const isTransmitting = useMemo(() =>
        itemToEdit !== null && ["tapdances", "combos", "macros", "overrides"].includes(activePanel || ""),
        [itemToEdit, activePanel]
    );

    const currentUnitSize = useMemo(() =>
        keyVariant === 'small' ? 30 : keyVariant === 'medium' ? 45 : UNIT_SIZE,
        [keyVariant]
    );

    // Ref to store the selection before entering transmitting mode
    const savedSelection = useRef<{ layer: number; row: number; col: number } | null>(null);

    useEffect(() => {
        if (isTransmitting) {
            if (selectedTarget?.type === "keyboard" && typeof selectedTarget.row === "number" && typeof selectedTarget.col === "number") {
                savedSelection.current = {
                    layer: selectedTarget.layer ?? selectedLayer,
                    row: selectedTarget.row,
                    col: selectedTarget.col,
                };
                clearSelection();
            }
        } else if (savedSelection.current) {
            const { layer, row, col } = savedSelection.current;
            selectKeyboardKey(layer, row, col);
            savedSelection.current = null;
        }
    }, [isTransmitting, selectedTarget, selectedLayer, clearSelection, selectKeyboardKey]);

    const layerColor = useMemo(() =>
        keyboard.cosmetic?.layer_colors?.[selectedLayer] || "primary",
        [keyboard.cosmetic, selectedLayer]
    );

    const layerKeymap = useMemo(() =>
        keyboard.keymap?.[selectedLayer] || [],
        [keyboard.keymap, selectedLayer]
    );

    const isKeySelected = (row: number, col: number) => {
        return selectedTarget?.type === "keyboard" &&
            selectedTarget.layer === selectedLayer &&
            selectedTarget.row === row &&
            selectedTarget.col === col;
    };

    const getSelectedSubsection = (row: number, col: number): "full" | "inner" | null => {
        if (!isKeySelected(row, col)) return null;
        return selectedTarget?.keyboardSubsection || null;
    };

    const handleKeySubsectionClick = (row: number, col: number, subsection: "full" | "inner") => {
        if (isTransmitting) {
            const pos = row * matrixCols + col;
            const keycode = layerKeymap[pos] || 0;
            const keycodeName = getKeycodeName(keycode);
            assignKeycode(keycodeName);
            return;
        }

        // If clicking the same key and same subsection, toggle off
        if (isKeySelected(row, col) && selectedTarget?.keyboardSubsection === subsection) {
            clearSelection();
            return;
        }
        selectKeyboardKeyWithSubsection(selectedLayer, row, col, subsection);
    };

    const handleKeyClick = (row: number, col: number) => {
        if (isTransmitting) {
            const pos = row * matrixCols + col;
            const keycode = layerKeymap[pos] || 0;
            const keycodeName = getKeycodeName(keycode);
            assignKeycode(keycodeName);
            return;
        }

        if (isKeySelected(row, col)) {
            clearSelection();
            return;
        }
        selectKeyboardKey(selectedLayer, row, col);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === "Delete" || e.key === "Backspace") && selectedTarget?.type === "keyboard") {
                if (selectedTarget.layer === selectedLayer && typeof selectedTarget.row === 'number') {
                    assignKeycode("KC_NO");
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedTarget, selectedLayer, assignKeycode]);

    // Calculate keyboard extents and squeeze factor for tight spaces
    const { keyboardSize, squeezeX } = useMemo(() => {
        let maxX = 0;
        let maxY = 0;
        let minY = Infinity; // Top edge of keyboard
        let leftFingerMaxX = 0;  // Rightmost edge of left finger clusters
        let rightFingerMinX = Infinity;  // Leftmost edge of right finger clusters

        Object.entries(keyboardLayout).forEach(([matrixPos, key]) => {
            const pos = Number(matrixPos);
            // Determine row from layout or calculate
            const row = typeof key.row === 'number' ? key.row : Math.floor(pos / matrixCols);

            // Only apply THUMB_OFFSET_U for hardcoded layout, not fragment-composed layouts
            const yPos = (!useFragmentLayout && key.y >= 6) ? key.y + THUMB_OFFSET_U : key.y;
            maxX = Math.max(maxX, key.x + key.w);
            maxY = Math.max(maxY, yPos + key.h);
            minY = Math.min(minY, yPos);

            // Track finger cluster extents (rows 1-4 are left fingers, rows 6-9 are right fingers)
            if (row >= 1 && row <= 4) {
                leftFingerMaxX = Math.max(leftFingerMaxX, key.x + key.w);
            } else if (row >= 6 && row <= 9) {
                rightFingerMinX = Math.min(rightFingerMinX, key.x);
            }
        });

        // Calculate horizontal squeeze to fit in container
        // Estimate available width more accurately
        const viewportWidth = window.innerWidth;
        // Account for: sidebar (~50px collapsed, ~200px expanded), padding, and some margin
        const sidebarEl = document.querySelector('[class*="sidebar"]');
        const sidebarWidth = sidebarEl?.getBoundingClientRect().width || 60;
        const padding = 80; // Container padding + some safety margin
        const availableWidth = viewportWidth - sidebarWidth - padding;
        const naturalWidth = maxX * currentUnitSize;

        // Calculate squeeze factor (how much to compress finger clusters horizontally)
        // Only squeeze if natural width exceeds available space
        let squeeze = 0;
        if (naturalWidth > availableWidth && leftFingerMaxX > 0 && rightFingerMinX < Infinity) {
            const overflow = naturalWidth - availableWidth;
            // Convert overflow to key units and split between left and right
            const overflowUnits = overflow / currentUnitSize;
            // Maximum squeeze is 70% of the gap between finger clusters
            const fingerGap = rightFingerMinX - leftFingerMaxX;
            const maxSqueezeUnits = fingerGap * 0.7;
            squeeze = Math.min(overflowUnits / 2, maxSqueezeUnits);
            // Round up to ensure we have enough squeeze
            squeeze = Math.ceil(squeeze * 10) / 10;
        }

        // Badge position: horizontally centered, aligned with top keys (same Y level)
        const badgeCenterX = (maxX / 2) * currentUnitSize;
        // Position at the same Y level as the top keys (center of the top row)
        const badgeCenterY = (minY + 0.5) * currentUnitSize;

        // Adjust width for squeeze - right keys move left by squeeze, so new width is (maxX - squeeze)
        // We also need to shift the whole layout left if needed, but for now just reduce width
        const adjustedWidth = (maxX - squeeze) * currentUnitSize;

        return {
            keyboardSize: {
                width: adjustedWidth,
                height: maxY * currentUnitSize + 20,
                badgeCenterX: badgeCenterX - squeeze * currentUnitSize,
                badgeCenterY,
                midlineX: maxX / 2, // Store midline for squeeze calculation
            },
            squeezeX: squeeze,
        };
    }, [keyboardLayout, currentUnitSize, useFragmentLayout, matrixCols]);

    return (
        <div className="p-4">
            <div
                className="keyboard-layout relative"
                style={{ width: `${keyboardSize.width}px`, height: `${keyboardSize.height}px` }}
            >
                {/* Layer Name Badge - centered between thumb clusters */}
                <LayerNameBadge
                    selectedLayer={selectedLayer}
                    x={keyboardSize.badgeCenterX}
                    y={keyboardSize.badgeCenterY}
                />

                {/* Keys */}
                {Object.entries(keyboardLayout).map(([matrixPos, layout]) => {
                    const pos = Number(matrixPos);
                    // Use row/col from layout if available (from fragments), otherwise calculate from position
                    const row = typeof layout.row === 'number' ? layout.row : Math.floor(pos / matrixCols);
                    const col = typeof layout.col === 'number' ? layout.col : pos % matrixCols;

                    const keycode = layerKeymap[pos] || 0;
                    const { label: defaultLabel, keyContents } = getKeyLabel(keyboard, keycode);
                    const keycodeName = getKeycodeName(keycode);

                    const label = getLabelForKeycode(keycodeName, internationalLayout) || defaultLabel;

                    // Styles for transmitting mode
                    const activeLayerColor = isTransmitting ? "sidebar" : layerColor;
                    const headerClass = headerClasses[activeLayerColor] || headerClasses["primary"];
                    const hoverHeaderClass = hoverHeaderClasses[activeLayerColor] || hoverHeaderClasses["primary"];
                    const keyHeaderClassFull = `${headerClass} ${hoverHeaderClass}`;

                    const keyHoverBg = isTransmitting ? hoverBackgroundClasses[layerColor] : undefined;
                    const keyHoverBorder = isTransmitting ? hoverBorderClasses[layerColor] : undefined;
                    const keyHoverLayerColor = isTransmitting ? layerColor : undefined;

                    // Only apply THUMB_OFFSET_U for hardcoded layout, not fragment-composed layouts
                    const yPos = (!useFragmentLayout && layout.y >= 6) ? layout.y + THUMB_OFFSET_U : layout.y;

                    // Apply horizontal squeeze to finger clusters only (not thumbs)
                    // Rows 0, 5 are thumbs - don't squeeze
                    // Rows 1-4 are left fingers - shift right (add squeeze)
                    // Rows 6-9 are right fingers - shift left (subtract squeeze)
                    let xPos = layout.x;
                    if (squeezeX > 0) {
                        if (row >= 1 && row <= 4) {
                            xPos = layout.x + squeezeX; // Left fingers move right
                        } else if (row >= 6 && row <= 9) {
                            xPos = layout.x - squeezeX; // Right fingers move left
                        }
                        // Thumb rows (0, 5) stay at original position
                    }

                    return (
                        <Key
                            key={`${row}-${col}`}
                            x={xPos}
                            y={yPos}
                            w={layout.w}
                            h={layout.h}
                            keycode={keycodeName}
                            label={label}
                            row={row}
                            col={col}
                            selected={isKeySelected(row, col)}
                            selectedSubsection={getSelectedSubsection(row, col)}
                            onClick={handleKeyClick}
                            onSubsectionClick={handleKeySubsectionClick}
                            keyContents={keyContents}
                            layerColor={activeLayerColor}
                            headerClassName={keyHeaderClassFull}
                            hoverBackgroundColor={keyHoverBg}
                            hoverBorderColor={keyHoverBorder}
                            hoverLayerColor={keyHoverLayerColor}
                            variant={keyVariant}
                            layerIndex={selectedLayer}
                            hasPendingChange={hasPendingChangeForKey(selectedLayer, row, col)}
                        />
                    );
                })}
            </div>

            {/* Key Information Panel */}
            <div className="absolute bottom-5 right-5 z-50 flex items-end justify-end">
                <div
                    className={`bg-white text-black shadow-lg transition-all duration-300 ease-in-out relative flex flex-col overflow-hidden ${showInfoPanel
                            ? "w-[250px] h-[100px] rounded-2xl p-4 cursor-default"
                            : "w-12 h-12 rounded-2xl cursor-pointer hover:bg-gray-50 bg-white"
                        }`}
                    onClick={() => !showInfoPanel && setShowInfoPanel(true)}
                >
                    <div className={`w-full transition-opacity duration-200 delay-100 ${showInfoPanel ? "opacity-100" : "opacity-0 invisible h-0"
                        }`}>
                        {useMemo(() => {
                            const target = hoveredKey || selectedTarget;
                            if (!target) {
                                return (
                                    <div className="flex items-center justify-center h-[68px] pr-8">
                                        <p className="text-gray-300 italic text-sm text-center">No key selected</p>
                                    </div>
                                );
                            }

                            const pos = (typeof target.row === 'number' && typeof target.col === 'number')
                                ? (target.row * matrixCols + target.col)
                                : null;

                            const keycode = target.keycode || (pos !== null ? getKeycodeName(layerKeymap[pos] || 0) : "?");

                            return (
                                <div className="text-sm space-y-1">
                                    <p><span className="font-bold">Keycode:</span> {keycode}</p>
                                    {pos !== null && (
                                        <>
                                            <p><span className="font-bold">Position:</span> Row {target.row}, Col {target.col}</p>
                                            <p><span className="font-bold">Matrix:</span> {pos}</p>
                                        </>
                                    )}
                                </div>
                            );
                        }, [hoveredKey, selectedTarget, layerKeymap, matrixCols])}
                    </div>

                    <button
                        className="absolute bottom-0 right-0 p-4 focus:outline-none text-black hover:text-gray-600 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowInfoPanel(!showInfoPanel);
                        }}
                        title={showInfoPanel ? "Close Info" : "Show Key Info"}
                    >
                        <InfoIcon />
                    </button>
                </div>
            </div>
        </div>
    );
};
