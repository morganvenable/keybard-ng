import { DialogClose, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { FC, useState } from "react";

import { useVial } from "@/contexts/VialContext";
import { layerColors } from "@/utils/colors";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface Props {
    layer: number;
    layerName?: string;
}

const EditLayer: FC<Props> = ({ layer, layerName }) => {
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [name, setName] = useState<string>(layerName || "");
    const { keyboard, setKeyboard } = useVial();
    const handleSubmit = () => {
        console.log("Submitting layer edit:", { layer, name, selectedColor });
        if (keyboard) {
            const updatedKeyboard = { ...keyboard };
            const layerCosmetics = updatedKeyboard.cosmetic?.layer || {};
            if (name && layerCosmetics) {
                layerCosmetics[layer] = name;
            }
            if (!updatedKeyboard.cosmetic?.layer_colors) updatedKeyboard.cosmetic = { ...updatedKeyboard.cosmetic, layer_colors: {} };
            const layerColors = updatedKeyboard.cosmetic?.layer_colors;
            if (selectedColor && layerColors) {
                if (!layerColors) updatedKeyboard.cosmetic = { ...updatedKeyboard.cosmetic, layer_colors: {} };
                layerColors[layer] = selectedColor;
            }
            setKeyboard(updatedKeyboard);
        }
    };
    return (
        <DialogContent>
            <DialogHeader></DialogHeader>
            <div className="grid gap-4">
                <Label htmlFor="name-1">Change name for layer {layer}</Label>
                <Input id="name-1" name="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-3 mt-4">
                <Label htmlFor="color-1">Layer Color</Label>
                <div className="flex flex-row gap-2">
                    {layerColors.map((color) => (
                        <div
                            key={color.name}
                            className={`w-10 h-10 rounded-full cursor-pointer hover:opacity-90 ${
                                selectedColor === color.name ? "border-black border-2 shadow-md" : "border-transparent"
                            }`}
                            style={{ backgroundColor: color.hex }}
                            onClick={() => setSelectedColor(color.name)}
                        ></div>
                    ))}
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                    <Button onClick={() => handleSubmit()}>Save changes</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    );
};

export default EditLayer;
