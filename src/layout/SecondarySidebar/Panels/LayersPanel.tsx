import { useState } from "react";

import SidebarItemRow from "@/layout/SecondarySidebar/components/SidebarItemRow";
import { Button } from "@/components/ui/button";
import { Key } from "@/components/Key";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { useLayer } from "@/contexts/LayerContext";
import { useLayoutSettings } from "@/contexts/LayoutSettingsContext";
import { useVial } from "@/contexts/VialContext";
import { cn } from "@/lib/utils";
import { svalService } from "@/services/sval.service";
import { KeyContent } from "@/types/vial.types";
import { hoverBackgroundClasses, hoverBorderClasses, hoverHeaderClasses } from "@/utils/colors";
import { getKeyContents } from "@/utils/keys";

/**
 * Valid layer modifiers supported by the UI
 */
const LAYER_MODIFIERS = ["MO", "DF", "TG", "TT", "OSL", "TO", "LT"] as const;
type LayerModifier = (typeof LAYER_MODIFIERS)[number];

const MODIFIER_NAMES: Record<LayerModifier, string> = {
    MO: "Momentary",
    DF: "Default Layer",
    TG: "Toggle Layer",
    TT: "Tap Toggle",
    OSL: "One Shot Layer",
    TO: "To Layer",
    LT: "Layer Tap",
};

/**
 * Main panel for managing and selecting layers.
 */
interface Props {
    isPicker?: boolean;
}

