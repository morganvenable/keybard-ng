import React, { useState, useRef, useEffect } from "react";
import { EllipsisVertical, Settings } from "lucide-react";
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
import AtomActiveIcon from "@/components/icons/AtomActiveIcon";
import AtomIcon from "@/components/icons/AtomIcon";
import { getPresetHsv, hsvToHex, hexToHsv } from "@/utils/color-conversion";

import { cn } from "@/lib/utils";
import { KEYMAP } from "@/constants/keygen";
import { MATRIX_COLS } from "@/constants/svalboard-layout";
import CustomColorDialog from "@/components/CustomColorDialog";
import { PublishLayerDialog } from "@/components/PublishLayerDialog";

interface LayerNameBadgeProps {
    selectedLayer: number;
    /** Position in pixels from top-left of keyboard layout. If omitted, renders relatively. */
    x?: number;
    y?: number;
    className?: string;
    isActive?: boolean;
    onToggleLayerOn?: (layer: number) => void;
    defaultLayerIndex?: number;
}

/**
 * Centered layer name badge with color picker.
 * Positioned between thumb clusters in the keyboard layout.
 */
export const LayerNameBadge: React.FC<LayerNameBadgeProps> = ({
    selectedLayer,
    x,
    y,
    className,
    isActive,
    onToggleLayerOn,
    defaultLayerIndex = 0,
}) => {
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

    // Get the display color from the preset hex value or custom hex
    const getDisplayColorHex = (): string => {
        if (currentLayerColorName && currentLayerColorName.startsWith("#")) {
            return currentLayerColorName;
        }
        const preset = layerColors.find(c => c.name === currentLayerColorName);
        return preset?.hex || "#099e7c";
    };



    const displayColorHex = getDisplayColorHex();
    // const hardwareColorHex = getHardwareColorHex();

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

    const handleSetCustomColor = async (
        displayHsv: { hue: number; sat: number; val: number },
        ledHsv: { hue: number; sat: number; val: number }
    ) => {
        if (keyboard) {
            // Convert display HSV to hex and store directly as cosmetic color
            const displayHex = hsvToHex(displayHsv.hue, displayHsv.sat, displayHsv.val);

            const cosmetic = JSON.parse(JSON.stringify(keyboard.cosmetic || { layer: {}, layer_colors: {} }));
            if (!cosmetic.layer_colors) cosmetic.layer_colors = {};
            cosmetic.layer_colors[selectedLayer.toString()] = displayHex;

            // Store LED color as hardware HSV
            const updatedLayerColors = [...(keyboard.layer_colors || [])];
            updatedLayerColors[selectedLayer] = { hue: ledHsv.hue, sat: ledHsv.sat, val: ledHsv.val };

            setKeyboard({ ...keyboard, cosmetic, layer_colors: updatedLayerColors });

            if (isConnected) {
                try {
                    await usbInstance.setLayerColor(selectedLayer, ledHsv.hue, ledHsv.sat);
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
    const handleChangeTransparentToDisabled = () => {
        const KC_TRNS = KEYMAP['KC_TRNS']?.code ?? 1;
        const KC_NO = 0;
        batchWipeKeys(KC_NO, (v) => v === KC_TRNS);
    };

    const layerKeymap = keyboard?.keymap?.[selectedLayer] || [];
    const hasBlankKeys = layerKeymap.some((v) => v === 0);
    const hasTransparentKeys = layerKeymap.some((v) => v === (KEYMAP['KC_TRNS']?.code ?? 1));

    const style: React.CSSProperties = (x !== undefined && y !== undefined) ? {
        left: `${x}px`,
        top: `${y}px`,
        transform: "translate(-50%, -50%)",
        position: 'absolute'
    } : {
        position: 'relative'
    };

    return (
        <>
            <div
                className={cn(
                    "flex items-center gap-2 z-50",
                    className
                )}
                style={style}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className="w-6 h-6 flex items-center justify-center flex-shrink-0 mr-[-3px]"
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        onToggleLayerOn?.(selectedLayer);
                    }}
                >
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="flex items-center">
                                {selectedLayer === defaultLayerIndex ? (
                                    <AtomIcon
                                        className="w-5 h-5"
                                        style={{ color: displayColorHex, stroke: displayColorHex }}
                                    />
                                ) : isActive ? (
                                    <AtomActiveIcon
                                        className="w-5 h-5"
                                        style={{ color: displayColorHex, stroke: displayColorHex }}
                                    />
                                ) : null}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            {selectedLayer === defaultLayerIndex
                                ? (isActive ? "Default Layer" : "Default Layer (inactive)")
                                : (isActive ? "Active Layer" : "Inactive Layer")}
                        </TooltipContent>
                    </Tooltip>
                </div>

                {/* Display Color Dot with Picker */}
                <div className="relative" ref={pickerRef}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className={cn(
                                    "w-5 h-5 rounded-full shadow-sm cursor-pointer transition-transform hover:scale-110 border-2",
                                    isColorPickerOpen ? "border-black" : "border-transparent"
                                )}
                                style={{ backgroundColor: displayColorHex }}
                                onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                            />
                        </TooltipTrigger>
                        <TooltipContent side="top">Display Color</TooltipContent>
                    </Tooltip>

                    {isColorPickerOpen && (
                        <div className="absolute top-[calc(100%+4px)] left-1/2 -translate-x-1/2 z-[100] bg-[#EEEEEE] rounded-3xl p-2 flex flex-col items-center gap-2 shadow-xl border border-gray-200 min-w-[40px]">
                            {allColors.map((color) => (
                                <button
                                    key={color.name}
                                    className={cn(
                                        "w-5 h-5 rounded-full transition-all hover:scale-110 border-2",
                                        currentLayerColorName === color.name ? "border-black" : "border-transparent"
                                    )}
                                    style={{ backgroundColor: color.hex }}
                                    onClick={() => handleSetColor(color.name)}
                                />
                            ))}
                            {/* Custom color button - always available, hardware write only happens when connected */}
                            <button
                                className="w-5 h-5 rounded-full transition-all hover:scale-110 border-2 border-transparent bg-gray-200 flex items-center justify-center"
                                onClick={() => {
                                    setIsColorPickerOpen(false);
                                    setIsCustomColorOpen(true);
                                }}
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
                        className={cn(
                            "text-base font-medium text-black cursor-pointer hover:underline whitespace-nowrap select-none"
                        )}
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
                            <EllipsisVertical size={16} strokeWidth={1.5} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 z-[1000]">
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={handleChangeDisabledToTransparent} disabled={!hasBlankKeys}>
                            Switch Blank to Transparent
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={handleChangeTransparentToDisabled} disabled={!hasTransparentKeys}>
                            Switch Transparent to Blank
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setIsPublishDialogOpen(true)}>
                            Publish Layer...
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* LED Color Indicator - Hidden per user request */}
                {/* <Tooltip>
                    <TooltipTrigger asChild>
                        <div
                            className="w-2.5 h-2.5 rounded-full shadow-sm border border-gray-300"
                            style={{ backgroundColor: hardwareColorHex }}
                        />
                    </TooltipTrigger>
                    <TooltipContent side="top">LED Color</TooltipContent>
                </Tooltip> */}

                {/* Publish Layer Dialog */}
                <PublishLayerDialog
                    isOpen={isPublishDialogOpen}
                    onClose={() => setIsPublishDialogOpen(false)}
                    layerIndex={selectedLayer}
                />
            </div>

            {/* Custom Color Dialog */}
            {/* Custom Color Dialog */}
            <CustomColorDialog
                open={isCustomColorOpen}
                onOpenChange={setIsCustomColorOpen}
                // LED Color (Hardware)
                initialLedHue={keyboard.layer_colors?.[selectedLayer]?.hue ?? 85}
                initialLedSat={keyboard.layer_colors?.[selectedLayer]?.sat ?? 255}
                initialLedVal={keyboard.layer_colors?.[selectedLayer]?.val ?? 200}
                // Display Color (UI) - Convert current display hex to HSV
                initialDisplayHue={hexToHsv(displayColorHex).hue}
                initialDisplaySat={hexToHsv(displayColorHex).sat}
                initialDisplayVal={hexToHsv(displayColorHex).val}
                onApply={handleSetCustomColor}
                layerName={svalService.getLayerName(keyboard, selectedLayer)}
            />
        </>
    );
};
