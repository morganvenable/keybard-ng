import TapdanceIcon from "@/components/icons/Tapdance";
import { useVial } from "@/contexts/VialContext";
import BindingsList from "../components/BindingsList";

interface TapdancePanelProps {}

const TapdancePanel: React.FC<TapdancePanelProps> = () => {
    const { keyboard } = useVial();
    const tapdances = (keyboard as any)?.tapdances || [];
    return <BindingsList icon={<TapdanceIcon className="h-4 w-4 text-white" />} items={tapdances} bindingType="tapdances" />;
};

export default TapdancePanel;
