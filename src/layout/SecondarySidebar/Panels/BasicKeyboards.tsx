import { useEffect, useState } from "react";

import QwertyKeyboard from "@/components/Keyboards/QwertyKeyboard";
import { Button } from "@/components/ui/button";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { useLayer } from "@/contexts/LayerContext";
import { useLayoutSettings } from "@/contexts/LayoutSettingsContext";
import { useVial } from "@/contexts/VialContext";
import { hoverBackgroundClasses, hoverBorderClasses, hoverHeaderClasses } from "@/utils/colors";
import { cn } from "@/lib/utils";
import { KeyboardInfo, KeyContent } from "@/types/vial.types";
import { Key } from "@/components/Key";
import { getKeyContents } from "@/utils/keys";
import { keyService } from "@/services/key.service";

import { BUTTON_TO_KEYCODE_MAP, LAYOUTS } from "@/components/Keyboards/layouts";

const getKeyCodeForButton = (keyboard: KeyboardInfo, button: string): string | undefined => {
    const k = BUTTON_TO_KEYCODE_MAP[button] || BUTTON_TO_KEYCODE_MAP[button.toLowerCase()];
    if (k) return k;
    const customKeycode = keyboard.custom_keycodes?.findIndex((ck) => ck.name === button);
    if (customKeycode === undefined || customKeycode < 0) return button;
    return `USER${customKeycode?.toString().padStart(2, "0")}`;
};

export const modifierOptions = ["Shift", "Ctrl", "Alt", "Gui"] as const;
export type Modifier = typeof modifierOptions[number];

// Helper to apply modifiers to a keycode
const MODIFIER_MAP: Record<number, string> = {
    1: "LCTL",
    2: "LSFT",
    3: "C_S",
    4: "LALT",
    5: "LCA",
    6: "LSA",
    7: "MEH",
    8: "LGUI",
    9: "LCG",
    10: "SGUI",
    11: "LSCG",
    12: "LAG",
    13: "LCAG",
    14: "LSAG",
    15: "HYPR",
};

// Mod-Tap variants (hold for modifier, tap for keycode)
const MOD_TAP_MAP: Record<number, string> = {
    1: "LCTL_T",
    2: "LSFT_T",
    3: "C_S_T",
    4: "LALT_T",
    5: "LCA_T",
    6: "LSA_T",
    7: "MEH_T",
    8: "LGUI_T",
    9: "LCG_T",
    10: "SGUI_T",
    11: "LSCG_T",
    12: "LAG_T",
    13: "LCAG_T",
    14: "LSAG_T",
    15: "HYPR_T",
};

// One-Shot Modifier keycodes (standalone, don't wrap a keycode)
const ONE_SHOT_MAP: Record<number, string> = {
    1: "OSM(MOD_LCTL)",
    2: "OSM(MOD_LSFT)",
    3: "OSM(MOD_LCTL|MOD_LSFT)",
    4: "OSM(MOD_LALT)",
    5: "OSM(MOD_LCTL|MOD_LALT)",
    6: "OSM(MOD_LSFT|MOD_LALT)",
    7: "OSM(MOD_MEH)",
    8: "OSM(MOD_LGUI)",
    9: "OSM(MOD_LCTL|MOD_LGUI)",
    10: "OSM(MOD_LSFT|MOD_LGUI)",
    11: "OSM(MOD_LCTL|MOD_LSFT|MOD_LGUI)",
    12: "OSM(MOD_LALT|MOD_LGUI)",
    13: "OSM(MOD_LCTL|MOD_LALT|MOD_LGUI)",
    14: "OSM(MOD_LSFT|MOD_LALT|MOD_LGUI)",
    15: "OSM(MOD_HYPR)",
};

