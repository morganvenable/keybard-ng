import React from "react";
import { ArrowRight } from "lucide-react";

import SidebarItemRow from "@/layout/SecondarySidebar/components/SidebarItemRow";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { useVial } from "@/contexts/VialContext";
import { useLayer } from "@/contexts/LayerContext";
import { usePanels } from "@/contexts/PanelsContext";
import { hoverBackgroundClasses, hoverBorderClasses, hoverHeaderClasses } from "@/utils/colors";
import { getKeyContents } from "@/utils/keys";
import { Key } from "@/components/Key";
import { KeyContent, AltRepeatKeyOptions } from "@/types/vial.types";
import { vialService } from "@/services/vial.service";
import { cn } from "@/lib/utils";

const AltRepeatPanel: React.FC = () => {
    const { keyboard, setKeyboard } = useVial();
    const { selectAltRepeatKey, assignKeycode, isBinding } = useKeyBinding();
    const { selectedLayer } = useLayer();
    const {
        setItemToEdit,
        setBindingTypeToEdit,
        setAlternativeHeader,
        itemToEdit,
    } = usePanels();

    if (!keyboard) return null;

    const layerColorName = keyboard?.cosmetic?.layer_colors?.[selectedLayer] || "primary";
    const hoverBorderColor = hoverBorderClasses[layerColorName] || hoverBorderClasses["primary"];
    const hoverBackgroundColor = hoverBackgroundClasses[layerColorName] || hoverBackgroundClasses["primary"];
    const hoverHeaderClass = hoverHeaderClasses[layerColorName] || hoverHeaderClasses["primary"];

    const altRepeatKeys = keyboard.alt_repeat_keys || [];

    const handleEdit = (index: number) => {
        setItemToEdit(index);
        setBindingTypeToEdit("altrepeat");
        setAlternativeHeader(true);
    };

    const isEnabled = (options: number) => {
        return (options & AltRepeatKeyOptions.ENABLED) !== 0;
    };

    const handleToggleEnabled = async (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!keyboard.alt_repeat_keys) return;

        const entry = keyboard.alt_repeat_keys[index];
        const newOptions = entry.options ^ AltRepeatKeyOptions.ENABLED;

        const updatedKeys = [...keyboard.alt_repeat_keys];
        updatedKeys[index] = { ...entry, options: newOptions };

        const updatedKeyboard = {
            ...keyboard,
            alt_repeat_keys: updatedKeys,
        };
        setKeyboard(updatedKeyboard);

        try {
            await vialService.updateAltRepeatKey(updatedKeyboard, index);
            await vialService.saveViable(); // Persist to EEPROM
        } catch (err) {
            console.error("Failed to update alt repeat key:", err);
        }
    };

    const handleKeyClick = (index: number, slot: "keycode" | "alt_keycode") => {
        handleEdit(index);
        selectAltRepeatKey(index, slot);
    };

    const renderSmallKey = (keycode: string, index: number, slot: "keycode" | "alt_keycode", isEditing: boolean) => {
        const content = getKeyContents(keyboard, keycode) as KeyContent;
        const hasContent = keycode !== "KC_NO" && keycode !== "";
        const isSelected = isEditing && itemToEdit === index;

        return (
            <div className="relative w-[40px] h-[40px] flex items-center justify-center">
                <Key
                    isRelative
                    x={0} y={0} w={1} h={1} row={-1} col={-1}
                    keycode={keycode}
                    label={content?.str || ""}
                    keyContents={content}
                    layerColor={hasContent ? "sidebar" : undefined}
                    className={cn(
                        hasContent ? "border-kb-gray" : "bg-transparent border border-kb-gray-border",
                        isSelected && "ring-2 ring-blue-500"
                    )}
                    headerClassName={hasContent ? "bg-kb-sidebar-dark" : "text-black"}
                    variant="small"
                    onClick={() => handleKeyClick(index, slot)}
                />
            </div>
        );
    };

    const handleAssignAltRepeatKey = () => {
        if (!isBinding) return;
        assignKeycode("QK_ALT_REPEAT_KEY");
    };

    // Custom key contents for the placeable key with explicit label
    const altRepeatKeyContents: KeyContent = { str: "Alt-Repeat", type: "special" };

    return (
        <section className="space-y-3 h-full max-h-full flex flex-col pt-3">
            {/* Placeable Alt-Repeat key */}
            <div className="px-3 flex flex-col gap-2">
                <div className="flex">
                    <Key
                        isRelative
                        x={0} y={0} w={1.5} h={1} row={-1} col={-1}
                        keycode="QK_ALT_REPEAT_KEY"
                        label="Alt-Repeat"
                        keyContents={altRepeatKeyContents}
                        layerColor="sidebar"
                        className={cn(
                            "border-kb-gray cursor-pointer",
                            isBinding && `hover:${hoverBorderColor} hover:${hoverBackgroundColor}`
                        )}
                        headerClassName="bg-kb-sidebar-dark"
                        onClick={handleAssignAltRepeatKey}
                    />
                </div>
            </div>

            <div className="px-2 pb-2 text-sm text-muted-foreground">
                Alt-Repeat keys remap what happens when you press Alt-Repeat after a specific key.
                Click on a key slot to assign a keycode.
            </div>

            <div className="flex flex-col overflow-auto flex-grow scrollbar-thin">
                {altRepeatKeys.map((entry, i) => {
                    const enabled = isEnabled(entry.options);
                    const hasKeycode = entry.keycode !== "KC_NO" && entry.keycode !== "";
                    const hasAltKeycode = entry.alt_keycode !== "KC_NO" && entry.alt_keycode !== "";
                    const isDefined = hasKeycode || hasAltKeycode;
                    const isEditing = itemToEdit === i;

                    const rowChildren = (
                        <div className="flex flex-row items-center w-full">
                            <div className="flex flex-row items-center gap-2 ml-4 overflow-hidden">
                                {renderSmallKey(entry.keycode, i, "keycode", isEditing)}
                                <div className="flex items-center justify-center h-[40px]">
                                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                </div>
                                {renderSmallKey(entry.alt_keycode, i, "alt_keycode", isEditing)}
                            </div>

                            {isDefined && (
                                <div
                                    className="ml-auto mr-2 flex flex-row items-center gap-0.5 bg-gray-200/50 p-0.5 rounded-md border border-gray-300/50"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={(e) => {
                                            if (!enabled) handleToggleEnabled(i, e);
                                        }}
                                        className={cn(
                                            "px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-[3px] transition-all font-bold border",
                                            enabled
                                                ? "bg-black text-white shadow-sm border-black"
                                                : "text-gray-500 border-transparent hover:text-black hover:bg-white hover:shadow-sm"
                                        )}
                                    >
                                        ON
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            if (enabled) handleToggleEnabled(i, e);
                                        }}
                                        className={cn(
                                            "px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-[3px] transition-all font-bold border",
                                            !enabled
                                                ? "bg-black text-white shadow-sm border-black"
                                                : "text-gray-500 border-transparent hover:text-black hover:bg-white hover:shadow-sm"
                                        )}
                                    >
                                        OFF
                                    </button>
                                </div>
                            )}
                        </div>
                    );

                    const keyContents = { type: "altrepeat" } as KeyContent;

                    return (
                        <SidebarItemRow
                            key={i}
                            index={i}
                            keyboard={keyboard}
                            label={i.toString()}
                            keyContents={keyContents}
                            onEdit={handleEdit}
                            hoverBorderColor={hoverBorderColor}
                            hoverBackgroundColor={hoverBackgroundColor}
                            hoverLayerColor={layerColorName}
                            hoverHeaderClass={hoverHeaderClass}
                            showPreviewKey={false}
                            className={cn("py-4", !enabled && isDefined && "opacity-50")}
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
