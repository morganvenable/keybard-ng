import Keyboard, { KeyboardOptions } from "react-simple-keyboard";

import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { commonKeyboardOptions } from "@/shared/CommonKeyboardOptions";
import { useRef } from "react";

const StenoKeys = () => {
    const group1Ref = useRef(null);
    const group2Ref = useRef(null);
    const { assignKeycode } = useKeyBinding();

    // shared display labels (only keys used in each group's options will be referenced)
    const display = {
        "{STN_N1}": "#₁",
        "{STN_N2}": "#₂",
        "{STN_N3}": "#₃",
        "{STN_N4}": "#₄",
        "{STN_N5}": "#₅",
        "{STN_S1}": "S-₁",
        "{STN_TL}": "T-",
        "{STN_PL}": "P-",
        "{STN_HL}": "H-",
        "{STN_ST1}": "*₁",
        "{STN_S3}": "SS-",
        "{STN_TKL}": "TK-",
        "{STN_PWL}": "PW-",
        "{STN_HRL}": "H-",
        "{STN_S2}": "S-₂",
        "{STN_KL}": "K-",
        "{STN_WL}": "W-",
        "{STN_RL}": "R-",
        "{STN_ST2}": "*₂",
        "{STN_A}": "A",
        "{STN_O}": "O",
        "{STN_N7}": "#₇",
        "{STN_N8}": "#₈",
        "{STN_N9}": "#₉",
        "{STN_NA}": "#₁₀",
        "{STN_NB}": "#₁₁",
        "{STN_NC}": "#₁₂",
        "{STN_ST3}": "*₃",
        "{STN_FR}": "-F",
        "{STN_PR}": "-P",
        "{STN_LR}": "-L",
        "{STN_TR}": "-T",
        "{STN_DR}": "-D",
        "{STN_FRR}": "-FR",
        "{STN_PBR}": "-PB",
        "{STN_LGR}": "-LG",
        "{STN_TSR}": "-TS",
        "{STN_DZR}": "-DZ",
        "{STN_ST4}": "*₄",
        "{STN_RR}": "-R",
        "{STN_BR}": "-B",
        "{STN_GR}": "-G",
        "{STN_SR}": "-S",
        "{STN_ZR}": "-Z",
        "{STN_E}": "E",
        "{STN_U}": "U",
    } as Record<string, string>;

    const group1Options: KeyboardOptions = {
        ...commonKeyboardOptions,
        onKeyPress: (button: string) => {
            assignKeycode(button.replace(/{|}/g, ""));
        },
        layout: {
            default: [
                "{STN_N1} {STN_N2} {STN_N3} {STN_N4} {STN_N5}",
                "{STN_S1} {STN_TL} {STN_PL} {STN_HL} {STN_ST1}",
                "{STN_S3} {STN_TKL} {STN_PWL} {STN_HRL} {STN_ST1}",
                "{STN_S2} {STN_KL} {STN_WL} {STN_RL} {STN_ST2}",
                "{STN_A} {STN_O}",
            ],
            shift: [
                "{STN_N1} {STN_N2} {STN_N3} {STN_N4} {STN_N5}",
                "{STN_S1} {STN_TL} {STN_PL} {STN_HL} {STN_ST1}",
                "{STN_S3} {STN_TKL} {STN_PWL} {STN_HRL} {STN_ST1}",
                "{STN_S2} {STN_KL} {STN_WL} {STN_RL} {STN_ST2}",
                "{STN_A} {STN_O}",
            ],
        },
        display,
    };

    const group2Options: KeyboardOptions = {
        ...commonKeyboardOptions,
        onKeyPress: (button: string) => {
            assignKeycode(button.replace(/{|}/g, ""));
        },
        layout: {
            default: [
                "{STN_N7} {STN_N8} {STN_N9} {STN_NA} {STN_NB} {STN_NC}",
                "{STN_ST3} {STN_FR} {STN_PR} {STN_LR} {STN_TR} {STN_DR}",
                "{STN_ST3} {STN_FRR} {STN_PBR} {STN_LGR} {STN_TSR} {STN_DZR}",
                "{STN_ST4} {STN_RR} {STN_BR} {STN_GR} {STN_SR} {STN_ZR}",
                "{STN_E} {STN_U}",
            ],
            shift: [
                "{STN_N7} {STN_N8} {STN_N9} {STN_NA} {STN_NB} {STN_NC}",
                "{STN_ST3} {STN_FR} {STN_PR} {STN_LR} {STN_TR} {STN_DR}",
                "{STN_ST3} {STN_FRR} {STN_PBR} {STN_LGR} {STN_TSR} {STN_DZR}",
                "{STN_ST4} {STN_RR} {STN_BR} {STN_GR} {STN_SR} {STN_ZR}",
                "{STN_E} {STN_U}",
            ],
        },
        display,
    };

    return (
        <div>
            <span className="font-semibold text-lg text-slate-700">All steno keys</span>
            <div className="flex flex-row gap-1">
                <div className="flex-1">
                    <Keyboard ref={(r: any) => (group1Ref.current = r)} layoutName="default" {...group1Options} />
                </div>
                <div className="flex-1">
                    <Keyboard ref={(r: any) => (group2Ref.current = r)} layoutName="default" {...group2Options} />
                </div>
            </div>
        </div>
    );
};

export default StenoKeys;
