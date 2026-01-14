// Type definitions for the Layout Library (Explore Layouts feature)
// Enables browsing, importing, and publishing keyboard layouts

import type { ComboEntry, MacroEntry, TapdanceEntry, KeyOverrideEntry } from './vial.types';

// ============================================================================
// Layout Metadata
// ============================================================================

/**
 * Category classification for layouts
 */
export type LayoutCategory = 'blessed' | 'community' | 'private';

/**
 * Metadata for a shared layout in the library
 */
export interface LayoutMetadata {
    /** Unique 6-character hash identifier (e.g., "Xg4Z9k") */
    id: string;

    /** Version number, increments on update */
    version: number;

    // Identity
    /** Display name of the layout */
    name: string;

    /** Description of the layout's purpose and features */
    description: string;

    /** Author's display name (e.g., "@username") */
    author: string;

    /** Author ID for future authentication */
    authorId?: string;

    // Classification
    /** Category: blessed (official), community (public), private */
    category: LayoutCategory;

    /** Tags for search/filtering (e.g., ["gaming", "vim", "colemak"]) */
    tags: string[];

    /** Keyboard type identifier (e.g., "svalboard", "svalboard-trackball") */
    keyboardType: string;

    // Timestamps
    /** ISO date string of creation */
    createdAt: string;

    /** ISO date string of last update */
    updatedAt: string;

    // Stats (future)
    /** Number of times this layout has been cloned */
    cloneCount?: number;

    /** Number of times this layout has been viewed */
    viewCount?: number;

    // Content references
    /** URL to the .viable file */
    layoutUrl: string;

    /** URL to preview image (thumbnail) */
    previewUrl?: string;

    /** Per-layer preview images */
    layerPreviews?: LayerPreview[];
}

/**
 * Preview information for a single layer
 */
export interface LayerPreview {
    /** Layer index */
    layer: number;

    /** Layer name (cosmetic or default) */
    name: string;

    /** URL to layer preview image */
    previewUrl: string;
}

// ============================================================================
// Layout Content
// ============================================================================

/**
 * Full layout content including metadata and viable file
 */
export interface LayoutContent {
    /** Layout metadata */
    metadata: LayoutMetadata;

    /** Full .viable JSON content as parsed object */
    viable: ViableFileContent;
}

/**
 * Structure of a .viable file (matches file.service.ts export format)
 */
export interface ViableFileContent {
    version: number;
    name?: string;
    author?: string;
    notes?: string;
    keymap: number[][];
    macros?: MacroEntry[];
    tapdances?: TapdanceEntry[];
    combos?: ComboEntry[];
    key_overrides?: KeyOverrideEntry[];

    // Cosmetic layer info
    cosmetic?: {
        name?: string;
        layer?: Record<string, string>;
        layer_colors?: Record<string, string>;
        macros?: Record<string, string>;
    };

    // Fragment selections (for modular keyboards)
    fragments?: Record<string, string>;
}

// ============================================================================
// Layer Import/Export
// ============================================================================

/**
 * Exported single layer from a layout
 * Used for individual layer sharing
 */
export interface LayerExport {
    /** Source layout ID */
    sourceLayoutId: string;

    /** Source layout name */
    sourceLayoutName: string;

    /** Layer index in source layout */
    layerIndex: number;

    /** Layer name (cosmetic or default) */
    layerName: string;

    /** Flat array of keycodes for this single layer */
    keymap: number[];

    /** Associated macros (if any keys reference them) */
    macros?: MacroEntry[];

    /** Associated tap dances */
    tapdances?: TapdanceEntry[];

    /** Associated combos */
    combos?: ComboEntry[];
}

/**
 * Options for importing a layer into existing keymap
 */
export interface LayerImportOptions {
    /** Target layer index in destination keymap */
    targetLayer: number;

    /** Whether to include associated macros */
    includeMacros?: boolean;

    /** Whether to include associated combos */
    includeCombos?: boolean;

    /** Whether to include associated tap dances */
    includeTapdances?: boolean;
}

/**
 * Options for applying a full layout
 */
export interface LayoutApplyOptions {
    /** Replace entire layout (true) or merge specific layers (false) */
    replaceAll: boolean;

    /** If not replaceAll, which layers to import (by index) */
    selectedLayers?: number[];

    /** Whether to include macros */
    includeMacros?: boolean;

    /** Whether to include combos */
    includeCombos?: boolean;

    /** Whether to include tap dances */
    includeTapdances?: boolean;
}

// ============================================================================
// Library Index
// ============================================================================

/**
 * Index file structure for blessed/community layouts
 * Stored as index.json in each category folder
 */
export interface LayoutLibraryIndex {
    /** Version of the index format */
    version: number;

    /** When the index was last updated */
    updatedAt: string;

    /** List of layout metadata entries */
    layouts: LayoutMetadata[];
}

// ============================================================================
// Search and Filter
// ============================================================================

/**
 * Search/filter options for browsing layouts
 */
export interface LayoutSearchOptions {
    /** Text search in name/description */
    query?: string;

    /** Filter by tags (match any) */
    tags?: string[];

    /** Filter by keyboard type */
    keyboardType?: string;

    /** Filter by category */
    category?: LayoutCategory;

    /** Sort order */
    sortBy?: 'recent' | 'popular' | 'name';

    /** Pagination offset */
    offset?: number;

    /** Pagination limit */
    limit?: number;
}

/**
 * Search results with pagination info
 */
export interface LayoutSearchResults {
    /** Matching layouts */
    layouts: LayoutMetadata[];

    /** Total count (for pagination) */
    total: number;

    /** Whether more results exist */
    hasMore: boolean;
}

// ============================================================================
// Publishing
// ============================================================================

/**
 * Data for publishing a new layout
 */
export interface PublishLayoutData {
    /** Layout name */
    name: string;

    /** Description */
    description: string;

    /** Author display name */
    author: string;

    /** Tags */
    tags: string[];

    /** Keyboard type */
    keyboardType: string;

    /** Visibility: public (community) or unlisted */
    visibility: 'public' | 'unlisted';

    /** What to include */
    includeMacros: boolean;
    includeCombos: boolean;
    includeTapdances: boolean;
    includeOverrides: boolean;
}

/**
 * Result of publish operation
 */
export interface PublishResult {
    /** Whether publish was successful */
    success: boolean;

    /** Error message if failed */
    error?: string;

    /** Generated layout ID */
    layoutId?: string;

    /** URL to the published layout */
    layoutUrl?: string;

    /** URL to the GitHub PR (for review) */
    prUrl?: string;
}
