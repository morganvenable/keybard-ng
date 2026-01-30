import React, { useRef, useState, useMemo, useCallback } from "react";
import { DragItem, useDrag } from "@/contexts/DragContext";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { useVial } from "@/contexts/VialContext";
import { KeyContent } from "@/types/vial.types";
import { CODEMAP } from "@/constants/keygen";
import { UNIT_SIZE, MATRIX_COLS } from "@/constants/svalboard-layout";

export interface UseKeyDragProps {
    uniqueId: string;
    keycode: string;
    label: string;
    row: number;
    col: number;
    layerIndex: number;
    layerColor: string;
    isRelative: boolean;
    keyContents?: KeyContent;
    w: number;
    h: number;
    variant: "default" | "medium" | "small";
    onClick?: (row: number, col: number) => void;
    disableHover?: boolean;
}

/**
 * Custom hook to handle drag and drop logic for a single key.
 */
export const useKeyDrag = (props: UseKeyDragProps) => {
    const {
        uniqueId, keycode, label, row, col, layerIndex, layerColor,
        isRelative, keyContents, w, h, variant, onClick, disableHover
    } = props;

    const { startDrag, dragSourceId, isDragging, draggedItem, markDropConsumed } = useDrag();
    const { assignKeycode, selectKeyboardKey, swapKeys, setHoveredKey, clearSelection } = useKeyBinding();
    const { keyboard } = useVial();

    const startPosRef = useRef<{ x: number; y: number } | null>(null);
    const [isDragHover, setIsDragHover] = useState(false);

    const currentUnitSize = useMemo(() => {
        if (variant === "small") return 30;
        if (variant === "medium") return 45;
        return UNIT_SIZE;
    }, [variant]);

    const isDragSource = dragSourceId === uniqueId;
    const canDrop = !isRelative && isDragging;

    const handleMouseEnter = useCallback(() => {
        if (canDrop) {
            setIsDragHover(true);
            selectKeyboardKey(layerIndex, row, col);
            onClick?.(row, col);
        }

        if (!disableHover) {
            setHoveredKey({ type: "keyboard", row, col, keycode, label });
        }
    }, [canDrop, selectKeyboardKey, layerIndex, row, col, onClick, disableHover, setHoveredKey, keycode, label]);

    const handleMouseLeave = useCallback(() => {
        if (canDrop) {
            setIsDragHover(false);
            clearSelection();
        }

        if (!disableHover) {
            setHoveredKey(null);
        }
    }, [canDrop, disableHover, setHoveredKey, clearSelection]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;

        startPosRef.current = { x: e.clientX, y: e.clientY };

        const checkDrag = (moveEvent: MouseEvent) => {
            const start = startPosRef.current;
            if (!start) return;

            const dx = moveEvent.clientX - start.x;
            const dy = moveEvent.clientY - start.y;

            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                // Clear keyboard selection when drag starts
                clearSelection();

                const dragPayload: DragItem = {
                    keycode,
                    label: label || keycode,
                    type: keyContents?.type || "keyboard",
                    extra: keyContents,
                    sourceId: uniqueId,
                    width: w * currentUnitSize,
                    height: h * currentUnitSize,
                    component: "Key",
                    props: {
                        x: 0, y: 0, w, h, keycode, label, row, col,
                        layerColor, keyContents, isRelative: true,
                        variant, className: "", selected: false, disableHover: true
                    },
                    row: isRelative ? undefined : row,
                    col: isRelative ? undefined : col,
                    layer: isRelative ? undefined : layerIndex
                };

                startDrag(dragPayload, moveEvent);
                cleanup();
            }
        };

        const handleUp = () => cleanup();

        const cleanup = () => {
            startPosRef.current = null;
            window.removeEventListener("mousemove", checkDrag);
            window.removeEventListener("mouseup", handleUp);
        };

        window.addEventListener("mousemove", checkDrag);
        window.addEventListener("mouseup", handleUp);
    }, [keycode, label, keyContents, uniqueId, w, currentUnitSize, h, row, col, layerColor, variant, isRelative, layerIndex, startDrag]);

    const handleMouseUp = useCallback(() => {
        if (canDrop && isDragHover && draggedItem) {
            markDropConsumed();

            if (draggedItem.row !== undefined && draggedItem.col !== undefined && draggedItem.layer !== undefined) {
                if (draggedItem.row !== row || draggedItem.col !== col || draggedItem.layer !== layerIndex) {
                    swapKeys(
                        { type: "keyboard", row: draggedItem.row, col: draggedItem.col, layer: draggedItem.layer },
                        { type: "keyboard", row, col, layer: layerIndex }
                    );
                }
            } else {
                // Check if the dragged item is a modifier wrapping KC_NO — if so,
                // combine with the drop target's existing base keycode
                const dragKc = draggedItem.keycode;
                const modWrapMatch = typeof dragKc === "string" && dragKc.match(/^(\w+)\(KC_NO\)$/);
                if (modWrapMatch && keyboard?.keymap && layerIndex !== undefined) {
                    const modPrefix = modWrapMatch[1];
                    const matrixCols = keyboard.cols || MATRIX_COLS;
                    const matrixPos = row * matrixCols + col;
                    const existingNumeric = keyboard.keymap[layerIndex]?.[matrixPos];
                    if (existingNumeric !== undefined && existingNumeric > 0) {
                        // Get the base keycode (strip existing modifiers if any)
                        let baseCode = existingNumeric;
                        if (existingNumeric >= 0x2000 && existingNumeric <= 0x3FFF) {
                            baseCode = existingNumeric & 0xFF; // mod-tap inner
                        } else if (existingNumeric >= 0x0100 && existingNumeric <= 0x1FFF) {
                            baseCode = existingNumeric & 0xFF; // modmask inner
                        }
                        const baseStr = baseCode in CODEMAP ? (CODEMAP[baseCode] as string) : "KC_NO";
                        assignKeycode(`${modPrefix}(${baseStr})`);
                    } else {
                        assignKeycode(dragKc);
                    }
                } else {
                    assignKeycode(dragKc);
                }
            }

            setIsDragHover(false);
        }
    }, [canDrop, isDragHover, draggedItem, markDropConsumed, row, col, layerIndex, swapKeys, assignKeycode, keyboard]);

    return {
        isDragSource,
        isDragHover,
        handleMouseEnter,
        handleMouseLeave,
        handleMouseDown,
        handleMouseUp,
        currentUnitSize,
    };
};
