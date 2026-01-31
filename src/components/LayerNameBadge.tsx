import React, { useState, useRef, useEffect } from "react";
import { Ellipsis, Settings, Upload } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useVial } from "@/contexts/VialContext";
import { useChanges } from "@/contexts/ChangesContext";
import { svalService } from "@/services/sval.service";
import { usbInstance } from "@/services/usb.service";
import { layerColors } from "@/utils/colors";
import { getPresetHsv, getClosestPresetColor, hsvToHex } from "@/utils/color-conversion";
import { cn } from "@/lib/utils";
import { KEYMAP } from "@/constants/keygen";
import { MATRIX_COLS } from "@/constants/svalboard-layout";
import CustomColorDialog from "@/components/CustomColorDialog";
import { PublishLayerDialog } from "@/components/PublishLayerDialog";

interface LayerNameBadgeProps {
    selectedLayer: number;
    /** Position in pixels from top-left of keyboard layout */
    x: number;
    y: number;
}

/**
 * Centered layer name badge with color picker.
 * Positioned between thumb clusters in the keyboard layout.
 */
export const LayerNameBadge: React.FC<LayerNameBadgeProps> = ({ selectedLayer, x, y }) => {
    const { keyboard, setKeyboard, isConnected, updateKey } = useVial();
    const { queue } = useChanges();
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [isCustomColorOpen, setIsCustomColorOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState("");
    const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
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

    const currentLayerColorName = keyboard.cosmetic?.layer_colors?.[selectedLayer] || "green";

    // Get the actual display color - either from cosmetic name or hardware HSV
    const getCurrentColorHex = (): string => {
        const hwColor = keyboard.layer_colors?.[selectedLayer];
        if (hwColor && (hwColor.hue !== 0 || hwColor.sat !== 0 || hwColor.val !== 0)) {
            return hsvToHex(hwColor.hue, hwColor.sat, hwColor.val);
        }
        const preset = layerColors.find(c => c.name === currentLayerColorName);
        return preset?.hex || "#099e7c";
    };

    const currentColorHex = getCurrentColorHex();
    const allColors = [...layerColors];

    const handleStartEditing = () => {
        const currentName = svalService.getLayerName(keyboard, selectedLayer);
        setEditValue(currentName);
        setIsEditing(true);
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
        if (keyboard) {
            const cosmetic = JSON.parse(JSON.stringify(keyboard.cosmetic || { layer: {}, layer_colors: {} }));
            if (!cosmetic.layer_colors) cosmetic.layer_colors = {};
            cosmetic.layer_colors[selectedLayer.toString()] = colorName;

            const hsv = getPresetHsv(colorName);
            const updatedLayerColors = [...(keyboard.layer_colors || [])];
            updatedLayerColors[selectedLayer] = { hue: hsv.hue, sat: hsv.sat, val: hsv.val };

            setKeyboard({ ...keyboard, cosmetic, layer_colors: updatedLayerColors });

            if (isConnected) {
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
            const closestPreset = getClosestPresetColor(hue, sat, val);
            const cosmetic = JSON.parse(JSON.stringify(keyboard.cosmetic || { layer: {}, layer_colors: {} }));
            if (!cosmetic.layer_colors) cosmetic.layer_colors = {};
            cosmetic.layer_colors[selectedLayer.toString()] = closestPreset;

            const updatedLayerColors = [...(keyboard.layer_colors || [])];
            updatedLayerColors[selectedLayer] = { hue, sat, val };

            setKeyboard({ ...keyboard, cosmetic, layer_colors: updatedLayerColors });

            if (isConnected) {
                try {
                    await usbInstance.setLayerColor(selectedLayer, hue, sat);
                } catch (e) {
                    console.error("Failed to set hardware layer color:", e);
                }
            }
        }
    };

    // Layer Actions
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
                const updatedKeyboard = JSON.parse(JSON.stringify(keyboard));
                let hasChanges = false;

                for (let r = 0; r < keyboard.rows; r++) {
                    for (let c = 0; c < keyboard.cols; c++) {
                        const idx = r * matrixCols + c;
                        if (idx < layerData.length) {
                            const newValue = layerData[idx];
                            const currentValue = currentLayerKeymap[idx];
                            if (newValue !== currentValue) {
                                hasChanges = true;
                                updatedKeyboard.keymap[selectedLayer][idx] = newValue;
                                const row = r;
                                const col = c;
                                const previousValue = currentValue;
                                queue(
                                    `key_${selectedLayer}_${row}_${col}`,
                                    async () => updateKey(selectedLayer, row, col, newValue),
                                    { type: "key", layer: selectedLayer, row, col, keycode: newValue, previousValue }
                                );
                            }
                        }
                    }
                }
                if (hasChanges) setKeyboard(updatedKeyboard);
            }
        } catch (e) {
            console.error("Failed to paste layer:", e);
        }
    };

    const batchWipeKeys = (targetKeycode: number, filterFn: (currentValue: number) => boolean) => {
        if (!keyboard || !keyboard.keymap) return;
        const matrixCols = keyboard.cols || MATRIX_COLS;
        const currentLayerKeymap = keyboard.keymap[selectedLayer] || [];
        const updatedKeyboard = JSON.parse(JSON.stringify(keyboard));
        let hasChanges = false;

        for (let r = 0; r < keyboard.rows; r++) {
            for (let c = 0; c < keyboard.cols; c++) {
                const idx = r * matrixCols + c;
                const currentValue = currentLayerKeymap[idx] as number;
                if (filterFn(currentValue)) {
                    hasChanges = true;
                    updatedKeyboard.keymap[selectedLayer][idx] = targetKeycode;
                    const row = r;
                    const col = c;
                    const previousValue = currentValue;
                    queue(
                        `key_${selectedLayer}_${row}_${col}`,
                        async () => updateKey(selectedLayer, row, col, targetKeycode),
                        { type: "key", layer: selectedLayer, row, col, keycode: targetKeycode, previousValue }
                    );
                }
            }
        }
        if (hasChanges) setKeyboard(updatedKeyboard);
    };

    const handleWipeDisable = () => {
        const KC_NO = 0;
        batchWipeKeys(KC_NO, (v) => v !== KC_NO);
    };
    const handleWipeTransparent = () => {
        const KC_TRNS = KEYMAP['KC_TRNS']?.code ?? 1;
        batchWipeKeys(KC_TRNS, (v) => v !== KC_TRNS);
    };
    const handleChangeDisabledToTransparent = () => {
        const KC_TRNS = KEYMAP['KC_TRNS']?.code ?? 1;
        const KC_NO = 0;
        batchWipeKeys(KC_TRNS, (v) => v === KC_NO);
    };

    return (
        <>
            <div
                className="absolute flex items-center gap-2 z-10"
                style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    transform: "translate(-50%, -50%)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Color Dot with Picker */}
                <div className="relative" ref={pickerRef}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className={cn(
                                    "w-5 h-5 rounded-full shadow-sm cursor-pointer transition-transform hover:scale-110 border-2",
                                    isColorPickerOpen ? "border-black" : "border-transparent"
                                )}
                                style={{ backgroundColor: currentColorHex }}
                                onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                            />
                        </TooltipTrigger>
                        <TooltipContent side="top">Layer LED Color</TooltipContent>
                    </Tooltip>

                    {isColorPickerOpen && (
                        <div className="absolute top-[calc(100%+4px)] left-1/2 -translate-x-1/2 z-50 bg-[#EEEEEE] rounded-2xl p-2 flex flex-row items-center gap-1.5 shadow-xl border border-gray-200">
                            {allColors.map((color) => (
                                <button
                                    key={color.name}
                                    className={cn(
                                        "w-5 h-5 rounded-full transition-all hover:scale-110 border-2",
                                        currentLayerColorName === color.name ? "border-black" : "border-transparent"
                                    )}
                                    style={{ backgroundColor: color.hex }}
                                    onClick={() => handleSetColor(color.name)}
                                    title={color.name}
                                />
                            ))}
                            {/* Custom color button - always available, hardware write only happens when connected */}
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
                        </div>
                    )}
                </div>

                {/* Layer Name */}
                {isEditing ? (
                    <Input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className="h-6 py-0 px-2 text-xs font-bold border border-black rounded w-24 bg-white"
                        autoFocus
                    />
                ) : (
                    <span
                        className="text-sm font-bold text-black cursor-pointer hover:underline whitespace-nowrap"
                        onClick={handleStartEditing}
                        title="Click to rename layer"
                    >
                        {svalService.getLayerName(keyboard, selectedLayer)}
                    </span>
                )}

                {/* Layer Actions Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="hover:bg-black/10 p-1 rounded-full transition-colors flex items-center justify-center text-black outline-none">
                            <Ellipsis size={16} strokeWidth={1.5} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem onSelect={handleCopyLayer}>
                            Copy Layer
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={handlePasteLayer}>
                            Paste Layer
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
        </>
    );
};
