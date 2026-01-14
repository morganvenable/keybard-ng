/**
 * Layout Library Service
 * Handles fetching, searching, and managing layouts from the layout library
 */

import type {
    LayoutCategory,
    LayoutContent,
    LayoutLibraryIndex,
    LayoutMetadata,
    LayoutSearchOptions,
    LayoutSearchResults,
    ViableFileContent,
} from '../types/layout-library';

// GitHub raw content base URL for the layout library repository
const LIBRARY_BASE_URL = 'https://raw.githubusercontent.com/svalboard/layout-library/main';

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

export class LayoutLibraryService {
    private indexCache: Map<LayoutCategory, CacheEntry<LayoutLibraryIndex>> = new Map();
    private layoutCache: Map<string, CacheEntry<LayoutContent>> = new Map();
    private baseUrl: string;

    constructor(baseUrl: string = LIBRARY_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * Set a custom base URL (for testing or local development)
     */
    setBaseUrl(url: string): void {
        this.baseUrl = url;
        // Clear caches when base URL changes
        this.indexCache.clear();
        this.layoutCache.clear();
    }

    /**
     * Clear all caches
     */
    clearCache(): void {
        this.indexCache.clear();
        this.layoutCache.clear();
    }

    /**
     * Fetch the index for a specific category (blessed or community)
     */
    async fetchIndex(category: LayoutCategory): Promise<LayoutLibraryIndex> {
        // Check cache
        const cached = this.indexCache.get(category);
        if (cached && Date.now() - cached.timestamp < CACHE_EXPIRATION_MS) {
            return cached.data;
        }

        // Private category has no remote index
        if (category === 'private') {
            return {
                version: 1,
                updatedAt: new Date().toISOString(),
                layouts: [],
            };
        }

        const url = `${this.baseUrl}/${category}/index.json`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch ${category} index: ${response.status} ${response.statusText}`);
        }

        const index = await response.json() as LayoutLibraryIndex;

        // Cache the result
        this.indexCache.set(category, {
            data: index,
            timestamp: Date.now(),
        });

        return index;
    }

    /**
     * Fetch blessed layouts index
     */
    async fetchBlessedLayouts(): Promise<LayoutMetadata[]> {
        const index = await this.fetchIndex('blessed');
        return index.layouts;
    }

    /**
     * Fetch community layouts index
     */
    async fetchCommunityLayouts(): Promise<LayoutMetadata[]> {
        const index = await this.fetchIndex('community');
        return index.layouts;
    }

    /**
     * Fetch full layout content by ID and category
     */
    async fetchLayoutContent(id: string, category: LayoutCategory): Promise<LayoutContent> {
        // Check cache
        const cacheKey = `${category}/${id}`;
        const cached = this.layoutCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_EXPIRATION_MS) {
            return cached.data;
        }

        // Fetch metadata
        const metaUrl = `${this.baseUrl}/${category}/layouts/${id}.meta.json`;
        const metaResponse = await fetch(metaUrl);
        if (!metaResponse.ok) {
            throw new Error(`Failed to fetch layout metadata: ${metaResponse.status}`);
        }
        const metadata = await metaResponse.json() as LayoutMetadata;

        // Fetch viable content
        const viableUrl = `${this.baseUrl}/${category}/layouts/${id}.viable`;
        const viableResponse = await fetch(viableUrl);
        if (!viableResponse.ok) {
            throw new Error(`Failed to fetch layout content: ${viableResponse.status}`);
        }
        const viable = await viableResponse.json() as ViableFileContent;

        const content: LayoutContent = {
            metadata,
            viable,
        };

        // Cache the result
        this.layoutCache.set(cacheKey, {
            data: content,
            timestamp: Date.now(),
        });

        return content;
    }

    /**
     * Search layouts across all categories (or specific category)
     */
    async searchLayouts(options: LayoutSearchOptions = {}): Promise<LayoutSearchResults> {
        const {
            query,
            tags,
            keyboardType,
            category,
            sortBy = 'recent',
            offset = 0,
            limit = 20,
        } = options;

        // Determine which categories to search
        const categories: LayoutCategory[] = category
            ? [category]
            : ['blessed', 'community'];

        // Fetch all relevant layouts
        const allLayouts: LayoutMetadata[] = [];
        for (const cat of categories) {
            try {
                const index = await this.fetchIndex(cat);
                allLayouts.push(...index.layouts);
            } catch (e) {
                console.warn(`Failed to fetch ${cat} index:`, e);
            }
        }

        // Apply filters
        let filtered = allLayouts;

        // Text search (name, description, author)
        if (query) {
            const lowerQuery = query.toLowerCase();
            filtered = filtered.filter(layout =>
                layout.name.toLowerCase().includes(lowerQuery) ||
                layout.description.toLowerCase().includes(lowerQuery) ||
                layout.author.toLowerCase().includes(lowerQuery)
            );
        }

        // Tag filter (match any)
        if (tags && tags.length > 0) {
            filtered = filtered.filter(layout =>
                tags.some(tag => layout.tags.includes(tag))
            );
        }

        // Keyboard type filter
        if (keyboardType) {
            filtered = filtered.filter(layout =>
                layout.keyboardType === keyboardType
            );
        }

        // Sort
        switch (sortBy) {
            case 'recent':
                filtered.sort((a, b) =>
                    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                );
                break;
            case 'popular':
                filtered.sort((a, b) =>
                    (b.cloneCount || 0) - (a.cloneCount || 0)
                );
                break;
            case 'name':
                filtered.sort((a, b) =>
                    a.name.localeCompare(b.name)
                );
                break;
        }

        // Pagination
        const total = filtered.length;
        const paginated = filtered.slice(offset, offset + limit);

        return {
            layouts: paginated,
            total,
            hasMore: offset + limit < total,
        };
    }

    /**
     * Get all unique tags from the library
     */
    async getAllTags(): Promise<string[]> {
        const tagSet = new Set<string>();

        try {
            const blessedIndex = await this.fetchIndex('blessed');
            blessedIndex.layouts.forEach(layout => {
                layout.tags.forEach(tag => tagSet.add(tag));
            });
        } catch (e) {
            console.warn('Failed to fetch blessed tags:', e);
        }

        try {
            const communityIndex = await this.fetchIndex('community');
            communityIndex.layouts.forEach(layout => {
                layout.tags.forEach(tag => tagSet.add(tag));
            });
        } catch (e) {
            console.warn('Failed to fetch community tags:', e);
        }

        return Array.from(tagSet).sort();
    }

    /**
     * Generate a unique 6-character ID for a new layout
     */
    generateLayoutId(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 6; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    /**
     * Find non-empty layers in a keymap
     * A layer is empty if all keys are KC_NO (0) or KC_TRNS (1)
     */
    getNonEmptyLayers(keymap: number[][]): number[] {
        const nonEmpty: number[] = [];

        keymap.forEach((layer, index) => {
            const hasContent = layer.some(keycode => keycode !== 0 && keycode !== 1);
            if (hasContent) {
                nonEmpty.push(index);
            }
        });

        return nonEmpty;
    }

    /**
     * Extract a single layer from a keymap
     */
    extractLayer(keymap: number[][], layerIndex: number): number[] | null {
        if (layerIndex < 0 || layerIndex >= keymap.length) {
            return null;
        }
        return [...keymap[layerIndex]];
    }
}

// Export singleton instance
export const layoutLibraryService = new LayoutLibraryService();
