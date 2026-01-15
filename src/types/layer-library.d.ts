// Type definitions for the Layer Library feature
// Stores and browses individual keyboard layers

/**
 * A single layer entry in the library
 */
export interface LayerEntry {
    /** Unique 6-character identifier */
    id: string;

    /** Display name (e.g., "Gaming WASD", "Vim Navigation") */
    name: string;

    /** Description of the layer's purpose */
    description: string;

    /** Author's display name */
    author: string;

    /** Tags for search/filtering (e.g., ["gaming", "vim"]) */
    tags: string[];

    /** Keyboard type identifier (e.g., "svalboard") */
    keyboardType: string;

    /** Number of keys in the keymap */
    keyCount: number;

    /** Flat array of keycodes for this layer */
    keymap: number[];

    /** Optional layer color name */
    layerColor?: string;

    /** ISO date string of creation */
    createdAt: string;

    /** ISO date string of last update */
    updatedAt: string;

    /** Optional source info (where this layer came from) */
    sourceLayout?: string;
}

/**
 * Database file structure
 */
export interface LayerDatabase {
    /** Database version */
    version: number;

    /** Array of layer entries */
    layers: LayerEntry[];
}

/**
 * Clipboard state for layer copy/paste
 */
export interface LayerClipboard {
    /** The copied layer */
    layer: LayerEntry;

    /** Timestamp when copied */
    copiedAt: number;
}

/**
 * Search/filter options for browsing layers
 */
export interface LayerSearchOptions {
    /** Text search in name/description/author */
    query?: string;

    /** Filter by tags (match any) */
    tags?: string[];

    /** Filter by keyboard type */
    keyboardType?: string;

    /** Sort order */
    sortBy?: 'recent' | 'name' | 'author';
}

/**
 * Search results
 */
export interface LayerSearchResults {
    /** Matching layers */
    layers: LayerEntry[];

    /** Total count */
    total: number;
}

/**
 * Data for publishing a new layer
 */
export interface PublishLayerData {
    /** Layer name */
    name: string;

    /** Description */
    description: string;

    /** Author display name */
    author: string;

    /** Tags */
    tags: string[];
}
