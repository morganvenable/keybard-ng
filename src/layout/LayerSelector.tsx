import LayersActiveIcon from "@/components/icons/LayersActive";
import LayersDefaultIcon from "@/components/icons/LayersDefault";
import CustomColorDialog from "@/components/CustomColorDialog";
import { Ellipsis, Settings, Unplug, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { useVial } from "@/contexts/VialContext";
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
import { KEYMAP } from "@/constants/keygen";
import { usePanels } from "@/contexts/PanelsContext";


interface LayerSelectorProps {
    selectedLayer: number;
    setSelectedLayer: (layer: number) => void;
}

/**
 * Component for selecting and managing active layers in the keyboard editor.
 * Provides a quick-access tab bar for all layers and a detailed display of the selected layer.
 */
const LayerSelector: FC<LayerSelectorProps> = ({ selectedLayer, setSelectedLayer }) => {
    const { keyboard, setKeyboard } = useVial();
    const { clearSelection } = useKeyBinding();


    // UI state
    const [showAllLayers, setShowAllLayers] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [isCustomColorOpen, setIsCustomColorOpen] = useState(false);
    const [editValue, setEditValue] = useState("");
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

    const handleStartEditing = () => {
        setEditValue(svalService.getLayerName(keyboard, selectedLayer));
        setIsEditing(true);
    };

    const handleSave = () => {
        if (keyboard) {
            const cosmetic = JSON.parse(JSON.stringify(keyboard.cosmetic || { layer: {}, layer_colors: {} }));
            if (!cosmetic.layer) cosmetic.layer = {};

            // If the input is empty, remove the custom name to revert to default
            if (editValue.trim() === "") {
                delete cosmetic.layer[selectedLayer.toString()];
            } else {
                cosmetic.layer[selectedLayer.toString()] = editValue;
            }

            setKeyboard({ ...keyboard, cosmetic });
        }
        setIsEditing(false);
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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSave();
        } else if (e.key === "Escape") {
            setIsEditing(false);
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
        if (!keyboard) return;
        try {
            const text = await navigator.clipboard.readText();
            const layerData = JSON.parse(text);
            if (Array.isArray(layerData)) {
                if (layerData.length === 0) return;

                // Update keys
                for (let r = 0; r < keyboard.rows; r++) {
                    for (let c = 0; c < keyboard.cols; c++) {
                        const idx = r * keyboard.cols + c;
                        if (idx < layerData.length) {
                            const val = layerData[idx];
                            if (isConnected) {
                                await vialService.updateKey(selectedLayer, r, c, val);
                            } else {
                                if (keyboard.keymap) keyboard.keymap[selectedLayer][idx] = val;
                            }
                        }
                    }
                }

                if (isConnected) {
                    // Refresh map from device
                    await vialService.getKeyMap(keyboard);
                }

                // Trigger React update
                setKeyboard({ ...keyboard });
            }
        } catch (e) {
            console.error("Failed to paste layer", e);
        }
    };

    const handleWipeDisable = async () => {
        if (!keyboard) return;
        const KC_NO = 0;
        for (let r = 0; r < keyboard.rows; r++) {
            for (let c = 0; c < keyboard.cols; c++) {
                if (isConnected) {
                    await vialService.updateKey(selectedLayer, r, c, KC_NO);
                } else {
                    const idx = r * keyboard.cols + c;
                    if (keyboard.keymap) keyboard.keymap[selectedLayer][idx] = KC_NO;
                }
            }
        }
        if (isConnected) {
            await vialService.getKeyMap(keyboard);
        }
        setKeyboard({ ...keyboard });
    };

    const handleWipeTransparent = async () => {
        if (!keyboard) return;
        const KC_TRNS = KEYMAP['KC_TRNS']?.code ?? 1;
        for (let r = 0; r < keyboard.rows; r++) {
            for (let c = 0; c < keyboard.cols; c++) {
                if (isConnected) {
                    await vialService.updateKey(selectedLayer, r, c, KC_TRNS);
                } else {
                    const idx = r * keyboard.cols + c;
                    if (keyboard.keymap) keyboard.keymap[selectedLayer][idx] = KC_TRNS;
                }
            }
        }
        if (isConnected) {
            await vialService.getKeyMap(keyboard);
        }
        setKeyboard({ ...keyboard });
    };

    const handleChangeDisabledToTransparent = async () => {
        if (!keyboard?.keymap) return;
        const KC_TRNS = KEYMAP['KC_TRNS']?.code ?? 1;
        const KC_NO = 0;
        const currentLayerData = keyboard.keymap[selectedLayer];

        for (let r = 0; r < keyboard.rows; r++) {
            for (let c = 0; c < keyboard.cols; c++) {
                const idx = r * keyboard.cols + c;
                const currentKey = currentLayerData[idx];
                if (currentKey === KC_NO) {
                    if (isConnected) {
                        await vialService.updateKey(selectedLayer, r, c, KC_TRNS);
                    } else {
                        keyboard.keymap[selectedLayer][idx] = KC_TRNS;
                    }
                }
            }
        }
        if (isConnected) {
            await vialService.getKeyMap(keyboard);
        }
        setKeyboard({ ...keyboard });
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

    return (
        <div className="w-full flex flex-col pt-4" onClick={(e) => e.stopPropagation()}>
            {/* Top Toolbar: Filter toggle and Layer Tabs */}
            <div className="py-3 overflow-hidden flex-shrink-0 flex items-center justify-start text-gray-500 gap-1 pl-4 w-full">
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

                <div className="max-w-full flex flex-row overflow-visible flex-grow-0 gap-2 p-1">
                    {Array.from({ length: keyboard.layers || 16 }, (_, i) => {
                        const layerData = keyboard.keymap?.[i];
                        const isEmpty = layerData ? vialService.isLayerEmpty(layerData) : true;

                        // Filter out empty layers if filter is active
                        if (!showAllLayers && isEmpty && i !== selectedLayer) {
                            return null;
                        }

                        const layerShortName = svalService.getLayerNameNoLabel(keyboard, i);
                        const isActive = selectedLayer === i;

                        return (
                            <button
                                key={`layer-tab-${i}`}
                                onClick={handleSelectLayer(i)}
                                onDoubleClick={handleStartEditing}
                                className={cn(
                                    "px-5 py-1 rounded-full transition-all text-sm font-medium cursor-pointer border-none outline-none whitespace-nowrap",
                                    isActive
                                        ? "bg-gray-800 text-white shadow-md scale-105"
                                        : "bg-transparent text-gray-600 hover:bg-gray-200"
                                )}
                            >
                                <span>{layerShortName}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Status: Current Layer Name and Edit Trigger */}
            <div className="mt-2 flex justify-start items-center px-5 py-2 relative">
                {/* Color Dot with Picker */}
                <div className="relative mr-3 left-px" ref={pickerRef}>
                    <div
                        className={cn(
                            "w-6 h-6 rounded-full shadow-sm cursor-pointer transition-transform hover:scale-110 border-2",
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
                                        "w-6 h-6 rounded-full transition-all hover:scale-110 border-2",
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
                                    className="w-6 h-6 rounded-full transition-all hover:scale-110 border-2 border-transparent bg-gray-200 flex items-center justify-center"
                                    onClick={() => {
                                        setIsColorPickerOpen(false);
                                        setIsCustomColorOpen(true);
                                    }}
                                    title="Custom color"
                                >
                                    <Settings className="w-3.5 h-3.5 text-gray-600" />
                                </button>
                            ) : null}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-1 ml-2">
                    {isEditing ? (
                        <div className="flex items-center gap-2 bg-white rounded-md px-1 py-0.5 border border-black shadow-sm">
                            <Input
                                ref={inputRef}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleSave}
                                onKeyDown={handleKeyDown}
                                className="h-auto py-1 px-2 text-lg font-bold border-none focus-visible:ring-0 w-auto min-w-[200px]"
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div
                            className="text-lg flex justify-start items-center cursor-pointer group hover:bg-black/5 rounded-md px-2 py-1 transition-colors"
                            onClick={handleStartEditing}
                            title="Click to rename"
                        >
                            <span className="font-bold text-black">
                                {svalService.getLayerName(keyboard, selectedLayer)}
                            </span>
                        </div>
                    )}


                </div>

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
                    </DropdownMenuContent>
                </DropdownMenu>
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
