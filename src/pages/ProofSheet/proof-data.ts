/**
 * Proof Sheet Data - Complete key definitions for visual key inspection
 * Includes ALL keycodes organized by category
 */

import { KeyboardInfo, KeyContent } from "@/types/vial.types";
import { getKeyContents } from "@/utils/keys";

/**
 * Mock KeyboardInfo with cosmetic layer names, sample macros, and tapdances
 * Used for rendering proof sheet keys without a connected keyboard
 */
export const mockKeyboardInfo: KeyboardInfo = {
    rows: 4,
    cols: 12,
    layers: 16,
    cosmetic: {
        name: "Proof Sheet Mock",
        layer: {
            "0": "default",
            "1": "nav",
            "2": "num",
            "3": "sym",
            "4": "fn",
            "5": "mouse",
            "15": "admin",
        },
    },
    macros: [
        { mid: 0, actions: [["text", "Hello"]] },
        { mid: 1, actions: [["tap", "KC_LCTRL"], ["tap", "KC_C"]] },
        { mid: 2, actions: [["text", "World"]] },
        { mid: 3, actions: [["tap", "KC_LALT"], ["tap", "KC_TAB"]] },
        { mid: 15, actions: [["text", "Macro15"]] },
    ],
    tapdances: [
        { idx: 0, tap: "KC_A", hold: "KC_LSHIFT", doubletap: "KC_CAPSLOCK", taphold: "KC_NO", tapping_term: 200 },
        { idx: 1, tap: "KC_SPACE", hold: "MO(1)", doubletap: "KC_ENTER", taphold: "KC_NO", tapping_term: 200 },
        { idx: 2, tap: "KC_ESCAPE", hold: "KC_LCTRL", doubletap: "KC_GRAVE", taphold: "KC_NO", tapping_term: 200 },
    ],
    custom_keycodes: [
        { name: "USER00", title: "Custom Key 0", shortName: "USR0" },
        { name: "USER01", title: "Custom Key 1", shortName: "USR1" },
        { name: "USER02", title: "Custom Key 2", shortName: "USR2" },
    ],
};

/**
 * Proof category definition
 */
export interface ProofKey {
    keycode: string;
    description?: string;
}

export interface ProofCategory {
    name: string;
    description: string;
    keys: ProofKey[];
}

/**
 * All proof categories with ALL keys
 */
