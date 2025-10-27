import "./MiscKeys.css";

import AudioKeys from "./AudioKeys";
import BacklightsKeys from "./BacklightsKeys";
import FunctionKeys from "./FunctionKeys";
import MediaKeys from "./MediaKeys";
import StenoKeys from "./StenoKeys";

const MiscKeysPanel = () => {
    return (
        <div className="flex flex-col gap-4">
            <FunctionKeys />
            <MediaKeys />
            <AudioKeys />
            <StenoKeys />
            <BacklightsKeys />
        </div>
    );
};

export default MiscKeysPanel;
