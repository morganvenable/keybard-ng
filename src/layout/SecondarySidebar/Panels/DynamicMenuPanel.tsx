import { useEffect, useState, useCallback } from "react";
import { CustomUIRenderer } from "@/components/CustomUI";
import { customValueService } from "@/services/custom-value.service";
import { useVial } from "@/contexts/VialContext";
import type { CustomUIMenuItem } from "@/types/vial.types";

interface DynamicMenuPanelProps {
    menuIndex: number;
}

/**
 * Dynamic panel that renders a VIA3 custom UI menu
 * Loads values from keyboard on mount and handles updates
 */
const DynamicMenuPanel: React.FC<DynamicMenuPanelProps> = ({ menuIndex }) => {
    const { keyboard, isConnected } = useVial();
    const [values, setValues] = useState<Map<string, number>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get the menu for this panel
    const menu = keyboard?.menus?.[menuIndex];

    // Load values when panel opens or keyboard connects
    useEffect(() => {
        if (!menu || !isConnected) {
            setLoading(false);
            return;
        }

        const loadValues = async () => {
            setLoading(true);
            setError(null);
            try {
                await customValueService.loadMenuValues([menu]);
                setValues(customValueService.getCache());
            } catch (err) {
                console.error("Failed to load custom values:", err);
                setError("Failed to load settings from keyboard");
            } finally {
                setLoading(false);
            }
        };

        loadValues();
    }, [menu, isConnected]);

    // Handle value changes
    const handleValueChange = useCallback(async (key: string, value: number) => {
        if (!menu || !isConnected) return;

        try {
            await customValueService.setValue(key, value, [menu]);
            setValues(prev => new Map(prev).set(key, value));
        } catch (err) {
            console.error(`Failed to set ${key}:`, err);
        }
    }, [menu, isConnected]);

    // Handle button clicks (special actions)
    const handleButtonClick = useCallback(async (key: string) => {
        if (!menu || !isConnected) return;

        // For buttons, we typically send a value of 1 to trigger the action
        try {
            await customValueService.setValue(key, 1, [menu]);
        } catch (err) {
            console.error(`Failed to execute ${key}:`, err);
        }
    }, [menu, isConnected]);

    // No menu found
    if (!menu) {
        return (
            <section className="h-full flex flex-col items-center justify-center p-4">
                <p className="text-muted-foreground">Menu not found</p>
            </section>
        );
    }

    // Not connected
    if (!isConnected) {
        return (
            <section className="h-full flex flex-col p-4">
                <h2 className="text-lg font-semibold mb-4">{menu.label}</h2>
                <p className="text-muted-foreground">Connect to a keyboard to view settings</p>
            </section>
        );
    }

    // Loading
    if (loading) {
        return (
            <section className="h-full flex flex-col p-4">
                <h2 className="text-lg font-semibold mb-4">{menu.label}</h2>
                <p className="text-muted-foreground">Loading settings...</p>
            </section>
        );
    }

    // Error
    if (error) {
        return (
            <section className="h-full flex flex-col p-4">
                <h2 className="text-lg font-semibold mb-4">{menu.label}</h2>
                <p className="text-red-500">{error}</p>
            </section>
        );
    }

    // Render the menu
    return (
        <section className="h-full flex flex-col overflow-hidden">
            <div className="flex-shrink-0 px-4 py-3 border-b">
                <h2 className="text-lg font-semibold">{menu.label}</h2>
            </div>
            <div className="flex-1 overflow-auto p-4">
                <CustomUIRenderer
                    items={menu.content as CustomUIMenuItem[]}
                    values={values}
                    onValueChange={handleValueChange}
                    onButtonClick={handleButtonClick}
                />
            </div>
        </section>
    );
};

export default DynamicMenuPanel;
