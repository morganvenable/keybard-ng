import { Switch } from "@/components/ui/switch";
import type { CustomUIMenuItem } from "@/types/vial.types";

interface ToggleControlProps {
    item: CustomUIMenuItem;
    value: number;
    onChange: (value: number) => void;
}

export const ToggleControl: React.FC<ToggleControlProps> = ({ item, value, onChange }) => {
    return (
        <div className="flex flex-row items-center justify-between p-3 gap-3 panel-layer-item">
            <span className="text-md">{item.label}</span>
            <Switch
                checked={value === 1}
                onCheckedChange={(checked) => onChange(checked ? 1 : 0)}
            />
        </div>
    );
};
