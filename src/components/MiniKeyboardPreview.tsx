/**
 * MiniKeyboardPreview - A tiny keyboard visualization for layer cards
 * Shows a simplified view of the layer's key assignments
 */

import type { FC } from "react";
import { useVial } from "@/contexts/VialContext";
import { SVALBOARD_LAYOUT, MATRIX_COLS } from "@/constants/svalboard-layout";
import { cn } from "@/lib/utils";

interface MiniKeyboardPreviewProps {
    /** Flat array of keycodes for this layer */
    keymap: number[];
    /** Layer color for styling */
    layerColor?: string;
    /** Additional className */
    className?: string;
}

// Keycodes for empty detection
const KC_NO = 0;
const KC_TRNS = 1;

export const MiniKeyboardPreview: FC<MiniKeyboardPreviewProps> = ({
    keymap,
    layerColor = "primary",
    className,
}) => {
    const { keyboard } = useVial();

    // Get the layout to use - prefer current keyboard's layout, fallback to default
    const keyboardLayout = (keyboard?.keylayout && Object.keys(keyboard.keylayout).length > 0)
        ? keyboard.keylayout as Record<number, { x: number; y: number; w: number; h: number }>
        : SVALBOARD_LAYOUT;

    // Calculate keyboard dimensions
    let maxX = 0;
    let maxY = 0;
    Object.values(keyboardLayout).forEach((key) => {
        maxX = Math.max(maxX, key.x + key.w);
        maxY = Math.max(maxY, key.y + key.h);
    });

    // Scale to fit in a small container (about 180px wide)
    const targetWidth = 180;
    const unitSize = Math.floor(targetWidth / maxX);
    const width = maxX * unitSize;
    const height = maxY * unitSize;

    // Color classes based on layer color
    const getKeyColor = (keycode: number) => {
        if (keycode === KC_NO || keycode === KC_TRNS) {
            return "bg-gray-200 dark:bg-gray-700";
        }
        // Use a muted version of the layer color
        const colorMap: Record<string, string> = {
            primary: "bg-orange-300",
            red: "bg-red-300",
            green: "bg-green-300",
            blue: "bg-blue-300",
            yellow: "bg-yellow-300",
            purple: "bg-purple-300",
            pink: "bg-pink-300",
            cyan: "bg-cyan-300",
        };
        return colorMap[layerColor] || "bg-orange-300";
    };

    return (
        <div
            className={cn(
                "relative rounded bg-gray-100 dark:bg-gray-800 p-1",
                className
            )}
            style={{
                width: `${width + 8}px`,
                height: `${height + 8}px`,
            }}
        >
            <div
                className="relative"
                style={{
                    width: `${width}px`,
                    height: `${height}px`,
                }}
            >
                {Object.entries(keyboardLayout).map(([matrixPos, layout]) => {
                    const pos = Number(matrixPos);
                    const keycode = keymap[pos] || 0;

                    return (
                        <div
                            key={`mini-${pos}`}
                            className={cn(
                                "absolute rounded-sm",
                                getKeyColor(keycode)
                            )}
                            style={{
                                left: `${layout.x * unitSize}px`,
                                top: `${layout.y * unitSize}px`,
                                width: `${layout.w * unitSize - 1}px`,
                                height: `${layout.h * unitSize - 1}px`,
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default MiniKeyboardPreview;
