import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CustomUIMenuItem } from "@/types/vial.types";

interface DropdownControlProps {
    item: CustomUIMenuItem;
    value: number;
    onChange: (value: number) => void;
}

export const DropdownControl: React.FC<DropdownControlProps> = ({ item, value, onChange }) => {
    // Options format: string[] of option labels (value is the index)
    const options = item.options as string[] | undefined;

    if (!options || options.length === 0) {
        return (
            <div className="flex flex-row items-center justify-between p-3 gap-3 panel-layer-item">
                <span className="text-md">{item.label}</span>
                <span className="text-muted-foreground text-sm">No options defined</span>
            </div>
        );
    }

    // Clamp value to valid range
    const safeValue = Math.max(0, Math.min(value, options.length - 1));

    return (
        <div className="flex flex-row items-center justify-between p-3 gap-3 panel-layer-item">
            <span className="text-md">{item.label}</span>
            <Select
                value={String(safeValue)}
                onValueChange={(val) => onChange(parseInt(val))}
            >
                <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option, index) => (
                        <SelectItem key={index} value={String(index)}>
                            {option}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};
