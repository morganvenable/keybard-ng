/**
 * LayoutPreviewModal - Full preview and import options for a library layout
 */

import type { FC } from "react";
import { useState, useMemo } from "react";
import { Clock, Copy, Download, User } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLayoutLibrary } from "@/contexts/LayoutLibraryContext";
import { layoutLibraryService } from "@/services/layout-library.service";
import { cn } from "@/lib/utils";

export const LayoutPreviewModal: FC = () => {
    const {
        selectedLayout,
        isLoadingLayout,
        isPreviewOpen,
        closePreview,
    } = useLayoutLibrary();

    // Import options state
    const [importMode, setImportMode] = useState<'full' | 'layers'>('full');
    const [selectedLayers, setSelectedLayers] = useState<Set<number>>(new Set());
    const [includeMacros, setIncludeMacros] = useState(true);
    const [includeCombos, setIncludeCombos] = useState(true);
    const [includeTapdances, setIncludeTapdances] = useState(true);

    // Preview layer state
    const [previewLayer, setPreviewLayer] = useState(0);

    // Get non-empty layers from the layout
    const nonEmptyLayers = useMemo(() => {
        if (!selectedLayout?.viable.keymap) return [];
        return layoutLibraryService.getNonEmptyLayers(selectedLayout.viable.keymap);
    }, [selectedLayout]);

    // Layer names from cosmetic info
    const getLayerName = (index: number): string => {
        const cosmetic = selectedLayout?.viable.cosmetic?.layer;
        if (cosmetic && cosmetic[index]) {
            return cosmetic[index];
        }
        return `Layer ${index}`;
    };

    // Toggle layer selection
    const toggleLayerSelection = (layer: number) => {
        const newSelected = new Set(selectedLayers);
        if (newSelected.has(layer)) {
            newSelected.delete(layer);
        } else {
            newSelected.add(layer);
        }
        setSelectedLayers(newSelected);
    };

    // Select all layers
    const selectAllLayers = () => {
        setSelectedLayers(new Set(nonEmptyLayers));
    };

    // Clear layer selection
    const clearLayerSelection = () => {
        setSelectedLayers(new Set());
    };

    // Handle apply
    const handleApply = () => {
        // TODO: Implement apply logic using layer-import service
        console.log('Apply layout:', {
            layout: selectedLayout,
            importMode,
            selectedLayers: Array.from(selectedLayers),
            includeMacros,
            includeCombos,
            includeTapdances,
        });
        closePreview();
    };

    if (!selectedLayout) return null;

    const { metadata, viable } = selectedLayout;

    return (
        <Dialog open={isPreviewOpen} onOpenChange={(open) => !open && closePreview()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {metadata.category === 'blessed' && (
                            <span className="text-yellow-500">*</span>
                        )}
                        {metadata.name}
                    </DialogTitle>
                    <DialogDescription>
                        {metadata.description}
                    </DialogDescription>
                </DialogHeader>

                {isLoadingLayout ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto space-y-4">
                        {/* Keyboard Preview Placeholder */}
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
                            <div className="text-center text-gray-500">
                                <p className="text-lg font-medium mb-2">Keyboard Preview</p>
                                <p className="text-sm">
                                    {viable.keymap?.length || 0} layers,{' '}
                                    {viable.keymap?.[0]?.length || 0} keys per layer
                                </p>
                                <p className="text-xs mt-2">
                                    (Full interactive preview coming soon)
                                </p>
                            </div>
                        </div>

                        {/* Layer Tabs */}
                        {nonEmptyLayers.length > 1 && (
                            <div className="flex flex-wrap gap-2">
                                {nonEmptyLayers.map(layer => (
                                    <button
                                        key={layer}
                                        onClick={() => setPreviewLayer(layer)}
                                        className={cn(
                                            "px-3 py-1.5 text-sm rounded-md transition-colors",
                                            previewLayer === layer
                                                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                                        )}
                                    >
                                        {getLayerName(layer)}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Meta Info */}
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {metadata.author}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                Updated {new Date(metadata.updatedAt).toLocaleDateString()}
                            </span>
                            {metadata.cloneCount !== undefined && metadata.cloneCount > 0 && (
                                <span className="flex items-center gap-1">
                                    <Copy className="w-4 h-4" />
                                    {metadata.cloneCount} clones
                                </span>
                            )}
                        </div>

                        {/* Tags */}
                        {metadata.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {metadata.tags.map(tag => (
                                    <span
                                        key={tag}
                                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Import Options */}
                        <div className="border rounded-lg p-4 space-y-4">
                            <h4 className="font-medium">Apply Options</h4>

                            {/* Import Mode */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        id="import-full"
                                        name="importMode"
                                        checked={importMode === 'full'}
                                        onChange={() => setImportMode('full')}
                                        className="w-4 h-4"
                                    />
                                    <Label htmlFor="import-full">Replace entire layout</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        id="import-layers"
                                        name="importMode"
                                        checked={importMode === 'layers'}
                                        onChange={() => setImportMode('layers')}
                                        className="w-4 h-4"
                                    />
                                    <Label htmlFor="import-layers">Import specific layers</Label>
                                </div>
                            </div>

                            {/* Layer Selection (when import-layers mode) */}
                            {importMode === 'layers' && (
                                <div className="pl-6 space-y-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-gray-500">Select layers to import:</span>
                                        <div className="space-x-2">
                                            <button
                                                onClick={selectAllLayers}
                                                className="text-xs text-blue-600 hover:underline"
                                            >
                                                Select all
                                            </button>
                                            <button
                                                onClick={clearLayerSelection}
                                                className="text-xs text-gray-500 hover:underline"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {nonEmptyLayers.map(layer => (
                                            <div key={layer} className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id={`layer-${layer}`}
                                                    checked={selectedLayers.has(layer)}
                                                    onChange={() => toggleLayerSelection(layer)}
                                                    className="w-4 h-4"
                                                />
                                                <Label htmlFor={`layer-${layer}`} className="text-sm">
                                                    {getLayerName(layer)}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Feature Toggles */}
                            <div className="border-t pt-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="include-macros">Include macros</Label>
                                    <Switch
                                        id="include-macros"
                                        checked={includeMacros}
                                        onCheckedChange={setIncludeMacros}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="include-combos">Include combos</Label>
                                    <Switch
                                        id="include-combos"
                                        checked={includeCombos}
                                        onCheckedChange={setIncludeCombos}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="include-tapdances">Include tap dances</Label>
                                    <Switch
                                        id="include-tapdances"
                                        checked={includeTapdances}
                                        onCheckedChange={setIncludeTapdances}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={closePreview}>
                        Cancel
                    </Button>
                    <Button
                        variant="default"
                        onClick={handleApply}
                        disabled={isLoadingLayout || (importMode === 'layers' && selectedLayers.size === 0)}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        {importMode === 'full' ? 'Apply Layout' : `Import ${selectedLayers.size} Layer(s)`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default LayoutPreviewModal;
