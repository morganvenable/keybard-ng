import "react-simple-keyboard/build/css/index.css";

import { FunctionComponent, useState } from "react";
import Keyboard, { KeyboardOptions } from "react-simple-keyboard";

interface IProps {
    onChange: (input: string) => void;
    onKeyPress?: (button: string) => void;
    keyboardRef: any;
}
const internationalKeyboards = [
    { label: "English (US)", value: "us" },
    { label: "English (UK)", value: "uk" },
    { label: "Brazilian", value: "br" },
    { label: "Canadian (CSA)", value: "ca-csa" },
    { label: "Colemak", value: "colemak" },
    { label: "Croatian (QWERTZ)", value: "croatian-qwertz" },
    { label: "Danish", value: "danish" },
    { label: "EuroKey", value: "eurokey" },
    { label: "French (AZERTY)", value: "french-azerty" },
    { label: "French (Mac)", value: "french-mac" },
    { label: "German (QWERTZ)", value: "german-qwertz" },
    { label: "Hebrew (Standard)", value: "hebrew-standard" },
    { label: "Hungarian (QWERTZ)", value: "hungarian-qwertz" },
    { label: "Italian", value: "italian" },
    { label: "Japanese", value: "japanese" },
    { label: "Latin American", value: "latin-american" },
    { label: "Norwegian", value: "norwegian" },
    { label: "Russian", value: "russian" },
    { label: "Slovak", value: "slovak" },
    { label: "Spanish", value: "spanish" },
    { label: "Swedish", value: "swedish" },
    { label: "Swedish (SWERTY)", value: "swedish-swerty" },
    { label: "Swiss (QWERTZ)", value: "swiss-qwertz" },
    { label: "Turkish", value: "turkish" },
];

const QwertyKeyboard: FunctionComponent<IProps> = ({ onChange, onKeyPress: onKeyPressCallback, keyboardRef }) => {
    const [layoutName, setLayoutName] = useState("default");
    const [internationalKeyboard, setInternationalKeyboard] = useState("us");
    const onKeyPress = (button: string) => {
        console.log("aaaa");
        console.log("Button pressed", button);
        if (button === "{shift}" || button === "{lock}") {
            setLayoutName(layoutName === "default" ? "shift" : "default");
        }
        // Call the callback if provided
        if (onKeyPressCallback) {
            onKeyPressCallback(button);
        }
    };
    const commonKeyboardOptions: KeyboardOptions = {
        onChange: (input: string) => onChange(input),
        onKeyPress: (button: any) => onKeyPress(button),
        theme: "simple-keyboard hg-theme-default hg-layout-default",
        physicalKeyboardHighlight: true,
        syncInstanceInputs: true,
        mergeDisplay: true,
        debug: true,
        disableButtonHold: true,
        preventMouseDownDefault: true,
        useButtonTag: true,
        disableCaretPositioning: true,
        useMouseEvents: true,
    };

    const keyboardOptions = {
        ...commonKeyboardOptions,
        /**
         * Layout by:
         * Sterling Butters (https://github.com/SterlingButters)
         */
        layout: {
            default: [
                "{escape} {f1} {f2} {f3} {f4} {f5} {f6} {f7} {f8} {f9} {f10} {f11} {f12}",
                "` 1 2 3 4 5 6 7 8 9 0 - = {backspace}",
                "{tab} q w e r t y u i o p [ ] \\",
                "{capslock} a s d f g h j k l ; ' {enter}",
                "{shiftleft} z x c v b n m , . / {shiftright}",
                "{controlleft} {altleft} {metaleft} {space} {metaright} {altright} {controlright}",
            ],
            shift: [
                "{escape} {f1} {f2} {f3} {f4} {f5} {f6} {f7} {f8} {f9} {f10} {f11} {f12}",
                "~ ! @ # $ % ^ & * ( ) _ + {backspace}",
                "{tab} Q W E R T Y U I O P { } |",
                '{capslock} A S D F G H J K L : " {enter}',
                "{shiftleft} Z X C V B N M < > ? {shiftright}",
                "{controlleft} {altleft} {metaleft} {space} {metaright} {altright} {controlright}",
            ],
        },
        display: {
            "{escape}": "esc",
            "{tab}": "tab",
            "{backspace}": "bksp",
            "{enter}": "enter",
            "{capslock}": "caps lock",
            "{shiftleft}": "lshift",
            "{shiftright}": "rshift",
            "{controlleft}": "lctrl",
            "{controlright}": "rctrl",
            "{altleft}": "alt",
            "{altright}": "alt",
            "{metaleft}": "GUI",
            "{metaright}": "GUI",
        },
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-row items-center gap-2">
                <select
                    className="border rounded-md text-lg text-slate-600 py-4 border-none !outline-none focus:border-none focus:outline-none cursor-pointer font-semibold "
                    value={internationalKeyboard}
                    onChange={(e) => setInternationalKeyboard(e.target.value)}
                >
                    {internationalKeyboards.map((keyboard) => (
                        <option key={keyboard.value} value={keyboard.value}>
                            {keyboard.label}
                        </option>
                    ))}
                </select>
            </div>

            <Keyboard keyboardRef={(r) => (keyboardRef.current = r)} layoutName={layoutName} {...keyboardOptions} />
        </div>
    );
};

export default QwertyKeyboard;
