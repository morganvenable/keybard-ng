import { Ellipsis, ImportIcon, MouseIcon, SettingsIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useState } from "react";

const SETTINGS = [
    {
        name: "live-updating",
        label: "Live Updating",
        description: "Automatically apply changes to the keyboard as you make them.",
        defaultValue: true,
        type: "boolean",
    },
    {
        name: "typing-binds-key",
        label: "Typing binds a key",
        description: "When enabled, typing on your physical keyboard will bind the corresponding key on the layout.",
        defaultValue: false,
        type: "boolean",
    },
    {
        name: "serial-assignment",
        label: "Serial Assignment",
        type: "select",
        items: [
            { label: "Down columns then rows", value: "col-row" },
            { label: "Across rows then columns", value: "row-col" },
            { label: "Svalboard by key direction", value: "svalboard" },
        ],
        defaultValue: "col-row",
    },
    {
        name: "international-keyboards",
        label: "International Keyboards",
        type: "select",
        items: [
            { label: "English (US)", value: "us" },
            { label: "English (UK)", value: "uk" },
            { label: "Brazilian", value: "br" },
            { label: "Canadian (CSA)", value: "ca-csa" },
            { label: "Colemak", value: "colemak" },
            { label: "Croatian (QWERTZ)", value: "croatian-qwertz" },
            { label: "Danish", value: "danish" },
            { label: "EuroKey", value: "eurokey" },
            { label: "French (AZERTY)", value: "french-azerty" },
            { label: "French (Mac)", value: "french-mac" },
            { label: "German (QWERTZ)", value: "german-qwertz" },
            { label: "Hebrew (Standard)", value: "hebrew-standard" },
            { label: "Hungarian (QWERTZ)", value: "hungarian-qwertz" },
            { label: "Italian", value: "italian" },
            { label: "Japanese", value: "japanese" },
            { label: "Latin American", value: "latin-american" },
            { label: "Norwegian", value: "norwegian" },
            { label: "Russian", value: "russian" },
            { label: "Slovak", value: "slovak" },
            { label: "Spanish", value: "spanish" },
            { label: "Swedish", value: "swedish" },
            { label: "Swedish (SWERTY)", value: "swedish-swerty" },
            { label: "Swiss (QWERTZ)", value: "swiss-qwertz" },
            { label: "Turkish", value: "turkish" },
        ],
        defaultValue: "us",
    },
    {
        name: "import",
        label: "Import...",
        type: "action",
        action: "import-settings",
    },
    {
        name: "export",
        label: "Export...",
        type: "action",
        action: "export-settings",
    },
    {
        name: "print",
        label: "Print...",
        type: "action",
        action: "print-keymap",
    },
    {
        name: "qmk-settings",
        label: "QMK Settings...",
        type: "action",
        action: "open-qmk-settings",
    },
    {
        name: "left-dpi",
        label: "Left DPI",
        description: "Adjust sensibility for your left pointing device.",
        type: "slider",
        defaultValue: 800,
        min: 100,
        max: 3200,
        step: 100,
    },
    {
        name: "right-dpi",
        label: "Right DPI",
        description: "Adjust sensibility for your right pointing device.",
        type: "slider",
        defaultValue: 800,
        min: 100,
        max: 3200,
        step: 100,
    },
    {
        name: "scroll-right",
        label: "Use right device for scrolling",
        type: "boolean",
    },
    {
        name: "scroll-left",
        label: "Use left device for scrolling",
        type: "boolean",
    },
    {
        name: "auto-mouse",
        label: "Automatically switch to mouse layer when using pointing device",
        type: "boolean",
    },
    {
        name: "auto-mouse",
        label: "Automatically switch to mouse layer when using pointing device",
        type: "boolean",
    },
    {
        name: "auto-mouse-timeout",
        label: "Auto-mouse switch timeout (ms)",
        description: "Time after which the keyboard switches back to the previous layer.",
        type: "slider",
        defaultValue: 500,
        min: 200,
        max: 2000,
        step: 100,
    },
    {
        name: "fix-drift",
        label: "Fix pointer drift",
        description: "Recalibrate the trackpoint module to avoid pointer drift.",
        type: "action",
    },
];

