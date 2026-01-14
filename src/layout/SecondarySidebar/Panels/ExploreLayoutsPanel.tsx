/**
 * ExploreLayoutsPanel - Browse and import layouts from the library
 */

import type { FC } from "react";
import { RefreshCw, Search, Upload, X } from "lucide-react";

import { useLayoutLibrary } from "@/contexts/LayoutLibraryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutCard } from "@/components/LayoutCard";
import type { LayoutCategory, LayoutMetadata } from "@/types/layout-library";
import { cn } from "@/lib/utils";

const ExploreLayoutsPanel: FC = () => {
    const {
        activeCategory,
        setActiveCategory,
        layouts,
        isLoading,
        error,
        hasMore,
        searchQuery,
        setSearchQuery,
        selectedTags,
        setSelectedTags,
        availableTags,
        loadMoreLayouts,
        refreshLayouts,
        openPreview,
    } = useLayoutLibrary();

    // Category tabs
    const categories: { id: LayoutCategory; label: string; icon: string }[] = [
        { id: 'blessed', label: 'Official', icon: '*' },
        { id: 'community', label: 'Community', icon: '' },
    ];

    // Handle tag toggle
    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    // Handle preview
    const handlePreview = (layout: LayoutMetadata) => {
        openPreview(layout);
    };

    // Handle apply (direct apply without preview)
    const handleApply = (layout: LayoutMetadata) => {
        // For now, just open preview. Full apply will come later.
        openPreview(layout);
    };

    return (
        <section className="space-y-3 h-full max-h-full flex flex-col pt-3">
            {/* Search Bar */}
            <div className="px-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Search layouts..."
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

            {/* Category Tabs */}
            <div className="px-3">
                <div className="flex gap-2">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={cn(
                                "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                                activeCategory === cat.id
                                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            )}
                        >
                            {cat.icon && <span className="mr-1">{cat.icon}</span>}
                            {cat.label}
                        </button>
                    ))}
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
                    onClick={refreshLayouts}
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

            {/* Layout List */}
            <div className="flex-1 overflow-auto px-3 pb-3 space-y-3 scrollbar-thin">
                {layouts.map(layout => (
                    <LayoutCard
                        key={layout.id}
                        layout={layout}
                        onPreview={handlePreview}
                        onApply={handleApply}
                    />
                ))}

                {/* Empty State */}
                {!isLoading && layouts.length === 0 && !error && (
                    <div className="text-center text-gray-500 mt-10">
                        <p className="mb-2">No layouts found.</p>
                        {searchQuery || selectedTags.length > 0 ? (
                            <p className="text-sm">Try adjusting your search or filters.</p>
                        ) : (
                            <p className="text-sm">Be the first to publish a layout!</p>
                        )}
                    </div>
                )}

                {/* Loading State */}
                {isLoading && layouts.length === 0 && (
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
                                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Load More */}
                {hasMore && !isLoading && (
                    <div className="pt-2">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={loadMoreLayouts}
                        >
                            Load More
                        </Button>
                    </div>
                )}
            </div>

            {/* Publish Button */}
            <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                <Button
                    variant="default"
                    className="w-full"
                    onClick={() => {
                        // TODO: Open publish dialog
                        console.log('Publish clicked');
                    }}
                >
                    <Upload className="w-4 h-4 mr-2" />
                    Publish Current Layout
                </Button>
            </div>
        </section>
    );
};

export default ExploreLayoutsPanel;