const LayersPanel = ({ isPicker }: Props) => {
    const [activeModifier, setActiveModifier] = useState<LayerModifier>("MO");
    const { keyboard, setKeyboard } = useVial();
    const { assignKeycode } = useKeyBinding();
    const { selectedLayer } = useLayer();
    const { layoutMode } = useLayoutSettings();

    const isHorizontal = layoutMode === "bottombar";

    if (!keyboard) return null;

    const layerColorName = keyboard?.cosmetic?.layer_colors?.[selectedLayer] || "primary";
    const hoverBorderColor = hoverBorderClasses[layerColorName] || hoverBorderClasses["primary"];
    const hoverBackgroundColor = hoverBackgroundClasses[layerColorName] || hoverBackgroundClasses["primary"];
    const hoverHeaderClass = hoverHeaderClasses[layerColorName] || hoverHeaderClasses["primary"];

    const handleColorChange = (index: number, colorName: string) => {
        if (keyboard) {
            const cosmetic = JSON.parse(JSON.stringify(keyboard.cosmetic || { layer: {}, layer_colors: {} }));
            if (!cosmetic.layer_colors) cosmetic.layer_colors = {};
            cosmetic.layer_colors[index.toString()] = colorName;
            setKeyboard({ ...keyboard, cosmetic });
        }
    };

    const handleNameChange = (index: number, newName: string) => {
        if (keyboard) {
            const cosmetic = JSON.parse(JSON.stringify(keyboard.cosmetic || { layer: {}, layer_colors: {} }));
            if (!cosmetic.layer) cosmetic.layer = {};

            // If the input is empty, remove the custom name to revert to default
            if (newName.trim() === "") {
                delete cosmetic.layer[index.toString()];
            } else {
                cosmetic.layer[index.toString()] = newName;
            }

            setKeyboard({ ...keyboard, cosmetic });
        }
    };

    // Horizontal layout for bottom panel
    if (isHorizontal) {
        return (
            <div className="flex flex-row gap-3 h-full items-start flex-wrap content-start">
                {/* Modifier tabs - compact vertical */}
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <span className="text-[9px] font-bold text-slate-500 uppercase mb-0.5">Type</span>
                    {LAYER_MODIFIERS.map((modifier) => {
                        const isActive = modifier === activeModifier;
                        return (
                            <button
                                key={modifier}
                                onClick={() => setActiveModifier(modifier)}
                                className={cn(
                                    "px-2 py-0.5 text-[10px] font-bold rounded transition-all",
                                    isActive ? "bg-black text-white" : "text-gray-500 hover:bg-gray-100"
                                )}
                            >
                                {modifier}
                            </button>
                        );
                    })}
                </div>

                {/* Layer keys grid */}
                <div className="flex flex-row gap-1 flex-wrap items-start">
                    {Array.from({ length: keyboard.layers || 16 }, (_, i) => {
                        const layerName = (svalService.getLayerCosmetic(keyboard, i) || "").trim();
                        const keycode = activeModifier === "LT" ? `LT${i}(kc)` : `${activeModifier}(${i})`;
                        const keyContents = getKeyContents(keyboard, keycode) as KeyContent;

                        return (
                            <Key
                                key={i}
                                x={0} y={0} w={1} h={1} row={-1} col={-1}
                                keycode={keycode}
                                label={layerName || i.toString()}
                                keyContents={keyContents}
                                layerColor="sidebar"
                                headerClassName={`bg-kb-sidebar-dark ${hoverHeaderClass}`}
                                isRelative
                                variant="medium"
                                hoverBorderColor={hoverBorderColor}
                                hoverBackgroundColor={hoverBackgroundColor}
                                hoverLayerColor={layerColorName}
                                onClick={() => assignKeycode(keycode)}
                            />
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <section className="space-y-3 h-full max-h-full flex flex-col">
            {isPicker && (
                <div className="pb-2">
                    <span className="font-semibold text-xl text-slate-700">Layer Keys</span>
                </div>
            )}
            {/* Layer Modifier Selection Tabs */}
            <div className="flex flex-wrap items-center justify-start gap-4">
                <div className="flex items-center justify-between rounded-full p-1 gap-1 bg-muted/30">
                    {LAYER_MODIFIERS.map((modifier) => {
                        const isActive = modifier === activeModifier;
                        return (
                            <Button
                                key={modifier}
                                type="button"
                                size="sm"
                                variant={isActive ? "default" : "ghost"}
                                className={cn(
                                    "px-3 py-1 text-md rounded-full transition-all",
                                    isActive ? "shadow-sm bg-slate-900 border-none" : "text-black hover:bg-slate-200"
                                )}
                                onClick={() => setActiveModifier(modifier)}
                            >
                                {modifier}
                            </Button>
                        );
                    })}
                </div>
            </div>

            {/* Active Modifier Legend */}
            <div className="text-black font-bold flex justify-start items-center pt-1 pl-[26px]">
                <span className="text-md font-medium">
                    {MODIFIER_NAMES[activeModifier]}
                </span>
            </div>

            {/* Scrollable Layer List */}
            <div className="flex flex-col overflow-auto flex-grow scrollbar-thin">
                {Array.from({ length: keyboard.layers || 16 }, (_, i) => {
                    const layerName = (svalService.getLayerCosmetic(keyboard, i) || "").trim();
                    const hasCustomName = layerName !== "";
                    const layerColor = keyboard?.cosmetic?.layer_colors?.[i] ?? "primary";
                    // LT uses format LT#(key) instead of LT(#)
                    const keycode = activeModifier === "LT" ? `LT${i}(kc)` : `${activeModifier}(${i})`;
                    const keyContents = getKeyContents(keyboard, keycode) as KeyContent;

                    return (
                        <SidebarItemRow
                            key={i}
                            index={i}
                            keyboard={keyboard}
                            keycode={keycode}
                            label={i.toString()}
                            keyContents={keyContents}
                            color={layerColor}
                            hasCustomName={hasCustomName}
                            customName={layerName}
                            onAssignKeycode={assignKeycode}
                            onColorChange={isPicker ? undefined : handleColorChange}
                            onNameChange={isPicker ? undefined : handleNameChange}
                            hoverBorderColor={hoverBorderColor}
                            hoverBackgroundColor={hoverBackgroundColor}
                            hoverLayerColor={layerColorName}
                            hoverHeaderClass={hoverHeaderClass}
                        />
                    );
                })}
            </div>
        </section>
    );
};

export default LayersPanel;
