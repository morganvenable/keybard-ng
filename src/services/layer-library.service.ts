/**
 * Layer Library Service
 * Manages local layer database - reading from bundled JSON and writing to localStorage
 */

import type {
    LayerDatabase,
    LayerEntry,
    LayerSearchOptions,
    LayerSearchResults,
} from '../types/layer-library';

// localStorage key for user-added layers
const STORAGE_KEY = 'keybard-layer-library';

// Path to bundled layers
const BUNDLED_LAYERS_PATH = '/keybard-ng/layer-library/layers.json';

export class LayerLibraryService {
    private bundledLayers: LayerEntry[] = [];
    private userLayers: LayerEntry[] = [];
    private isLoaded = false;

    /**
     * Load layers from bundled JSON and localStorage
     */
    async loadLayers(): Promise<LayerEntry[]> {
        if (!this.isLoaded) {
            await this.fetchBundledLayers();
            this.loadUserLayers();
            this.isLoaded = true;
        }
        return this.getAllLayers();
    }

    /**
     * Fetch bundled layers from public JSON file
     */
    private async fetchBundledLayers(): Promise<void> {
        try {
            const response = await fetch(BUNDLED_LAYERS_PATH);
            if (response.ok) {
                const data = await response.json() as LayerDatabase;
                this.bundledLayers = data.layers || [];
            }
        } catch (e) {
            console.warn('Failed to load bundled layers:', e);
            this.bundledLayers = [];
        }
    }

    /**
     * Load user-added layers from localStorage
     */
    private loadUserLayers(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored) as LayerEntry[];
                this.userLayers = Array.isArray(data) ? data : [];
            }
        } catch (e) {
            console.warn('Failed to load user layers:', e);
            this.userLayers = [];
        }
    }

    /**
     * Save user layers to localStorage
     */
    private saveUserLayers(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.userLayers));
        } catch (e) {
            console.error('Failed to save user layers:', e);
        }
    }

    /**
     * Get all layers (bundled + user)
     */
    getAllLayers(): LayerEntry[] {
        // User layers first (most recent), then bundled
        return [...this.userLayers, ...this.bundledLayers];
    }

    /**
     * Search and filter layers
     */
    async searchLayers(options: LayerSearchOptions = {}): Promise<LayerSearchResults> {
        await this.loadLayers();

        const { query, tags, keyboardType, sortBy = 'recent' } = options;

        let filtered = this.getAllLayers();

        // Text search (name, description, author)
        if (query) {
            const lowerQuery = query.toLowerCase();
            filtered = filtered.filter(layer =>
                layer.name.toLowerCase().includes(lowerQuery) ||
                layer.description.toLowerCase().includes(lowerQuery) ||
                layer.author.toLowerCase().includes(lowerQuery)
            );
        }

        // Tag filter (match any)
        if (tags && tags.length > 0) {
            filtered = filtered.filter(layer =>
                tags.some(tag => layer.tags.includes(tag))
            );
        }

        // Keyboard type filter
        if (keyboardType) {
            filtered = filtered.filter(layer =>
                layer.keyboardType === keyboardType
            );
        }

        // Sort
        switch (sortBy) {
            case 'recent':
                filtered.sort((a, b) =>
                    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                );
                break;
            case 'name':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'author':
                filtered.sort((a, b) => a.author.localeCompare(b.author));
                break;
        }

        return {
            layers: filtered,
            total: filtered.length,
        };
    }

    /**
     * Add a new layer (saves to localStorage)
     */
    async addLayer(layer: LayerEntry): Promise<void> {
        await this.loadLayers();

        // Add to beginning of user layers
        this.userLayers.unshift(layer);
        this.saveUserLayers();
    }

    /**
     * Get a layer by ID
     */
    async getLayerById(id: string): Promise<LayerEntry | null> {
        await this.loadLayers();
        return this.getAllLayers().find(l => l.id === id) || null;
    }

    /**
     * Delete a user layer by ID
     */
    async deleteLayer(id: string): Promise<boolean> {
        await this.loadLayers();

        const index = this.userLayers.findIndex(l => l.id === id);
        if (index >= 0) {
            this.userLayers.splice(index, 1);
            this.saveUserLayers();
            return true;
        }
        return false;
    }

    /**
     * Get all unique tags from all layers
     */
    async getAllTags(): Promise<string[]> {
        await this.loadLayers();

        const tagSet = new Set<string>();
        this.getAllLayers().forEach(layer => {
            layer.tags.forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet).sort();
    }

    /**
     * Generate a unique 6-character ID
     */
    generateId(): string {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 6; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    /**
     * Export all layers (bundled + user) as JSON string
     */
    async exportAllLayers(): Promise<string> {
        await this.loadLayers();
        const database: LayerDatabase = {
            version: 1,
            layers: this.getAllLayers(),
        };
        return JSON.stringify(database, null, 2);
    }

    /**
     * Export user layers only as JSON string
     */
    exportUserLayers(): string {
        const database: LayerDatabase = {
            version: 1,
            layers: this.userLayers,
        };
        return JSON.stringify(database, null, 2);
    }

    /**
     * Clear cache and force reload
     */
    clearCache(): void {
        this.isLoaded = false;
        this.bundledLayers = [];
        // Don't clear userLayers - they're in localStorage
        this.loadUserLayers();
    }
}

// Export singleton instance
export const layerLibraryService = new LayerLibraryService();
