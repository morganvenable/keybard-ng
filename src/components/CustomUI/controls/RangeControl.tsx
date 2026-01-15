import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import type { CustomUIMenuItem } from "@/types/vial.types";

interface RangeControlProps {
    item: CustomUIMenuItem;
    value: number;
    onChange: (value: number) => void;
}

export const RangeControl: React.FC<RangeControlProps> = ({ item, value, onChange }) => {
    // Options format: [min, max] or [min, max, step]
    const options = item.options as number[] | undefined;
    const min = options?.[0] ?? 0;
    const max = options?.[1] ?? 255;
    const step = options?.[2] ?? 1;

    return (
        <div className="flex flex-col gap-2 p-3 panel-layer-item">
            <span className="text-md">{item.label}</span>
            <div className="flex flex-row items-center gap-3">
                <Slider
                    value={[value]}
                    onValueChange={(values) => onChange(values[0])}
                    min={min}
                    max={max}
                    step={step}
                    className="flex-grow"
                />
                <Input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value) || min)}
                    className="w-20 text-right"
                    min={min}
                    max={max}
                />
            </div>
        </div>
    );
};
