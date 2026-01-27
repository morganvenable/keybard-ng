/**
 * ExploreLayoutsPanel - Browse and copy individual layers from the layer library
 */

import type { FC } from "react";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Filter, RefreshCw, Search, X } from "lucide-react";

import { useLayerLibrary } from "@/contexts/LayoutLibraryContext";
import { useLayoutSettings } from "@/contexts/LayoutSettingsContext";
import { LayerCard } from "@/components/LayoutCard";
import { LayerPreviewModal } from "@/components/LayerPreviewModal";
import { Input } from "@/components/ui/input";
import type { LayerEntry } from "@/types/layer-library";
import { cn } from "@/lib/utils";

const ExploreLayoutsPanel: FC = () => {
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const {
        layers,
        isLoading,
        error,
        searchQuery,
        setSearchQuery,
        selectedTags,
        setSelectedTags,
        availableTags,
        refreshLayers,
        copyLayer,
        previewLayer,
        isPreviewOpen,
        openPreview,
        closePreview,
    } = useLayerLibrary();

    const { layoutMode } = useLayoutSettings();
    const isHorizontal = layoutMode === "bottombar";

    // Handle tag toggle
    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    // Handle copy - copies layer keymap to system clipboard and context
    const handleCopy = async (layer: LayerEntry) => {
        // Copy keymap to system clipboard (for Ctrl+V paste in editor)
        await navigator.clipboard.writeText(JSON.stringify(layer.keymap));

        // Also copy to context for the paste dialog
        copyLayer(layer);
    };

    // ==========================================
    // HORIZONTAL LAYOUT (Bottom Bar Mode)
    // ==========================================
    if (isHorizontal) {
        const hasActiveFilters = searchQuery || selectedTags.length > 0;

        return (
            <section className="h-full flex flex-row gap-0 overflow-hidden">
                {/* Collapsible Filter Panel */}
                <div
                    className={cn(
                        "flex flex-col gap-1.5 flex-shrink-0 border-r border-gray-200 transition-all duration-200 overflow-hidden",
                        filtersExpanded ? "w-[160px] px-2 py-1.5" : "w-8 px-1 py-1.5"
                    )}
                >
                    {/* Toggle Button */}
                    <button
                        onClick={() => setFiltersExpanded(!filtersExpanded)}
                        className={cn(
                            "flex items-center justify-center gap-1 p-1 rounded hover:bg-gray-100 transition-colors",
                            hasActiveFilters && !filtersExpanded && "text-blue-600"
                        )}
                        title={filtersExpanded ? "Collapse filters" : "Expand filters"}
                    >
                        {filtersExpanded ? (
                            <ChevronLeft className="w-4 h-4" />
                        ) : (
                            <>
                                <Filter className="w-3.5 h-3.5" />
                                {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                            </>
                        )}
                    </button>

                    {/* Expanded Filter Content */}
                    {filtersExpanded && (
                        <>
                            {/* Search Bar */}
                            <div className="relative">
                                <Search className="absolute left-1.5 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-6 pr-5 h-6 text-[11px]"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-1.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-2.5 h-2.5" />
                                    </button>
                                )}
                            </div>

                            {/* Tag Filters */}
                            {availableTags.length > 0 && (
                                <div className="flex flex-wrap gap-0.5">
                                    {availableTags.slice(0, 6).map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => toggleTag(tag)}
                                            className={cn(
                                                "text-[9px] px-1 py-0.5 rounded transition-colors",
                                                selectedTags.includes(tag)
                                                    ? "bg-gray-900 text-white"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            )}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                    {selectedTags.length > 0 && (
                                        <button
                                            onClick={() => setSelectedTags([])}
                                            className="text-[9px] px-1 py-0.5 text-gray-500 hover:text-gray-700"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Refresh */}
                            <button
                                onClick={refreshLayers}
                                disabled={isLoading}
                                className="text-[10px] text-gray-500 hover:text-gray-700 flex items-center gap-1 mt-auto"
                            >
                                <RefreshCw className={cn("w-2.5 h-2.5", isLoading && "animate-spin")} />
                                Refresh
                            </button>

                            {error && (
                                <div className="bg-red-50 text-red-600 p-1 rounded text-[9px]">
                                    {error}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Layer Cards - Full height horizontal scroll */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden px-2 py-1">
                    <div className="flex flex-row gap-2 h-full">
                        {layers.map(layer => (
                            <LayerCard
                                key={layer.id}
                                layer={layer}
                                onCopy={handleCopy}
                                onClick={openPreview}
                                compact
                            />
                        ))}

                        {/* Empty State */}
                        {!isLoading && layers.length === 0 && !error && (
                            <div className="flex items-center justify-center text-gray-400 text-xs h-full">
                                {searchQuery || selectedTags.length > 0 ? "No matches" : "No layers"}
                            </div>
                        )}

                        {/* Loading State */}
                        {isLoading && layers.length === 0 && (
                            <div className="flex gap-2 h-full">
                                {[1, 2, 3, 4].map(i => (
                                    <div
                                        key={i}
                                        className="border rounded-lg bg-gray-50 animate-pulse w-[140px] h-full flex-shrink-0"
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Layer Preview Modal */}
                <LayerPreviewModal
                    layer={previewLayer}
                    isOpen={isPreviewOpen}
                    onClose={closePreview}
                    onCopy={handleCopy}
                />
            </section>
        );
    }

    // ==========================================
    // VERTICAL LAYOUT (Sidebar Mode)
    // ==========================================
    return (
        <section className="space-y-3 h-full max-h-full flex flex-col pt-3">
            {/* Search Bar */}
            <div className="px-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Search layers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-8"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Tag Filters */}
            {availableTags.length > 0 && (
                <div className="px-3">
                    <div className="flex flex-wrap gap-1">
                        {availableTags.slice(0, 8).map(tag => (
                            <button
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                className={cn(
                                    "text-xs px-2 py-1 rounded-full transition-colors",
                                    selectedTags.includes(tag)
                                        ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                                )}
                            >
                                {tag}
                            </button>
                        ))}
                        {selectedTags.length > 0 && (
                            <button
                                onClick={() => setSelectedTags([])}
                                className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Refresh Button */}
            <div className="px-3 flex justify-end">
                <button
                    onClick={refreshLayers}
                    disabled={isLoading}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                >
                    <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
                    Refresh
                </button>
            </div>

            {/* Error State */}
            {error && (
                <div className="px-3">
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
                        {error}
                    </div>
                </div>
            )}

            {/* Layer List */}
            <div className="flex-1 overflow-auto px-3 pb-3 space-y-3 scrollbar-thin">
                {layers.map(layer => (
                    <LayerCard
                        key={layer.id}
                        layer={layer}
                        onCopy={handleCopy}
                        onClick={openPreview}
                    />
                ))}

                {/* Empty State */}
                {!isLoading && layers.length === 0 && !error && (
                    <div className="text-center text-gray-500 mt-10">
                        <p className="mb-2">No layers found.</p>
                        {searchQuery || selectedTags.length > 0 ? (
                            <p className="text-sm">Try adjusting your search or filters.</p>
                        ) : (
                            <p className="text-sm">
                                Publish a layer from the layer dropdown to add it here!
                            </p>
                        )}
                    </div>
                )}

                {/* Loading State */}
                {isLoading && layers.length === 0 && (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div
                                key={i}
                                className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 animate-pulse"
                            >
                                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-3" />
                                <div className="flex gap-2">
                                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Layer Preview Modal */}
            <LayerPreviewModal
                layer={previewLayer}
                isOpen={isPreviewOpen}
                onClose={closePreview}
                onCopy={handleCopy}
            />
        </section>
    );
};

export default ExploreLayoutsPanel;
