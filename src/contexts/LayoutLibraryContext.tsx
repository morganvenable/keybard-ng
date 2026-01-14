/**
 * Layout Library Context
 * Manages state for the Explore Layouts feature
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import type {
    LayoutCategory,
    LayoutContent,
    LayoutMetadata,
    LayoutSearchOptions,
} from "@/types/layout-library";
import { layoutLibraryService } from "@/services/layout-library.service";

interface LayoutLibraryContextType {
    // Current state
    activeCategory: LayoutCategory;
    setActiveCategory: (category: LayoutCategory) => void;

    // Layout lists
    layouts: LayoutMetadata[];
    isLoading: boolean;
    error: string | null;
    hasMore: boolean;

    // Search/filter state
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedTags: string[];
    setSelectedTags: (tags: string[]) => void;
    availableTags: string[];

    // Actions
    loadLayouts: (options?: LayoutSearchOptions) => Promise<void>;
    loadMoreLayouts: () => Promise<void>;
    refreshLayouts: () => Promise<void>;

    // Selected layout for preview
    selectedLayout: LayoutContent | null;
    isLoadingLayout: boolean;
    selectLayout: (metadata: LayoutMetadata) => Promise<void>;
    clearSelection: () => void;

    // Preview modal state
    isPreviewOpen: boolean;
    openPreview: (metadata: LayoutMetadata) => Promise<void>;
    closePreview: () => void;
}

const LayoutLibraryContext = createContext<LayoutLibraryContextType | undefined>(undefined);

export const LayoutLibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Category state
    const [activeCategory, setActiveCategory] = useState<LayoutCategory>('blessed');

    // Layout list state
    const [layouts, setLayouts] = useState<LayoutMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);

    // Search/filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [availableTags, setAvailableTags] = useState<string[]>([]);

    // Selected layout state
    const [selectedLayout, setSelectedLayout] = useState<LayoutContent | null>(null);
    const [isLoadingLayout, setIsLoadingLayout] = useState(false);

    // Preview modal state
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Load layouts with current filters
    const loadLayouts = useCallback(async (options?: LayoutSearchOptions) => {
        setIsLoading(true);
        setError(null);

        try {
            const searchOptions: LayoutSearchOptions = {
                category: activeCategory,
                query: searchQuery || undefined,
                tags: selectedTags.length > 0 ? selectedTags : undefined,
                offset: 0,
                limit: 20,
                ...options,
            };

            const results = await layoutLibraryService.searchLayouts(searchOptions);
            setLayouts(results.layouts);
            setHasMore(results.hasMore);
            setOffset(20);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load layouts');
            setLayouts([]);
        } finally {
            setIsLoading(false);
        }
    }, [activeCategory, searchQuery, selectedTags]);

    // Load more layouts (pagination)
    const loadMoreLayouts = useCallback(async () => {
        if (isLoading || !hasMore) return;

        setIsLoading(true);
        try {
            const searchOptions: LayoutSearchOptions = {
                category: activeCategory,
                query: searchQuery || undefined,
                tags: selectedTags.length > 0 ? selectedTags : undefined,
                offset,
                limit: 20,
            };

            const results = await layoutLibraryService.searchLayouts(searchOptions);
            setLayouts(prev => [...prev, ...results.layouts]);
            setHasMore(results.hasMore);
            setOffset(prev => prev + 20);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load more layouts');
        } finally {
            setIsLoading(false);
        }
    }, [activeCategory, searchQuery, selectedTags, offset, isLoading, hasMore]);

    // Refresh layouts (clear cache and reload)
    const refreshLayouts = useCallback(async () => {
        layoutLibraryService.clearCache();
        await loadLayouts();
    }, [loadLayouts]);

    // Select a layout and fetch its full content
    const selectLayout = useCallback(async (metadata: LayoutMetadata) => {
        setIsLoadingLayout(true);
        try {
            const content = await layoutLibraryService.fetchLayoutContent(
                metadata.id,
                metadata.category
            );
            setSelectedLayout(content);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load layout');
            setSelectedLayout(null);
        } finally {
            setIsLoadingLayout(false);
        }
    }, []);

    // Clear selection
    const clearSelection = useCallback(() => {
        setSelectedLayout(null);
    }, []);

    // Open preview modal
    const openPreview = useCallback(async (metadata: LayoutMetadata) => {
        await selectLayout(metadata);
        setIsPreviewOpen(true);
    }, [selectLayout]);

    // Close preview modal
    const closePreview = useCallback(() => {
        setIsPreviewOpen(false);
        // Keep selectedLayout for potential re-use
    }, []);

    // Load layouts when category changes
    useEffect(() => {
        loadLayouts();
    }, [activeCategory]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load available tags on mount
    useEffect(() => {
        layoutLibraryService.getAllTags().then(tags => {
            setAvailableTags(tags);
        }).catch(e => {
            console.warn('Failed to load tags:', e);
        });
    }, []);

    // Reload when search or tags change (with debounce)
    useEffect(() => {
        const timer = setTimeout(() => {
            loadLayouts();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, selectedTags]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <LayoutLibraryContext.Provider
            value={{
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
                loadLayouts,
                loadMoreLayouts,
                refreshLayouts,
                selectedLayout,
                isLoadingLayout,
                selectLayout,
                clearSelection,
                isPreviewOpen,
                openPreview,
                closePreview,
            }}
        >
            {children}
        </LayoutLibraryContext.Provider>
    );
};

export const useLayoutLibrary = (): LayoutLibraryContextType => {
    const context = useContext(LayoutLibraryContext);
    if (!context) {
        throw new Error("useLayoutLibrary must be used within a LayoutLibraryProvider");
    }
    return context;
};
