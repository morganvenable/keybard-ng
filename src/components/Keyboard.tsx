import "./Keyboard.css";
import { cn } from "@/lib/utils";

import { getKeyLabel, getKeycodeName } from "@/utils/layers";
import React, { useMemo, useEffect, useRef } from "react";
import { MATRIX_COLS, SVALBOARD_LAYOUT, UNIT_SIZE } from "../constants/svalboard-layout";
import { THUMB_OFFSET_U } from "../constants/keyboard-visuals";

import { useKeyBinding } from "@/contexts/KeyBindingContext";
import type { KeyboardInfo } from "../types/vial.types";
import { Key } from "./Key";
import { useLayoutSettings } from "@/contexts/LayoutSettingsContext";
import { useSettings } from "@/contexts/SettingsContext";
import { getLabelForKeycode } from "./Keyboards/layouts";
import {
    headerClasses,
    hoverHeaderClasses,
    hoverBackgroundClasses,
    hoverBorderClasses,
    colorClasses,
    layerColors,
    getColorByName
} from "@/utils/colors";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { svalService } from "@/services/sval.service";
// import { InfoIcon } from "./icons/InfoIcon";
import { usePanels } from "@/contexts/PanelsContext";
import { useChanges } from "@/hooks/useChanges";

const TEXT_CLASS_TO_HEX: Record<string, string> = {
    "text-white": "#ffffff",
    "text-black": "#000000",
    "text-orange-800": "#9a3412",
    "text-gray-200": "#e5e7eb",
};

interface KeyboardProps {
    keyboard: KeyboardInfo;
    onKeyClick?: (layer: number, row: number, col: number) => void;
    selectedLayer: number;
    setSelectedLayer: (layer: number) => void;
    showTransparency?: boolean;
    onGhostNavigate?: (sourceLayer: number) => void;
    layerActiveState?: boolean[];
    instanceId?: string;
    show3DBackdrop?: boolean;
    activeLayerIndex?: number | null;
    isConnected?: boolean;
}

/**
 * Main Keyboard component for the Svalboard layout.
 * Renders individual keys, cluster backgrounds, and an information panel.
 */
