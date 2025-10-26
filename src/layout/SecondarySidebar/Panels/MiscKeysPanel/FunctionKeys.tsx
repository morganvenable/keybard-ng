import Keyboard, { KeyboardOptions } from "react-simple-keyboard";

import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { commonKeyboardOptions } from "@/shared/CommonKeyboardOptions";
import { useRef } from "react";

const FunctionKeys = () => {
    const functionKeysRef = useRef(null);
    const { assignKeycode } = useKeyBinding();
    const keyboardOptions: KeyboardOptions = {
        ...commonKeyboardOptions,
        onKeyPress: (button: string) => {
            assignKeycode(button.replace(/{|}/g, ""));
        },
        /**
         * Layout by:
         * Sterling Butters (https://github.com/SterlingButters)
         */
        layout: {
            default: [
                "{KC_F1} {KC_F2} {KC_F3} {KC_F4} {KC_F5} {KC_F6} {KC_F7} {KC_F8} {KC_F9} {KC_F10} {KC_F11} {KC_F12}",
                "{KC_F13} {KC_F14} {KC_F15} {KC_F16} {KC_F17} {KC_F18} {KC_F19} {KC_F20} {KC_F21}",
                "{KC_F22} {KC_F23} {KC_F24}",
            ],
            shift: [
                "{KC_F1} {KC_F2} {KC_F3} {KC_F4} {KC_F5} {KC_F6} {KC_F7} {KC_F8} {KC_F9} {KC_F10} {KC_F11} {KC_F12}",
                "{KC_13} {KC_14} {KC_15} {KC_16} {KC_17} {KC_18} {KC_19} {KC_20} {KC_21}",
                "{KC_22} {KC_23} {KC_24}",
            ],
        },
        display: {
            "{KC_F1}": "F1",
            "{KC_F2}": "F2",
            "{KC_F3}": "F3",
            "{KC_F4}": "F4",
            "{KC_F5}": "F5",
            "{KC_F6}": "F6",
            "{KC_F7}": "F7",
            "{KC_F8}": "F8",
            "{KC_F9}": "F9",
            "{KC_F10}": "F10",
            "{KC_F11}": "F11",
            "{KC_F12}": "F12",
            "{KC_F13}": "F13",
            "{KC_F14}": "F14",
            "{KC_F15}": "F15",
            "{KC_F16}": "F16",
            "{KC_F17}": "F17",
            "{KC_F18}": "F18",
            "{KC_F19}": "F19",
            "{KC_F20}": "F20",
            "{KC_F21}": "F21",
            "{KC_F22}": "F22",
            "{KC_F23}": "F23",
            "{KC_F24}": "F24",
        },
    };
    return (
        <div>
            <span className="font-semibold text-lg text-slate-700">All function keys</span>
            <Keyboard ref={(r: any) => (functionKeysRef.current = r)} layoutName="default" {...keyboardOptions} />
        </div>
    );
};

export default FunctionKeys;
