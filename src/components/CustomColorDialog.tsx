import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { hsvToHex } from "@/utils/color-conversion";

interface CustomColorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialHue?: number;
    initialSat?: number;
    initialVal?: number;
    onApply: (hue: number, sat: number, val: number) => void;
    layerName?: string;
}

/**
 * Dialog for selecting a custom HSV color for layer lights
 * Uses 0-255 range for all HSV values (QMK/Svalboard format)
 */
const CustomColorDialog = ({
    open,
    onOpenChange,
    initialHue = 85,
    initialSat = 255,
    initialVal = 200,
    onApply,
    layerName,
}: CustomColorDialogProps) => {
    const [hue, setHue] = useState(initialHue);
    const [sat, setSat] = useState(initialSat);
    const [val, setVal] = useState(initialVal);

    // Reset to initial values when dialog opens
    useEffect(() => {
        if (open) {
            setHue(initialHue);
            setSat(initialSat);
            setVal(initialVal);
        }
    }, [open, initialHue, initialSat, initialVal]);

    const previewColor = hsvToHex(hue, sat, val);

    const handleApply = () => {
        onApply(hue, sat, val);
        onOpenChange(false);
    };

    // Generate hue gradient for the slider track
    const hueGradient = `linear-gradient(to right,
        hsl(0, 100%, 50%),
        hsl(60, 100%, 50%),
        hsl(120, 100%, 50%),
        hsl(180, 100%, 50%),
        hsl(240, 100%, 50%),
        hsl(300, 100%, 50%),
        hsl(360, 100%, 50%)
    )`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Custom Layer Color</DialogTitle>
                    <DialogDescription>
                        {layerName
                            ? `Set a custom color for "${layerName}" layer light.`
                            : "Set a custom color for the layer light."
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Color Preview */}
                    <div className="flex items-center justify-center">
                        <div
                            className="w-20 h-20 rounded-full shadow-lg border-4 border-white"
                            style={{
                                backgroundColor: previewColor,
                                boxShadow: `0 0 20px ${previewColor}40`
                            }}
                        />
                    </div>

                    {/* Hue Slider */}
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="hue">Hue</Label>
                            <span className="text-sm text-muted-foreground w-12 text-right">{hue}</span>
                        </div>
                        <div
                            className="relative rounded-full h-3 overflow-hidden"
                            style={{ background: hueGradient }}
                        >
                            <Slider
                                id="hue"
                                min={0}
                                max={255}
                                step={1}
                                value={[hue]}
                                onValueChange={([v]) => setHue(v)}
                                className="absolute inset-0 [&_[data-slot=slider-track]]:bg-transparent [&_[data-slot=slider-range]]:bg-transparent"
                            />
                        </div>
                    </div>

                    {/* Saturation Slider */}
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="sat">Saturation</Label>
                            <span className="text-sm text-muted-foreground w-12 text-right">{sat}</span>
                        </div>
                        <div
                            className="relative rounded-full h-3 overflow-hidden"
                            style={{
                                background: `linear-gradient(to right,
                                    ${hsvToHex(hue, 0, val)},
                                    ${hsvToHex(hue, 255, val)}
                                )`
                            }}
                        >
                            <Slider
                                id="sat"
                                min={0}
                                max={255}
                                step={1}
                                value={[sat]}
                                onValueChange={([v]) => setSat(v)}
                                className="absolute inset-0 [&_[data-slot=slider-track]]:bg-transparent [&_[data-slot=slider-range]]:bg-transparent"
                            />
                        </div>
                    </div>

                    {/* Value/Brightness Slider */}
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="val">Brightness</Label>
                            <span className="text-sm text-muted-foreground w-12 text-right">{val}</span>
                        </div>
                        <div
                            className="relative rounded-full h-3 overflow-hidden"
                            style={{
                                background: `linear-gradient(to right,
                                    ${hsvToHex(hue, sat, 0)},
                                    ${hsvToHex(hue, sat, 255)}
                                )`
                            }}
                        >
                            <Slider
                                id="val"
                                min={0}
                                max={255}
                                step={1}
                                value={[val]}
                                onValueChange={([v]) => setVal(v)}
                                className="absolute inset-0 [&_[data-slot=slider-track]]:bg-transparent [&_[data-slot=slider-range]]:bg-transparent"
                            />
                        </div>
                    </div>

                    {/* Hex value display */}
                    <div className="flex items-center justify-center text-sm text-muted-foreground">
                        {previewColor.toUpperCase()}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleApply}>
                        Apply
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CustomColorDialog;
