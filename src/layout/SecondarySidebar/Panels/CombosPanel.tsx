import React from "react";
import { ArrowRight, Plus } from "lucide-react";

import SidebarItemRow from "@/layout/SecondarySidebar/components/SidebarItemRow";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { useLayer } from "@/contexts/LayerContext";
import { usePanels } from "@/contexts/PanelsContext";
import { useVial } from "@/contexts/VialContext";
import { hoverBackgroundClasses, hoverBorderClasses, hoverHeaderClasses } from "@/utils/colors";
import { getKeyContents } from "@/utils/keys";
import { Key } from "@/components/Key";

const CombosPanel: React.FC = () => {
    const { keyboard } = useVial();
    const { assignKeycode } = useKeyBinding();
    const { selectedLayer } = useLayer();
    const {
        setItemToEdit,
        setBindingTypeToEdit,
        setAlternativeHeader,
    } = usePanels();

    if (!keyboard) return null;

    const layerColorName = keyboard?.cosmetic?.layer_colors?.[selectedLayer] || "primary";
    const hoverBorderColor = hoverBorderClasses[layerColorName] || hoverBorderClasses["primary"];
    const hoverBackgroundColor = hoverBackgroundClasses[layerColorName] || hoverBackgroundClasses["primary"];
    const hoverHeaderClass = hoverHeaderClasses[layerColorName] || hoverHeaderClasses["primary"];

    const combos = keyboard.combos || [];

    const handleEdit = (index: number) => {
        setItemToEdit(index);
        setBindingTypeToEdit("combos");
        setAlternativeHeader(true);
    };

    return (
        <div className="space-y-3 pt-3 pb-8 relative">
            <div className="flex flex-col">
                {combos.map((combo, i) => {
                    const isKeyAssigned = (content: any) => {
                        if (!content) return false;
                        const top = content.top;
                        const str = content.str;
                        return (top && top !== "KC_NO" && top !== "TRNS") || (str && str !== "KC_NO" && str !== "");
                    };

                    const inputs = [0, 1, 2, 3].map(idx => ({
                        content: getKeyContents(keyboard, (combo as any)[idx.toString()] || "KC_NO"),
                        id: idx
                    })).filter(k => isKeyAssigned(k.content));

                    const resultKeycode = (combo as any)["4"];
                    // Use resultKeycode directly if available, otherwise KC_NO, to prevent crash
                    const result = getKeyContents(keyboard, resultKeycode || "KC_NO");
                    const hasAssignment = inputs.length > 0 || isKeyAssigned(result);

                    const renderSmallKey = (content: any, idx: number) => {
                        const hasContent = (content?.top && content.top !== "KC_NO") || (content?.str && content.str !== "KC_NO" && content.str !== "");
                        return (
                            <div key={idx} className="relative w-[30px] h-[30px]">
                                <Key
                                    isRelative
                                    x={0} y={0} w={1} h={1} row={-1} col={-1}
                                    keycode={content?.top || "KC_NO"}
                                    label={content?.str || ""}
                                    keyContents={content}
                                    layerColor={hasContent ? "sidebar" : undefined}
                                    className={hasContent ? "border-kb-gray" : "bg-transparent border border-kb-gray-border"}
                                    headerClassName={hasContent ? "bg-kb-sidebar-dark" : "text-black"}
                                    variant="small"
                                    disableHover
                                    onClick={() => handleEdit(i)}
                                />
                            </div>
                        );
                    };

                    const rowChildren = hasAssignment ? (
                        <div className="flex flex-row items-center gap-1 ml-4 overflow-hidden">
                            {inputs.map((input, idx) => (
                                <React.Fragment key={input.id}>
                                    {idx > 0 && <Plus className="w-3 h-3 text-black" />}
                                    {renderSmallKey(input.content, input.id)}
                                </React.Fragment>
                            ))}
                            <ArrowRight className="w-3 h-3 text-black mx-1" />
                            {renderSmallKey(result, 4)}
                        </div>
                    ) : undefined;

                    // Restore visual style: use "combo" type for icon and index for label
                    const keyContents = { type: "combo" } as any;

                    return (
                        <SidebarItemRow
                            key={i}
                            index={i}
                            keyboard={keyboard}
                            label={i.toString()}
                            keycode={resultKeycode || "KC_NO"}
                            keyContents={keyContents}
                            onEdit={handleEdit}
                            onAssignKeycode={assignKeycode}
                            hoverBorderColor={hoverBorderColor}
                            hoverBackgroundColor={hoverBackgroundColor}
                            hoverLayerColor={layerColorName}
                            hoverHeaderClass={hoverHeaderClass}
                            showPreviewKey={false}
                        >
                            {rowChildren}
                        </SidebarItemRow>
                    );
                })}

                {combos.length === 0 && (
                    <div className="text-center text-gray-500 mt-10">
                        No combos found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default CombosPanel;
