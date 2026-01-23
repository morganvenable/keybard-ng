import { FC, useEffect } from "react";
import { ArrowRight, Trash2 } from "lucide-react";

import { Key } from "@/components/Key";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { useLayoutSettings } from "@/contexts/LayoutSettingsContext";
import { usePanels } from "@/contexts/PanelsContext";
import { useVial } from "@/contexts/VialContext";
import { cn } from "@/lib/utils";
import { getKeyContents } from "@/utils/keys";
import { vialService } from "@/services/vial.service";

const LeaderEditor: FC = () => {
    const { keyboard, setKeyboard } = useVial();
    const { itemToEdit, setPanelToGoBack, setAlternativeHeader } = usePanels();
    const { selectLeaderKey, selectedTarget } = useKeyBinding();
    const { layoutMode } = useLayoutSettings();

    const isHorizontal = layoutMode === "bottombar";
    const seqKeySize = isHorizontal ? "w-[45px] h-[45px]" : "w-[50px] h-[50px]";
    const outputKeySize = isHorizontal ? "w-[45px] h-[45px]" : "w-[60px] h-[60px]";
    const keyVariant = isHorizontal ? "medium" : "default";

    const leaderIndex = itemToEdit!;
    const leaderEntry = keyboard?.leaders?.[leaderIndex];

    useEffect(() => {
        selectLeaderKey(leaderIndex, "sequence", 0);
        setPanelToGoBack("leaders");
        setAlternativeHeader(true);
    }, [leaderIndex, selectLeaderKey, setPanelToGoBack, setAlternativeHeader]);

    const isSlotSelected = (slot: "sequence" | "output", seqIndex?: number) => {
        return (
            selectedTarget?.type === "leaders" &&
            selectedTarget.leaderId === leaderIndex &&
            selectedTarget.leaderSlot === slot &&
            (slot === "output" || selectedTarget.leaderSeqIndex === seqIndex)
        );
    };

    const clearKey = async (slot: "sequence" | "output", seqIndex?: number) => {
        if (!keyboard || !leaderEntry) return;
        const updatedKeyboard = JSON.parse(JSON.stringify(keyboard));

        if (slot === "sequence" && seqIndex !== undefined) {
            // Remove the key at seqIndex and shift remaining keys left
            const seq = updatedKeyboard.leaders[leaderIndex].sequence;
            seq.splice(seqIndex, 1);
            // Pad back to 5 with KC_NO
            while (seq.length < 5) {
                seq.push("KC_NO");
            }
        } else if (slot === "output") {
            updatedKeyboard.leaders[leaderIndex].output = "KC_NO";
        }

        setKeyboard(updatedKeyboard);

        try {
            await vialService.updateLeader(updatedKeyboard, leaderIndex);
            await vialService.saveViable();
        } catch (err) {
            console.error("Failed to update leader:", err);
        }
    };

    const renderSequenceKey = (seqIndex: number) => {
        if (!leaderEntry) return null;
        const keycode = leaderEntry.sequence?.[seqIndex] || "KC_NO";
        const keyContents = getKeyContents(keyboard!, keycode);
        const isSelected = isSlotSelected("sequence", seqIndex);
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
            keyClassName = "bg-transparent border-2 border-dashed border-gray-300";
            headerClass = "text-gray-400";
        }

        return (
            <div className="flex flex-col items-center gap-1 relative">
                <span className={cn("font-medium text-slate-500", isHorizontal ? "text-[10px]" : "text-xs")}>{seqIndex + 1}</span>
                <div className={`relative ${seqKeySize} group/leader-key`}>
                    <Key
                        isRelative
                        x={0}
                        y={0}
                        w={1}
                        h={1}
                        row={-1}
                        col={-1}
                        keycode={keycode}
                        label={keyContents?.str || ""}
                        keyContents={keyContents}
                        selected={isSelected}
                        onClick={() => selectLeaderKey(leaderIndex, "sequence", seqIndex)}
                        layerColor={keyColor}
                        className={keyClassName}
                        headerClassName={headerClass}
                        variant={keyVariant}
                    />
                    {hasContent && (
                        <div className="absolute -top-2 -right-2 opacity-0 group-hover/leader-key:opacity-100 transition-opacity">
                            <button
                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full bg-white shadow-sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    clearKey("sequence", seqIndex);
                                }}
                                title="Remove key"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderOutputKey = () => {
        if (!leaderEntry) return null;
        const keycode = leaderEntry.output || "KC_NO";
        const keyContents = getKeyContents(keyboard!, keycode);
        const isSelected = isSlotSelected("output");
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

        const trashOffset = isHorizontal ? "-left-8" : "-left-10";
        const trashSize = isHorizontal ? "w-3 h-3" : "w-4 h-4";

        return (
            <div className="flex flex-col items-center gap-1 relative">
                <span className={cn("font-bold text-slate-600", isHorizontal ? "text-xs" : "text-sm")}>Output</span>
                <div className={`relative ${outputKeySize} group/leader-output`}>
                    <Key
                        isRelative
                        x={0}
                        y={0}
                        w={1}
                        h={1}
                        row={-1}
                        col={-1}
                        keycode={keycode}
                        label={keyContents?.str || ""}
                        keyContents={keyContents}
                        selected={isSelected}
                        onClick={() => selectLeaderKey(leaderIndex, "output")}
                        layerColor={keyColor}
                        className={keyClassName}
                        headerClassName={headerClass}
                        variant={keyVariant}
                    />
                    {hasContent && (
                        <div className={`absolute ${trashOffset} top-0 h-full flex items-center justify-center opacity-0 group-hover/leader-output:opacity-100 transition-opacity`}>
                            <button
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    clearKey("output");
                                }}
                                title="Clear key"
                            >
                                <Trash2 className={trashSize} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (!leaderEntry) return <div className="p-5">Leader entry not found</div>;

    // Count how many sequence keys are filled
    const filledKeys = leaderEntry.sequence?.filter(k => k && k !== "KC_NO").length || 0;

    // Horizontal layout for bottom bar mode
    if (isHorizontal) {
        return (
            <div className="flex flex-row items-center gap-4 px-4 py-2">
                {/* Sequence Keys */}
                <div className="flex flex-row gap-1 items-end">
                    {[0, 1, 2, 3, 4].map((idx) => {
                        if (idx > filledKeys) return null;
                        return (
                            <div key={idx} className="flex items-center gap-0.5">
                                {idx > 0 && <ArrowRight className="w-3 h-3 text-gray-400" />}
                                {renderSequenceKey(idx)}
                            </div>
                        );
                    })}
                </div>

                <ArrowRight className="w-5 h-5 text-gray-600 flex-shrink-0" />

                {/* Output Key */}
                {renderOutputKey()}

                {/* Info */}
                <div className="text-xs text-muted-foreground ml-2">
                    Press Leader key, then type this sequence to trigger output.
                </div>
            </div>
        );
    }

    // Vertical layout (sidebar mode)
    return (
        <div className="flex flex-col gap-2 py-3 px-3 overflow-hidden">
            {/* Sequence Keys */}
            <div className="flex flex-wrap gap-1 items-end">
                {[0, 1, 2, 3, 4].map((idx) => {
                    // Only show slots up to filledKeys + 1 (to allow adding one more)
                    if (idx > filledKeys) return null;
                    return (
                        <div key={idx} className="flex items-center gap-0.5">
                            {idx > 0 && <ArrowRight className="w-3 h-3 text-gray-400 mt-5" />}
                            {renderSequenceKey(idx)}
                        </div>
                    );
                })}
            </div>

            {/* Output Key on its own row */}
            <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-black" />
                {renderOutputKey()}
                <span className="text-xs text-muted-foreground ml-2">
                    Press Leader key, type sequence, get output.
                </span>
            </div>
        </div>
    );
};

export default LeaderEditor;
