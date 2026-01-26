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
}

export const LayoutGroupCard: FC<LayoutGroupCardProps> = ({
    group,
    defaultExpanded = false,
    onDelete,
    onPlaceLayer,
    searchQuery = "",
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
