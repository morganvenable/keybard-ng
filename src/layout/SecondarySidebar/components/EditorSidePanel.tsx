import KeyboardIcon from "@/components/icons/Keyboard";
import LayersIcon from "@/components/icons/Layers";
import MacrosIcon from "@/components/icons/MacrosIcon";
import { usePanels } from "@/contexts/PanelsContext";
import { cn } from "@/lib/utils";
import { FC } from "react";

const iconsToShow = [
    {
        icon: <LayersIcon className="w-4 h-4" />,
        panel: "layers",
    },
    {
        icon: <KeyboardIcon className="w-4 h-4" />,
        panel: "keyboard",
    },
    {
        icon: <MacrosIcon className="w-4 h-4" />,
        panel: "macros",
    },
];

interface Props {
    parentPanel?: string;
}

const EditorSidePanel: FC<Props> = ({ parentPanel: _parentPanel }) => {
    const { setActivePanel, activePanel, setAlternativeHeader, setPanelToGoBack, bindingTypeToEdit } = usePanels();
    return (
        <div className="absolute top-0 left-0 h-full items-center justify-start flex">
            <div className="bg-white rounded-r-3xl text-gray-400 flex items-center flex-col justify-around py-3 px-2 gap-1">
                {iconsToShow.map((i) => (
                    <div
                        key={i.panel}
                        className={cn(
                            "cursor-pointer hover:bg-muted/40 px-2 py-3 h-10 w-10 rounded-xl items-center justify-center flex",
                            activePanel === i.panel && "bg-muted/60 text-black"
                        )}
                        onClick={() => {
                            setActivePanel(i.panel!);
                            setAlternativeHeader(true);
                            setPanelToGoBack(bindingTypeToEdit!);
                        }}
                    >
                        {i.icon}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EditorSidePanel;