// Helper to get modifier bitmask
const getModifierMask = (activeModifiers: Modifier[]): number => {
    const hasCtrl = activeModifiers.includes("Ctrl");
    const hasShift = activeModifiers.includes("Shift");
    const hasAlt = activeModifiers.includes("Alt");
    const hasGui = activeModifiers.includes("Gui");
    return (hasCtrl ? 1 : 0) | (hasShift ? 2 : 0) | (hasAlt ? 4 : 0) | (hasGui ? 8 : 0);
};

// Get the OSM keycode string for the currently active modifiers (or null if none)
const getOsmKeycode = (activeModifiers: Modifier[]): string | null => {
    if (activeModifiers.length === 0) return null;
    const mask = getModifierMask(activeModifiers);
    return ONE_SHOT_MAP[mask] || null;
};

// Helper to apply modifiers to a keycode
const applyModifiers = (keycode: string, activeModifiers: Modifier[], isModTap: boolean) => {
    if (activeModifiers.length === 0) return keycode;

    const mask = getModifierMask(activeModifiers);
    const modMap = isModTap ? MOD_TAP_MAP : MODIFIER_MAP;
    const modifierFunc = modMap[mask];
    return modifierFunc ? `${modifierFunc}(${keycode})` : keycode;
};

interface Props {
    isPicker?: boolean;
}

