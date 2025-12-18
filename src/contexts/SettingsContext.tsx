import { SettingDefinition, SettingsCategory, SettingsContextType, SettingsState } from "@/types/settings.types";
import { Ellipsis, ImportIcon, MouseIcon, SettingsIcon } from "lucide-react";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { SettingsService } from "@/services/settings.service";

// Settings definitions - single source of truth
export const SETTINGS: SettingDefinition[] = [
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
        defaultValue: false,
    },
    {
        name: "scroll-left",
        label: "Use left device for scrolling",
        type: "boolean",
        defaultValue: false,
    },
    {
        name: "auto-mouse",
        label: "Automatically switch to mouse layer when using pointing device",
        type: "boolean",
        defaultValue: false,
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

export const SETTINGS_CATEGORIES: SettingsCategory[] = [
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

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<SettingsState>({});
    const [loaded, setLoaded] = useState(false);
    const settingsService = new SettingsService();

    // Load settings from localStorage on mount
    useEffect(() => {
        const loadedSettings = settingsService.load();
        setSettings(loadedSettings);
        setLoaded(true);
    }, []);

    // Save settings to localStorage whenever they change
    useEffect(() => {
        if (!loaded) return;
        settingsService.save(settings);
    }, [settings, loaded]);

    const updateSetting = useCallback((name: string, value: string | number | boolean) => {
        setSettings((prev) => ({
            ...prev,
            [name]: value,
        }));
    }, []);

    const getSetting = useCallback(
        (name: string, defaultValue?: string | number | boolean) => {
            if (settings[name] !== undefined) {
                return settings[name];
            }

            // Try to get default from SETTINGS definition
            const settingDef = SETTINGS.find((s) => s.name === name);
            if (settingDef) {
                return settingDef.defaultValue ?? false;
            }

            return defaultValue ?? false;
        },
        [settings]
    );

    const getSettingDefinition = useCallback((name: string) => {
        return SETTINGS.find((s) => s.name === name);
    }, []);

    const resetSettings = useCallback(() => {
        settingsService.clear();
        setSettings({});
    }, []);

    const resetSetting = useCallback((name: string) => {
        setSettings((prev) => {
            const newSettings = { ...prev };
            delete newSettings[name];
            return newSettings;
        });
    }, []);

    const value: SettingsContextType = {
        settings,
        settingsDefinitions: SETTINGS,
        settingsCategories: SETTINGS_CATEGORIES,
        updateSetting,
        getSetting,
        getSettingDefinition,
        resetSettings,
        resetSetting,
    };

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
};
