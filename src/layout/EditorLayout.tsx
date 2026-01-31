import * as React from "react";

import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { PanelsProvider, usePanels } from "@/contexts/PanelsContext";
import { DragProvider, useDrag } from "@/contexts/DragContext";
import { DragOverlay } from "@/components/DragOverlay";
import SecondarySidebar, { DETAIL_SIDEBAR_WIDTH } from "./SecondarySidebar/SecondarySidebar";
import { BottomPanel, BOTTOM_PANEL_HEIGHT } from "./BottomPanel";
import BindingEditorContainer from "./SecondarySidebar/components/BindingEditor/BindingEditorContainer";

import { Keyboard } from "@/components/Keyboard";
import { useVial } from "@/contexts/VialContext";
import { InfoIcon } from "@/components/icons/InfoIcon";
import { cn } from "@/lib/utils";
import LayerSelector from "./LayerSelector";
import AppSidebar from "./Sidebar";

import { LayerProvider, useLayer } from "@/contexts/LayerContext";
import { useLayoutLibrary } from "@/contexts/LayoutLibraryContext";
import { PasteLayerDialog } from "@/components/PasteLayerDialog";

import { LayoutSettingsProvider, useLayoutSettings } from "@/contexts/LayoutSettingsContext";
import { UNIT_SIZE, SVALBOARD_LAYOUT } from "@/constants/svalboard-layout";
import { THUMB_OFFSET_U, MAX_FINGER_CLUSTER_SQUEEZE_U } from "@/constants/keyboard-visuals";

import { useKeyBinding } from "@/contexts/KeyBindingContext";

import { useChanges } from "@/hooks/useChanges";
import { PanelBottom, PanelRight, X } from "lucide-react";
import { MatrixTester } from "@/components/MatrixTester";
import { MATRIX_COLS } from "@/constants/svalboard-layout";
import EditorSidePanel, { PickerMode } from "./SecondarySidebar/components/EditorSidePanel";

const EditorLayout = () => {
    const { assignKeycodeTo } = useKeyBinding();

    const handleUnhandledDrop = React.useCallback((item: any) => {
        if (item.row !== undefined && item.col !== undefined && item.layer !== undefined) {
            console.log("Unhandled drop for keyboard key, assigning KC_NO", item);
            assignKeycodeTo({
                type: "keyboard",
                row: item.row,
                col: item.col,
                layer: item.layer
            }, "KC_NO");
        }
    }, [assignKeycodeTo]);

    return (
        <SidebarProvider defaultOpen={false}>
            <PanelsProvider>
                <LayoutSettingsProvider>
                    <LayerProvider>
                        <DragProvider onUnhandledDrop={handleUnhandledDrop}>
                            <EditorLayoutInner />
                            <DragOverlay />
                        </DragProvider>
                    </LayerProvider>
                </LayoutSettingsProvider>
            </PanelsProvider>
        </SidebarProvider>
    );
};

