import { FC, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

import { Key } from "@/components/Key";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { usePanels } from "@/contexts/PanelsContext";
import { useVial } from "@/contexts/VialContext";
import { cn } from "@/lib/utils";
import { getKeyContents } from "@/utils/keys";

interface Props { }

const MOD_MASKS = {
    // Left
    LCTRL: 1,
    LSHIFT: 2,
    LALT: 4,
    LGUI: 8,
    // Right
    RCTRL: 16,
    RSHIFT: 32,
    RALT: 64,
    RGUI: 128,
};

const MOD_TYPES = ["Shift", "Ctrl", "Alt", "Gui"] as const;
type ModType = typeof MOD_TYPES[number];

const SIDES = ["Either", "Left", "Right"] as const;
type SideType = typeof SIDES[number];

const TABS = ["Trigger", "Negative", "Suspended"] as const;
type TabType = typeof TABS[number];

const OPTIONS = [
    { label: "Active on trigger down", bit: 1 << 0 },
    { label: "Active on mod down", bit: 1 << 1 },
    { label: "Active on negative mod down", bit: 1 << 2 },
    { label: "Active trigger mod activates", bit: 1 << 3 },
    { label: "Reregister trigger on deactivate", bit: 1 << 4 },
    { label: "No unregister on other key down", bit: 1 << 5 },
] as const;

const ENABLED_BIT = 1 << 7;

const OverrideEditor: FC<Props> = () => {
    const { keyboard, setKeyboard } = useVial();
    const { itemToEdit } = usePanels();
    const { selectOverrideKey, selectedTarget } = useKeyBinding();
    const [activeTab, setActiveTab] = useState<TabType>("Trigger");

    const overrideIndex = itemToEdit!;
    const override = keyboard?.key_overrides?.[overrideIndex];

    const isSlotSelected = (slot: "trigger" | "replacement") => {
        return (
            selectedTarget?.type === "override" &&
            selectedTarget.overrideId === overrideIndex &&
            selectedTarget.overrideSlot === slot
        );
    };

    const getActiveMask = () => {
        if (!override) return 0;
        switch (activeTab) {
            case "Trigger": return override.trigger_mods;
            case "Negative": return override.negative_mod_mask;
            case "Suspended": return override.suppressed_mods;
        }
    };

    const updateMask = (newMask: number) => {
        if (!keyboard || !override) return;
        const updatedKeyboard = JSON.parse(JSON.stringify(keyboard));
        const ovr = updatedKeyboard.key_overrides[overrideIndex];
        switch (activeTab) {
            case "Trigger": ovr.trigger_mods = newMask; break;
            case "Negative": ovr.negative_mod_mask = newMask; break;
            case "Suspended": ovr.suppressed_mods = newMask; break;
        }
        setKeyboard(updatedKeyboard);
    };

    const updateOption = (bit: number, checked: boolean) => {
        if (!keyboard || !override) return;
        const updatedKeyboard = JSON.parse(JSON.stringify(keyboard));
        let options = updatedKeyboard.key_overrides[overrideIndex].options;
        if (checked) options |= bit;
        else options &= ~bit;
        updatedKeyboard.key_overrides[overrideIndex].options = options;
        setKeyboard(updatedKeyboard);
    };

    const updateLayer = (layer: number, active: boolean) => {
        if (!keyboard || !override) return;
        const updatedKeyboard = JSON.parse(JSON.stringify(keyboard));
        let layers = updatedKeyboard.key_overrides[overrideIndex].layers;
        if (active) layers |= (1 << layer);
        else layers &= ~(1 << layer);
        updatedKeyboard.key_overrides[overrideIndex].layers = layers;
        setKeyboard(updatedKeyboard);
    };

    const currentMask = getActiveMask();

    // Derived UI State from currentMask
    const activeMods = useMemo(() => {
        const mods = new Set<ModType>();
        if (currentMask & (MOD_MASKS.LSHIFT | MOD_MASKS.RSHIFT)) mods.add("Shift");
        if (currentMask & (MOD_MASKS.LCTRL | MOD_MASKS.RCTRL)) mods.add("Ctrl");
        if (currentMask & (MOD_MASKS.LALT | MOD_MASKS.RALT)) mods.add("Alt");
        if (currentMask & (MOD_MASKS.LGUI | MOD_MASKS.RGUI)) mods.add("Gui");
        return Array.from(mods);
    }, [currentMask]);

    const activeSides = useMemo(() => {
        const sides = { left: false, right: false };
        if (currentMask & (MOD_MASKS.LSHIFT | MOD_MASKS.LCTRL | MOD_MASKS.LALT | MOD_MASKS.LGUI)) {
            sides.left = true;
        }
        if (currentMask & (MOD_MASKS.RSHIFT | MOD_MASKS.RCTRL | MOD_MASKS.RALT | MOD_MASKS.RGUI)) {
            sides.right = true;
        }
        return sides;
    }, [currentMask]);

    const isEither = activeSides.left && activeSides.right;

    const handleModClick = (mod: ModType) => {
        const isActive = activeMods.includes(mod);
        let currentSides = { ...activeSides };

        // Default to Either (Both) if no sides are active when a modifier is toggled
        if (!currentSides.left && !currentSides.right) {
            currentSides.left = true;
            currentSides.right = true;
        }

        let newMask = currentMask;

        const getBits = (m: ModType) => {
            switch (m) {
                case "Shift": return [MOD_MASKS.LSHIFT, MOD_MASKS.RSHIFT];
                case "Ctrl": return [MOD_MASKS.LCTRL, MOD_MASKS.RCTRL];
                case "Alt": return [MOD_MASKS.LALT, MOD_MASKS.RALT];
                case "Gui": return [MOD_MASKS.LGUI, MOD_MASKS.RGUI];
            }
        };

        const [lBit, rBit] = getBits(mod);

        if (isActive) {
            newMask &= ~lBit;
            newMask &= ~rBit;
        } else {
            if (currentSides.left) newMask |= lBit;
            if (currentSides.right) newMask |= rBit;
        }

        updateMask(newMask);
    };

    const handleSideClick = (side: SideType) => {
        let newLeft = activeSides.left;
        let newRight = activeSides.right;

        if (side === "Either") {
            // Activate both
            newLeft = true;
            newRight = true;
        } else if (side === "Left") {
            newLeft = !newLeft;
        } else if (side === "Right") {
            newRight = !newRight;
        }

        // Reconstruct mask completely to avoid stale bits
        let newMask = 0;
        activeMods.forEach(mod => {
            if (mod === "Shift") {
                if (newLeft) newMask |= MOD_MASKS.LSHIFT;
                if (newRight) newMask |= MOD_MASKS.RSHIFT;
            } else if (mod === "Ctrl") {
                if (newLeft) newMask |= MOD_MASKS.LCTRL;
                if (newRight) newMask |= MOD_MASKS.RCTRL;
            } else if (mod === "Alt") {
                if (newLeft) newMask |= MOD_MASKS.LALT;
                if (newRight) newMask |= MOD_MASKS.RALT;
            } else if (mod === "Gui") {
                if (newLeft) newMask |= MOD_MASKS.LGUI;
                if (newRight) newMask |= MOD_MASKS.RGUI;
            }
        });

        // Corner case: if no mods are selected, clicking sides does nothing to the mask 
        // because we don't know WHICH mod to set bit for.
        // But the user might expect just sides to be "active" waiting for a mod.
        // Since we don't store "active sides" in state (we derive from mask), 
        // we can't persist this selection without a mod.
        // We could default to "Shift" if no mod selected? No, that's intrusive.
        // For now, key override semantics require both Mod AND Side (e.g. MOD_LSFT).
        // So clicking "Left" with no Mod selected effectively does nothing.
        // This is chemically consistent with how we derive activeSides.

        updateMask(newMask);
    };

    const renderKey = (label: string, slot: "trigger" | "replacement") => {
        if (!override) return null;
        const keycode = slot === "trigger" ? override.trigger : override.replacement;
        const keyContents = getKeyContents(keyboard!, keycode || "KC_NO");
        const isSelected = isSlotSelected(slot);
        const hasContent = keycode && keycode !== "KC_NO";

        let keyColor: string | undefined;
        let keyClassName: string;
        let headerClass: string;

        if (isSelected) {
            keyColor = undefined;
            keyClassName = "border-2 border-red-600";
            headerClass = "bg-black/20";
        } else if (hasContent) {
            keyColor = "sidebar";
            keyClassName = "border-kb-gray";
            headerClass = "bg-kb-sidebar-dark";
        } else {
            keyColor = undefined;
            keyClassName = "bg-transparent border-2 border-black";
            headerClass = "text-black";
        }

        return (
            <div className="flex flex-col items-center gap-2">
                <span className="text-sm font-bold text-slate-600">{label}</span>
                <div className="relative w-[60px] h-[60px]">
                    <Key
                        isRelative
                        x={0}
                        y={0}
                        w={1}
                        h={1}
                        row={-1}
                        col={-1}
                        keycode={keycode || "KC_NO"}
                        label={keyContents?.str || ""}
                        keyContents={keyContents}
                        selected={isSelected}
                        onClick={() => selectOverrideKey(overrideIndex, slot)}
                        layerColor={keyColor}
                        className={keyClassName}
                        headerClassName={headerClass}
                    />
                </div>
            </div>
        );
    };

    if (!override) return <div className="p-5">Override not found</div>;

    const isEnabled = (override.options & ENABLED_BIT) !== 0;

    return (
        <div className="flex flex-col gap-4 py-8 pl-[44px] pr-5 pb-4">
            {/* Active Switch */}
            <div className="flex items-center space-x-3">
                <Switch
                    id="override-active"
                    checked={isEnabled}
                    onCheckedChange={(checked) => updateOption(ENABLED_BIT, checked)}
                />
                <Label htmlFor="override-active" className="font-normal text-slate-700 cursor-pointer">
                    Active
                </Label>
            </div>

            <div className="flex flex-row gap-2 justify-start items-center">
                {renderKey("Trigger", "trigger")}
                <div className="pt-6 text-black -mr-1">
                    <ArrowRight className="w-6 h-6" />
                </div>
                {renderKey("Replacement", "replacement")}
            </div>

            {/* Tabs */}
            <div className="flex flex-row gap-0.5 p-1 w-fit">
                {TABS.map((tab) => (
                    <Button
                        key={tab}
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "px-5 py-1 rounded-full transition-all text-sm font-medium cursor-pointer border-none outline-none whitespace-nowrap",
                            activeTab === tab
                                ? "bg-gray-800 text-white shadow-md scale-105 hover:bg-gray-900 hover:text-white"
                                : "bg-transparent text-gray-600 hover:bg-gray-200"
                        )}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </Button>
                ))}
            </div>

            {/* Modifiers Section */}
            <div className="flex flex-col gap-1.5">
                <span className="font-semibold text-lg text-slate-700">Modifiers</span>
                <div className="flex flex-row gap-2">
                    <Button
                        type="button"
                        variant={activeMods.length === 0 ? "default" : "secondary"}
                        size="sm"
                        className={cn(
                            "rounded-md px-4 transition-all text-sm font-medium border-none",
                            activeMods.length === 0 ? "bg-kb-sidebar-dark text-white shadow-sm" : "bg-kb-gray-medium text-slate-700 hover:bg-slate-200"
                        )}
                        onClick={() => updateMask(0)}
                    >
                        NONE
                    </Button>
                    {MOD_TYPES.map((mod) => {
                        const isActive = activeMods.includes(mod);
                        return (
                            <Button
                                key={mod}
                                type="button"
                                variant={isActive ? "default" : "secondary"}
                                size="sm"
                                className={cn(
                                    "rounded-md px-4 transition-all text-sm font-medium border-none",
                                    isActive ? "bg-kb-sidebar-dark text-white shadow-sm" : "bg-kb-gray-medium text-slate-700 hover:bg-slate-200"
                                )}
                                onClick={() => handleModClick(mod)}
                            >
                                {mod.toUpperCase()}
                            </Button>
                        );
                    })}
                </div>
            </div>

            {/* Side Section */}
            <div className="flex flex-col gap-1.5">
                <span className="font-semibold text-lg text-slate-700">Side</span>
                <div className="flex flex-row gap-2">
                    {SIDES.map(side => {
                        let isActive = false;
                        if (side === "Either") isActive = isEither;
                        else if (side === "Left") isActive = activeSides.left;
                        else if (side === "Right") isActive = activeSides.right;

                        return (
                            <Button
                                key={side}
                                type="button"
                                variant={isActive ? "default" : "secondary"}
                                size="sm"
                                className={cn(
                                    "rounded-md px-4 transition-all text-sm font-medium border-none",
                                    isActive ? "bg-kb-sidebar-dark text-white shadow-sm" : "bg-kb-gray-medium text-slate-700 hover:bg-slate-200"
                                )}
                                onClick={() => handleSideClick(side)}
                            >
                                {side.toUpperCase()}
                            </Button>
                        );
                    })}
                </div>
            </div>

            {/* Layers Section */}
            <div className="flex flex-col gap-1.5">
                <span className="font-semibold text-lg text-slate-700">Layers</span>
                <div className="grid grid-cols-8 gap-2 w-fit">
                    {Array.from({ length: 16 }).map((_, i) => {
                        const isActive = (override.layers & (1 << i)) !== 0;
                        return (
                            <div
                                key={i}
                                className={cn(
                                    "w-10 h-10 flex items-center justify-center rounded-md cursor-pointer transition-colors text-sm font-medium",
                                    isActive ? "bg-kb-sidebar-dark text-white" : "bg-kb-gray-medium text-slate-700 hover:bg-slate-200"
                                )}
                                onClick={() => updateLayer(i, !isActive)}
                            >
                                {i}
                            </div>
                        );
                    })}
                </div>
            </div>



            {/* Options Switches */}
            <div className="flex flex-col gap-3 mt-4">
                {OPTIONS.map((opt) => {
                    const isChecked = (override.options & opt.bit) !== 0;
                    return (
                        <div key={opt.label} className="flex items-center space-x-3">
                            <Switch
                                id={`opt-${opt.bit}`}
                                checked={isChecked}
                                onCheckedChange={(checked) => updateOption(opt.bit, checked)}
                            />
                            <Label htmlFor={`opt-${opt.bit}`} className="font-normal text-slate-700 cursor-pointer">
                                {opt.label}
                            </Label>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OverrideEditor;
