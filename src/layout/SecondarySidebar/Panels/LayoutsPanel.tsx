/**
 * LayoutsPanel - Browse and import layers from layout files
 *
 * Shows:
 * - Current keyboard (always at top)
 * - Imported .viable/.vil layouts
 * - Import button and drag-drop zone
 */

import type { FC } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Filter, Plus, Search, Upload, X } from "lucide-react";

import { LayoutGroupCard } from "@/components/LayoutGroupCard";
import { LayerCard } from "@/components/LayoutCard";
import { LayerPreviewModal } from "@/components/LayerPreviewModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLayoutLibrary } from "@/contexts/LayoutLibraryContext";
import { useLayoutSettings } from "@/contexts/LayoutSettingsContext";
import { layerLibraryService } from "@/services/layer-library.service";
import type { LayoutGroup, ImportedLayer, LayerEntry } from "@/types/layer-library";
import { cn } from "@/lib/utils";

const LayoutsPanel: FC = () => {
    const { layoutMode } = useLayoutSettings();
    const isHorizontal = layoutMode === "bottombar";
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const {
        copyLayer,
        openPasteDialog,
        layers: publishedLayers,
        isLoading: isPublishedLoading,
        deleteLayer,
        previewLayer,
        isPreviewOpen,
        openPreview,
        closePreview,
    } = useLayoutLibrary();

    const [searchQuery, setSearchQuery] = useState("");
    const [importedLayouts, setImportedLayouts] = useState<LayoutGroup[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    // Load imported layouts on mount
    useEffect(() => {
        setImportedLayouts(layerLibraryService.getImportedLayouts());
    }, []);

    // Handle file import
    const handleFileImport = useCallback(async (file: File) => {
        if (!file.name.match(/\.(viable|vil|json)$/i)) {
            setImportError("Please select a .viable, .vil, or .json file");
            return;
        }

        setIsImporting(true);
        setImportError(null);

        try {
            const layout = await layerLibraryService.importLayoutFromFile(file);
            setImportedLayouts(prev => [layout, ...prev]);
        } catch (e) {
            console.error("Failed to import layout:", e);
            setImportError(e instanceof Error ? e.message : "Failed to import layout");
        } finally {
            setIsImporting(false);
        }
    }, []);

    // Handle file input change
    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileImport(file);
        }
        // Reset input
        if (e.target) {
            e.target.value = '';
        }
    };

    // Handle drag events
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Only set dragging to false if we're leaving the drop zone
        if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileImport(file);
        }
    };

    // Handle delete layout
    const handleDeleteLayout = (group: LayoutGroup) => {
        if (layerLibraryService.deleteImportedLayout(group.id)) {
            setImportedLayouts(prev => prev.filter(l => l.id !== group.id));
        }
    };

    // Handle place layer (copy to clipboard and open paste dialog)
    const handlePlaceLayer = (layer: ImportedLayer, sourceLayout: string) => {
        const layerEntry = layerLibraryService.importedLayerToLayerEntry(layer, sourceLayout);
        copyLayer(layerEntry);
        // Open paste dialog immediately after copying
        setTimeout(() => openPasteDialog(), 0);
    };

    // Handle copy published layer
    const handleCopyPublished = async (layer: LayerEntry) => {
        await navigator.clipboard.writeText(JSON.stringify(layer.keymap));
        copyLayer(layer);
        setTimeout(() => openPasteDialog(), 0);
    };

    // Filter layouts based on search query
    const hasMatchingLayers = (group: LayoutGroup | null) => {
        if (!group) return false;
        if (!searchQuery) return true;
        return group.layers.some(l =>
            l.name.toLowerCase().includes(searchQuery.toLowerCase())
        ) || group.name.toLowerCase().includes(searchQuery.toLowerCase());
    };

    // Filter published layers
    const filteredPublishedLayers = publishedLayers.filter(l =>
        !searchQuery || l.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ==========================================
    // HORIZONTAL LAYOUT (Bottom Bar Mode)
    // ==========================================
    if (isHorizontal) {
        const hasActiveFilters = searchQuery.length > 0;

        return (
            <section
                ref={dropZoneRef}
                className="h-full flex flex-row gap-0 overflow-hidden relative"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {/* Drag overlay */}
                {isDragging && (
                    <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-10">
                        <div className="text-center">
                            <Upload className="w-8 h-8 text-blue-500 mx-auto mb-1" />
                            <p className="text-blue-700 text-sm font-medium">Drop to import</p>
                        </div>
                    </div>
                )}

                {/* Collapsible Controls Panel */}
                <div
                    className={cn(
                        "flex flex-col gap-1.5 flex-shrink-0 border-r border-gray-200 transition-all duration-200 overflow-hidden",
                        filtersExpanded ? "w-[140px] px-2 py-1.5" : "w-8 px-1 py-1.5"
                    )}
                >
                    {/* Toggle Button */}
                    <button
                        onClick={() => setFiltersExpanded(!filtersExpanded)}
                        className={cn(
                            "flex items-center justify-center gap-1 p-1 rounded hover:bg-gray-100 transition-colors",
                            hasActiveFilters && !filtersExpanded && "text-blue-600"
                        )}
                        title={filtersExpanded ? "Collapse" : "Expand controls"}
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

                    {/* Expanded Controls */}
                    {filtersExpanded && (
                        <>
                            {/* Import Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px]"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isImporting}
                            >
                                <Plus className="w-3 h-3 mr-1" />
                                Import
                            </Button>

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

                            {/* Error */}
                            {importError && (
                                <div className="bg-red-50 text-red-600 p-1 rounded text-[9px] flex items-center gap-1">
                                    <span className="truncate flex-1">{importError}</span>
                                    <button onClick={() => setImportError(null)}>
                                        <X className="w-2.5 h-2.5" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".viable,.vil,.json"
                    className="hidden"
                    onChange={handleFileInputChange}
                />

                {/* Layout Groups - Horizontal scroll */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden px-2 py-1">
                    <div className="flex flex-row gap-2 h-full">
                        {/* Imported Layouts */}
                        {importedLayouts
                            .filter(hasMatchingLayers)
                            .map(layout => (
                                <LayoutGroupCard
                                    key={layout.id}
                                    group={layout}
                                    defaultExpanded={false}
                                    onDelete={handleDeleteLayout}
                                    onPlaceLayer={handlePlaceLayer}
                                    searchQuery={searchQuery}
                                    compact
                                />
                            ))
                        }

                        {/* Published Layers */}
                        {filteredPublishedLayers.map(layer => (
                            <LayerCard
                                key={layer.id}
                                layer={layer}
                                onCopy={handleCopyPublished}
                                onClick={openPreview}
                                onDelete={() => { deleteLayer(layer.id); }}
                                compact
                            />
                        ))}

                        {/* Empty State */}
                        {importedLayouts.length === 0 && publishedLayers.length === 0 && (
                            <div className="flex items-center justify-center text-gray-400 text-xs h-full px-4">
                                <span>Import a .viable file or publish layers to get started</span>
                            </div>
                        )}

                        {/* Loading */}
                        {(isImporting || isPublishedLoading) && (
                            <div className="flex items-center gap-2 text-gray-500 text-xs px-2">
                                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                                {isImporting ? "Importing..." : "Loading..."}
                            </div>
                        )}
                    </div>
                </div>

                {/* Layer Preview Modal */}
                <LayerPreviewModal
                    layer={previewLayer}
                    isOpen={isPreviewOpen}
                    onClose={closePreview}
                    onCopy={handleCopyPublished}
                />
            </section>
        );
    }

    // ==========================================
    // VERTICAL LAYOUT (Sidebar Mode)
    // ==========================================
    return (
        <section
            ref={dropZoneRef}
            className="space-y-3 h-full max-h-full flex flex-col pt-3"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Header with Import Button */}
            <div className="px-3 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                    Import layers from layout files
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                >
                    <Plus className="w-4 h-4 mr-1" />
                    Import
                </Button>
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".viable,.vil,.json"
                className="hidden"
                onChange={handleFileInputChange}
            />

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

            {/* Error Message */}
            {importError && (
                <div className="px-3">
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm flex items-center justify-between">
                        <span>{importError}</span>
                        <button onClick={() => setImportError(null)} className="ml-2">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Drag overlay */}
            {isDragging && (
                <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-10">
                    <div className="text-center">
                        <Upload className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                        <p className="text-blue-700 dark:text-blue-300 font-medium">
                            Drop .viable file to import
                        </p>
                    </div>
                </div>
            )}

            {/* Layout List */}
            <div className="flex-1 overflow-auto px-3 pb-3 space-y-3 scrollbar-thin">
                {/* Imported Layouts */}
                {importedLayouts
                    .filter(hasMatchingLayers)
                    .map(layout => (
                        <LayoutGroupCard
                            key={layout.id}
                            group={layout}
                            defaultExpanded={false}
                            onDelete={handleDeleteLayout}
                            onPlaceLayer={handlePlaceLayer}
                            searchQuery={searchQuery}
                        />
                    ))
                }

                {/* Published Layers */}
                {filteredPublishedLayers.length > 0 && (
                    <>
                        {importedLayouts.length > 0 && (
                            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider pt-2">
                                Published Layers
                            </div>
                        )}
                        {filteredPublishedLayers.map(layer => (
                            <LayerCard
                                key={layer.id}
                                layer={layer}
                                onCopy={handleCopyPublished}
                                onClick={openPreview}
                                onDelete={() => { deleteLayer(layer.id); }}
                            />
                        ))}
                    </>
                )}

                {/* Empty State */}
                {importedLayouts.length === 0 && publishedLayers.length === 0 && (
                    <div className="text-center text-gray-500 mt-10">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="mb-2">No layouts loaded</p>
                        <p className="text-sm">
                            Import a .viable file or publish layers to get started
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Import Layout
                        </Button>
                    </div>
                )}

                {/* No search results */}
                {searchQuery && importedLayouts.filter(hasMatchingLayers).length === 0 && filteredPublishedLayers.length === 0 && (
                    <div className="text-center text-gray-500 mt-10">
                        <p className="mb-2">No layers match "{searchQuery}"</p>
                        <button
                            className="text-sm text-blue-600 hover:underline"
                            onClick={() => setSearchQuery('')}
                        >
                            Clear search
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {(isImporting || isPublishedLoading) && (
                    <div className="text-center text-gray-500 py-4">
                        <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-sm">{isImporting ? "Importing layout..." : "Loading..."}</p>
                    </div>
                )}
            </div>

            {/* Tip text */}
            <div className="px-3 pb-2 text-xs text-gray-400 text-center">
                Click Place to apply a layer to the currently selected layer
            </div>

            {/* Layer Preview Modal */}
            <LayerPreviewModal
                layer={previewLayer}
                isOpen={isPreviewOpen}
                onClose={closePreview}
                onCopy={handleCopyPublished}
            />
        </section>
    );
};

export default LayoutsPanel;
