import { Button } from "@/components/ui/button";
import type { CustomUIMenuItem } from "@/types/vial.types";

interface ButtonControlProps {
    item: CustomUIMenuItem;
    onClick: () => void;
}

export const ButtonControl: React.FC<ButtonControlProps> = ({ item, onClick }) => {
    return (
        <div className="flex flex-row items-center justify-between p-3 gap-3 panel-layer-item">
            <span className="text-md">{item.label}</span>
            <Button variant="outline" onClick={onClick}>
                Execute
            </Button>
        </div>
    );
};
