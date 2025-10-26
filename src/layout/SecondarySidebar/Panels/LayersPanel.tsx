import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { GripVerticalIcon, PencilIcon } from "lucide-react";
import { useEffect, useState } from "react";

import EditLayer from "@/components/EditLayer";
import LayersIcon from "@/components/icons/Layers";
import { Button } from "@/components/ui/button";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { useVial } from "@/contexts/VialContext";
import { cn } from "@/lib/utils";
import { svalService } from "@/services/sval.service";

const layerModifiers = ["MO", "DF", "TG", "TT", "OSL", "TO"];

const LayersPanel = () => {
    const [activeModifier, setActiveModifier] = useState<string>(layerModifiers[0]);
    const { keyboard } = useVial();
    const { assignKeycode } = useKeyBinding();
    useEffect(() => {
        console.log("Keyboard updated:", keyboard);
    }, [keyboard]);
    return (
        <section className="space-y-3 h-full max-h-full flex flex-col   ">
            <div className="flex flex-wrap items-center justify-center gap-4">
                <div className="flex items-center justify-between rounded-full p-1 gap-1 bg-muted/30">
                    {layerModifiers.map((modifier) => {
                        const isActive = modifier === activeModifier;
                        return (
                            <Button
                                key={modifier}
                                type="button"
                                size="sm"
                                variant={isActive ? "default" : "ghost"}
                                className={cn("px-6 py-1 text-md rounded-full", isActive ? "shadow" : "text-muted-foreground")}
                                onClick={() => setActiveModifier(modifier)}
                            >
                                {modifier}
                            </Button>
                        );
                    })}
                </div>
            </div>
            <div className=" flex flex-col overflow-auto flex-grow">
                {Array.from({ length: keyboard!.layers || 16 }, (_, i) => {
                    const layer = svalService.getLayerNameNoLabel(keyboard!, i);
                    return (
                        <div className="flex flex-row items-center justify-between p-3 gap-3 panel-layer-item group/item" key={layer}>
                            <div className="flex flex-row items-center">
                                <Button size="sm" variant="ghost" className="cursor-move group-hover/item:opacity-100 opacity-0">
                                    <GripVerticalIcon className="h-4 w-4" />
                                </Button>
                                <div className={`ml-[5px] w-3 h-3 bg-black rounded-full flex-shrink-0`}></div>
                            </div>
                            <span className="text-md text-left w-full border-b border-b-dashed py-2">{layer}</span>
                            <div className="flex flex-row flex-shrink-0 items-center gap-1">
                                <div
                                    className="flex flex-col bg-black h-12 w-12 rounded-sm flex-shrink-0 items-center cursor-pointer border-2 hover:border-red-600 border-transparent transition-all"
                                    onClick={() => assignKeycode(`${activeModifier}(${i})`)}
                                >
                                    <LayersIcon className="h-4 w-4 mt-2 mb-1 text-white" />
                                    <span className="text-xs text-white">{i}</span>
                                </div>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button size="sm" variant="ghost" className="px-4 py-1  group-hover/item:opacity-100 opacity-0">
                                            <PencilIcon className="h-4 w-4" />
                                        </Button>
                                    </DialogTrigger>
                                    <EditLayer layer={i} layerName={svalService.getLayerCosmetic(keyboard!, i)} />
                                </Dialog>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default LayersPanel;
