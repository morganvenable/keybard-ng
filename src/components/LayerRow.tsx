/**
 * LayerRow - A single layer entry in a LayoutGroupCard
 * Shows full-width keyboard preview with layer info and Place button
 * Can be dragged to place on current layer
 */

import type { FC } from "react";
import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { GripVertical, Check } from "lucide-react";
import CopyIcon from "@/components/icons/CopyIcon";

import type { ImportedLayer } from "@/types/layer-library";
import { Button } from "@/components/ui/button";
import { MiniKeyboardPreview } from "@/components/MiniKeyboardPreview";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { colorClasses } from "@/utils/colors";
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
    /** Compact mode for horizontal layout */
    compact?: boolean;
}

// Small unit size used by Key component in "small" variant
const SMALL_UNIT_SIZE = 30;

export const LayerRow: FC<LayerRowProps> = ({
    layer,
    sourceLayout,
    onPlace,
    searchQuery = "",
    compact = false,
}) => {
    const { keyboard } = useVial();
    const { startDrag, isDragging } = useDrag();
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.5);
    const [justCopied, setJustCopied] = useState(false);

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
                // Account for both outer and inner padding to prevent clipping
                const outerPaddingWidth = compact ? 8 : 16;
                const innerPaddingWidth = compact ? 12 : 16;
                const extraSafety = 8; // Extra buffer to ensure no clipping on right edge
                const totalPadding = outerPaddingWidth + innerPaddingWidth + extraSafety;

                const containerWidth = containerRef.current.clientWidth - totalPadding;
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

    const resolvedColorName = useMemo(() => {
        return layer.color || keyboard?.cosmetic?.layer_colors?.[layer.index] || "primary";
    }, [layer.color, layer.index, keyboard?.cosmetic?.layer_colors]);

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

    // Calculate the scaled container height plus 8px extra below the keys
    const extraHeight = 8;
    const scaledHeight = (dimensions.height * scale) + extraHeight;

    return (
        <div
            ref={containerRef}
            className={cn(
                "px-1 py-1 transition-colors group/row",
                compact ? "w-[340px] flex-shrink-0 h-full" : "px-2 py-1",
                isDragging && "opacity-50"
            )}
        >
            <div className={cn(
                "rounded-sm bg-kb-gray dark:bg-gray-800/80 flex flex-col",
                compact ? "p-1.5 h-full" : "p-2"
            )}>
                {/* Layer header with info and Place button moved inside the gray box */}
                <div className={cn(
                    "flex items-center justify-between px-1",
                    compact ? "mb-1 scale-95 origin-left" : "mb-2"
                )}>
                    <div className="flex items-center gap-2">
                        {/* Drag handle */}
                        <div
                            className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            onMouseDown={handleDragStart}
                            title="Drag to place on current layer"
                        >
                            <GripVertical className="w-4 h-4 text-gray-400" />
                        </div>
                        {/* Layer color indicator - shows LED hardware color if available */}
                        <div
                            className={cn(
                                "w-3 h-3 rounded-full flex-shrink-0 shadow-sm",
                                colorClasses[resolvedColorName] || "bg-kb-primary"
                            )}
                        />
                        {/* Layer index */}
                        <span className="text-sm font-mono text-gray-500 font-bold">
                            {layer.index}
                        </span>
                        {/* Layer name */}
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {highlightMatch(layer.name)}
                        </span>
                    </div>

                    {/* Place button - only appears on hover of this specific row */}
                    {/* Copy/Place button - round icon button */}
                    <div className="opacity-0 group-hover/row:opacity-100 transition-all flex items-center">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={justCopied ? "default" : "outline"}
                                    size="icon"
                                    className={cn(
                                        "h-8 w-8 rounded-full flex items-center justify-center p-0 transition-all",
                                        justCopied ? "bg-green-500 hover:bg-green-600 border-green-500 text-white" : "bg-white dark:bg-gray-700 shadow-sm"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onPlace();
                                        setJustCopied(true);
                                        setTimeout(() => setJustCopied(false), 2000);
                                    }}
                                    title="" // Clear native title since we use Tooltip
                                >
                                    {justCopied ? (
                                        <Check className="w-4 h-4" />
                                    ) : (
                                        <CopyIcon className="w-4 h-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Copy Layer</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                {/* Full-width keyboard preview with scaling */}
                <div
                    className="overflow-hidden"
                    style={{
                        height: compact ? "100%" : `${scaledHeight}px`,
                    }}
                >
                    <div
                        className={compact ? "flex items-center justify-center h-full" : ""}
                        style={{
                            transform: `scale(${scale})`,
                            transformOrigin: compact ? "center center" : "top left",
                            width: `${dimensions.width}px`,
                            height: `${dimensions.height}px`,
                        }}
                    >
                        <MiniKeyboardPreview
                            keymap={layer.keymap}
                            layerColor={resolvedColorName}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LayerRow;
