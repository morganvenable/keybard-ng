import { FC } from "react";
import CombineIcon from "@/components/icons/CombineIcon";

interface Props {
    className?: string;
}

const ComboIcon: FC<Props> = ({ className }) => {
    return <CombineIcon className={className} />;
};

export default ComboIcon;
