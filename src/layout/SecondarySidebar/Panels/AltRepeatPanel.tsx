import React from "react";
import { ArrowRight, ToggleLeft, ToggleRight } from "lucide-react";

import SidebarItemRow from "@/layout/SecondarySidebar/components/SidebarItemRow";
import { useVial } from "@/contexts/VialContext";
import { useLayer } from "@/contexts/LayerContext";
import { hoverBackgroundClasses, hoverBorderClasses, hoverHeaderClasses } from "@/utils/colors";
import { getKeyContents } from "@/utils/keys";
import { Key } from "@/components/Key";
import { KeyContent, AltRepeatKeyEntry, AltRepeatKeyOptions } from "@/types/vial.types";
import { vialService } from "@/services/vial.service";
import { cn } from "@/lib/utils";

const AltRepeatPanel: React.FC = () => {
    const { keyboard, setKeyboard } = useVial();
    const { selectedLayer } = useLayer();

    if (!keyboard) return null;

    const layerColorName = keyboard?.cosmetic?.layer_colors?.[selectedLayer] || "primary";
    const hoverBorderColor = hoverBorderClasses[layerColorName] || hoverBorderClasses["primary"];
    const hoverBackgroundColor = hoverBackgroundClasses[layerColorName] || hoverBackgroundClasses["primary"];
    const hoverHeaderClass = hoverHeaderClasses[layerColorName] || hoverHeaderClasses["primary"];

    const altRepeatKeys = keyboard.alt_repeat_keys || [];

    const isEnabled = (entry: AltRepeatKeyEntry) => {
        return (entry.options & AltRepeatKeyOptions.ENABLED) !== 0;
    };

    const handleToggleEnabled = async (index: number) => {
        if (!keyboard.alt_repeat_keys) return;

        const entry = keyboard.alt_repeat_keys[index];
        const newOptions = entry.options ^ AltRepeatKeyOptions.ENABLED; // Toggle the enabled bit

        // Update local state
        const updatedKeys = [...keyboard.alt_repeat_keys];
        updatedKeys[index] = { ...entry, options: newOptions };

        const updatedKeyboard = {
            ...keyboard,
            alt_repeat_keys: updatedKeys,
        };
        setKeyboard(updatedKeyboard);

        // Send to keyboard
        try {
            await vialService.updateAltRepeatKey(updatedKeyboard, index);
        } catch (err) {
            console.error("Failed to update alt repeat key:", err);
        }
    };

    const renderSmallKey = (keycode: string, isEmpty: boolean = false) => {
        const content = getKeyContents(keyboard, keycode) as KeyContent;
        const hasContent = !isEmpty && keycode !== "KC_NO" && keycode !== "";

        return (
            <div className="relative w-[40px] h-[40px]">
                <Key
                    isRelative
                    x={0} y={0} w={1} h={1} row={-1} col={-1}
                    keycode={keycode}
                    label=""
                    keyContents={content}
                    layerColor={hasContent ? "sidebar" : undefined}
                    className={hasContent ? "border-kb-gray" : "bg-transparent border border-kb-gray-border"}
                    headerClassName={hasContent ? "bg-kb-sidebar-dark" : "text-black"}
                    variant="small"
                />
            </div>
        );
    };

    return (
        <section className="space-y-3 h-full max-h-full flex flex-col pt-3">
            {/* Info text */}
            <div className="px-2 pb-2 text-sm text-muted-foreground">
                Alt-Repeat keys allow you to remap what happens when you press the Repeat Key after a specific key.
            </div>

            {/* Scrollable Alt Repeat Keys List */}
            <div className="flex flex-col overflow-auto flex-grow scrollbar-thin">
                {altRepeatKeys.map((entry, i) => {
                    const enabled = isEnabled(entry);
                    const keycodeContent = getKeyContents(keyboard, entry.keycode) as KeyContent;
                    const hasKeycode = entry.keycode !== "KC_NO" && entry.keycode !== "";
                    const hasAltKeycode = entry.alt_keycode !== "KC_NO" && entry.alt_keycode !== "";

                    const rowChildren = (hasKeycode || hasAltKeycode) ? (
                        <div className="flex flex-row items-center gap-2 ml-4 overflow-hidden">
                            {renderSmallKey(entry.keycode, !hasKeycode)}
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            {renderSmallKey(entry.alt_keycode, !hasAltKeycode)}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleEnabled(i);
                                }}
                                className={cn(
                                    "ml-2 p-1 rounded transition-colors",
                                    enabled ? "text-green-600 hover:text-green-700" : "text-gray-400 hover:text-gray-500"
                                )}
                                title={enabled ? "Enabled - Click to disable" : "Disabled - Click to enable"}
                            >
                                {enabled ? (
                                    <ToggleRight className="w-6 h-6" />
                                ) : (
                                    <ToggleLeft className="w-6 h-6" />
                                )}
                            </button>
                        </div>
                    ) : undefined;

                    // Use type for icon styling
                    const keyContents = { type: "altrepeat" } as KeyContent;

                    return (
                        <SidebarItemRow
                            key={i}
                            index={i}
                            keyboard={keyboard}
                            label={i.toString()}
                            keycode={entry.keycode || "KC_NO"}
                            keyContents={keyContents}
                            hoverBorderColor={hoverBorderColor}
                            hoverBackgroundColor={hoverBackgroundColor}
                            hoverLayerColor={layerColorName}
                            hoverHeaderClass={hoverHeaderClass}
                            showPreviewKey={false}
                            className={cn("py-4", !enabled && "opacity-50")}
                        >
                            {rowChildren}
                        </SidebarItemRow>
                    );
                })}

                {altRepeatKeys.length === 0 && (
                    <div className="text-center text-gray-500 mt-10">
                        <p>No alt-repeat keys configured.</p>
                        <p className="text-sm mt-2">This keyboard may not support alt-repeat keys.</p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default AltRepeatPanel;
