import MacrosIcon from "@/components/icons/MacrosIcon";
import { useVial } from "@/contexts/VialContext";
import BindingsList from "../components/BindingsList";

const MacrosPanel = () => {
    const { keyboard } = useVial();
    const macros = (keyboard as any)?.macros || [];
    return <BindingsList icon={<MacrosIcon className="h-4 w-4 text-white" />} items={macros} bindingType="macros" />;
};

export default MacrosPanel;
