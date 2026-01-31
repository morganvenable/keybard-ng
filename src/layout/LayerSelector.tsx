import LayersActiveIcon from "@/components/icons/LayersActive";
import LayersDefaultIcon from "@/components/icons/LayersDefault";
import { ChevronDown, Unplug, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { useVial } from "@/contexts/VialContext";
import { useChanges } from "@/contexts/ChangesContext";
import { MATRIX_COLS } from "@/constants/svalboard-layout";
import { cn } from "@/lib/utils";
import { svalService } from "@/services/sval.service";
import { vialService } from "@/services/vial.service";
import { FC, useState, useEffect, useRef } from "react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { KEYMAP } from "@/constants/keygen";
import { usePanels } from "@/contexts/PanelsContext";


interface LayerSelectorProps {
    selectedLayer: number;
    setSelectedLayer: (layer: number) => void;
}

/**
 * Component for selecting and managing active layers in the keyboard editor.
 * Displays a horizontal bar of layer tabs with a filter toggle for hiding blank layers.
 */
const LayerSelector: FC<LayerSelectorProps> = ({ selectedLayer, setSelectedLayer }) => {
    const { keyboard, setKeyboard, updateKey } = useVial();
    const { clearSelection } = useKeyBinding();
    const { queue } = useChanges();

    // User preference for showing all layers
    const [showAllLayers, setShowAllLayers] = useState(true);

    // Track container width for auto-hiding blank layers when narrow
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    // Track window height for hover-only mode when vertically constrained
    const [windowHeight, setWindowHeight] = useState(window.innerHeight);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Track window height for hover-only mode
    useEffect(() => {
        const handleResize = () => setWindowHeight(window.innerHeight);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // When narrow: force-hide blank layers (override user toggle)
    // When wide: respect user's showAllLayers toggle
    // Threshold of 800px accounts for sidebar + layer tabs needing room
    const isNarrow = containerWidth > 0 && containerWidth < 800;

    // When vertically constrained, go into hover-only mode
    // Threshold of 550px is when keyboard + layer bar start competing for space
    const isVerticallyConstrained = windowHeight < 550;
    const showFullBar = !isVerticallyConstrained || isHovered;

    if (!keyboard) return null;

    const handleSelectLayer = (layer: number) => () => {
        setSelectedLayer(layer);
        clearSelection();
    };

    const toggleShowLayers = () => {
        setShowAllLayers((prev) => !prev);
    };

    // Layer Actions
    const { isConnected, connect } = useVial();



    const handleCopyLayer = () => {
        if (!keyboard?.keymap) return;
        const layerData = keyboard.keymap[selectedLayer];
        navigator.clipboard.writeText(JSON.stringify(layerData));
    };

    const handlePasteLayer = async () => {
        if (!keyboard || !keyboard.keymap) return;
        try {
            const text = await navigator.clipboard.readText();
            const layerData = JSON.parse(text);
            if (Array.isArray(layerData)) {
                if (layerData.length === 0) return;

                const matrixCols = keyboard.cols || MATRIX_COLS;
                const currentLayerKeymap = keyboard.keymap[selectedLayer] || [];

                // Clone keyboard once for all changes
                const updatedKeyboard = JSON.parse(JSON.stringify(keyboard));
                if (!updatedKeyboard.keymap[selectedLayer]) {
                    updatedKeyboard.keymap[selectedLayer] = [];
                }

                let hasChanges = false;

                for (let r = 0; r < keyboard.rows; r++) {
                    for (let c = 0; c < keyboard.cols; c++) {
                        const idx = r * matrixCols + c;
                        if (idx < layerData.length) {
                            const newValue = layerData[idx];
                            const currentValue = currentLayerKeymap[idx];

                            // Only queue change if value is different
                            if (newValue !== currentValue) {
                                hasChanges = true;

                                // Update the cloned keyboard
                                updatedKeyboard.keymap[selectedLayer][idx] = newValue;

                                // Queue change for tracking
                                const row = r;
                                const col = c;
                                const previousValue = currentValue;
                                const changeDesc = `key_${selectedLayer}_${row}_${col}`;

                                queue(
                                    changeDesc,
                                    async () => {
                                        console.log(`Committing key change: Layer ${selectedLayer}, Key [${row},${col}] → ${newValue}`);
                                        updateKey(selectedLayer, row, col, newValue);
                                    },
                                    {
                                        type: "key",
                                        layer: selectedLayer,
                                        row,
                                        col,
                                        keycode: newValue,
                                        previousValue,
                                    }
                                );
                            }
                        }
                    }
                }

                // Only update state if there were changes
                if (hasChanges) {
                    setKeyboard(updatedKeyboard);
                }
            }
        } catch (e) {
            console.error("Failed to paste layer", e);
        }
    };

    // Batch wipe helper - clones keyboard once, makes all changes, queues each for tracking, then updates state once
    const batchWipeKeys = (targetKeycode: number, filterFn: (currentValue: number) => boolean) => {
        if (!keyboard || !keyboard.keymap) return;

        const matrixCols = keyboard.cols || MATRIX_COLS;
        const currentLayerKeymap = keyboard.keymap[selectedLayer] || [];

        // Clone keyboard once for all changes
        const updatedKeyboard = JSON.parse(JSON.stringify(keyboard));
        if (!updatedKeyboard.keymap[selectedLayer]) {
            updatedKeyboard.keymap[selectedLayer] = [];
        }

        // Track if any changes were made
        let hasChanges = false;

        for (let r = 0; r < keyboard.rows; r++) {
            for (let c = 0; c < keyboard.cols; c++) {
                const idx = r * matrixCols + c;
                const currentValue = currentLayerKeymap[idx];

                // Only process keys that pass the filter
                if (filterFn(currentValue)) {
                    hasChanges = true;

                    // Update the cloned keyboard
                    updatedKeyboard.keymap[selectedLayer][idx] = targetKeycode;

                    // Queue change for tracking (captures row, col, targetKeycode by value)
                    const row = r;
                    const col = c;
                    const previousValue = currentValue;
                    const changeDesc = `key_${selectedLayer}_${row}_${col}`;

                    queue(
                        changeDesc,
                        async () => {
                            console.log(`Committing key change: Layer ${selectedLayer}, Key [${row},${col}] → ${targetKeycode}`);
                            updateKey(selectedLayer, row, col, targetKeycode);
                        },
                        {
                            type: "key",
                            layer: selectedLayer,
                            row,
                            col,
                            keycode: targetKeycode,
                            previousValue,
                        }
                    );
                }
            }
        }

        // Only update state if there were changes
        if (hasChanges) {
            setKeyboard(updatedKeyboard);
        }
    };

    const handleWipeDisable = () => {
        const KC_NO = 0;
        batchWipeKeys(KC_NO, (currentValue) => currentValue !== KC_NO);
    };

    const handleWipeTransparent = () => {
        const KC_TRNS = KEYMAP['KC_TRNS']?.code ?? 1;
        batchWipeKeys(KC_TRNS, (currentValue) => currentValue !== KC_TRNS);
    };

    const handleChangeDisabledToTransparent = () => {
        const KC_TRNS = KEYMAP['KC_TRNS']?.code ?? 1;
        const KC_NO = 0;
        batchWipeKeys(KC_TRNS, (currentValue) => currentValue === KC_NO);
    };

    const { activePanel } = usePanels();

    if (activePanel === "matrixtester") {
        return (
            <div className="w-full flex data-[state=collapsed] flex-col pt-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-col justify-start items-start px-5 py-2 relative mt-3">
                    <span className="font-bold text-lg text-black">Matrix Tester</span>
                    {!isConnected ? (
                        <button
                            onClick={() => connect()}
                            className="mt-2 bg-black text-white px-4 py-1 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
                        >
                            <Unplug className="h-4 w-4" />
                            Connect Keyboard
                        </button>
                    ) : (
                        <button
                            onClick={() => connect()}
                            className="mt-2 bg-white text-black px-4 py-1 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors flex items-center gap-2"
                        >
                            <Zap className="h-4 w-4 fill-black text-black" />
                            Keyboard Connected
                        </button>
                    )}
                </div>
            </div>
        )
    }

    // Render a layer tab with context menu for right-click actions
    const renderLayerTab = (i: number) => {
        const layerData = keyboard.keymap?.[i];
        const isEmpty = layerData ? vialService.isLayerEmpty(layerData) : true;

        // When narrow: always hide blank layers (except selected)
        // When wide: respect user's showAllLayers preference
        const shouldHideBlank = isNarrow || !showAllLayers;
        if (shouldHideBlank && isEmpty && i !== selectedLayer) {
            return null;
        }

        const layerShortName = svalService.getLayerNameNoLabel(keyboard, i);
        const isActive = selectedLayer === i;

        return (
            <ContextMenu key={`layer-tab-${i}`}>
                <ContextMenuTrigger asChild>
                    <button
                        onClick={handleSelectLayer(i)}
                        className={cn(
                            "px-4 py-1 rounded-full transition-all text-sm font-medium cursor-pointer border-none outline-none whitespace-nowrap",
                            isActive
                                ? "bg-gray-800 text-white shadow-md scale-105"
                                : "bg-transparent text-gray-600 hover:bg-gray-200"
                        )}
                    >
                        <span>{layerShortName}</span>
                    </button>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56">
                    <ContextMenuItem onSelect={handleCopyLayer}>
                        Copy Layer
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={handlePasteLayer}>
                        Paste Layer
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={handleWipeDisable}>
                        Make All Blank
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={handleWipeTransparent}>
                        Make All Transparent
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={handleChangeDisabledToTransparent}>
                        Switch Blank to Transparent
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        );
    };

    // Single clean render - horizontal bar of layer tabs (single line, no wrap, no scroll)
    // When vertically constrained: hover-only mode with collapsed hint bar
    return (
        <div
            ref={containerRef}
            className={cn(
                "w-full flex-shrink-0 overflow-hidden transition-all duration-200",
                showFullBar ? "pt-4" : "pt-0"
            )}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Collapsed hint bar - shown when vertically constrained and not hovered */}
            {isVerticallyConstrained && !isHovered && (
                <div className="flex items-center justify-center text-gray-300 cursor-pointer h-3">
                    <ChevronDown className="h-3 w-3" />
                </div>
            )}

            {/* Full layer tabs - shown when not constrained or when hovered */}
            {showFullBar && (
                <div className="flex items-center gap-2 pl-5 py-2 whitespace-nowrap">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={toggleShowLayers}
                                disabled={isNarrow}
                                className={cn(
                                    "p-1.5 rounded-md transition-colors flex-shrink-0",
                                    isNarrow
                                        ? "text-gray-400 cursor-not-allowed"
                                        : "text-black hover:bg-gray-200"
                                )}
                                aria-label={isNarrow ? "Blank layers auto-hidden" : (showAllLayers ? "Hide Blank Layers" : "Show All Layers")}
                            >
                                {(isNarrow || !showAllLayers) ? <LayersActiveIcon className="h-5 w-5" /> : <LayersDefaultIcon className="h-5 w-5" />}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            {isNarrow ? "Blank layers auto-hidden (narrow)" : (showAllLayers ? "Hide Blank Layers" : "Show All Layers")}
                        </TooltipContent>
                    </Tooltip>

                    {/* Layer tabs - single line */}
                    <div className="flex items-center gap-1">
                        {Array.from({ length: keyboard.layers || 16 }, (_, i) => renderLayerTab(i))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LayerSelector;