const EditorLayoutInner = () => {
    const { keyboard, setKeyboard, updateKey } = useVial();
    const { selectedLayer, setSelectedLayer } = useLayer();
    const { clearSelection } = useKeyBinding();
    const { keyVariant, setKeyVariant, layoutMode, setLayoutMode, isAutoLayoutMode, setIsAutoLayoutMode, isAutoKeySize, setIsAutoKeySize, setSecondarySidebarOpen, setPrimarySidebarExpanded, registerPrimarySidebarControl, setMeasuredDimensions } = useLayoutSettings();
    const { layerClipboard, copyLayer, openPasteDialog } = useLayoutLibrary();
    const { isDragging, draggedItem, markDropConsumed } = useDrag();

    // Track if we're dragging a layer over the keyboard area
    const [isLayerDragOver, setIsLayerDragOver] = React.useState(false);
    const isDraggingLayer = isDragging && draggedItem?.type === "layer";

    // Ref for measuring container dimensions
    const contentContainerRef = React.useRef<HTMLDivElement>(null);

    // Calculate keyboard layout extents (independent of current keyVariant)
    const keyboardExtents = React.useMemo(() => {
        if (!keyboard) return { maxX: 20, maxY: 10 }; // default estimate

        // Use dynamic keylayout if available, otherwise fallback to hardcoded layout
        const keyboardLayout = (keyboard.keylayout && Object.keys(keyboard.keylayout).length > 0)
            ? keyboard.keylayout as Record<number, { x: number; y: number; w: number; h: number }>
            : SVALBOARD_LAYOUT;
        const useFragmentLayout = keyboard.keylayout && Object.keys(keyboard.keylayout).length > 0;

        // Find max X and Y extents
        let maxX = 0;
        let maxY = 0;
        Object.values(keyboardLayout).forEach((key) => {
            // Only apply THUMB_OFFSET_U for hardcoded layout, not fragment-composed layouts
            const yPos = (!useFragmentLayout && key.y >= 6) ? key.y + THUMB_OFFSET_U : key.y;
            maxX = Math.max(maxX, key.x + key.w);
            maxY = Math.max(maxY, yPos + key.h);
        });

        return { maxX, maxY };
    }, [keyboard]);

    // Current key unit size based on variant
    const currentUnitSize = React.useMemo(() =>
        keyVariant === 'small' ? 30 : keyVariant === 'medium' ? 45 : UNIT_SIZE,
        [keyVariant]);

    // Track container height for dynamic spacing
    const [containerHeight, setContainerHeight] = React.useState(0);


    // Raw keyboard widths without squeeze (used for squeeze calculation)
    const rawKeyboardWidths = React.useMemo(() => ({
        default: keyboardExtents.maxX * UNIT_SIZE + 32, // +32 for padding
        medium: keyboardExtents.maxX * 45 + 32,
        small: keyboardExtents.maxX * 30 + 32,
    }), [keyboardExtents]);

    // Calculate keyboard widths at each size (for auto-sizing)
    // Account for max squeeze capability - both sides can squeeze toward center
    const squeezeReduction = 2 * MAX_FINGER_CLUSTER_SQUEEZE_U;
    const keyboardWidths = React.useMemo(() => ({
        default: rawKeyboardWidths.default, // no squeeze at default
        medium: (keyboardExtents.maxX - squeezeReduction) * 45 + 32, // squeeze enabled
        small: rawKeyboardWidths.small, // no squeeze at small (already compact)
    }), [keyboardExtents, squeezeReduction, rawKeyboardWidths]);

    // Calculate keyboard heights at each size (for auto-sizing)
    const keyboardHeights = React.useMemo(() => ({
        default: keyboardExtents.maxY * UNIT_SIZE + 80, // +80 for layer selector and bottom bar
        medium: keyboardExtents.maxY * 45 + 80,
        small: keyboardExtents.maxY * 30 + 80,
    }), [keyboardExtents]);

    // Measure container dimensions and report to context for auto-sizing
    React.useEffect(() => {
        const container = contentContainerRef.current;
        if (!container) return;

        const measureSpace = () => {
            const containerWidth = container.clientWidth;
            const height = container.clientHeight;

            // Track container height for dynamic spacing
            setContainerHeight(height);

            // Report measured dimensions to context for auto-sizing
            setMeasuredDimensions({
                containerWidth,
                containerHeight: height,
                keyboardWidths,
                keyboardHeights,
                rawKeyboardWidths,
            });
        };

        // Initial measurement
        measureSpace();

        // Set up ResizeObserver for dynamic updates
        const resizeObserver = new ResizeObserver(measureSpace);
        resizeObserver.observe(container);

        return () => resizeObserver.disconnect();
    }, [keyboardWidths, keyboardHeights, rawKeyboardWidths, setMeasuredDimensions]);


    const { queue } = useChanges();

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

        const sourceKeymap = layerClipboard.layer.keymap;
        const sourceLayerColor = layerClipboard.layer.layerColor;
        const sourceLedColor = layerClipboard.layer.ledColor;
        const targetLayerKeymap = keyboard.keymap[selectedLayer] || [];
        const cols = keyboard.cols || MATRIX_COLS;

        // Create ONE copy and batch all changes to avoid React state batching issues
        const updatedKeyboard = JSON.parse(JSON.stringify(keyboard));
        if (!updatedKeyboard.keymap[selectedLayer]) {
            updatedKeyboard.keymap[selectedLayer] = [];
        }

        // Copy cosmetic layer color if the source layer has one
        if (sourceLayerColor) {
            if (!updatedKeyboard.cosmetic) {
                updatedKeyboard.cosmetic = {};
            }
            if (!updatedKeyboard.cosmetic.layer_colors) {
                updatedKeyboard.cosmetic.layer_colors = {};
            }
            updatedKeyboard.cosmetic.layer_colors[selectedLayer] = sourceLayerColor;
        }

        // Copy LED hardware color if the source layer has one
        if (sourceLedColor) {
            if (!updatedKeyboard.layer_colors) {
                updatedKeyboard.layer_colors = [];
            }
            // Ensure array is long enough
            while (updatedKeyboard.layer_colors.length <= selectedLayer) {
                updatedKeyboard.layer_colors.push({ hue: 0, sat: 0, val: 0 });
            }
            updatedKeyboard.layer_colors[selectedLayer] = { ...sourceLedColor };
        }

        // Collect all changes and apply to the single copy
        for (let i = 0; i < targetLayerKeymap.length && i < sourceKeymap.length; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const newValue = sourceKeymap[i];
            const currentValue = targetLayerKeymap[i];
            const matrixPos = row * cols + col;

            if (newValue !== currentValue) {
                // Apply to the single copy
                updatedKeyboard.keymap[selectedLayer][matrixPos] = newValue;

                // Queue change for push to device
                const changeDesc = `key_${selectedLayer}_${row}_${col}`;
                queue(
                    changeDesc,
                    async () => {
                        await updateKey(selectedLayer, row, col, newValue);
                    },
                    {
                        type: "key",
                        layer: selectedLayer,
                        row,
                        col,
                        keycode: newValue,
                        previousValue: currentValue,
                    }
                );
            }
        }

        // Update state ONCE with all changes
        setKeyboard(updatedKeyboard);
    }, [keyboard, layerClipboard, selectedLayer, queue, updateKey, setKeyboard]);

    // Handle layer drop on keyboard area
    const handleLayerDrop = React.useCallback(() => {
        if (!isDraggingLayer || !draggedItem?.layerData) return;

        // Copy the layer to clipboard and open paste dialog
        copyLayer(draggedItem.layerData);
        markDropConsumed();

        // Open paste dialog after a brief delay to ensure clipboard is set
        setTimeout(() => openPasteDialog(), 0);
    }, [isDraggingLayer, draggedItem, copyLayer, markDropConsumed, openPasteDialog]);

    // Get current layer name for the paste dialog
    const currentLayerName = React.useMemo(() => {
        if (!keyboard?.cosmetic?.layer) return `Layer ${selectedLayer}`;
        return keyboard.cosmetic.layer[String(selectedLayer)] || `Layer ${selectedLayer}`;
    }, [keyboard, selectedLayer]);



    const primarySidebar = useSidebar("primary-nav", { defaultOpen: false });
    const { isMobile, state, activePanel, itemToEdit, setItemToEdit, handleCloseEditor } = usePanels();

    // Editor overlay state for bottom bar mode
    const [pickerMode, setPickerMode] = React.useState<PickerMode>("keyboard");
    const [isClosingEditor, setIsClosingEditor] = React.useState(false);

    // Check if we should show the editor overlay in bottom bar mode
    const showEditorOverlay = layoutMode === "bottombar" && itemToEdit !== null &&
        ["tapdances", "combos", "macros", "overrides", "altrepeat", "leaders"].includes(activePanel || "");

    // Reset picker mode when editor closes
    React.useEffect(() => {
        if (!showEditorOverlay) {
            const timeout = setTimeout(() => setPickerMode("keyboard"), 500);
            return () => clearTimeout(timeout);
        }
    }, [showEditorOverlay]);

    const [showInfoPanel, setShowInfoPanel] = React.useState(false);

    React.useEffect(() => {
        if (itemToEdit === null) setIsClosingEditor(false);
    }, [itemToEdit]);

    // Layout mode determines whether we use sidebar or bottom panel
    const useSidebarLayout = layoutMode === "sidebar";
    const useBottomLayout = layoutMode === "bottombar";

    const primaryOffset = primarySidebar.isMobile ? undefined : primarySidebar.state === "collapsed" ? "var(--sidebar-width-icon)" : "var(--sidebar-width-base)";

    // In sidebar mode: show detail sidebar on right
    // In bottom bar mode: no detail sidebar, use bottom panel instead
    const showDetailsSidebar = useSidebarLayout && !isMobile && state === "expanded";
    const showBottomPanel = useBottomLayout && state === "expanded";

    // Notify context when a panel is selected (wants to be shown)
    // This is independent of layout mode - used to calculate if sidebar mode CAN work
    React.useEffect(() => {
        // A panel is "open" if user has selected one, regardless of current layout mode
        const panelIsSelected = state === "expanded";
        setSecondarySidebarOpen(panelIsSelected);
    }, [state, setSecondarySidebarOpen]);

    // Track the previous sidebar state to detect user-initiated toggles
    const prevSidebarStateRef = React.useRef<string | undefined>(undefined);
    const autoToggleInProgressRef = React.useRef(false);

    React.useEffect(() => {
        if (primarySidebar?.state) {
            const prevState = prevSidebarStateRef.current;
            const newState = primarySidebar.state;
            const stateChanged = prevState !== newState;
            prevSidebarStateRef.current = newState;

            // Detect if this is a manual toggle (state changed but not by auto-layout)
            const isManualToggle = stateChanged && prevState !== undefined && !autoToggleInProgressRef.current;

            // Always sync the expanded state to context (not just on change)
            // This ensures the ref stays in sync even if initial state differs
            setPrimarySidebarExpanded(newState === "expanded", isManualToggle);
        }
    }, [primarySidebar?.state, setPrimarySidebarExpanded]);

    // Register callbacks for auto-layout to collapse/expand the sidebar
    // Use refs to avoid recreating the callbacks
    const collapseSidebarRef = React.useRef(() => {
        autoToggleInProgressRef.current = true;
        primarySidebar.setOpen(false);
        // Reset flag after state change propagates
        setTimeout(() => { autoToggleInProgressRef.current = false; }, 50);
    });
    const expandSidebarRef = React.useRef(() => {
        autoToggleInProgressRef.current = true;
        primarySidebar.setOpen(true);
        // Reset flag after state change propagates
        setTimeout(() => { autoToggleInProgressRef.current = false; }, 50);
    });
    collapseSidebarRef.current = () => {
        autoToggleInProgressRef.current = true;
        primarySidebar.setOpen(false);
        setTimeout(() => { autoToggleInProgressRef.current = false; }, 50);
    };
    expandSidebarRef.current = () => {
        autoToggleInProgressRef.current = true;
        primarySidebar.setOpen(true);
        setTimeout(() => { autoToggleInProgressRef.current = false; }, 50);
    };

    React.useEffect(() => {
        registerPrimarySidebarControl(
            () => collapseSidebarRef.current(),
            () => expandSidebarRef.current()
        );
    }, [registerPrimarySidebarControl]);

    const contentOffset = showDetailsSidebar ? `calc(${primaryOffset ?? "0px"} + ${DETAIL_SIDEBAR_WIDTH})` : primaryOffset ?? undefined;

    // Calculate dynamic top padding for keyboard
    // Ideal: 1 key height gap between layer selector and keyboard
    // Squeeze: reduce gap when space is tight, continuous adjustment
    const dynamicTopPadding = React.useMemo(() => {
        const idealGap = currentUnitSize; // 1 key height
        const minGap = 8; // Minimum gap in pixels

        // Estimate heights: layer selector ~46px (compact) or ~86px (standard)
        const layerSelectorHeight = showEditorOverlay ? 46 : 86;
        const bottomBarHeight = showBottomPanel ? BOTTOM_PANEL_HEIGHT : 0;

        // Get current keyboard height based on variant
        const kbHeight = keyVariant === 'small'
            ? keyboardHeights.small
            : keyVariant === 'medium'
                ? keyboardHeights.medium
                : keyboardHeights.default;

        // Available space = container - layer selector - keyboard - bottom bar
        const availableSpace = containerHeight - layerSelectorHeight - kbHeight - bottomBarHeight;

        // If plenty of room, use ideal gap (1 key height)
        // If tight, scale down continuously but keep minimum
        if (availableSpace >= idealGap) {
            return idealGap;
        } else if (availableSpace > minGap) {
            return availableSpace;
        } else {
            return minGap;
        }
    }, [currentUnitSize, containerHeight, keyboardHeights, keyVariant, showEditorOverlay, showBottomPanel]);

    // Calculate dynamic bottom panel height to fill remaining vertical space
    const dynamicBottomPanelHeight = React.useMemo(() => {
        if (!showBottomPanel) return BOTTOM_PANEL_HEIGHT;

        const MIN_HEIGHT = 150;
        const MAX_HEIGHT = 400;
        const layerSelectorHeight = 86;
        const topPadding = dynamicTopPadding;

        // Get current keyboard height based on variant
        const kbHeight = keyVariant === 'small'
            ? keyboardHeights.small
            : keyVariant === 'medium'
                ? keyboardHeights.medium
                : keyboardHeights.default;

        // Available = container - layerSelector - topPadding - keyboard
        const available = containerHeight - layerSelectorHeight - topPadding - kbHeight;

        return Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, available));
    }, [showBottomPanel, containerHeight, keyboardHeights, keyVariant, dynamicTopPadding]);

    const contentStyle = React.useMemo<React.CSSProperties>(
        () => ({
            marginLeft: contentOffset,
            transition: "margin-left 320ms cubic-bezier(0.22, 1, 0.36, 1), padding-bottom 300ms ease-in-out",
            willChange: "margin-left, padding-bottom",
            // Add bottom padding when bottom panel is shown
            paddingBottom: showBottomPanel ? dynamicBottomPanelHeight : 0,
        }),
        [contentOffset, showBottomPanel, dynamicBottomPanelHeight]
    );

    return (
        <div className={cn("flex flex-1 h-screen max-w-screen min-w-[850px] p-0", showDetailsSidebar && "bg-white")}>
            <AppSidebar />
            {/* Render SecondarySidebar only in sidebar mode */}
            {useSidebarLayout && <SecondarySidebar />}
            <div
                ref={contentContainerRef}
                className={cn(
                    "relative flex-1 px-4 h-screen max-h-screen flex flex-col max-w-full w-full overflow-hidden bg-kb-gray border-none",
                    isDraggingLayer && "ring-4 ring-inset ring-blue-400 ring-opacity-50 bg-blue-50/10"
                )}
                style={contentStyle}
                onClick={() => clearSelection()}
                onMouseEnter={() => isDraggingLayer && setIsLayerDragOver(true)}
                onMouseLeave={() => setIsLayerDragOver(false)}
                onMouseUp={() => {
                    if (isDraggingLayer && isLayerDragOver) {
                        handleLayerDrop();
                        setIsLayerDragOver(false);
                    }
                }}
            >
                {/* Layer drop indicator - covers entire content area */}
                {isDraggingLayer && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        <div className="bg-blue-500/90 text-white px-6 py-3 rounded-lg shadow-lg text-lg font-medium">
                            Drop to place on Layer {selectedLayer}
                        </div>
                    </div>
                )}

                <LayerSelector
                    selectedLayer={selectedLayer}
                    setSelectedLayer={setSelectedLayer}
                />

                <div
                    className="flex-1 overflow-hidden flex items-start justify-center max-w-full relative transition-[padding] duration-200"
                    style={{ paddingTop: dynamicTopPadding }}
                >

                    {activePanel === "matrixtester" ? (
                        <MatrixTester />
                    ) : (
                        <Keyboard keyboard={keyboard!} selectedLayer={selectedLayer} setSelectedLayer={setSelectedLayer} />
                    )}

                    {/* Editor overlay for bottom bar mode - picker tabs + editor */}
                    {useBottomLayout && (
                        <div
                            className={cn(
                                "absolute inset-x-0 bottom-0 z-30 transition-all duration-300 ease-in-out flex items-end justify-center gap-0 max-h-full",
                                showEditorOverlay ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Picker selector tabs - vertical on the left */}
                            <div className="flex-shrink-0 bg-white border-r border-gray-200 shadow-lg self-stretch">
                                <EditorSidePanel
                                    activeTab={pickerMode}
                                    onTabChange={setPickerMode}
                                    showMacros={activePanel !== "macros"}
                                />
                            </div>

                            {/* Editor Panel - minimum height matches picker, can grow for content */}
                            <div className={cn(
                                "bg-kb-gray-medium flex-shrink-0 shadow-[8px_0_24px_rgba(0,0,0,0.15),-2px_0_8px_rgba(0,0,0,0.1)] min-h-[280px] max-h-full overflow-auto self-stretch",
                                activePanel === "overrides" ? "w-[700px]" : "w-[500px]"
                            )}>
                                {itemToEdit !== null && (
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsClosingEditor(true);
                                                setTimeout(() => {
                                                    handleCloseEditor();
                                                    setItemToEdit(null);
                                                }, 100);
                                            }}
                                            className="absolute top-4 right-4 p-1 rounded hover:bg-black/10 transition-colors z-10"
                                        >
                                            <X className="h-5 w-5 text-gray-500" />
                                        </button>
                                        <BindingEditorContainer shouldClose={isClosingEditor} inline />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Controls - bottom left corner for bottom bar mode (same style as sidebar mode) */}
                    {useBottomLayout && !showEditorOverlay && (
                        <div className="absolute bottom-4 left-4 flex items-center gap-6 z-10">

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
                                            keyVariant === variant && !isAutoKeySize
                                                ? "bg-black text-white shadow-sm border-black"
                                                : keyVariant === variant && isAutoKeySize
                                                    ? "bg-gray-400 text-white border-gray-400"
                                                    : "text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-300/50"
                                        )}
                                        title={`Set key size to ${variant}`}
                                    >
                                        {variant === 'default' ? 'Normal' : variant}
                                    </button>
                                ))}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsAutoKeySize(true);
                                    }}
                                    className={cn(
                                        "px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-[4px] transition-all font-semibold border",
                                        isAutoKeySize
                                            ? "bg-black text-white shadow-sm border-black"
                                            : "text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-300/50"
                                    )}
                                    title="Auto size based on window"
                                >
                                    Auto
                                </button>
                            </div>
                            <div className="flex flex-row items-center gap-0.5 bg-gray-200/50 p-0.5 rounded-md border border-gray-300/50 w-fit">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsAutoLayoutMode(false);
                                        setLayoutMode("sidebar");
                                    }}
                                    className="p-1 rounded-[4px] transition-all text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-300/50 border"
                                    title="Sidebar layout"
                                >
                                    <PanelRight className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsAutoLayoutMode(false);
                                        setLayoutMode("bottombar");
                                    }}
                                    className={cn(
                                        "p-1 rounded-[4px] transition-all border",
                                        !isAutoLayoutMode
                                            ? "bg-black text-white shadow-sm border-black"
                                            : "bg-gray-400 text-white border-gray-400"
                                    )}
                                    title="Bottom bar layout"
                                >
                                    <PanelBottom className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsAutoLayoutMode(true);
                                    }}
                                    className={cn(
                                        "px-1.5 py-0.5 text-[10px] uppercase tracking-wide rounded-[4px] transition-all font-semibold border",
                                        isAutoLayoutMode
                                            ? "bg-black text-white shadow-sm border-black"
                                            : "text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-300/50"
                                    )}
                                    title="Auto-switch layout based on window size"
                                >
                                    Auto
                                </button>
                            </div>
                            {/* Key Information Panel Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowInfoPanel(!showInfoPanel);
                                }}
                                className={cn(
                                    "p-1 rounded-[4px] transition-all border",
                                    showInfoPanel
                                        ? "bg-black text-white shadow-sm border-black"
                                        : "text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-300/50"
                                )}
                                title={showInfoPanel ? "Hide Key Info" : "Show Key Info"}
                            >
                                <InfoIcon className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Controls - bottom left in sidebar mode only */}
                {!useBottomLayout && (
                    <>
                        <div className="absolute bottom-9 left-[37px] flex items-center gap-6">
                            {/* Key Information Panel Button */}
                            {/* Key Information Panel (Expandable Widget) */}
                            <div
                                className={cn(
                                    "bg-white text-black shadow-lg transition-all duration-300 ease-in-out relative flex flex-col overflow-hidden",
                                    showInfoPanel
                                        ? "w-[280px] h-[100px] rounded-2xl p-4 cursor-default"
                                        : "w-12 h-12 rounded-2xl cursor-pointer hover:bg-gray-50 bg-white items-center justify-center border border-gray-200"
                                )}
                                onClick={() => !showInfoPanel && setShowInfoPanel(true)}
                            >
                                <div className={cn(
                                    "w-full transition-opacity duration-200 delay-100",
                                    showInfoPanel ? "opacity-100" : "opacity-0 invisible h-0"
                                )}>
                                    {(() => {
                                        const { hoveredKey, selectedTarget } = useKeyBinding();
                                        const { keyboard } = useVial();
                                        const target = hoveredKey || selectedTarget;

                                        if (!target) {
                                            return (
                                                <p className="text-gray-300 italic text-sm text-center pt-2 pl-10">No key selected</p>
                                            );
                                        }

                                        const matrixCols = keyboard?.cols || MATRIX_COLS;
                                        const pos = (typeof target.row === 'number' && typeof target.col === 'number')
                                            ? (target.row * matrixCols + target.col)
                                            : null;

                                        return (
                                            <div className="text-sm space-y-1.5 pl-10">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="font-bold text-gray-500 text-[10px] uppercase tracking-wider">Keycode:</span>
                                                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{target.keycode || "?"}</span>
                                                </div>
                                                {pos !== null && (
                                                    <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-1.5 mt-1.5">
                                                        <div>
                                                            <span className="block font-bold text-gray-500 text-[10px] uppercase tracking-wider">Position:</span>
                                                            <span className="text-xs">R{target.row} C{target.col}</span>
                                                        </div>
                                                        <div>
                                                            <span className="block font-bold text-gray-500 text-[10px] uppercase tracking-wider">Matrix:</span>
                                                            <span className="text-xs">{pos}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>

                                <button
                                    className={cn(
                                        "absolute p-3.5 focus:outline-none text-black hover:text-gray-600 transition-colors",
                                        showInfoPanel ? "bottom-0 left-0" : "inset-0 flex items-center justify-center p-0"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowInfoPanel(!showInfoPanel);
                                    }}
                                    title={showInfoPanel ? "Close Info" : "Show Key Info"}
                                >
                                    <InfoIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="absolute bottom-9 right-[37px] flex flex-col items-end gap-1 pointer-events-none">
                            <div className="flex items-center gap-6 pointer-events-auto">
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
                                                keyVariant === variant && !isAutoKeySize
                                                    ? "bg-black text-white shadow-sm border-black"
                                                    : keyVariant === variant && isAutoKeySize
                                                        ? "bg-gray-400 text-white border-gray-400"
                                                        : "text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-300/50"
                                            )}
                                            title={`Set key size to ${variant}`}
                                        >
                                            {variant === 'default' ? 'Normal' : variant}
                                        </button>
                                    ))}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsAutoKeySize(true);
                                        }}
                                        className={cn(
                                            "px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-[4px] transition-all font-semibold border",
                                            isAutoKeySize
                                                ? "bg-black text-white shadow-sm border-black"
                                                : "text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-300/50"
                                        )}
                                        title="Auto size based on window"
                                    >
                                        Auto
                                    </button>
                                </div>

                                {/* Layout mode toggle */}
                                <div className="flex flex-row items-center gap-0.5 bg-gray-200/50 p-0.5 rounded-md border border-gray-300/50 w-fit">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsAutoLayoutMode(false);
                                            setLayoutMode("sidebar");
                                        }}
                                        className={cn(
                                            "p-1 rounded-[4px] transition-all border",
                                            // In sidebar mode, this button is active
                                            !isAutoLayoutMode
                                                ? "bg-black text-white shadow-sm border-black"
                                                : "bg-gray-400 text-white border-gray-400"
                                        )}
                                        title="Sidebar layout (panel on right)"
                                    >
                                        <PanelRight className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsAutoLayoutMode(false);
                                            setLayoutMode("bottombar");
                                        }}
                                        className={cn(
                                            "p-1 rounded-[4px] transition-all border",
                                            // In sidebar mode, bottombar button is never active
                                            "text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-300/50"
                                        )}
                                        title="Bottom bar layout (panel on bottom)"
                                    >
                                        <PanelBottom className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsAutoLayoutMode(true);
                                        }}
                                        className={cn(
                                            "px-1.5 py-0.5 text-[10px] uppercase tracking-wide rounded-[4px] transition-all font-semibold border",
                                            isAutoLayoutMode
                                                ? "bg-black text-white shadow-sm border-black"
                                                : "text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-300/50"
                                        )}
                                        title="Auto-switch layout based on window size"
                                    >
                                        Auto
                                    </button>
                                </div>
                            </div>
                            {import.meta.env.DEV && (
                                <div className="text-[10px] font-medium text-slate-400 select-none px-1 pointer-events-auto">
                                    Branch: {__GIT_BRANCH__}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            {/* Render BottomPanel at root level so it spans full width */}
            {useBottomLayout && <BottomPanel leftOffset={primaryOffset} pickerMode={pickerMode} height={dynamicBottomPanelHeight} />}

            {/* Picked Key Info Panel Display (Floating near bottom left button) */}
            {useBottomLayout && !showEditorOverlay && showInfoPanel && (
                <div className="absolute bottom-16 left-4 z-50 bg-white text-black shadow-lg rounded-xl p-4 w-[280px] border border-gray-200">
                    <div className="text-sm space-y-1">
                        {(() => {
                            const { hoveredKey, selectedTarget } = useKeyBinding();
                            const { keyboard } = useVial();
                            const target = hoveredKey || selectedTarget;

                            if (!target) {
                                return (
                                    <p className="text-gray-300 italic text-sm text-center">No key selected</p>
                                );
                            }

                            const matrixCols = keyboard?.cols || MATRIX_COLS;
                            const pos = (typeof target.row === 'number' && typeof target.col === 'number')
                                ? (target.row * matrixCols + target.col)
                                : null;

                            return (
                                <div className="text-sm space-y-1.5">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-bold text-gray-500 text-[10px] uppercase tracking-wider">Keycode:</span>
                                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{target.keycode || "?"}</span>
                                    </div>
                                    {pos !== null && (
                                        <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-1.5 mt-1.5">
                                            <div>
                                                <span className="block font-bold text-gray-500 text-[10px] uppercase tracking-wider">Position:</span>
                                                <span className="text-xs">R{target.row} C{target.col}</span>
                                            </div>
                                            <div>
                                                <span className="block font-bold text-gray-500 text-[10px] uppercase tracking-wider">Matrix:</span>
                                                <span className="text-xs">{pos}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}


            {/* Paste Layer Dialog */}
            <PasteLayerDialog
                currentLayerName={currentLayerName}
                onConfirm={handlePasteConfirm}
            />
        </div>
    );
};

export default EditorLayout;