export const proofCategories: ProofCategory[] = [
    {
        name: "Special Keys",
        description: "Blank and transparent keys",
        keys: [
            { keycode: "KC_NO", description: "No key (blank)" },
            { keycode: "KC_TRNS", description: "Transparent (pass-through)" },
        ],
    },
    {
        name: "Letters",
        description: "All letter keys A-Z",
        keys: [
            { keycode: "KC_A" }, { keycode: "KC_B" }, { keycode: "KC_C" }, { keycode: "KC_D" },
            { keycode: "KC_E" }, { keycode: "KC_F" }, { keycode: "KC_G" }, { keycode: "KC_H" },
            { keycode: "KC_I" }, { keycode: "KC_J" }, { keycode: "KC_K" }, { keycode: "KC_L" },
            { keycode: "KC_M" }, { keycode: "KC_N" }, { keycode: "KC_O" }, { keycode: "KC_P" },
            { keycode: "KC_Q" }, { keycode: "KC_R" }, { keycode: "KC_S" }, { keycode: "KC_T" },
            { keycode: "KC_U" }, { keycode: "KC_V" }, { keycode: "KC_W" }, { keycode: "KC_X" },
            { keycode: "KC_Y" }, { keycode: "KC_Z" },
        ],
    },
    {
        name: "Numbers",
        description: "Number keys 0-9 (show shift symbols)",
        keys: [
            { keycode: "KC_1", description: "!/1" }, { keycode: "KC_2", description: "@/2" },
            { keycode: "KC_3", description: "#/3" }, { keycode: "KC_4", description: "$/4" },
            { keycode: "KC_5", description: "%/5" }, { keycode: "KC_6", description: "^/6" },
            { keycode: "KC_7", description: "&/7" }, { keycode: "KC_8", description: "*/8" },
            { keycode: "KC_9", description: "(/9" }, { keycode: "KC_0", description: ")/0" },
        ],
    },
    {
        name: "Punctuation",
        description: "Punctuation and symbol keys",
        keys: [
            { keycode: "KC_MINUS", description: "- / _" },
            { keycode: "KC_EQUAL", description: "= / +" },
            { keycode: "KC_LBRACKET", description: "[ / {" },
            { keycode: "KC_RBRACKET", description: "] / }" },
            { keycode: "KC_BSLASH", description: "\\ / |" },
            { keycode: "KC_SCOLON", description: "; / :" },
            { keycode: "KC_QUOTE", description: "' / \"" },
            { keycode: "KC_GRAVE", description: "` / ~" },
            { keycode: "KC_COMMA", description: ", / <" },
            { keycode: "KC_DOT", description: ". / >" },
            { keycode: "KC_SLASH", description: "/ / ?" },
            { keycode: "KC_NONUS_HASH", description: "Non-US #" },
            { keycode: "KC_NONUS_BSLASH", description: "Non-US \\" },
        ],
    },
    {
        name: "Shifted Symbols",
        description: "Pre-shifted symbol keycodes",
        keys: [
            { keycode: "KC_EXLM", description: "!" },
            { keycode: "KC_AT", description: "@" },
            { keycode: "KC_HASH", description: "#" },
            { keycode: "KC_DLR", description: "$" },
            { keycode: "KC_PERC", description: "%" },
            { keycode: "KC_CIRC", description: "^" },
            { keycode: "KC_AMPR", description: "&" },
            { keycode: "KC_ASTR", description: "*" },
            { keycode: "KC_LPRN", description: "(" },
            { keycode: "KC_RPRN", description: ")" },
            { keycode: "KC_UNDS", description: "_" },
            { keycode: "KC_PLUS", description: "+" },
            { keycode: "KC_LCBR", description: "{" },
            { keycode: "KC_RCBR", description: "}" },
            { keycode: "KC_PIPE", description: "|" },
            { keycode: "KC_COLN", description: ":" },
            { keycode: "KC_DQUO", description: "\"" },
            { keycode: "KC_TILD", description: "~" },
            { keycode: "KC_LT", description: "<" },
            { keycode: "KC_GT", description: ">" },
            { keycode: "KC_QUES", description: "?" },
        ],
    },
    {
        name: "Editing Keys",
        description: "Common editing and control keys",
        keys: [
            { keycode: "KC_ENTER", description: "Enter/Return" },
            { keycode: "KC_ESCAPE", description: "Escape" },
            { keycode: "KC_BSPACE", description: "Backspace" },
            { keycode: "KC_TAB", description: "Tab" },
            { keycode: "KC_SPACE", description: "Space" },
            { keycode: "KC_CAPSLOCK", description: "Caps Lock" },
            { keycode: "KC_INSERT", description: "Insert" },
            { keycode: "KC_DELETE", description: "Delete" },
            { keycode: "KC_APPLICATION", description: "Application/Menu" },
        ],
    },
    {
        name: "Modifiers",
        description: "All modifier keys (Ctrl, Shift, Alt, GUI)",
        keys: [
            { keycode: "KC_LCTRL", description: "Left Control" },
            { keycode: "KC_LSHIFT", description: "Left Shift" },
            { keycode: "KC_LALT", description: "Left Alt" },
            { keycode: "KC_LGUI", description: "Left GUI/Super" },
            { keycode: "KC_RCTRL", description: "Right Control" },
            { keycode: "KC_RSHIFT", description: "Right Shift" },
            { keycode: "KC_RALT", description: "Right Alt" },
            { keycode: "KC_RGUI", description: "Right GUI/Super" },
        ],
    },
    {
        name: "Function Keys",
        description: "F1-F24 function keys",
        keys: [
            { keycode: "KC_F1" }, { keycode: "KC_F2" }, { keycode: "KC_F3" }, { keycode: "KC_F4" },
            { keycode: "KC_F5" }, { keycode: "KC_F6" }, { keycode: "KC_F7" }, { keycode: "KC_F8" },
            { keycode: "KC_F9" }, { keycode: "KC_F10" }, { keycode: "KC_F11" }, { keycode: "KC_F12" },
            { keycode: "KC_F13" }, { keycode: "KC_F14" }, { keycode: "KC_F15" }, { keycode: "KC_F16" },
            { keycode: "KC_F17" }, { keycode: "KC_F18" }, { keycode: "KC_F19" }, { keycode: "KC_F20" },
            { keycode: "KC_F21" }, { keycode: "KC_F22" }, { keycode: "KC_F23" }, { keycode: "KC_F24" },
        ],
    },
    {
        name: "Navigation",
        description: "Arrow keys and navigation cluster",
        keys: [
            { keycode: "KC_UP", description: "Up Arrow" },
            { keycode: "KC_DOWN", description: "Down Arrow" },
            { keycode: "KC_LEFT", description: "Left Arrow" },
            { keycode: "KC_RIGHT", description: "Right Arrow" },
            { keycode: "KC_HOME", description: "Home" },
            { keycode: "KC_END", description: "End" },
            { keycode: "KC_PGUP", description: "Page Up" },
            { keycode: "KC_PGDOWN", description: "Page Down" },
            { keycode: "KC_PSCREEN", description: "Print Screen" },
            { keycode: "KC_SCROLLLOCK", description: "Scroll Lock" },
            { keycode: "KC_PAUSE", description: "Pause/Break" },
        ],
    },
    {
        name: "Numpad",
        description: "Numeric keypad keys",
        keys: [
            { keycode: "KC_NUMLOCK", description: "Num Lock" },
            { keycode: "KC_KP_SLASH", description: "Numpad /" },
            { keycode: "KC_KP_ASTERISK", description: "Numpad *" },
            { keycode: "KC_KP_MINUS", description: "Numpad -" },
            { keycode: "KC_KP_PLUS", description: "Numpad +" },
            { keycode: "KC_KP_ENTER", description: "Numpad Enter" },
            { keycode: "KC_KP_1" }, { keycode: "KC_KP_2" }, { keycode: "KC_KP_3" },
            { keycode: "KC_KP_4" }, { keycode: "KC_KP_5" }, { keycode: "KC_KP_6" },
            { keycode: "KC_KP_7" }, { keycode: "KC_KP_8" }, { keycode: "KC_KP_9" },
            { keycode: "KC_KP_0" },
            { keycode: "KC_KP_DOT", description: "Numpad ." },
            { keycode: "KC_KP_EQUAL", description: "Numpad =" },
            { keycode: "KC_KP_COMMA", description: "Numpad ," },
        ],
    },
    {
        name: "Media Keys",
        description: "Media playback and volume controls",
        keys: [
            { keycode: "KC_MUTE", description: "Mute" },
            { keycode: "KC_VOLU", description: "Volume Up" },
            { keycode: "KC_VOLD", description: "Volume Down" },
            { keycode: "KC_MPLY", description: "Play/Pause" },
            { keycode: "KC_MSTP", description: "Stop" },
            { keycode: "KC_MNXT", description: "Next Track" },
            { keycode: "KC_MPRV", description: "Previous Track" },
            { keycode: "KC_MFFD", description: "Fast Forward" },
            { keycode: "KC_MRWD", description: "Rewind" },
            { keycode: "KC_MSEL", description: "Media Select" },
            { keycode: "KC_EJCT", description: "Eject" },
        ],
    },
    {
        name: "System Keys",
        description: "System and application control",
        keys: [
            { keycode: "KC_PWR", description: "Power" },
            { keycode: "KC_SLEP", description: "Sleep" },
            { keycode: "KC_WAKE", description: "Wake" },
            { keycode: "KC_BRIU", description: "Brightness Up" },
            { keycode: "KC_BRID", description: "Brightness Down" },
            { keycode: "KC_MAIL", description: "Mail" },
            { keycode: "KC_CALC", description: "Calculator" },
            { keycode: "KC_MYCM", description: "My Computer" },
            { keycode: "KC_WSCH", description: "Web Search" },
            { keycode: "KC_WHOM", description: "Web Home" },
            { keycode: "KC_WBAK", description: "Web Back" },
            { keycode: "KC_WFWD", description: "Web Forward" },
            { keycode: "KC_WSTP", description: "Web Stop" },
            { keycode: "KC_WREF", description: "Web Refresh" },
            { keycode: "KC_WFAV", description: "Web Favorites" },
        ],
    },
    {
        name: "Mouse Movement",
        description: "Mouse cursor movement keys",
        keys: [
            { keycode: "KC_MS_U", description: "Mouse Up" },
            { keycode: "KC_MS_D", description: "Mouse Down" },
            { keycode: "KC_MS_L", description: "Mouse Left" },
            { keycode: "KC_MS_R", description: "Mouse Right" },
        ],
    },
    {
        name: "Mouse Wheel",
        description: "Mouse wheel scroll keys",
        keys: [
            { keycode: "KC_WH_U", description: "Wheel Up" },
            { keycode: "KC_WH_D", description: "Wheel Down" },
            { keycode: "KC_WH_L", description: "Wheel Left" },
            { keycode: "KC_WH_R", description: "Wheel Right" },
        ],
    },
    {
        name: "Mouse Buttons",
        description: "Mouse button clicks",
        keys: [
            { keycode: "KC_BTN1", description: "Button 1 (Left)" },
            { keycode: "KC_BTN2", description: "Button 2 (Right)" },
            { keycode: "KC_BTN3", description: "Button 3 (Middle)" },
            { keycode: "KC_BTN4", description: "Button 4" },
            { keycode: "KC_BTN5", description: "Button 5" },
            { keycode: "KC_MS_BTN6", description: "Button 6" },
            { keycode: "KC_MS_BTN7", description: "Button 7" },
            { keycode: "KC_MS_BTN8", description: "Button 8" },
        ],
    },
    {
        name: "Mouse Acceleration",
        description: "Mouse acceleration controls",
        keys: [
            { keycode: "KC_ACL0", description: "Acceleration 0" },
            { keycode: "KC_ACL1", description: "Acceleration 1" },
            { keycode: "KC_ACL2", description: "Acceleration 2" },
        ],
    },
    {
        name: "Layer Keys (MO)",
        description: "Momentary layer activation (0-15)",
        keys: [
            { keycode: "MO(0)" }, { keycode: "MO(1)" }, { keycode: "MO(2)" }, { keycode: "MO(3)" },
            { keycode: "MO(4)" }, { keycode: "MO(5)" }, { keycode: "MO(6)" }, { keycode: "MO(7)" },
            { keycode: "MO(8)" }, { keycode: "MO(9)" }, { keycode: "MO(10)" }, { keycode: "MO(11)" },
            { keycode: "MO(12)" }, { keycode: "MO(13)" }, { keycode: "MO(14)" }, { keycode: "MO(15)" },
        ],
    },
    {
        name: "Layer Keys (DF)",
        description: "Default layer switch (0-15)",
        keys: [
            { keycode: "DF(0)" }, { keycode: "DF(1)" }, { keycode: "DF(2)" }, { keycode: "DF(3)" },
            { keycode: "DF(4)" }, { keycode: "DF(5)" }, { keycode: "DF(6)" }, { keycode: "DF(7)" },
            { keycode: "DF(8)" }, { keycode: "DF(9)" }, { keycode: "DF(10)" }, { keycode: "DF(11)" },
            { keycode: "DF(12)" }, { keycode: "DF(13)" }, { keycode: "DF(14)" }, { keycode: "DF(15)" },
        ],
    },
    {
        name: "Layer Keys (TG)",
        description: "Toggle layer (0-15)",
        keys: [
            { keycode: "TG(0)" }, { keycode: "TG(1)" }, { keycode: "TG(2)" }, { keycode: "TG(3)" },
            { keycode: "TG(4)" }, { keycode: "TG(5)" }, { keycode: "TG(6)" }, { keycode: "TG(7)" },
            { keycode: "TG(8)" }, { keycode: "TG(9)" }, { keycode: "TG(10)" }, { keycode: "TG(11)" },
            { keycode: "TG(12)" }, { keycode: "TG(13)" }, { keycode: "TG(14)" }, { keycode: "TG(15)" },
        ],
    },
    {
        name: "Layer Keys (TT)",
        description: "Tap-toggle layer (0-15)",
        keys: [
            { keycode: "TT(0)" }, { keycode: "TT(1)" }, { keycode: "TT(2)" }, { keycode: "TT(3)" },
            { keycode: "TT(4)" }, { keycode: "TT(5)" }, { keycode: "TT(6)" }, { keycode: "TT(7)" },
            { keycode: "TT(8)" }, { keycode: "TT(9)" }, { keycode: "TT(10)" }, { keycode: "TT(11)" },
            { keycode: "TT(12)" }, { keycode: "TT(13)" }, { keycode: "TT(14)" }, { keycode: "TT(15)" },
        ],
    },
    {
        name: "Layer Keys (OSL)",
        description: "One-shot layer (0-15)",
        keys: [
            { keycode: "OSL(0)" }, { keycode: "OSL(1)" }, { keycode: "OSL(2)" }, { keycode: "OSL(3)" },
            { keycode: "OSL(4)" }, { keycode: "OSL(5)" }, { keycode: "OSL(6)" }, { keycode: "OSL(7)" },
            { keycode: "OSL(8)" }, { keycode: "OSL(9)" }, { keycode: "OSL(10)" }, { keycode: "OSL(11)" },
            { keycode: "OSL(12)" }, { keycode: "OSL(13)" }, { keycode: "OSL(14)" }, { keycode: "OSL(15)" },
        ],
    },
    {
        name: "Layer Keys (TO)",
        description: "Turn on layer (0-15)",
        keys: [
            { keycode: "TO(0)" }, { keycode: "TO(1)" }, { keycode: "TO(2)" }, { keycode: "TO(3)" },
            { keycode: "TO(4)" }, { keycode: "TO(5)" }, { keycode: "TO(6)" }, { keycode: "TO(7)" },
            { keycode: "TO(8)" }, { keycode: "TO(9)" }, { keycode: "TO(10)" }, { keycode: "TO(11)" },
            { keycode: "TO(12)" }, { keycode: "TO(13)" }, { keycode: "TO(14)" }, { keycode: "TO(15)" },
        ],
    },
    {
        name: "Layer Tap (LT)",
        description: "Layer on hold, key on tap (0-15)",
        keys: [
            { keycode: "LT0(KC_SPACE)", description: "LT0 / Space" },
            { keycode: "LT1(KC_SPACE)", description: "LT1 / Space" },
            { keycode: "LT2(KC_SPACE)", description: "LT2 / Space" },
            { keycode: "LT3(KC_SPACE)", description: "LT3 / Space" },
            { keycode: "LT4(KC_BSPACE)", description: "LT4 / Backspace" },
            { keycode: "LT5(KC_ENTER)", description: "LT5 / Enter" },
            { keycode: "LT6(KC_TAB)", description: "LT6 / Tab" },
            { keycode: "LT7(KC_ESCAPE)", description: "LT7 / Escape" },
            { keycode: "LT8(KC_A)", description: "LT8 / A" },
            { keycode: "LT9(KC_NO)", description: "LT9 / No tap" },
            { keycode: "LT10(KC_SPACE)", description: "LT10 / Space" },
            { keycode: "LT11(KC_SPACE)", description: "LT11 / Space" },
            { keycode: "LT12(KC_SPACE)", description: "LT12 / Space" },
            { keycode: "LT13(KC_SPACE)", description: "LT13 / Space" },
            { keycode: "LT14(KC_SPACE)", description: "LT14 / Space" },
            { keycode: "LT15(KC_SPACE)", description: "LT15 / Space" },
        ],
    },
    {
        name: "Mod-Tap (Left)",
        description: "Left-side modifier on hold, key on tap",
        keys: [
            { keycode: "LCTL_T(KC_A)", description: "LCtrl / A" },
            { keycode: "LSFT_T(KC_S)", description: "LShift / S" },
            { keycode: "LALT_T(KC_D)", description: "LAlt / D" },
            { keycode: "LGUI_T(KC_F)", description: "LGUI / F" },
            { keycode: "C_S_T(KC_Z)", description: "Ctrl+Shift / Z" },
            { keycode: "LCA_T(KC_X)", description: "Ctrl+Alt / X" },
            { keycode: "LSA_T(KC_C)", description: "Shift+Alt / C" },
            { keycode: "SGUI_T(KC_V)", description: "Shift+GUI / V" },
            { keycode: "LCG_T(KC_B)", description: "Ctrl+GUI / B" },
            { keycode: "LAG_T(KC_N)", description: "Alt+GUI / N" },
            { keycode: "LCAG_T(KC_M)", description: "Ctrl+Alt+GUI / M" },
            { keycode: "MEH_T(KC_TAB)", description: "Meh / Tab" },
            { keycode: "ALL_T(KC_SPACE)", description: "Hyper / Space" },
        ],
    },
    {
        name: "Mod-Tap (Right)",
        description: "Right-side modifier on hold, key on tap",
        keys: [
            { keycode: "RCTL_T(KC_J)", description: "RCtrl / J" },
            { keycode: "RSFT_T(KC_K)", description: "RShift / K" },
            { keycode: "RALT_T(KC_L)", description: "RAlt / L" },
            { keycode: "RGUI_T(KC_SCOLON)", description: "RGUI / ;" },
            { keycode: "RCS_T(KC_N)", description: "RCtrl+Shift / N" },
            { keycode: "RCA_T(KC_M)", description: "RCtrl+Alt / M" },
            { keycode: "RSA_T(KC_COMMA)", description: "RShift+Alt / ," },
            { keycode: "RSG_T(KC_DOT)", description: "RShift+GUI / ." },
            { keycode: "RCG_T(KC_SLASH)", description: "RCtrl+GUI / /" },
            { keycode: "RAG_T(KC_QUOTE)", description: "RAlt+GUI / '" },
            { keycode: "RCAG_T(KC_BSLASH)", description: "RCtrl+Alt+GUI / \\" },
        ],
    },
    {
        name: "Mod-Mask (Left)",
        description: "Left-side modifier + key combinations",
        keys: [
            { keycode: "LCTL(KC_C)", description: "Ctrl+C" },
            { keycode: "LCTL(KC_V)", description: "Ctrl+V" },
            { keycode: "LCTL(KC_X)", description: "Ctrl+X" },
            { keycode: "LCTL(KC_Z)", description: "Ctrl+Z" },
            { keycode: "LCTL(KC_A)", description: "Ctrl+A" },
            { keycode: "LCTL(KC_S)", description: "Ctrl+S" },
            { keycode: "LSFT(KC_INSERT)", description: "Shift+Insert" },
            { keycode: "LALT(KC_F4)", description: "Alt+F4" },
            { keycode: "LGUI(KC_TAB)", description: "GUI+Tab" },
            { keycode: "LGUI(KC_L)", description: "GUI+L" },
            { keycode: "C_S(KC_ESCAPE)", description: "Ctrl+Shift+Esc" },
            { keycode: "LCA(KC_DELETE)", description: "Ctrl+Alt+Del" },
            { keycode: "MEH(KC_A)", description: "Meh+A" },
            { keycode: "HYPR(KC_A)", description: "Hyper+A" },
        ],
    },
    {
        name: "One-Shot Modifiers (Left)",
        description: "Left-side one-shot modifiers",
        keys: [
            { keycode: "OSM(MOD_LCTL)", description: "One-shot LCtrl" },
            { keycode: "OSM(MOD_LSFT)", description: "One-shot LShift" },
            { keycode: "OSM(MOD_LALT)", description: "One-shot LAlt" },
            { keycode: "OSM(MOD_LGUI)", description: "One-shot LGUI" },
            { keycode: "OSM(MOD_LCTL|MOD_LSFT)", description: "One-shot LCtrl+LShift" },
            { keycode: "OSM(MOD_LCTL|MOD_LALT)", description: "One-shot LCtrl+LAlt" },
            { keycode: "OSM(MOD_LCTL|MOD_LGUI)", description: "One-shot LCtrl+LGUI" },
            { keycode: "OSM(MOD_LSFT|MOD_LALT)", description: "One-shot LShift+LAlt" },
            { keycode: "OSM(MOD_LSFT|MOD_LGUI)", description: "One-shot LShift+LGUI" },
            { keycode: "OSM(MOD_LALT|MOD_LGUI)", description: "One-shot LAlt+LGUI" },
            { keycode: "OSM(MOD_MEH)", description: "One-shot Meh" },
            { keycode: "OSM(MOD_HYPR)", description: "One-shot Hyper" },
        ],
    },
    {
        name: "One-Shot Modifiers (Right)",
        description: "Right-side one-shot modifiers",
        keys: [
            { keycode: "OSM(MOD_RCTL)", description: "One-shot RCtrl" },
            { keycode: "OSM(MOD_RSFT)", description: "One-shot RShift" },
            { keycode: "OSM(MOD_RALT)", description: "One-shot RAlt" },
            { keycode: "OSM(MOD_RGUI)", description: "One-shot RGUI" },
            { keycode: "OSM(MOD_RCTL|MOD_RSFT)", description: "One-shot RCtrl+RShift" },
            { keycode: "OSM(MOD_RCTL|MOD_RALT)", description: "One-shot RCtrl+RAlt" },
            { keycode: "OSM(MOD_RCTL|MOD_RGUI)", description: "One-shot RCtrl+RGUI" },
            { keycode: "OSM(MOD_RSFT|MOD_RALT)", description: "One-shot RShift+RAlt" },
            { keycode: "OSM(MOD_RSFT|MOD_RGUI)", description: "One-shot RShift+RGUI" },
            { keycode: "OSM(MOD_RALT|MOD_RGUI)", description: "One-shot RAlt+RGUI" },
        ],
    },
    {
        name: "Macros",
        description: "Macro key assignments (0-15)",
        keys: [
            { keycode: "M0", description: "Macro 0" },
            { keycode: "M1", description: "Macro 1" },
            { keycode: "M2", description: "Macro 2" },
            { keycode: "M3", description: "Macro 3" },
            { keycode: "M4", description: "Macro 4" },
            { keycode: "M5", description: "Macro 5" },
            { keycode: "M6", description: "Macro 6" },
            { keycode: "M7", description: "Macro 7" },
            { keycode: "M8", description: "Macro 8" },
            { keycode: "M9", description: "Macro 9" },
            { keycode: "M10", description: "Macro 10" },
            { keycode: "M11", description: "Macro 11" },
            { keycode: "M12", description: "Macro 12" },
            { keycode: "M13", description: "Macro 13" },
            { keycode: "M14", description: "Macro 14" },
            { keycode: "M15", description: "Macro 15" },
        ],
    },
    {
        name: "Tap Dances",
        description: "Tap dance assignments (0-31)",
        keys: [
            { keycode: "TD(0)" }, { keycode: "TD(1)" }, { keycode: "TD(2)" }, { keycode: "TD(3)" },
            { keycode: "TD(4)" }, { keycode: "TD(5)" }, { keycode: "TD(6)" }, { keycode: "TD(7)" },
            { keycode: "TD(8)" }, { keycode: "TD(9)" }, { keycode: "TD(10)" }, { keycode: "TD(11)" },
            { keycode: "TD(12)" }, { keycode: "TD(13)" }, { keycode: "TD(14)" }, { keycode: "TD(15)" },
            { keycode: "TD(16)" }, { keycode: "TD(17)" }, { keycode: "TD(18)" }, { keycode: "TD(19)" },
            { keycode: "TD(20)" }, { keycode: "TD(21)" }, { keycode: "TD(22)" }, { keycode: "TD(23)" },
            { keycode: "TD(24)" }, { keycode: "TD(25)" }, { keycode: "TD(26)" }, { keycode: "TD(27)" },
            { keycode: "TD(28)" }, { keycode: "TD(29)" }, { keycode: "TD(30)" }, { keycode: "TD(31)" },
        ],
    },
    {
        name: "User/Custom Keycodes",
        description: "Custom user-defined keycodes",
        keys: [
            { keycode: "USER00", description: "User keycode 0" },
            { keycode: "USER01", description: "User keycode 1" },
            { keycode: "USER02", description: "User keycode 2" },
        ],
    },
    {
        name: "QMK Special",
        description: "QMK-specific special keycodes",
        keys: [
            { keycode: "QK_REPEAT_KEY", description: "Repeat last key" },
            { keycode: "QK_ALT_REPEAT_KEY", description: "Alternate repeat" },
            { keycode: "QK_LAYER_LOCK", description: "Layer Lock" },
            { keycode: "QK_LEADER", description: "Leader Key" },
        ],
    },
    {
        name: "International",
        description: "International keyboard keys",
        keys: [
            { keycode: "KC_RO", description: "Ro (Japanese)" },
            { keycode: "KC_KANA", description: "Kana (Japanese)" },
            { keycode: "KC_JYEN", description: "Yen (Japanese)" },
            { keycode: "KC_HENK", description: "Henkan (Japanese)" },
            { keycode: "KC_MHEN", description: "Muhenkan (Japanese)" },
            { keycode: "KC_LANG1", description: "Language 1 (Korean)" },
            { keycode: "KC_LANG2", description: "Language 2 (Korean)" },
        ],
    },
    {
        name: "Lock Keys",
        description: "Lock and toggle keys",
        keys: [
            { keycode: "KC_LCAP", description: "Locking Caps" },
            { keycode: "KC_LNUM", description: "Locking Num" },
            { keycode: "KC_LSCR", description: "Locking Scroll" },
        ],
    },
    {
        name: "Editing Commands",
        description: "Common editing command keys",
        keys: [
            { keycode: "KC_UNDO", description: "Undo" },
            { keycode: "KC_REDO", description: "Redo" },
            { keycode: "KC_CUT", description: "Cut" },
            { keycode: "KC_COPY", description: "Copy" },
            { keycode: "KC_PSTE", description: "Paste" },
            { keycode: "KC_FIND", description: "Find" },
            { keycode: "KC_SLCT", description: "Select" },
            { keycode: "KC_EXEC", description: "Execute" },
            { keycode: "KC_HELP", description: "Help" },
            { keycode: "KC_MENU", description: "Menu" },
            { keycode: "KC_STOP", description: "Stop" },
        ],
    },
];

/**
 * Get KeyContent for a keycode using the mock keyboard info
 */
export function getProofKeyContents(keycode: string): KeyContent | undefined {
    return getKeyContents(mockKeyboardInfo, keycode);
}