const SETTINGS_CATEGORIES = [
    {
        name: "general",
        label: "General",
        icon: SettingsIcon,
        settings: ["live-updating", "typing-binds-key", "serial-assignment", "international-keyboards", "qmk-settings"],
    },
    {
        name: "pointing-devices",
        icon: MouseIcon,
        label: "Pointing",
        settings: ["left-dpi", "right-dpi", "scroll-right", "scroll-left", "auto-mouse", "auto-mouse-timeout", "fix-drift"],
    },
    {
        name: "import-export",
        icon: ImportIcon,
        label: "Import / Export",
        settings: ["import", "export", "print"],
    },
    {
        name: "other",
        icon: Ellipsis,
        label: "Other",
        settings: [],
    },
];

const SettingsPanel = () => {
    const [activeCategory, setActiveCategory] = useState<string>("general");
    return (
        <section className="space-y-3 h-full max-h-full flex flex-col w-full mx-auto py-4">
            <div className="flex flex-row gap-2 justify-stretch align-stretch mb-3 w-full">
                {SETTINGS_CATEGORIES.map((category) => (
                    <div
                        key={category.name}
                        onClick={() => setActiveCategory(category.name)}
                        className={cn(
                            "w-0 min-w-0 flex-1 flex items-center gap-2 flex-col cursor-pointer py-3 rounded-lg transition-all",
                            activeCategory === category.name ? "bg-black text-white hover:bg-black/80 hover:text-white" : "text-muted-foreground hover:bg-muted bg-muted/60"
                        )}
                    >
                        {category.icon && <category.icon className="h-4 w-4" />}
                        <span className="text-xs font-medium text-center break-words">{category.label}</span>
                    </div>
                ))}
            </div>
            <div className=" flex flex-col overflow-auto flex-grow gap-2">
                {SETTINGS_CATEGORIES.find((cat) => cat.name === activeCategory)?.settings.map((se) => {
                    const setting = SETTINGS.find((s) => s.name === se);
                    if (!setting) return null;
                    if (setting.type === "boolean") {
                        return (
                            <div className="flex flex-row items-center justify-between p-3 gap-3 panel-layer-item group/item" key={setting.name}>
                                <div className="flex flex-col items-start gap-3">
                                    <span className="text-md text-left">{setting.label}</span>
                                    <span className="text-xs text-muted-foreground">{setting.description}</span>
                                </div>
                                <Switch
                                    checked={setting.defaultValue as boolean}
                                    onCheckedChange={(checked) => {
                                        console.log(`Setting ${setting.name} changed to ${checked}`);
                                    }}
                                />
                            </div>
                        );
                    }
                    if (setting.type === "select") {
                        return (
                            <div className="flex flex-row items-center justify-between p-3 gap-3 panel-layer-item group/item" key={setting.name}>
                                <div className="flex flex-col items-start gap-3">
                                    <div className="text-md text-left">{setting.label}</div>
                                    {setting.description && setting.description !== "" && <span className="text-xs text-muted-foreground">{setting.description}</span>}
                                </div>
                                <select
                                    defaultValue={setting.defaultValue as string}
                                    onChange={(e) => {
                                        console.log(`Setting ${setting.name} changed to ${e.target.value}`);
                                    }}
                                    className=" h-8 px-3 font-bold rounded-md pr-3 cursor-pointer active:border-none focus:border-none"
                                >
                                    {setting.items?.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        );
                    }
                    if (setting.type === "action") {
                        return (
                            <div
                                className="flex flex-row items-center justify-between p-3 gap-3 panel-layer-item group/item cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md"
                                key={setting.name}
                                onClick={() => {
                                    console.log(`Action ${setting.action} triggered`);
                                }}
                            >
                                <div className="flex flex-col gap-2">
                                    <span className="text-md text-left">{setting.label}</span>
                                    {setting.description ? <span className="text-xs text-muted-foreground">{setting.description}</span> : undefined}
                                </div>
                                <span className="text-xs text-muted-foreground">›</span>
                            </div>
                        );
                    }
                    if (setting.type === "slider") {
                        return (
                            <div className="flex flex-col gap-2 p-3 panel-layer-item group/item w-full" key={setting.name}>
                                <span className="text-md text-left">{setting.label}</span>
                                <span className="text-xs text-muted-foreground">{setting.description}</span>
                                <div className="flex flex-row items-center justify-between">
                                    <Slider
                                        defaultValue={[(setting.defaultValue as number) || 0]}
                                        min={setting.min}
                                        max={setting.max}
                                        step={setting.step}
                                        key={setting.name}
                                        className="flex-grow"
                                    />
                                    <Input type="number" value={setting.defaultValue as number} className="w-22 ml-4 text-right" />
                                </div>
                            </div>
                        );
                    }

                    return null;
                })}
            </div>
        </section>
    );
};

export default SettingsPanel;
