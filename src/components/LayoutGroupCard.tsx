/**
 * LayoutGroupCard - Expandable card showing a layout group with its layers
 * Used in the Layouts panel to display imported layouts and the current keyboard
 */

import type { FC } from "react";
import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2, Keyboard } from "lucide-react";

import type { LayoutGroup, ImportedLayer } from "@/types/layer-library";
import { Button } from "@/components/ui/button";
import LayerRow from "./LayerRow";

interface LayoutGroupCardProps {
    /** The layout group to display */
    group: LayoutGroup;
    /** Whether the group is initially expanded */
    defaultExpanded?: boolean;
    /** Callback when delete is clicked (only for imported layouts) */
    onDelete?: (group: LayoutGroup) => void;
    /** Callback when Place is clicked on a layer */
    onPlaceLayer: (layer: ImportedLayer, sourceLayout: string) => void;
    /** Optional search query for highlighting matches */
    searchQuery?: string;
    /** Compact mode for horizontal/bottom bar layout */
    compact?: boolean;
}

export const LayoutGroupCard: FC<LayoutGroupCardProps> = ({
    group,
    defaultExpanded = false,
    onDelete,
    onPlaceLayer,
    searchQuery = "",
    compact = false,
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    // Filter layers based on search query
    const filteredLayers = searchQuery
        ? group.layers.filter(layer =>
            layer.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : group.layers;

    // Don't show card if no layers match search
    if (searchQuery && filteredLayers.length === 0) {
        return null;
    }

    const canDelete = group.source === "imported";

    // Compact mode - show layers side by side with mini previews
    if (compact) {
        return (
            <div className="flex flex-row gap-1 h-full items-stretch">
                {/* Group label - vertical on the left */}
                <div className="flex flex-col items-center justify-between py-1 px-1 bg-gray-50 rounded-l-lg border border-gray-200 border-r-0 w-6 flex-shrink-0">
                    <div className="flex flex-col items-center gap-0.5">
                        <Keyboard className="w-3 h-3 text-gray-400" />
                        {group.source === "current" && (
                            <span className="text-[7px] px-1 bg-blue-100 text-blue-700 rounded writing-mode-vertical">
                                Active
                            </span>
                        )}
                    </div>
                    <span
                        className="text-[9px] text-gray-500 font-medium truncate max-w-full"
                        style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" }}
                        title={group.name}
                    >
                        {group.name.slice(0, 12)}
                    </span>
                    {canDelete && onDelete && (
                        <button
                            className="p-0.5 text-gray-400 hover:text-red-500 rounded"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(group);
                            }}
                            title="Remove"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}
                </div>

                {/* Layers with mini previews - horizontal row */}
                {filteredLayers.map((layer) => (
                    <LayerRow
                        key={`${group.id}-${layer.index}`}
                        layer={layer}
                        sourceLayout={group.name}
                        onPlace={() => onPlaceLayer(layer, group.name)}
                        searchQuery={searchQuery}
                        compact
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
            {/* Header */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
                <div className="flex items-center gap-3">
                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                    <Keyboard className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                        {group.name}
                    </span>
                    {group.source === "current" && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                            Active
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                        {filteredLayers.length} layer{filteredLayers.length !== 1 ? 's' : ''}
                    </span>
                    {canDelete && onDelete && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(group);
                            }}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                    {filteredLayers.map((layer) => (
                        <LayerRow
                            key={`${group.id}-${layer.index}`}
                            layer={layer}
                            sourceLayout={group.name}
                            onPlace={() => onPlaceLayer(layer, group.name)}
                            searchQuery={searchQuery}
                        />
                    ))}
                    {filteredLayers.length === 0 && (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            No layers
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LayoutGroupCard;
