import LayersActiveIcon from "@/components/icons/LayersActive";
import LayersDefaultIcon from "@/components/icons/LayersDefault";
import CustomColorDialog from "@/components/CustomColorDialog";
import { Ellipsis, Settings, Unplug, Upload, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { useVial } from "@/contexts/VialContext";
import { useChanges } from "@/contexts/ChangesContext";
import { MATRIX_COLS } from "@/constants/svalboard-layout";
import { cn } from "@/lib/utils";
import { svalService } from "@/services/sval.service";
import { vialService } from "@/services/vial.service";
import { usbInstance } from "@/services/usb.service";
import { layerColors } from "@/utils/colors";
import { getPresetHsv, getClosestPresetColor, hsvToHex } from "@/utils/color-conversion";
import { FC, useState, useRef, useEffect } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { KEYMAP } from "@/constants/keygen";
import { usePanels } from "@/contexts/PanelsContext";
import { PublishLayerDialog } from "@/components/PublishLayerDialog";
import { Input } from "@/components/ui/input";


interface LayerSelectorProps {
    selectedLayer: number;
    setSelectedLayer: (layer: number) => void;
    /** Force compact mode (e.g., when editor overlay is shown) */
    forceHide?: boolean;
}

/**
 * Component for selecting and managing active layers in the keyboard editor.
 * Provides a quick-access tab bar for all layers and a detailed display of the selected layer.
 */
// Minimum window height before layer selector auto-hides
const MIN_HEIGHT_FOR_LAYER_SELECTOR = 500;

const LayerSelector: FC<LayerSelectorProps> = ({ selectedLayer, setSelectedLayer, forceHide }) => {
    const { keyboard, setKeyboard, updateKey } = useVial();
    const { clearSelection } = useKeyBinding();
    const { queue } = useChanges();

    // Track window height for auto-hiding
    const [windowHeight, setWindowHeight] = useState(window.innerHeight);

    useEffect(() => {
        const handleResize = () => setWindowHeight(window.innerHeight);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Hide layer selector when window is too short or when editor overlay is shown
    const shouldHide = forceHide || windowHeight < MIN_HEIGHT_FOR_LAYER_SELECTOR;
    const isCompact = shouldHide;

    // UI state
    const [showAllLayers, setShowAllLayers] = useState(true);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [isCustomColorOpen, setIsCustomColorOpen] = useState(false);
    const [editValue, setEditValue] = useState("");
    const [isHovered, setIsHovered] = useState(false);
    const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Close picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsColorPickerOpen(false);
            }
        };

        if (isColorPickerOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isColorPickerOpen]);

    if (!keyboard) return null;

    const handleSelectLayer = (layer: number) => () => {
        setSelectedLayer(layer);
        clearSelection();
    };

    const toggleShowLayers = () => {
        setShowAllLayers((prev) => !prev);
    };

    // Inline editing functions
    const handleStartEditing = () => {
        const currentName = svalService.getLayerName(keyboard, selectedLayer);
        setEditValue(currentName);
        setIsEditing(true);
        // Focus the input after the state update
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleSave = () => {
        if (editValue.trim() && keyboard) {
            const cosmetic = JSON.parse(JSON.stringify(keyboard.cosmetic || { layer: {}, layer_colors: {} }));
            if (!cosmetic.layer) cosmetic.layer = {};
            cosmetic.layer[selectedLayer.toString()] = editValue.trim();
            setKeyboard({ ...keyboard, cosmetic });
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSave();
        } else if (e.key === "Escape") {
            setIsEditing(false);
        }
    };

    const handleSetColor = async (colorName: string) => {
        console.log("setColor:", colorName, "connected:", isConnected);
        if (keyboard) {
            // Update cosmetic color for UI
            const cosmetic = JSON.parse(JSON.stringify(keyboard.cosmetic || { layer: {}, layer_colors: {} }));
            if (!cosmetic.layer_colors) cosmetic.layer_colors = {};
            cosmetic.layer_colors[selectedLayer.toString()] = colorName;

            // Also update layer_colors with preset HSV so getCurrentColorHex() shows correct color
            const hsv = getPresetHsv(colorName);
            const updatedLayerColors = [...(keyboard.layer_colors || [])];
            updatedLayerColors[selectedLayer] = { hue: hsv.hue, sat: hsv.sat, val: hsv.val };

            setKeyboard({ ...keyboard, cosmetic, layer_colors: updatedLayerColors });

            // If connected to keyboard, set hardware layer color via VIA custom values
            if (isConnected) {
                console.log("Sending hardware color via VIA custom values:", { layer: selectedLayer, hue: hsv.hue, sat: hsv.sat });
                try {
                    await usbInstance.setLayerColor(selectedLayer, hsv.hue, hsv.sat);
                } catch (e) {
                    console.error("Failed to set hardware layer color:", e);
                }
            }
        }
        setIsColorPickerOpen(false);
    };

    const handleSetCustomColor = async (hue: number, sat: number, val: number) => {
        if (keyboard) {
            // Find closest preset for cosmetic display, or use custom indicator
            const closestPreset = getClosestPresetColor(hue, sat, val);
            const cosmetic = JSON.parse(JSON.stringify(keyboard.cosmetic || { layer: {}, layer_colors: {} }));
            if (!cosmetic.layer_colors) cosmetic.layer_colors = {};

            // Store the closest preset name for UI display
            cosmetic.layer_colors[selectedLayer.toString()] = closestPreset;

            // Store actual HSV in layer_colors array for hardware state
            const updatedLayerColors = [...(keyboard.layer_colors || [])];
            updatedLayerColors[selectedLayer] = { hue, sat, val };

            setKeyboard({ ...keyboard, cosmetic, layer_colors: updatedLayerColors });

            // If connected to keyboard, set hardware layer color via VIA custom values
            if (isConnected) {
                console.log("Sending custom hardware color via VIA custom values:", { layer: selectedLayer, hue, sat });
                try {
                    await usbInstance.setLayerColor(selectedLayer, hue, sat);
                } catch (e) {
                    console.error("Failed to set hardware layer color:", e);
                }
            }
        }
    };

    const currentLayerColorName = keyboard.cosmetic?.layer_colors?.[selectedLayer] || "green";

    // Get the actual display color - either from cosmetic name or hardware HSV
    const getCurrentColorHex = (): string => {
        // First check if we have hardware layer colors (from Svalboard)
        const hwColor = keyboard.layer_colors?.[selectedLayer];
        if (hwColor && (hwColor.hue !== 0 || hwColor.sat !== 0 || hwColor.val !== 0)) {
            return hsvToHex(hwColor.hue, hwColor.sat, hwColor.val);
        }
        // Otherwise use the cosmetic preset color
        const preset = layerColors.find(c => c.name === currentLayerColorName);
        return preset?.hex || "#099e7c"; // Default to green hex
    };

    const currentColorHex = getCurrentColorHex();

    // All possible colors for the picker
    const allColors = [...layerColors];

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

        // Filter out empty layers if filter is active
        if (!showAllLayers && isEmpty && i !== selectedLayer) {
            return null;
        }

        const layerShortName = svalService.getLayerNameNoLabel(keyboard, i);
        const isActive = selectedLayer === i;

        return (
            <ContextMenu key={`layer-tab-${i}`}>
                <ContextMenuTrigger asChild>
                    <button
                        onClick={handleSelectLayer(i)}
                        onDoubleClick={handleStartEditing}
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
                    <ContextMenuItem onSelect={handleStartEditing}>
                        Rename Layer
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => setIsColorPickerOpen(true)}>
                        Change Color
                    </ContextMenuItem>
                    <ContextMenuSeparator />
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

    // In compact mode, show a thin hint bar that expands as an absolute overlay on hover
    if (isCompact) {
        const showExpanded = isHovered || isColorPickerOpen || isEditing;

        return (
            <div
                className="w-full h-1 relative"
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Thin hint bar - always visible as hover target, z-40 to stay above editor overlay (z-30) */}
                <div className={cn(
                    "absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-gray-300/30 to-transparent cursor-pointer z-40 transition-opacity duration-200",
                    showExpanded ? "opacity-0" : "opacity-100"
                )} />

                {/* Expanded overlay - absolute positioned, only as tall as content, z-50 to stay above editor overlay */}
                <div className={cn(
                    "absolute top-0 left-0 right-0 h-fit z-50 transition-all duration-200 bg-white/98 backdrop-blur-sm shadow-md border-b border-gray-200",
                    showExpanded ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none -translate-y-1"
                )}>
                    <div className="flex items-center justify-between px-3 py-1.5">
                        {/* Layer tabs */}
                        <div className="flex flex-row items-center gap-1 overflow-x-auto">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={toggleShowLayers}
                                        className="hover:bg-gray-200 p-1 rounded-md transition-colors text-black flex items-center justify-center flex-shrink-0"
                                        aria-label={showAllLayers ? "Hide Blank Layers" : "Show All Layers"}
                                    >
                                        {showAllLayers ? <LayersDefaultIcon className="h-4 w-4" /> : <LayersActiveIcon className="h-4 w-4" />}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    {showAllLayers ? "Hide Blank Layers" : "Show All Layers"}
                                </TooltipContent>
                            </Tooltip>

                            <div className="flex flex-row gap-1">
                                {Array.from({ length: keyboard.layers || 16 }, (_, i) => renderLayerTab(i))}
                            </div>
                        </div>

                        {/* Color picker and layer name */}
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <div className="relative" ref={pickerRef}>
                                <div
                                    className={cn(
                                        "w-4 h-4 rounded-full shadow-sm cursor-pointer transition-transform hover:scale-110 border",
                                        isColorPickerOpen ? "border-black" : "border-transparent"
                                    )}
                                    style={{ backgroundColor: currentColorHex }}
                                    onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                                />
                                {isColorPickerOpen && (
                                    <div className="absolute top-[calc(100%+4px)] right-0 z-50 bg-[#EEEEEE] rounded-2xl p-1.5 flex flex-row items-center gap-1 shadow-xl border border-gray-200">
                                        {allColors.map((color) => (
                                            <button
                                                key={color.name}
                                                className={cn(
                                                    "w-4 h-4 rounded-full transition-all hover:scale-110 border",
                                                    currentLayerColorName === color.name ? "border-black" : "border-transparent"
                                                )}
                                                style={{ backgroundColor: color.hex }}
                                                onClick={() => handleSetColor(color.name)}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {isEditing ? (
                                <Input
                                    ref={inputRef}
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleSave}
                                    onKeyDown={handleKeyDown}
                                    className="h-6 py-0 px-2 text-xs font-bold border border-black rounded w-24"
                                    autoFocus
                                />
                            ) : (
                                <span
                                    className="text-xs font-semibold text-gray-700 cursor-pointer hover:text-black"
                                    onClick={handleStartEditing}
                                    title="Click to rename"
                                >
                                    {svalService.getLayerName(keyboard, selectedLayer)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Custom Color Dialog */}
                <CustomColorDialog
                    open={isCustomColorOpen}
                    onOpenChange={setIsCustomColorOpen}
                    initialHue={keyboard.layer_colors?.[selectedLayer]?.hue ?? 85}
                    initialSat={keyboard.layer_colors?.[selectedLayer]?.sat ?? 255}
                    initialVal={keyboard.layer_colors?.[selectedLayer]?.val ?? 200}
                    onApply={handleSetCustomColor}
                    layerName={svalService.getLayerName(keyboard, selectedLayer)}
                />
            </div>
        );
    }

    // Standard layout for sidebar mode
    return (
        <div
            className="w-full flex flex-col pt-4"
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Top Toolbar: Filter toggle and Layer Tabs */}
            <div className="overflow-hidden flex-shrink-0 flex items-center justify-start text-gray-500 gap-1 pl-4 w-full py-3">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={toggleShowLayers}
                            className="hover:bg-gray-200 p-1.5 rounded-md transition-colors mr-2 text-black flex items-center justify-center"
                            aria-label={showAllLayers ? "Hide Blank Layers" : "Show All Layers"}
                        >
                            {showAllLayers ? <LayersDefaultIcon className="h-5 w-5" /> : <LayersActiveIcon className="h-5 w-5" />}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        {showAllLayers ? "Hide Blank Layers" : "Show All Layers"}
                    </TooltipContent>
                </Tooltip>

                <div className="max-w-full flex flex-row overflow-visible flex-grow-0 gap-1 p-1">
                    {Array.from({ length: keyboard.layers || 16 }, (_, i) => renderLayerTab(i))}
                </div>
            </div>

            {/* Bottom Status: Current Layer Name and Edit Trigger */}
            <div className="flex justify-start items-center px-5 py-2 relative mt-2">
                {/* Color Dot with Picker */}
                <div className="relative mr-3 left-px" ref={pickerRef}>
                    <div
                        className={cn(
                            "w-5 h-5 rounded-full shadow-sm cursor-pointer transition-transform hover:scale-110 border-2",
                            isColorPickerOpen ? "border-black" : "border-transparent"
                        )}
                        style={{ backgroundColor: currentColorHex }}
                        onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                    />

                    {isColorPickerOpen && (
                        <div className="absolute top-[calc(100%+4px)] left-1/2 -translate-x-1/2 z-50 bg-[#EEEEEE] rounded-3xl p-2 flex flex-col items-center gap-2 shadow-xl border border-gray-200 min-w-[40px]">
                            {allColors.map((color) => (
                                <button
                                    key={color.name}
                                    className={cn(
                                        "w-5 h-5 rounded-full transition-all hover:scale-110 border-2",
                                        currentLayerColorName === color.name
                                            ? "border-black border-3"
                                            : "border-transparent"
                                    )}
                                    style={{ backgroundColor: color.hex }}
                                    onClick={() => handleSetColor(color.name)}
                                    title={color.name}
                                />
                            ))}
                            {/* Custom color button - only show when connected to keyboard */}
                            {isConnected ? (
                                <button
                                    className="w-5 h-5 rounded-full transition-all hover:scale-110 border-2 border-transparent bg-gray-200 flex items-center justify-center"
                                    onClick={() => {
                                        setIsColorPickerOpen(false);
                                        setIsCustomColorOpen(true);
                                    }}
                                    title="Custom color"
                                >
                                    <Settings className="w-3 h-3 text-gray-600" />
                                </button>
                            ) : null}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-1 ml-1">
                    {isEditing ? (
                        <div className="flex items-center gap-2 bg-white rounded-md px-1 py-0.5 border border-black shadow-sm">
                            <Input
                                ref={inputRef}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleSave}
                                onKeyDown={handleKeyDown}
                                className="h-auto py-1 px-2 text-base font-bold border-none focus-visible:ring-0 w-auto min-w-[150px]"
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div
                            className="text-sm flex justify-start items-center cursor-pointer group hover:bg-black/5 rounded-md px-2 py-0.5 transition-colors"
                            onClick={handleStartEditing}
                            title="Click to rename"
                        >
                            <span className="font-bold text-black">
                                {svalService.getLayerName(keyboard, selectedLayer)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Only show ellipsis in non-compact mode */}
                {!isCompact && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="ml-2 hover:bg-black/5 p-1 rounded-full transition-colors flex items-center justify-center text-black outline-none">
                                <Ellipsis size={18} strokeWidth={1.5} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-64">
                            <DropdownMenuItem disabled>
                                Apply
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={handleCopyLayer}>
                                Copy
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={handlePasteLayer}>
                                Paste
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={handleWipeDisable}>
                                Make All Blank
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={handleWipeTransparent}>
                                Make All Transparent
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={handleChangeDisabledToTransparent}>
                                Switch Blank to Transparent
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setIsPublishDialogOpen(true)}>
                                <Upload className="w-4 h-4 mr-2" />
                                Publish Layer...
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {/* Publish Layer Dialog */}
                <PublishLayerDialog
                    isOpen={isPublishDialogOpen}
                    onClose={() => setIsPublishDialogOpen(false)}
                    layerIndex={selectedLayer}
                />
            </div>

            {/* Custom Color Dialog */}
            <CustomColorDialog
                open={isCustomColorOpen}
                onOpenChange={setIsCustomColorOpen}
                initialHue={keyboard.layer_colors?.[selectedLayer]?.hue ?? 85}
                initialSat={keyboard.layer_colors?.[selectedLayer]?.sat ?? 255}
                initialVal={keyboard.layer_colors?.[selectedLayer]?.val ?? 200}
                onApply={handleSetCustomColor}
                layerName={svalService.getLayerName(keyboard, selectedLayer)}
            />
        </div>
    );
};

export default LayerSelector;
