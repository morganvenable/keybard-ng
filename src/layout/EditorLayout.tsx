import * as React from "react";

import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { PanelsProvider, usePanels } from "@/contexts/PanelsContext";
import SecondarySidebar, { DETAIL_SIDEBAR_WIDTH } from "./SecondarySidebar/SecondarySidebar";

import { Keyboard } from "@/components/Keyboard";
import { useVial } from "@/contexts/VialContext";
import { cn } from "@/lib/utils";
import LayerSelector from "./LayerSelector";
import AppSidebar from "./Sidebar";

import { LayerProvider, useLayer } from "@/contexts/LayerContext";
import { useLayoutLibrary } from "@/contexts/LayoutLibraryContext";
import { PasteLayerDialog } from "@/components/PasteLayerDialog";

import { LayoutSettingsProvider, useLayoutSettings } from "@/contexts/LayoutSettingsContext";

import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useChanges } from "@/hooks/useChanges";
import { Zap } from "lucide-react";
import { MatrixTester } from "@/components/MatrixTester";
import { MATRIX_COLS } from "@/constants/svalboard-layout";

const EditorLayout = () => {
    return (
        <SidebarProvider defaultOpen={false}>
            <PanelsProvider>
                <LayoutSettingsProvider>
                    <LayerProvider>
                        <EditorLayoutInner />
                    </LayerProvider>
                </LayoutSettingsProvider>
            </PanelsProvider>
        </SidebarProvider>
    );
};

