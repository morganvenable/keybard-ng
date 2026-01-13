import { useState, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVial } from "@/contexts/VialContext";
import { vialService } from "@/services/vial.service";
import type { FragmentInstance } from "@/types/vial.types";

/**
 * Fragment Selections Panel
 *
 * Allows users to select which physical component (fragment) is installed
 * at each position. Hardware-detected components are shown and some may
 * be locked depending on the keyboard configuration.
 */
const FragmentsPanel: React.FC = () => {
    const { keyboard, setKeyboard } = useVial();
    const [updating, setUpdating] = useState<number | null>(null);

    const fragmentService = vialService.getFragmentService();

    // Handle fragment selection change
    const handleSelectionChange = useCallback(async (
        instanceIdx: number,
        instance: FragmentInstance,
        newFragmentName: string
    ) => {
        if (!keyboard) return;

        setUpdating(instanceIdx);

        try {
            // Get option index for the selected fragment
            const optionIdx = fragmentService.getOptionIndex(instance, newFragmentName);

            // Update on device
            const success = await vialService.updateFragmentSelection(keyboard, instanceIdx, optionIdx);

            if (success) {
                // Update local state
                const newKeyboard = { ...keyboard };
                if (newKeyboard.fragmentState) {
                    newKeyboard.fragmentState.userSelections.set(instance.id, newFragmentName);
                }

                // Recompose keyboard layout with new fragment selection
                const fragmentComposer = vialService.getFragmentComposer();
                const composedLayout = fragmentComposer.composeLayout(newKeyboard);
                if (Object.keys(composedLayout).length > 0) {
                    newKeyboard.keylayout = composedLayout;
                    console.log("Fragment layout recomposed:", Object.keys(composedLayout).length, "keys");
                }

                setKeyboard(newKeyboard);
            }
        } catch (error) {
            console.error("Failed to update fragment selection:", error);
        } finally {
            setUpdating(null);
        }
    }, [keyboard, setKeyboard, fragmentService]);

    // Check if keyboard has fragments
    if (!keyboard || !fragmentService.hasFragments(keyboard)) {
        return (
            <section className="space-y-3 h-full max-h-full flex flex-col pt-3">
                <div className="text-center text-gray-500 mt-10">
                    No fragment configuration available for this keyboard.
                </div>
            </section>
        );
    }

    const selectableInstances = fragmentService.getSelectableInstances(keyboard);

    if (selectableInstances.length === 0) {
        return (
            <section className="space-y-3 h-full max-h-full flex flex-col pt-3">
                <div className="text-center text-gray-500 mt-10">
                    No selectable fragment positions available.
                </div>
            </section>
        );
    }

    return (
        <section className="space-y-3 h-full max-h-full flex flex-col pt-3">
            <div className="px-4 pb-3 border-b">
                <p className="text-sm text-muted-foreground">
                    Select which physical component is installed at each position.
                    Hardware-detected components are shown; some may be locked.
                </p>
            </div>

            <div className="flex flex-col overflow-auto flex-grow scrollbar-thin px-4 gap-3">
                {selectableInstances.map(({ idx, instance }) => {
                    const options = fragmentService.getFragmentOptions(instance);
                    const currentFragment = fragmentService.resolveFragment(keyboard, idx, instance);

                    // Get hardware detection info
                    const hwFragmentId = keyboard.fragmentState?.hwDetection.get(idx);
                    const hwDetected = hwFragmentId !== undefined && hwFragmentId !== 0xff;
                    const hwFragmentName = hwDetected
                        ? fragmentService.getFragmentNameById(keyboard, hwFragmentId)
                        : undefined;

                    const allowOverride = instance.allow_override !== false;
                    const isLocked = hwDetected && !allowOverride;
                    const isUpdating = updating === idx;

                    // Build label with detection info
                    const instanceDisplayName = fragmentService.getInstanceDisplayName(instance.id);
                    let statusText = "";
                    if (hwDetected && hwFragmentName) {
                        const hwDisplayName = fragmentService.getFragmentDisplayName(keyboard, hwFragmentName);
                        statusText = isLocked
                            ? `Locked: ${hwDisplayName}`
                            : `Detected: ${hwDisplayName}`;
                    }

                    return (
                        <div
                            key={instance.id}
                            className="flex flex-row items-center justify-between p-3 gap-3 panel-layer-item group/item rounded-md"
                        >
                            <div className="flex flex-col items-start gap-1 min-w-0">
                                <Label className="text-sm font-medium">
                                    {instanceDisplayName}
                                </Label>
                                {statusText && (
                                    <span className={`text-xs ${isLocked ? 'text-amber-600' : 'text-blue-600'}`}>
                                        {statusText}
                                    </span>
                                )}
                            </div>

                            <Select
                                value={currentFragment}
                                onValueChange={(value) => handleSelectionChange(idx, instance, value)}
                                disabled={isLocked || isUpdating}
                            >
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Select fragment" />
                                </SelectTrigger>
                                <SelectContent>
                                    {options.map((fragmentName) => (
                                        <SelectItem key={fragmentName} value={fragmentName}>
                                            {fragmentService.getFragmentDisplayName(keyboard, fragmentName)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default FragmentsPanel;