export const Keyboard: React.FC<KeyboardProps> = ({
    keyboard,
    selectedLayer,
    setSelectedLayer,
    showTransparency = false,
    onGhostNavigate,
    layerActiveState,
    instanceId,
    show3DBackdrop = false,
    activeLayerIndex,
}) => {
    const {
        selectKeyboardKey,
        selectedTarget,
        clearSelection,
        assignKeycode
    } = useKeyBinding();

    const { activePanel, itemToEdit } = usePanels();
    const { hasPendingChangeForKey } = useChanges();

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

    const { internationalLayout, keyVariant, fingerClusterSqueeze, is3DMode, isThumb3DOffsetActive, backdropOpacity } = useLayoutSettings();
    const { getSetting } = useSettings();
    const isTransmitting = useMemo(() =>
        itemToEdit !== null && ["tapdances", "combos", "macros", "overrides"].includes(activePanel || ""),
        [itemToEdit, activePanel]
    );

    const currentUnitSize = useMemo(() =>
        keyVariant === 'small' ? 30 : keyVariant === 'medium' ? 45 : UNIT_SIZE,
        [keyVariant]
    );

    const getYPos = (y: number) => (
        (!useFragmentLayout && y >= 6) ? y + THUMB_OFFSET_U : y
    );

    const layoutValues = useMemo(
        () => Object.values(keyboardLayout) as Array<{ x: number; y: number; w: number; h: number; row?: number; col?: number }>,
        [keyboardLayout]
    );

    const clusterBounds = useMemo(() => {
        const clusterTopKeys = [
            { x: 1, y: 1.5 },   // Q
            { x: 3.5, y: 0 },   // W
            { x: 7, y: 0 },     // E
            { x: 9.5, y: 1.5 }, // R
            { x: 13.8, y: 1.5 }, // U
            { x: 16.3, y: 0 },  // I
            { x: 19.8, y: 0 },  // O
            { x: 22.3, y: 1.5 }, // P
        ];

        const findKeyByXY = (x: number, y: number): { x: number; y: number; w: number; h: number } | null => {
            let best: { x: number; y: number; w: number; h: number } | null = null;
            let bestDist = Infinity;
            layoutValues.forEach((k) => {
                const dx = Math.abs(k.x - x);
                const dy = Math.abs(k.y - y);
                const dist = dx + dy;
                if (dist < bestDist) {
                    bestDist = dist;
                    best = k;
                }
            });
            return bestDist <= 0.75 ? best : null;
        };

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        clusterTopKeys.forEach(({ x, y }) => {
            const top = findKeyByXY(x, y);
            const right = findKeyByXY(x + 1, y + 1);
            const bottom = findKeyByXY(x, y + 2);
            const left = findKeyByXY(x - 1, y + 1);
            const candidates: Array<{ x: number; y: number; w: number; h: number } | null> = [top, right, bottom, left];
            candidates.forEach((k) => {
                if (!k) return;
                const yPos = getYPos(k.y);
                minX = Math.min(minX, k.x);
                minY = Math.min(minY, yPos);
                maxX = Math.max(maxX, k.x + k.w);
                maxY = Math.max(maxY, yPos + k.h);
            });
        });

        if (!Number.isFinite(minX)) {
            return null;
        }

        return { minX, minY, maxX, maxY };
    }, [layoutValues, getYPos, useFragmentLayout]);

    const thumbClusterBounds = useMemo(() => {
        const hideThumbs2D = !is3DMode && isThumb3DOffsetActive;
        if (hideThumbs2D) return null;
        const thumbKeys = layoutValues.filter((k) => k.y >= 5);

        if (thumbKeys.length === 0) return null;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        thumbKeys.forEach((k) => {
            const yPos = getYPos(k.y);
            minX = Math.min(minX, k.x);
            minY = Math.min(minY, yPos);
            maxX = Math.max(maxX, k.x + k.w);
            maxY = Math.max(maxY, yPos + k.h);
        });

        if (!Number.isFinite(minX)) return null;

        return { minX, minY, maxX, maxY };
    }, [layoutValues, getYPos, is3DMode, isThumb3DOffsetActive]);

    // Calculate layout midline for squeeze positioning (center X of the keyboard)
    const layoutMidline = useMemo(() => {
        let maxX = 0;
        layoutValues.forEach((key) => {
            maxX = Math.max(maxX, key.x + key.w);
        });
        return maxX / 2;
    }, [layoutValues]);

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
            const typingBindsKey = getSetting("typing-binds-key");
            if (typingBindsKey) return;

            if (!(e.key === "Delete" || e.key === "Backspace")) return;
            if (selectedTarget?.type !== "keyboard") return;

            // Ignore if user is typing in an input or textarea
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

            if (selectedTarget.layer === selectedLayer && typeof selectedTarget.row === 'number') {
                e.preventDefault();
                e.stopPropagation();
                const shouldTransparent = e.key === "Delete" || (e.key === "Backspace" && e.shiftKey);
                assignKeycode(shouldTransparent ? "KC_TRNS" : "KC_NO");
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedTarget, selectedLayer, assignKeycode, getSetting]);

    const layoutOffsets = useMemo(() => {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        const hideThumbs2D = !is3DMode && isThumb3DOffsetActive;

        layoutValues.forEach((key) => {
            const isThumbCluster = key.y >= 5;
            if (hideThumbs2D && isThumbCluster) {
                maxX = Math.max(maxX, key.x + key.w);
                return;
            }
            const yPos = getYPos(key.y);
            let xPos = key.x;
            if (fingerClusterSqueeze > 0) {
                const keyCenterX = key.x + key.w / 2;
                if (keyCenterX < layoutMidline) {
                    xPos = key.x + fingerClusterSqueeze;
                } else {
                    xPos = key.x - fingerClusterSqueeze;
                }
                xPos -= fingerClusterSqueeze;
            }
            minX = Math.min(minX, xPos);
            minY = Math.min(minY, yPos);
            maxX = Math.max(maxX, xPos + key.w);
            maxY = Math.max(maxY, yPos + key.h);
        });

        if (!Number.isFinite(minX)) {
            return { offsetX: 0, offsetY: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
        }

        const offsetX = minX < 0 ? -minX : 0;
        const offsetY = minY < 0 ? -minY : 0;
        return { offsetX, offsetY, minX, minY, maxX, maxY };
    }, [layoutValues, getYPos, fingerClusterSqueeze, layoutMidline, is3DMode, isThumb3DOffsetActive]);

    const keyboardSize = useMemo(() => {
        let maxX = 0;
        let maxY = 0;
        let minY = Infinity; // Top edge of keyboard
        const hideThumbs2D = !is3DMode && isThumb3DOffsetActive;

        layoutValues.forEach((key) => {
            const isThumbCluster = key.y >= 5;
            if (hideThumbs2D && isThumbCluster) {
                // Keep width from full layout, but reduce height when thumbs are hidden in 2D
                maxX = Math.max(maxX, key.x + key.w);
                return;
            }
            const yPos = getYPos(key.y);
            maxX = Math.max(maxX, key.x + key.w);
            maxY = Math.max(maxY, yPos + key.h);
            minY = Math.min(minY, yPos);
        });

        // Adjust width for squeeze (both sides squeezed toward center)
        const adjustedMaxX = maxX - (2 * fingerClusterSqueeze);
        const widthUnits = layoutOffsets.maxX - layoutOffsets.minX;
        const heightUnits = layoutOffsets.maxY - layoutOffsets.minY;

        // Badge position: horizontally centered, aligned with top keys (same Y level)
        const badgeCenterX = (adjustedMaxX / 2) * currentUnitSize;
        // Position at the same Y level as the top keys (center of the top row)
        const badgeCenterY = ((minY + layoutOffsets.offsetY) + 0.5) * currentUnitSize;

        return {
            width: Math.max(widthUnits, adjustedMaxX) * currentUnitSize,
            height: Math.max(heightUnits, maxY - minY) * currentUnitSize + 20,
            badgeCenterX,
            badgeCenterY,
        };
    }, [layoutValues, currentUnitSize, useFragmentLayout, fingerClusterSqueeze, is3DMode, isThumb3DOffsetActive, layoutOffsets]);

    const isActiveLayerBackdrop = typeof activeLayerIndex === "number" && activeLayerIndex === selectedLayer;
    const isLayerActive = typeof activeLayerIndex === "number"
        ? activeLayerIndex === selectedLayer
        : !!layerActiveState?.[selectedLayer];

    const layerBackdropColor = useMemo(() => {
        const layerName = keyboard.cosmetic?.layer_colors?.[selectedLayer] || "green";
        const color = getColorByName(layerName)?.hex || "#099e7c";
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const appliedOpacity = isActiveLayerBackdrop ? 0.65 : backdropOpacity;
        return `rgba(${r}, ${g}, ${b}, ${appliedOpacity})`;
    }, [keyboard.cosmetic, selectedLayer, backdropOpacity, isActiveLayerBackdrop]);

    const layerDisplayName = useMemo(() => {
        return svalService.getLayerName(keyboard, selectedLayer);
    }, [keyboard, selectedLayer]);

    const layerHeaderTextColor = useMemo(() => {
        const layerName = keyboard.cosmetic?.layer_colors?.[selectedLayer] || "green";
        return getColorByName(layerName)?.hex || "#099e7c";
    }, [keyboard.cosmetic, selectedLayer]);

    const layerTextColorClass = useMemo(() => {
        const layerName = keyboard.cosmetic?.layer_colors?.[selectedLayer] || "green";
        const classes = colorClasses[layerName] || colorClasses.primary;
        return classes.split(" ").find(c => c.startsWith("text-"));
    }, [keyboard.cosmetic, selectedLayer]);
    const keyTextColorHex = layerTextColorClass ? TEXT_CLASS_TO_HEX[layerTextColorClass] : undefined;
    const active3DIndicatorColor = isLayerActive ? (keyTextColorHex || layerHeaderTextColor) : layerHeaderTextColor;
    const useKeyTextColorFor3DLabel = isLayerActive
        ? !!layerTextColorClass
        : !!layerTextColorClass && layerTextColorClass !== "text-white";
    const isDefaultLayer = selectedLayer === 0;
    const showStatusRing = isDefaultLayer || isLayerActive;
    const useInsetDotStyle = isLayerActive && !isDefaultLayer;

    const getDarkLayerHex = (layerName: string) => {
        const layerHex = getColorByName(layerName)?.hex || "#099e7c";
        const r = parseInt(layerHex.slice(1, 3), 16);
        const g = parseInt(layerHex.slice(3, 5), 16);
        const b = parseInt(layerHex.slice(5, 7), 16);
        const darkenMultiplier = 0.7;
        const rd = Math.round(r * darkenMultiplier).toString(16).padStart(2, "0");
        const gd = Math.round(g * darkenMultiplier).toString(16).padStart(2, "0");
        const bd = Math.round(b * darkenMultiplier).toString(16).padStart(2, "0");
        return `#${rd}${gd}${bd}`;
    };


    const KC_TRNS = 1;
    const UNDERLAY_SCREEN_OFFSET_PX = 4;
    const LAYER_LABEL_PREPROJECTION_Y_SHIFT_PX = 8;
    const ISOMETRIC_ROTATE_Z_DEG = -45;
    const ISOMETRIC_ROTATE_X_DEG = 55;

    // Convert desired screen-space vertical drop into local XY offsets that cancel X drift
    // after rotateZ + rotateX in 3D view.
    const underlayLocalOffset = useMemo(() => {
        const zRad = (ISOMETRIC_ROTATE_Z_DEG * Math.PI) / 180;
        const xRad = (ISOMETRIC_ROTATE_X_DEG * Math.PI) / 180;
        const cosZ = Math.cos(zRad);
        const sinZ = Math.sin(zRad);
        const cosX = Math.cos(xRad);

        // Solve:
        //  screenDx = dx*cosZ - dy*sinZ = 0
        //  screenDy = (dx*sinZ + dy*cosZ) * cosX = UNDERLAY_SCREEN_OFFSET_PX
        const dy = UNDERLAY_SCREEN_OFFSET_PX / ((sinZ * sinZ / cosZ + cosZ) * cosX);
        const dx = dy * (sinZ / cosZ);
        return { dx, dy };
    }, []);

    // Helper to find effective keycode for transparency
    // Uses layerActiveState (UI/device) to decide which lower layers are "active".
    // Fallback is always Layer 0.
    const findEffectiveKey = (startLayer: number, pos: number) => {
        for (let l = startLayer - 1; l >= 0; l--) {
            const isActive = layerActiveState ? !!layerActiveState[l] : false;
            if (!isActive) continue;
            const keymap = keyboard.keymap?.[l];
            if (!keymap) continue;
            const code = keymap[pos];
            if (code !== KC_TRNS) {
                return {
                    keycode: code,
                    sourceLayer: l,
                    sourceLayerColor: keyboard.cosmetic?.layer_colors?.[l] || "primary"
                };
            }
        }

        // Fallback to layer 0 key
        const baseLayer = 0;
        const keymap = keyboard.keymap?.[baseLayer];
        if (!keymap) return null;
        const code = keymap[pos];
        return {
            keycode: code,
            sourceLayer: baseLayer,
            sourceLayerColor: keyboard.cosmetic?.layer_colors?.[baseLayer] || "primary"
        };
    };

    return (
        <div className="p-4 pointer-events-none" data-keyboard-instance={instanceId}>
            <div
                className="keyboard-layout relative pointer-events-none"
                style={{
                    width: `${keyboardSize.width}px`,
                    height: `${keyboardSize.height}px`,
                }}
            >
                {is3DMode && show3DBackdrop && clusterBounds && (
                    <div
                        className="absolute"
                        data-layer-backdrop="true"
                        style={{
                            left: ((clusterBounds!.minX + layoutOffsets.offsetX) * currentUnitSize) - currentUnitSize,
                            top: ((clusterBounds!.minY + layoutOffsets.offsetY) * currentUnitSize) - currentUnitSize,
                            width: ((clusterBounds!.maxX - clusterBounds!.minX) * currentUnitSize) + (currentUnitSize * 3),
                            height: ((clusterBounds!.maxY - clusterBounds!.minY) * currentUnitSize) + (currentUnitSize * 1.5),
                            background: layerBackdropColor,
                            mixBlendMode: "multiply",
                            zIndex: -1,
                            pointerEvents: "none",
                        }}
                    >
                    </div>
                )}
                {is3DMode && show3DBackdrop && clusterBounds && (
                    <div
                        className={cn(
                            "absolute text-lg font-normal select-none flex items-center gap-2",
                            useKeyTextColorFor3DLabel && layerTextColorClass
                        )}
                        data-layer-label="true"
                        style={{
                            color: useKeyTextColorFor3DLabel ? undefined : active3DIndicatorColor,
                            left: ((clusterBounds!.minX + layoutOffsets.offsetX) * currentUnitSize) - currentUnitSize + 24,
                            top: ((clusterBounds!.minY + layoutOffsets.offsetY) * currentUnitSize) - currentUnitSize + 8 + LAYER_LABEL_PREPROJECTION_Y_SHIFT_PX,
                        }}
                    >
                        <span
                            className="relative w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                            style={showStatusRing ? { border: `2px solid ${active3DIndicatorColor}` } : undefined}
                        >
                            <span
                                className="w-[18px] h-[18px] rounded-full shadow-sm"
                                style={useInsetDotStyle
                                    ? {
                                        backgroundColor: "transparent",
                                        boxShadow: `inset 0 0 0 6px ${active3DIndicatorColor}`,
                                    }
                                    : { backgroundColor: active3DIndicatorColor }}
                            />
                        </span>
                        <span>{layerDisplayName}</span>
                    </div>
                )}
                {is3DMode && show3DBackdrop && clusterBounds && thumbClusterBounds && (
                    <div
                        className="absolute"
                        data-layer-backdrop="true"
                        style={{
                            left: ((thumbClusterBounds!.minX + layoutOffsets.offsetX) * currentUnitSize) - currentUnitSize,
                            top:
                                (((clusterBounds!.minY + layoutOffsets.offsetY) * currentUnitSize) - currentUnitSize) +
                                (((clusterBounds!.maxY - clusterBounds!.minY) * currentUnitSize) + (currentUnitSize * 1.5)),
                            width: ((thumbClusterBounds!.maxX - thumbClusterBounds!.minX) * currentUnitSize) + (currentUnitSize * 2),
                            height: ((thumbClusterBounds!.maxY - thumbClusterBounds!.minY) * currentUnitSize) + (currentUnitSize * 1.5),
                            background: layerBackdropColor,
                            mixBlendMode: "multiply",
                            zIndex: -1,
                            pointerEvents: "none",
                            transform: (is3DMode && isThumb3DOffsetActive) ? "translateY(900px)" : undefined,
                            transition: "transform 300ms ease-in-out",
                        }}
                    />
                )}
                {/* Keys */}
                {Object.entries(keyboardLayout).map(([matrixPos, layout]) => {
                    const pos = Number(matrixPos);
                    // Use row/col from layout if available (from fragments), otherwise calculate from position
                    const row = typeof layout.row === 'number' ? layout.row : Math.floor(pos / matrixCols);
                    const col = typeof layout.col === 'number' ? layout.col : pos % matrixCols;

                    let keycode = layerKeymap[pos] || 0;

                    // Transparency Logic
                    let effectiveKeycode = 0;
                    let effectiveLayerColor = "primary";
                    let isGhostKey = false;
                    let ghostSourceLayer = -1;

                    if (showTransparency && keycode === KC_TRNS && selectedLayer > 0) {
                        const effective = findEffectiveKey(selectedLayer, pos);
                        if (effective) {
                            effectiveKeycode = effective.keycode;
                            effectiveLayerColor = effective.sourceLayerColor;
                            isGhostKey = true;
                            ghostSourceLayer = effective.sourceLayer;
                        }
                    }

                    // Render Standard Key (or the underlying key if ghost is active)
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
                    const keyUnderlayColor = getDarkLayerHex(activeLayerColor);

                    const yPos = getYPos(layout.y) + layoutOffsets.offsetY;

                    // Apply finger cluster squeeze: shift keys toward center based on side
                    // Only squeeze finger cluster keys (y < 5), not thumb clusters (y >= 5)
                    let xPos = layout.x;
                    const isThumbCluster = layout.y >= 5;
                    if (!is3DMode && isThumb3DOffsetActive && isThumbCluster) {
                        return null;
                    }
                    if (fingerClusterSqueeze > 0) {
                        if (!isThumbCluster) {
                            const keyCenterX = layout.x + layout.w / 2;
                            if (keyCenterX < layoutMidline) {
                                // Left side: shift right (toward center)
                                xPos = layout.x + fingerClusterSqueeze;
                            } else {
                                // Right side: shift left (toward center)
                                xPos = layout.x - fingerClusterSqueeze;
                            }
                        }
                        // Offset ALL keys left to keep keyboard left-aligned
                        // (compensates for left finger cluster shifting right)
                        xPos -= fingerClusterSqueeze;
                    }
                    xPos += layoutOffsets.offsetX;

                    const isSelected = isKeySelected(row, col);
                    const standardKeyClassName = isGhostKey
                        ? cn("transition-opacity duration-200 pointer-events-auto", isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")
                        : "pointer-events-auto";

                    const THUMB_3D_SHIFT_PX = (is3DMode && isThumb3DOffsetActive) ? 900 : 0;
                    const underlayBorderRadius = keyVariant === "default" ? 6 : 5;
                    const underlayStyle: React.CSSProperties = {
                        position: "absolute",
                        left: `${(xPos * currentUnitSize) + (is3DMode ? underlayLocalOffset.dx : 0)}px`,
                        top: `${(yPos * currentUnitSize) + (is3DMode ? underlayLocalOffset.dy : UNDERLAY_SCREEN_OFFSET_PX)}px`,
                        width: `${layout.w * currentUnitSize}px`,
                        height: `${layout.h * currentUnitSize}px`,
                        borderRadius: `${underlayBorderRadius}px`,
                        border: `1px solid ${keyUnderlayColor}`,
                        backgroundColor: keyUnderlayColor,
                        opacity: 0.65,
                        pointerEvents: "none",
                        transition: "top 300ms ease-in-out, left 300ms ease-in-out, transform 300ms ease-in-out",
                        transform: is3DMode && isThumbCluster ? `translateY(${THUMB_3D_SHIFT_PX}px)` : undefined,
                    };
                    const standardKey = (
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
                            data-key-x={layout.x}
                            data-key-y={layout.y}
                            data-key-w={layout.w}
                            data-key-h={layout.h}
                            data-key-label={label}
                            data-keycode={keycodeName}
                            selected={isKeySelected(row, col)}
                            onClick={handleKeyClick}
                            onDoubleClick={isGhostKey ? () => {
                                if (onGhostNavigate) {
                                    onGhostNavigate(ghostSourceLayer);
                                } else {
                                    setSelectedLayer(ghostSourceLayer);
                                }
                            } : undefined}
                            keyContents={keyContents}
                            layerColor={activeLayerColor}
                            headerClassName={keyHeaderClassFull}
                            hoverBackgroundColor={keyHoverBg}
                            hoverBorderColor={keyHoverBorder}
                            hoverLayerColor={keyHoverLayerColor}
                            variant={keyVariant}
                            layerIndex={selectedLayer}
                            hasPendingChange={hasPendingChangeForKey(selectedLayer, row, col)}
                            disableTooltip={true}
                            className={standardKeyClassName}
                            style={is3DMode && isThumbCluster ? { transform: `translateY(${THUMB_3D_SHIFT_PX}px)`, transition: 'transform 300ms ease-in-out' } : undefined}
                        />
                    );

                    if (!isGhostKey) {
                        return (
                            <React.Fragment key={`${row}-${col}-stack`}>
                                {is3DMode && <div aria-hidden="true" style={underlayStyle} />}
                                {standardKey}
                            </React.Fragment>
                        );
                    }

                    // Render Ghost Key Overlay
                    const isTrnsOrNo = Number(effectiveKeycode) === 1 || Number(effectiveKeycode) === 0 || Number.isNaN(Number(effectiveKeycode));
                    const { label: ghostDefaultLabel, keyContents: ghostKeyContents } = getKeyLabel(keyboard, effectiveKeycode);
                    const ghostKeycodeName = getKeycodeName(effectiveKeycode);

                    // Use empty label if TRNS/NO to avoid "0x0000" or "OXNAN"
                    // Also check for "0xNaN" string which might come from invalid keycode formatting
                    const isInvalidLabel =
                        ghostKeycodeName.toLowerCase() === "0xnan" ||
                        ghostDefaultLabel.toLowerCase() === "0xnan" ||
                        ghostKeycodeName.toLowerCase() === "0x0000" ||
                        ghostDefaultLabel.toLowerCase() === "0x0000";
                    const ghostLabel = (isTrnsOrNo || isInvalidLabel) ? "" : (getLabelForKeycode(ghostKeycodeName, internationalLayout) || ghostDefaultLabel);

                    // Styles for ghost key
                    const ghostLayerColor = isTransmitting ? "sidebar" : effectiveLayerColor;
                    const ghostHeaderClass = headerClasses[ghostLayerColor] || headerClasses["primary"];
                    const ghostHoverHeaderClass = hoverHeaderClasses[ghostLayerColor] || hoverHeaderClasses["primary"];
                    const ghostHeaderClassFull = `${ghostHeaderClass} ${ghostHoverHeaderClass}`;


                    const sourceLayerName = svalService.getLayerName(keyboard, ghostSourceLayer);
                    const tooltipText = sourceLayerName.startsWith("Layer") ? sourceLayerName : `Layer ${sourceLayerName}`;

                    // Calculate darker border color
                    const layerColorObj = layerColors.find(c => c.name === ghostLayerColor) || layerColors[0];
                    const hex = layerColorObj.hex;
                    const darkBorderColor = getDarkLayerHex(ghostLayerColor);

                    const ghostOverlay = (
                        <Key
                            key={`${row}-${col}-ghost`}
                            x={xPos}
                            y={yPos}
                            w={layout.w}
                            h={layout.h}
                            keycode={ghostKeycodeName}
                            label={ghostLabel}
                            row={row}
                            col={col}
                            onClick={handleKeyClick} // Clicking ghost selects the key slot on CURRENT layer
                            onDoubleClick={() => {
                                if (onGhostNavigate) {
                                    onGhostNavigate(ghostSourceLayer);
                                } else {
                                    setSelectedLayer(ghostSourceLayer);
                                }
                            }}
                            keyContents={ghostKeyContents}
                            layerColor={ghostLayerColor}
                            headerClassName={ghostHeaderClassFull}
                            // Ghost styles
                            className={cn("border-solid border-[3px] transition-opacity", isSelected ? "opacity-0" : "opacity-50 group-hover:opacity-0")}
                            // Override border color via style to match the specific darkened color
                            style={{ borderColor: darkBorderColor, pointerEvents: "none" }}
                            // Dragging a ghost key should behave like dragging the real transparent key slot
                            dragItemData={{
                                keycode: keycodeName,
                                label,
                                row,
                                col,
                                layer: selectedLayer,
                                extra: keyContents,
                                props: {
                                    x: 0,
                                    y: 0,
                                    w: layout.w,
                                    h: layout.h,
                                    row,
                                    col,
                                    keycode: keycodeName,
                                    label,
                                    keyContents,
                                    layerColor: activeLayerColor,
                                    headerClassName: keyHeaderClassFull,
                                    hoverBorderColor: keyHoverBorder,
                                    hoverBackgroundColor: keyHoverBg,
                                    hoverLayerColor: keyHoverLayerColor,
                                    isRelative: true,
                                    variant: keyVariant,
                                    className: "",
                                    selected: false,
                                    disableHover: true,
                                },
                            }}
                            variant={keyVariant}
                            layerIndex={selectedLayer} // Important: belongs to current layer logic
                            hasPendingChange={hasPendingChangeForKey(selectedLayer, row, col)}
                            disableTooltip={true} // Disable native tooltip, we use custom one
                        />
                    );

                    const wrapperStyle: React.CSSProperties = {
                        position: 'absolute',
                        left: `${xPos * currentUnitSize}px`,
                        top: `${yPos * currentUnitSize}px`,
                        width: `${layout.w * currentUnitSize}px`,
                        height: `${layout.h * currentUnitSize}px`,
                        transition: 'top 300ms ease-in-out, left 300ms ease-in-out, transform 300ms ease-in-out',
                        transform: (is3DMode && isThumbCluster) ? `translateY(${THUMB_3D_SHIFT_PX}px)` : undefined,
                    };

                    return (
                        <Tooltip delayDuration={0} key={`${row}-${col}-fragment`}>
                            <TooltipTrigger asChild>
                                <div
                                    className="group pointer-events-auto"
                                    style={wrapperStyle}
                                    onDoubleClick={() => {
                                        if (onGhostNavigate) {
                                            onGhostNavigate(ghostSourceLayer);
                                        } else {
                                            setSelectedLayer(ghostSourceLayer);
                                        }
                                    }}
                                >
                                    {React.cloneElement(standardKey, { x: 0, y: 0 })}
                                    {React.cloneElement(ghostOverlay, { x: 0, y: 0 })}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent
                                className={cn(`bg-kb-${ghostLayerColor} border-none`, colorClasses[ghostLayerColor] || "text-white")}
                                arrowStyle={{ backgroundColor: hex, fill: 'transparent' }}
                                side="top"
                            >
                                {tooltipText}
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>

        </div>
    );
};