const BasicKeyboards = ({ isPicker }: Props) => {
    const [activeModifiers, setActiveModifiers] = useState<Modifier[]>([]);
    const [modTapEnabled, setModTapEnabled] = useState(false);
    const { assignKeycode, isBinding } = useKeyBinding();
    const { keyboard } = useVial();
    const { selectedLayer } = useLayer();
    const { keyVariant, layoutMode, internationalLayout, setInternationalLayout } = useLayoutSettings();

    const isHorizontal = layoutMode === "bottombar";

    useEffect(() => {
        setActiveModifiers([]);
        setModTapEnabled(false);
           }, []);

    const layerColorName = keyboard?.cosmetic?.layer_colors?.[selectedLayer] || "primary";
    const hoverBorderColor = hoverBorderClasses[layerColorName] || hoverBorderClasses["primary"];
    const hoverBackgroundColor = hoverBackgroundClasses[layerColorName] || hoverBackgroundClasses["primary"];
    const hoverHeaderClass = hoverHeaderClasses[layerColorName] || hoverHeaderClasses["primary"];

    const handleModifierToggle = (modifier: Modifier) => {
        setActiveModifiers((prev) => {
            if (prev.includes(modifier)) {
                return prev.filter((item) => item !== modifier);
            }
            return [...prev, modifier];
        });
    };

    const handleKeyClick = (keycode: string) => {
        if (!isBinding || !keyboard) return;

        // Ensure we translate names like 'SV_...' to actual keycodes if needed
        const mappedKeycode = getKeyCodeForButton(keyboard, keycode) || keycode;
        // Blank and Transparent keys are never modified
        const isBlank = keycode === "KC_NO" || keycode === "KC_TRNS";
        const finalKeycode = isBlank ? mappedKeycode : applyModifiers(mappedKeycode, activeModifiers, modTapEnabled);
        assignKeycode(finalKeycode);
        // Clear modifiers after placing a key so they don't persist unexpectedly
        if (activeModifiers.length > 0 || modTapEnabled) {
            setActiveModifiers([]);
            setModTapEnabled(false);
        }
    };

    const handleKeyboardInput = (button: string) => {
        if (!isBinding || !keyboard) return;
        handleKeyClick(button);
    };

    const numpadKeys = [
        { keycode: "KC_PSCR", label: "PrtSc" }, { keycode: "KC_SLCK", label: "ScrLk" }, { keycode: "KC_PAUS", label: "Pause" },
        { keycode: "KC_NLCK", label: "NumLk" }, { keycode: "KC_PEQL", label: "=" }, { keycode: "KC_KP_SLASH", label: "/" }, { keycode: "KC_KP_ASTERISK", label: "*" },

        { keycode: "KC_INS", label: "Ins" }, { keycode: "KC_HOME", label: "Home" }, { keycode: "KC_PGUP", label: "PgUp" },
        { keycode: "KC_KP_7", label: "7" }, { keycode: "KC_KP_8", label: "8" }, { keycode: "KC_KP_9", label: "9" }, { keycode: "KC_KP_MINUS", label: "-" },

        { keycode: "KC_DEL", label: "Del" }, { keycode: "KC_END", label: "End" }, { keycode: "KC_PGDN", label: "PgDn" },
        { keycode: "KC_KP_4", label: "4" }, { keycode: "KC_KP_5", label: "5" }, { keycode: "KC_KP_6", label: "6" }, { keycode: "KC_KP_PLUS", label: "+" },

        { keycode: "BLANK", label: "" }, { keycode: "KC_UP", label: "Up" }, { keycode: "BLANK", label: "" },
        { keycode: "KC_KP_1", label: "1" }, { keycode: "KC_KP_2", label: "2" }, { keycode: "KC_KP_3", label: "3" }, { keycode: "KC_KP_ENTER", label: "Enter" },

        { keycode: "KC_LEFT", label: "Left" }, { keycode: "KC_DOWN", label: "Down" }, { keycode: "KC_RGHT", label: "Right" },
        { keycode: "KC_KP_0", label: "0" }, { keycode: "KC_KP_DOT", label: "." },
    ];


    const blankKeys = [
        { keycode: "KC_NO", label: "" },
        { keycode: "KC_TRNS", label: "▽" },
    ];

    const numpadGridCols = 'grid-cols-[repeat(7,45px)]'; // Always medium for sidebar numpad

    const renderKeyGrid = (keys: { keycode: string, label: string, useServiceLabel?: boolean }[], gridCols?: string, variantOverride?: "small" | "medium" | "default") => {
        const effectiveVariant = variantOverride || keyVariant;
        const blankSize = effectiveVariant === 'small' ? 'w-[30px] h-[30px]' : effectiveVariant === 'medium' ? 'w-[45px] h-[45px]' : 'w-[60px] h-[60px]';
        return (
        <div className={cn("gap-1", gridCols ? `grid ${gridCols}` : "flex flex-wrap")}>
            {keys.map((k, i) => {
                if (k.keycode === "BLANK") {
                    return <div key={`blank-${i}`} className={blankSize} />;
                }
                const keyContents = keyboard ? getKeyContents(keyboard, k.keycode) : undefined;
                // Use custom label for numpad keys, otherwise fall back to keyService
                const displayLabel = k.useServiceLabel ? (keyService.define(k.keycode)?.str || k.label || k.keycode) : (k.label || k.keycode);
                const isDoubleHeight = k.keycode === "KC_KP_ENTER";

                return (
                    <Key
                        key={`${k.keycode}-${i}`}
                        x={0} y={0} w={1} h={1} row={0} col={0}
                        keycode={k.keycode}
                        label={displayLabel}
                        keyContents={keyContents as KeyContent | undefined}
                        layerColor="sidebar"
                        headerClassName={`bg-kb-sidebar-dark ${hoverHeaderClass}`}
                        isRelative
                        variant={effectiveVariant}
                        className={cn(
                            isDoubleHeight ? "row-span-2" : ""
                        )}
                        hoverBorderColor={hoverBorderColor}
                        hoverBackgroundColor={hoverBackgroundColor}
                        hoverLayerColor={layerColorName}
                        onClick={() => handleKeyClick(k.keycode)}
                    />
                );
            })}
        </div>
    );
    };

    // Compact horizontal layout for bottom panel
    if (isHorizontal) {
        return (
            <div className="flex flex-row gap-3 h-full items-start">
                {/* Left column: Language selector + Modifiers */}
                <div className="flex flex-col gap-1 flex-shrink-0">
                    {/* Language selector at top */}
                    <select
                        className="border rounded text-[10px] text-slate-600 py-0.5 px-1 border-gray-200 bg-gray-50 !outline-none focus:border-gray-300 cursor-pointer w-full mb-1"
                        value={internationalLayout}
                        onChange={(e) => setInternationalLayout(e.target.value)}
                        title="Keyboard layout"
                    >
                        {Object.values(LAYOUTS).map((kb: any) => (
                            <option key={kb.value} value={kb.value}>
                                {kb.value.toUpperCase()}
                            </option>
                        ))}
                    </select>

                    {/* Modifiers section */}
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Modifiers</span>
                    <Button
                        type="button"
                        variant={activeModifiers.length === 0 ? "default" : "secondary"}
                        size="sm"
                        className={cn(
                            "rounded-md px-2 py-0.5 h-6 transition-all text-[10px] font-medium border-none w-full",
                            activeModifiers.length === 0 ? "bg-kb-sidebar-dark text-white shadow-sm" : "bg-kb-gray-medium text-slate-700 hover:bg-white"
                        )}
                        onClick={() => { setActiveModifiers([]); setModTapEnabled(false);}}
                        title="Clear modifiers"
                    >
                        None
                    </Button>

                    {/* Modifier 2x2 grid */}
                    <div className="grid grid-cols-2 gap-0.5">
                        {modifierOptions.map((modifier) => {
                            const isActive = activeModifiers.includes(modifier);
                            return (
                                <Button
                                    key={modifier}
                                    type="button"
                                    variant={isActive ? "default" : "secondary"}
                                    size="sm"
                                    className={cn(
                                        "rounded-md px-0.5 py-0.5 h-6 transition-all text-[8px] font-medium border-none",
                                        isActive ? "bg-kb-sidebar-dark text-white shadow-sm" : "bg-kb-gray-medium text-slate-700 hover:bg-white"
                                    )}
                                    onClick={() => handleModifierToggle(modifier)}
                                    title={modifier}
                                >
                                    {modifier.toUpperCase()}
                                </Button>
                            );
                        })}
                    </div>

                    {/* Mod-Tap / One-Shot toggles */}
                    <div className="border-t border-gray-200 pt-1 mt-1 flex flex-col gap-0.5">
                        <Button
                            type="button"
                            variant={modTapEnabled ? "default" : "secondary"}
                            size="sm"
                            className={cn(
                                "rounded-md px-1 py-0.5 h-6 transition-all text-[9px] font-medium border-none w-full",
                                modTapEnabled ? "bg-kb-sidebar-dark text-white shadow-sm" : "bg-kb-gray-medium text-slate-700 hover:bg-white",
                                activeModifiers.length === 0 && "opacity-50 cursor-not-allowed"
                            )}
                            onClick={() => { setModTapEnabled(!modTapEnabled);}}
                            disabled={activeModifiers.length === 0}
                            title="Mod-Tap: Hold for modifier, tap for key"
                        >
                            Mod-Tap
                        </Button>
                        {/* One-Shot: rendered as a draggable Key when modifiers are selected */}
                        {(() => {
                            const osmKc = getOsmKeycode(activeModifiers);
                            if (osmKc && keyboard) {
                                const osmContents = getKeyContents(keyboard, osmKc);
                                return (
                                    <Key
                                        x={0} y={0} w={1} h={1} row={0} col={0}
                                        keycode={osmKc}
                                        label={osmContents?.str || "OSM"}
                                        keyContents={osmContents}
                                        layerColor="sidebar"
                                        headerClassName={`bg-kb-sidebar-dark ${hoverHeaderClass}`}
                                        isRelative
                                        variant="small"
                                        className="h-[30px] w-full"
                                        onClick={() => assignKeycode(osmKc)}
                                        hoverBorderColor={hoverBorderColor}
                                        hoverBackgroundColor={hoverBackgroundColor}
                                        hoverLayerColor={layerColorName}
                                    />
                                );
                            }
                            const placeholderContents = keyboard ? getKeyContents(keyboard, "OSM(MOD_LCTL)") : undefined;
                            return (
                                <div className="opacity-30 pointer-events-none w-full">
                                    <Key
                                        x={0} y={0} w={1} h={1} row={0} col={0}
                                        keycode="OSM(MOD_LCTL)"
                                        label="OSM"
                                        keyContents={placeholderContents}
                                        layerColor="sidebar"
                                        headerClassName="bg-kb-sidebar-dark"
                                        isRelative
                                        variant="small"
                                        className="h-[30px] w-full"
                                        disableHover
                                    />
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* QWERTY keyboard - main content, no language selector here */}
                <div className="flex-shrink-0">
                    <QwertyKeyboard onKeyPress={handleKeyboardInput} activeModifiers={activeModifiers} hideLanguageSelector />
                </div>

                {/* Blank/Transparent keys */}
                <div className="flex flex-col gap-1 flex-shrink-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Blank</span>
                    <div className="flex flex-col gap-1">
                        {blankKeys.map((k, i) => {
                            const keyContents = keyboard ? getKeyContents(keyboard, k.keycode) : undefined;
                            return (
                                <Key
                                    key={`${k.keycode}-${i}`}
                                    x={0} y={0} w={1} h={1} row={0} col={0}
                                    keycode={k.keycode}
                                    label={k.label || k.keycode}
                                    keyContents={keyContents as KeyContent | undefined}
                                    layerColor="sidebar"
                                    headerClassName={`bg-kb-sidebar-dark ${hoverHeaderClass}`}
                                    isRelative
                                    variant="small"
                                    hoverBorderColor={hoverBorderColor}
                                    hoverBackgroundColor={hoverBackgroundColor}
                                    hoverLayerColor={layerColorName}
                                    onClick={() => handleKeyClick(k.keycode)}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Numpad section - compact grid */}
                <div className="flex flex-col gap-1 flex-shrink-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Numpad</span>
                    <div className="grid grid-cols-7 gap-0.5">
                        {numpadKeys.map((k, i) => {
                            if (k.keycode === "BLANK") {
                                return <div key={`blank-${i}`} className="w-[30px] h-[30px]" />;
                            }
                            const keyContents = keyboard ? getKeyContents(keyboard, k.keycode) : undefined;
                            const displayLabel = k.label || k.keycode;
                            return (
                                <Key
                                    key={`${k.keycode}-${i}`}
                                    x={0} y={0} w={1} h={1} row={0} col={0}
                                    keycode={k.keycode}
                                    label={displayLabel}
                                    keyContents={keyContents as KeyContent | undefined}
                                    layerColor="sidebar"
                                    headerClassName={`bg-kb-sidebar-dark ${hoverHeaderClass}`}
                                    isRelative
                                    variant="small"
                                    hoverBorderColor={hoverBorderColor}
                                    hoverBackgroundColor={hoverBackgroundColor}
                                    hoverLayerColor={layerColorName}
                                    onClick={() => handleKeyClick(k.keycode)}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // Standard vertical layout for sidebar
    return (
        <div className="space-y-6 relative">
            {isPicker && (
                <div className="pb-2">
                    <span className="font-semibold text-xl text-slate-700">Keyboard</span>
                </div>
            )}
            <section className="flex flex-col gap-2 sticky top-0 z-20 bg-white pt-4 pb-4 -mt-4">
                <span className="font-semibold text-lg text-slate-700">Modifiers</span>
                <div className="flex flex-wrap items-center gap-1">
                    <Button
                        type="button"
                        variant={activeModifiers.length === 0 ? "default" : "secondary"}
                        size="sm"
                        className={cn(
                            "rounded-md px-2 py-1 h-8 transition-all text-xs font-medium border-none",
                            activeModifiers.length === 0 ? "bg-kb-sidebar-dark text-white shadow-sm" : "bg-kb-gray-medium text-slate-700 hover:bg-white"
                        )}
                        onClick={() => { setActiveModifiers([]); setModTapEnabled(false);}}
                        title="Clear modifiers"
                    >
                        None
                    </Button>
                    {modifierOptions.map((modifier) => {
                        const isActive = activeModifiers.includes(modifier);
                        return (
                            <Button
                                key={modifier}
                                type="button"
                                variant={isActive ? "default" : "secondary"}
                                size="sm"
                                className={cn(
                                    "rounded-md px-3 py-1 h-8 transition-all text-xs font-medium border-none",
                                    isActive ? "bg-kb-sidebar-dark text-white shadow-sm" : "bg-kb-gray-medium text-slate-700 hover:bg-white"
                                )}
                                onClick={() => handleModifierToggle(modifier)}
                            >
                                {modifier.toUpperCase()}
                            </Button>
                        );
                    })}

                    {/* Mod-Tap / One-Shot toggles */}
                    <div className="border-l border-gray-300 pl-2 ml-2 flex items-center gap-1">
                        <Button
                            type="button"
                            variant={modTapEnabled ? "default" : "secondary"}
                            size="sm"
                            className={cn(
                                "rounded-md px-2 py-1 h-8 transition-all text-xs font-medium border-none",
                                modTapEnabled ? "bg-kb-sidebar-dark text-white shadow-sm" : "bg-kb-gray-medium text-slate-700 hover:bg-white",
                                activeModifiers.length === 0 && "opacity-50 cursor-not-allowed"
                            )}
                            onClick={() => { setModTapEnabled(!modTapEnabled);}}
                            disabled={activeModifiers.length === 0}
                            title="Mod-Tap: Hold for modifier, tap for key"
                        >
                            Mod-Tap
                        </Button>
                        {/* One-Shot: rendered as a draggable Key when modifiers are selected */}
                        {(() => {
                            const osmKc = getOsmKeycode(activeModifiers);
                            const sidebarVariant = keyVariant === 'small' ? 'small' as const : 'medium' as const;
                            const sidebarSizeClass = sidebarVariant === 'small' ? 'h-[30px] w-[60px]' : 'h-[45px] w-[90px]';
                            if (osmKc && keyboard) {
                                const osmContents = getKeyContents(keyboard, osmKc);
                                return (
                                    <Key
                                        x={0} y={0} w={1} h={1} row={0} col={0}
                                        keycode={osmKc}
                                        label={osmContents?.str || "OSM"}
                                        keyContents={osmContents}
                                        layerColor="sidebar"
                                        headerClassName={`bg-kb-sidebar-dark ${hoverHeaderClass}`}
                                        isRelative
                                        variant={sidebarVariant}
                                        className={sidebarSizeClass}
                                        onClick={() => assignKeycode(osmKc)}
                                        hoverBorderColor={hoverBorderColor}
                                        hoverBackgroundColor={hoverBackgroundColor}
                                        hoverLayerColor={layerColorName}
                                    />
                                );
                            }
                            const placeholderContents = keyboard ? getKeyContents(keyboard, "OSM(MOD_LCTL)") : undefined;
                            return (
                                <div className="opacity-30 pointer-events-none">
                                    <Key
                                        x={0} y={0} w={1} h={1} row={0} col={0}
                                        keycode="OSM(MOD_LCTL)"
                                        label="OSM"
                                        keyContents={placeholderContents}
                                        layerColor="sidebar"
                                        headerClassName="bg-kb-sidebar-dark"
                                        isRelative
                                        variant={sidebarVariant}
                                        className={sidebarSizeClass}
                                        disableHover
                                    />
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </section>

            <QwertyKeyboard onKeyPress={handleKeyboardInput} activeModifiers={activeModifiers} />

            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <span className="font-semibold text-lg text-slate-700">Blank and Transparent</span>
                    {renderKeyGrid(blankKeys, undefined, "medium")}
                </div>
                <div className="flex flex-col gap-2">
                    <span className="font-semibold text-lg text-slate-700">Numpad</span>
                    {renderKeyGrid(numpadKeys, numpadGridCols, "medium")}
                </div>
            </div>
        </div>
    );
};

export default BasicKeyboards;
