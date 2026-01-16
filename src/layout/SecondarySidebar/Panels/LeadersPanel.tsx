import React, { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";

import SidebarItemRow from "@/layout/SecondarySidebar/components/SidebarItemRow";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { qmkService } from "@/services/qmk.service";
import { useVial } from "@/contexts/VialContext";
import { useLayer } from "@/contexts/LayerContext";
import { usePanels } from "@/contexts/PanelsContext";
import { hoverBackgroundClasses, hoverBorderClasses, hoverHeaderClasses } from "@/utils/colors";
import { getKeyContents } from "@/utils/keys";
import { Key } from "@/components/Key";
import { KeyContent, LeaderOptions } from "@/types/vial.types";
import { vialService } from "@/services/vial.service";
import { cn } from "@/lib/utils";

const LeadersPanel: React.FC = () => {
    const { keyboard, setKeyboard, isConnected } = useVial();
    const { selectLeaderKey, assignKeycode, isBinding } = useKeyBinding();
    const { selectedLayer } = useLayer();
    const {
        setItemToEdit,
        setBindingTypeToEdit,
        setAlternativeHeader,
        itemToEdit,
    } = usePanels();
    const [savingTimeout, setSavingTimeout] = useState(false);
    const [savingPerKey, setSavingPerKey] = useState(false);

    // QMK Settings for Leader Key
    const LEADER_TIMEOUT_QSID = 28;
    const LEADER_PER_KEY_QSID = 29;

    // Local state for timeout input to allow typing without async interference
    const keyboardTimeout = keyboard?.settings?.[LEADER_TIMEOUT_QSID] ?? 300;
    const [localTimeout, setLocalTimeout] = useState<string>(String(keyboardTimeout));

    // Sync local state when keyboard settings change (e.g., on load)
    useEffect(() => {
        setLocalTimeout(String(keyboardTimeout));
    }, [keyboardTimeout]);

    if (!keyboard) return null;

    const isTimeoutSupported = keyboard.settings?.[LEADER_TIMEOUT_QSID] !== undefined;
    const isPerKeySupported = keyboard.settings?.[LEADER_PER_KEY_QSID] !== undefined;
    const perKeyTiming = (keyboard.settings?.[LEADER_PER_KEY_QSID] ?? 0) !== 0;

    const handleTimeoutChange = async (value: number) => {
        if (!isConnected) return;
        setSavingTimeout(true);
        try {
            const clamped = Math.max(50, Math.min(5000, value));
            const updated = {
                ...keyboard,
                settings: { ...keyboard.settings, [LEADER_TIMEOUT_QSID]: clamped }
            };
            setKeyboard(updated);
            await qmkService.push(updated, LEADER_TIMEOUT_QSID);
            await vialService.saveViable();
        } catch (err) {
            console.error("Failed to update leader timeout:", err);
        } finally {
            setSavingTimeout(false);
        }
    };

    const handlePerKeyToggle = async (checked: boolean) => {
        if (!isConnected) return;
        setSavingPerKey(true);
        try {
            const updated = {
                ...keyboard,
                settings: { ...keyboard.settings, [LEADER_PER_KEY_QSID]: checked ? 1 : 0 }
            };
            setKeyboard(updated);
            await qmkService.push(updated, LEADER_PER_KEY_QSID);
            await vialService.saveViable();
        } catch (err) {
            console.error("Failed to update per-key timing:", err);
        } finally {
            setSavingPerKey(false);
        }
    };

    const layerColorName = keyboard?.cosmetic?.layer_colors?.[selectedLayer] || "primary";
    const hoverBorderColor = hoverBorderClasses[layerColorName] || hoverBorderClasses["primary"];
    const hoverBackgroundColor = hoverBackgroundClasses[layerColorName] || hoverBackgroundClasses["primary"];
    const hoverHeaderClass = hoverHeaderClasses[layerColorName] || hoverHeaderClasses["primary"];

    const leaders = keyboard.leaders || [];

    const handleEdit = (index: number) => {
        setItemToEdit(index);
        setBindingTypeToEdit("leaders");
        setAlternativeHeader(true);
    };

    const isEnabled = (options: number) => {
        return (options & LeaderOptions.ENABLED) !== 0;
    };

    const handleToggleEnabled = async (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!keyboard.leaders) return;

        const entry = keyboard.leaders[index];
        const newOptions = entry.options ^ LeaderOptions.ENABLED;

        const updatedLeaders = [...keyboard.leaders];
        updatedLeaders[index] = { ...entry, options: newOptions };

        const updatedKeyboard = {
            ...keyboard,
            leaders: updatedLeaders,
        };
        setKeyboard(updatedKeyboard);

        try {
            await vialService.updateLeader(updatedKeyboard, index);
            await vialService.saveViable();
        } catch (err) {
            console.error("Failed to update leader:", err);
        }
    };

    const handleKeyClick = (index: number, slot: "sequence" | "output", seqIndex?: number) => {
        handleEdit(index);
        selectLeaderKey(index, slot, seqIndex);
    };

    const renderSmallKey = (keycode: string, index: number, slot: "sequence" | "output", seqIndex: number | undefined, isEditing: boolean) => {
        const content = getKeyContents(keyboard, keycode) as KeyContent;
        const hasContent = keycode !== "KC_NO" && keycode !== "";
        const isSelected = isEditing && itemToEdit === index;

        return (
            <div className="relative w-[30px] h-[30px]">
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
                    onClick={() => handleKeyClick(index, slot, seqIndex)}
                />
            </div>
        );
    };

    const handleAssignLeaderKey = () => {
        if (!isBinding) return;
        assignKeycode("QK_LEADER");
    };

    // Custom key contents for the placeable key with explicit label
    const leaderKeyContents: KeyContent = { str: "Leader", type: "special" };

    return (
        <section className="space-y-3 h-full max-h-full flex flex-col pt-3">
            {/* Placeable Leader key */}
            <div className="px-3 flex flex-col gap-2">
                <div className="flex">
                    <Key
                        isRelative
                        x={0} y={0} w={1.5} h={1} row={-1} col={-1}
                        keycode="QK_LEADER"
                        label="Leader"
                        keyContents={leaderKeyContents}
                        layerColor="sidebar"
                        className={cn(
                            "border-kb-gray cursor-pointer",
                            isBinding && `hover:${hoverBorderColor} hover:${hoverBackgroundColor}`
                        )}
                        headerClassName="bg-kb-sidebar-dark"
                        onClick={handleAssignLeaderKey}
                    />
                </div>
            </div>

            <div className="px-2 pb-2 text-sm text-muted-foreground">
                Leader sequences trigger an output when you press a specific sequence of keys after the Leader key.
                Click on a key slot to assign a keycode.
            </div>

            {/* Leader Timing Settings */}
            {isConnected && (isTimeoutSupported || isPerKeySupported) && (
                <div className="px-3 pb-3 border-b border-gray-200 dark:border-gray-700 space-y-3">
                    {isTimeoutSupported && (
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">Leader Timeout</span>
                                <span className="text-xs text-muted-foreground">50-5000 ms</span>
                            </div>
                            <Input
                                type="number"
                                value={localTimeout}
                                min={50}
                                max={5000}
                                onChange={(e) => {
                                    setLocalTimeout(e.target.value);
                                }}
                                onBlur={() => {
                                    const newVal = parseInt(localTimeout) || 50;
                                    handleTimeoutChange(newVal);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const newVal = parseInt(localTimeout) || 50;
                                        handleTimeoutChange(newVal);
                                        (e.target as HTMLInputElement).blur();
                                    }
                                }}
                                disabled={savingTimeout}
                                className={cn("w-24 text-right", savingTimeout && "opacity-50")}
                            />
                        </div>
                    )}
                    {isPerKeySupported && (
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">Per-key timing</span>
                                <span className="text-xs text-muted-foreground">Reset timeout on each key</span>
                            </div>
                            <Switch
                                checked={perKeyTiming}
                                onCheckedChange={handlePerKeyToggle}
                                disabled={savingPerKey}
                                className={cn(savingPerKey && "opacity-50")}
                            />
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-col overflow-auto flex-grow scrollbar-thin">
                {leaders.map((entry, i) => {
                    const enabled = isEnabled(entry.options);
                    const hasSequence = entry.sequence.some(k => k !== "KC_NO" && k !== "");
                    const hasOutput = entry.output !== "KC_NO" && entry.output !== "";
                    const isDefined = hasSequence || hasOutput;
                    const isEditing = itemToEdit === i;

                    const rowChildren = (
                        <div className="flex flex-row items-center w-full">
                            <div className="flex flex-row items-center gap-1 ml-4 overflow-hidden">
                                {/* Sequence keys (up to 5) */}
                                {entry.sequence.slice(0, 5).map((keycode, seqIdx) => {
                                    if (keycode === "KC_NO" || keycode === "") return null;
                                    return (
                                        <React.Fragment key={seqIdx}>
                                            {seqIdx > 0 && <span className="text-xs text-muted-foreground mx-0.5">→</span>}
                                            {renderSmallKey(keycode, i, "sequence", seqIdx, isEditing)}
                                        </React.Fragment>
                                    );
                                })}
                                {!hasSequence && (
                                    <div className="w-[30px] h-[30px] border border-dashed border-gray-300 rounded flex items-center justify-center">
                                        <span className="text-xs text-gray-400">...</span>
                                    </div>
                                )}
                                <ArrowRight className="w-3 h-3 text-muted-foreground mx-1" />
                                {renderSmallKey(entry.output, i, "output", undefined, isEditing)}
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

                    const keyContents = { type: "leader" } as KeyContent;

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

                {leaders.length === 0 && (
                    <div className="text-center text-gray-500 mt-10">
                        <p>No leader sequences configured.</p>
                        <p className="text-sm mt-2">This keyboard may not support leader sequences.</p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default LeadersPanel;
