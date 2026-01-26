/**
 * LayerRow - A single layer entry in a LayoutGroupCard
 * Shows full-width keyboard preview with layer info and Place button
 * Can be dragged to place on current layer
 */

import type { FC } from "react";
import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { ArrowRight, GripVertical } from "lucide-react";

import type { ImportedLayer } from "@/types/layer-library";
import { Button } from "@/components/ui/button";
import { MiniKeyboardPreview } from "@/components/MiniKeyboardPreview";
import { cn } from "@/lib/utils";
import { colorClasses } from "@/utils/colors";
import { hsvToHex } from "@/utils/color-conversion";
import { useVial } from "@/contexts/VialContext";
import { useDrag } from "@/contexts/DragContext";
import { layerLibraryService } from "@/services/layer-library.service";
import { SVALBOARD_LAYOUT } from "@/constants/svalboard-layout";
import { THUMB_OFFSET_U } from "@/constants/keyboard-visuals";

interface LayerRowProps {
    /** The layer to display */
    layer: ImportedLayer;
    /** Source layout name (for display) */
    sourceLayout: string;
    /** Callback when Place button is clicked */
    onPlace: () => void;
    /** Optional search query for highlighting matches */
    searchQuery?: string;
}

// Small unit size used by Key component in "small" variant
const SMALL_UNIT_SIZE = 30;

export const LayerRow: FC<LayerRowProps> = ({
    layer,
    sourceLayout,
    onPlace,
    searchQuery = "",
}) => {
    const { keyboard } = useVial();
    const { startDrag, isDragging } = useDrag();
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.5);

    // Handle drag start for the entire layer
    const handleDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Convert ImportedLayer to LayerEntry for the clipboard
        const layerEntry = layerLibraryService.importedLayerToLayerEntry(layer, sourceLayout);

        startDrag({
            keycode: "",
            label: layer.name,
            type: "layer",
            component: "Layer",
            layerData: layerEntry,
            sourceId: `layer-${sourceLayout}-${layer.index}`,
        }, e);
    }, [layer, sourceLayout, startDrag]);

    // Get the layout to calculate dimensions
    const keyboardLayout = (keyboard?.keylayout && Object.keys(keyboard.keylayout).length > 0)
        ? keyboard.keylayout as Record<number, { x: number; y: number; w: number; h: number }>
        : SVALBOARD_LAYOUT;

    const useFragmentLayout = keyboard?.keylayout && Object.keys(keyboard.keylayout).length > 0;

    // Calculate actual keyboard dimensions
    const dimensions = useMemo(() => {
        let maxX = 0;
        let maxY = 0;

        Object.values(keyboardLayout).forEach((key) => {
            const yPos = (!useFragmentLayout && key.y >= 6) ? key.y + THUMB_OFFSET_U : key.y;
            maxX = Math.max(maxX, key.x + key.w);
            maxY = Math.max(maxY, yPos + key.h);
        });

        return {
            width: maxX * SMALL_UNIT_SIZE,
            height: maxY * SMALL_UNIT_SIZE,
        };
    }, [keyboardLayout, useFragmentLayout]);

    // Calculate scale to fit container width
    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.clientWidth - 8; // Small padding
                const newScale = Math.min(1, containerWidth / dimensions.width);
                setScale(newScale);
            }
        };

        updateScale();
        window.addEventListener("resize", updateScale);

        // Also observe container size changes
        const observer = new ResizeObserver(updateScale);
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            window.removeEventListener("resize", updateScale);
            observer.disconnect();
        };
    }, [dimensions.width]);

    // Get layer color - prefer LED hardware color over cosmetic color
    const layerColorStyle = useMemo(() => {
        // If we have LED hardware color, convert HSV to hex
        if (layer.ledColor) {
            const hex = hsvToHex(layer.ledColor.hue, layer.ledColor.sat, layer.ledColor.val);
            return { backgroundColor: hex };
        }
        // Fall back to cosmetic color class
        return undefined;
    }, [layer.ledColor]);

    const layerColorClass = !layerColorStyle && layer.color
        ? colorClasses[layer.color] || "bg-kb-primary"
        : !layerColorStyle ? "bg-gray-400" : "";

    // Highlight matching text if search query is provided
    const highlightMatch = (text: string): React.ReactNode => {
        if (!searchQuery) return text;

        const lowerText = text.toLowerCase();
        const lowerQuery = searchQuery.toLowerCase();
        const index = lowerText.indexOf(lowerQuery);

        if (index === -1) return text;

        return (
            <>
                {text.slice(0, index)}
                <mark className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
                    {text.slice(index, index + searchQuery.length)}
                </mark>
                {text.slice(index + searchQuery.length)}
            </>
        );
    };

    // Calculate the scaled container height
    const scaledHeight = dimensions.height * scale;

    return (
        <div
            ref={containerRef}
            className={cn(
                "px-1 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group",
                isDragging && "opacity-50"
            )}
        >
            {/* Layer header with info and Place button */}
            <div className="flex items-center justify-between mb-1 px-1">
                <div className="flex items-center gap-2">
                    {/* Drag handle */}
                    <div
                        className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        onMouseDown={handleDragStart}
                        title="Drag to place on current layer"
                    >
                        <GripVertical className="w-4 h-4 text-gray-400" />
                    </div>
                    {/* Layer color indicator - shows LED hardware color if available */}
                    <div
                        className={cn(
                            "w-3 h-3 rounded-full flex-shrink-0",
                            layerColorClass
                        )}
                        style={layerColorStyle}
                    />
                    {/* Layer index */}
                    <span className="text-sm font-mono text-gray-500">
                        {layer.index}
                    </span>
                    {/* Layer name */}
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {highlightMatch(layer.name)}
                    </span>
                </div>

                {/* Place button */}
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                    onClick={(e) => {
                        e.stopPropagation();
                        onPlace();
                    }}
                    title={`Place "${layer.name}" on current layer`}
                >
                    <span className="text-xs font-medium">Place</span>
                    <ArrowRight className="w-3 h-3" />
                </Button>
            </div>

            {/* Full-width keyboard preview with scaling */}
            <div
                className="rounded-lg bg-gray-100 dark:bg-gray-800 p-1"
                style={{
                    height: `${scaledHeight + 8}px`, // Add padding
                }}
            >
                <div
                    style={{
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                        width: `${dimensions.width}px`,
                        height: `${dimensions.height}px`,
                    }}
                >
                    <MiniKeyboardPreview
                        keymap={layer.keymap}
                        layerColor={layer.color}
                    />
                </div>
            </div>
        </div>
    );
};

export default LayerRow;
