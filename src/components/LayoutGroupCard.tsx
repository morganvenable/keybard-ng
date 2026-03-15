/**
 * LayoutGroupCard - Expandable card showing a layout group with its layers
 * Used in the Layouts panel to display imported layouts and the current keyboard
 */

import type { FC } from "react";
import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import LayoutLayersIcon from "@/components/icons/LayoutLayersIcon";

import type { LayoutGroup, ImportedLayer } from "@/types/layer-library";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
    /** Callback when deleting a single imported layer */
    onDeleteLayer?: (group: LayoutGroup, layer: ImportedLayer) => void;
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
    onDeleteLayer,
    searchQuery = "",
    compact = false,
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

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
    const handleOpenDeleteConfirm = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleteConfirmOpen(true);
    };
    const handleConfirmDelete = () => {
        if (!canDelete || !onDelete) return;
        onDelete(group);
        setIsDeleteConfirmOpen(false);
    };

    // Compact mode - show layers side by side with mini previews
    if (compact) {
        return (
            <>
                <div className="flex flex-row gap-1 h-full items-stretch">
                    {/* Group label - vertical on the left */}
                    <div className="flex flex-col items-center justify-between py-1 px-1 bg-kb-gray rounded-l-lg border border-gray-200 border-r-0 w-6 flex-shrink-0">
                        <div className="flex flex-col items-center gap-0.5">
                            <LayoutLayersIcon className="w-3 h-3 text-gray-400" />
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
                                className="rounded-full p-1 text-gray-500 transition-all hover:bg-red-500 hover:text-white focus:outline-none cursor-pointer bg-white"
                                onClick={handleOpenDeleteConfirm}
                                title="Delete layout"
                                type="button"
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
                            onDelete={canDelete && onDeleteLayer ? () => onDeleteLayer(group, layer) : undefined}
                            searchQuery={searchQuery}
                            compact
                        />
                    ))}
                </div>

                <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">
                                Clear Layouts {group.name}
                            </DialogTitle>
                        </DialogHeader>
                        <DialogFooter className="gap-3 sm:gap-4 mt-4">
                            <Button
                                variant="outline"
                                onClick={() => setIsDeleteConfirmOpen(false)}
                                className="rounded-full px-8 py-5 text-base border-slate-300 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleConfirmDelete}
                                className="rounded-full px-8 py-5 text-base font-bold bg-red-600 hover:bg-red-700 transition-colors border-none"
                            >
                                Clear
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    return (
        <>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
                {/* Header */}
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setIsExpanded(!isExpanded)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded(!isExpanded); } }}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                    <div className="flex items-center gap-3">
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                        <LayoutLayersIcon className="w-5 h-5 text-gray-500" />
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
                            <button
                                type="button"
                                className="h-8 w-8 rounded-full flex items-center justify-center p-0 text-gray-500 transition-all hover:bg-red-500 hover:text-white focus:outline-none cursor-pointer bg-white"
                                onClick={handleOpenDeleteConfirm}
                                title="Delete layout"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                    <div className="flex flex-col">
                        {filteredLayers.map((layer) => (
                            <LayerRow
                                key={`${group.id}-${layer.index}`}
                                layer={layer}
                                sourceLayout={group.name}
                                onPlace={() => onPlaceLayer(layer, group.name)}
                                onDelete={canDelete && onDeleteLayer ? () => onDeleteLayer(group, layer) : undefined}
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

            <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">
                            Clear Layouts {group.name}
                        </DialogTitle>
                    </DialogHeader>
                    <DialogFooter className="gap-3 sm:gap-4 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteConfirmOpen(false)}
                            className="rounded-full px-8 py-5 text-base border-slate-300 hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            className="rounded-full px-8 py-5 text-base font-bold bg-red-600 hover:bg-red-700 transition-colors border-none"
                        >
                            Clear
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default LayoutGroupCard;