const EditorLayoutInner = () => {
    const { keyboard, isConnected, setKeyboard } = useVial();
    const { selectedLayer, setSelectedLayer } = useLayer();
    const { clearSelection } = useKeyBinding();
    const { keyVariant, setKeyVariant } = useLayoutSettings();
    const { layerClipboard, openPasteDialog } = useLayoutLibrary();

    const { getSetting, updateSetting } = useSettings();
    const { getPendingCount, commit, setInstant, clearAll, getPendingChanges } = useChanges();

    // Ctrl+V handler for pasting layers
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Ctrl+V (or Cmd+V on Mac)
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                // Only handle if we have a layer in clipboard
                if (layerClipboard) {
                    e.preventDefault();
                    openPasteDialog();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [layerClipboard, openPasteDialog]);

    // Handler for when paste is confirmed
    const handlePasteConfirm = React.useCallback(() => {
        if (!keyboard || !layerClipboard || !keyboard.keymap) return;

        // Create a copy of the keyboard with the new layer
        const updatedKeyboard = { ...keyboard };
        const updatedKeymap = [...keyboard.keymap];

        // Replace the selected layer's keymap with the copied layer
        // Handle potential size mismatch by taking the minimum
        const targetLayerKeymap = [...(updatedKeymap[selectedLayer] || [])];
        const sourceKeymap = layerClipboard.layer.keymap;

        for (let i = 0; i < targetLayerKeymap.length && i < sourceKeymap.length; i++) {
            targetLayerKeymap[i] = sourceKeymap[i];
        }

        updatedKeymap[selectedLayer] = targetLayerKeymap;
        updatedKeyboard.keymap = updatedKeymap;

        setKeyboard(updatedKeyboard);
    }, [keyboard, layerClipboard, selectedLayer, setKeyboard]);

    // Get current layer name for the paste dialog
    const currentLayerName = React.useMemo(() => {
        if (!keyboard?.cosmetic?.layer) return `Layer ${selectedLayer}`;
        return keyboard.cosmetic.layer[String(selectedLayer)] || `Layer ${selectedLayer}`;
    }, [keyboard, selectedLayer]);

    const liveUpdating = getSetting("live-updating");

    React.useEffect(() => {
        setInstant(!!liveUpdating);
    }, [liveUpdating, setInstant]);

    const hasChanges = getPendingCount() > 0;

    // Revert function that restores original values from pending changes
    const revert = React.useCallback(() => {
        if (!keyboard || getPendingCount() === 0) {
            clearAll();
            return;
        }

        const pendingChanges = getPendingChanges();
        const restoredKeyboard = JSON.parse(JSON.stringify(keyboard));

        for (const change of pendingChanges) {
            if (change.type === 'key' &&
                change.layer !== undefined &&
                change.row !== undefined &&
                change.col !== undefined &&
                change.previousValue !== undefined) {
                const matrixPos = change.row * MATRIX_COLS + change.col;
                if (restoredKeyboard.keymap?.[change.layer]) {
                    restoredKeyboard.keymap[change.layer][matrixPos] = change.previousValue;
                }
            }
            // Note: combo/tapdance/override revert would need additional logic
            // For now, those changes will just be discarded from the queue
        }

        setKeyboard(restoredKeyboard);
        clearAll();
    }, [keyboard, setKeyboard, getPendingCount, getPendingChanges, clearAll]);

    const primarySidebar = useSidebar("primary-nav", { defaultOpen: false });
    const { isMobile, state, activePanel } = usePanels();

    const primaryOffset = primarySidebar.isMobile ? undefined : primarySidebar.state === "collapsed" ? "var(--sidebar-width-icon)" : "var(--sidebar-width-base)";
    const showDetailsSidebar = !isMobile && state === "expanded";
    const contentOffset = showDetailsSidebar ? `calc(${primaryOffset ?? "0px"} + ${DETAIL_SIDEBAR_WIDTH})` : primaryOffset ?? undefined;
    const contentStyle = React.useMemo<React.CSSProperties>(
        () => ({
            marginLeft: contentOffset,
            transition: "margin-left 320ms cubic-bezier(0.22, 1, 0.36, 1)",
            willChange: "margin-left",
        }),
        [contentOffset]
    );

    return (
        <div className={cn("flex h-screen max-w-screen p-0", showDetailsSidebar && "bg-white")}>
            <AppSidebar />
            <SecondarySidebar />
            <div
                className="relative flex-1 px-4 h-screen max-h-screen flex flex-col max-w-full w-full overflow-hidden bg-kb-gray border-none"
                style={contentStyle}
                onClick={() => clearSelection()}
            >
                <LayerSelector selectedLayer={selectedLayer} setSelectedLayer={setSelectedLayer} />
                <div className="flex-1 overflow-auto flex items-center overflow-x-auto max-w-full">
                    <div className={cn(showDetailsSidebar && "pr-[450px]")}>
                        {activePanel === "matrixtester" ? (
                            <MatrixTester />
                        ) : (
                            <Keyboard keyboard={keyboard!} selectedLayer={selectedLayer} setSelectedLayer={setSelectedLayer} />
                        )}
                    </div>
                </div>


                <div className="absolute bottom-9 left-[37px] flex items-center gap-6">
                    {liveUpdating ? (
                        // Live mode - clickable indicator to switch to Push mode
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                updateSetting("live-updating", false);
                            }}
                            className={cn(
                                "flex items-center gap-2 text-sm font-medium cursor-pointer transition-opacity hover:opacity-70 animate-in fade-in zoom-in duration-300",
                                !isConnected && "opacity-30 cursor-not-allowed"
                            )}
                            disabled={!isConnected}
                            title="Click to switch to Push mode"
                        >
                            <Zap className="h-4 w-4 fill-black text-black" />
                            <span>Live Updating</span>
                        </button>
                    ) : (
                        // Push mode - buttons row
                        <div className="flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                            <button
                                className={cn(
                                    "h-9 rounded-full px-4 text-sm font-medium transition-all shadow-sm flex items-center gap-2 whitespace-nowrap",
                                    hasChanges && isConnected
                                        ? "bg-black text-white hover:bg-black/90 cursor-pointer"
                                        : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                                )}
                                disabled={!hasChanges || !isConnected}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    commit();
                                }}
                            >
                                Push Changes{hasChanges && ` (${getPendingCount()})`}
                            </button>

                            {hasChanges && (
                                <button
                                    className="h-9 rounded-full px-4 text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-all"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        revert();
                                    }}
                                    title="Restore original values and discard pending changes"
                                >
                                    Revert
                                </button>
                            )}

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    updateSetting("live-updating", true);
                                }}
                                className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                                title="Click to switch to Live mode"
                            >
                                <Zap className="h-4 w-4 text-gray-400" />
                            </button>
                        </div>
                    )}

                    <div className="flex flex-row items-center gap-0.5 bg-gray-200/50 p-0.5 rounded-md border border-gray-300/50 w-fit">
                        {(['default', 'medium', 'small'] as const).map((variant) => (
                            <button
                                key={variant}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setKeyVariant(variant);
                                }}
                                className={cn(
                                    "px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-[4px] transition-all font-semibold border",
                                    keyVariant === variant
                                        ? "bg-black text-white shadow-sm border-black"
                                        : "text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-300/50"
                                )}
                                title={`Set key size to ${variant}`}
                            >
                                {variant === 'default' ? 'Normal' : variant}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Paste Layer Dialog */}
            <PasteLayerDialog
                currentLayerName={currentLayerName}
                onConfirm={handlePasteConfirm}
            />
        </div>
    );
};

export default EditorLayout;
