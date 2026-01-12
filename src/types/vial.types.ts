// Type definitions for Viable keyboard configuration system
// (Migrated from Vial protocol to Viable protocol)

export interface KeyboardInfo {
    via_proto?: number;
    viable_proto?: number;  // Viable protocol version
    vial_proto?: number;    // Legacy, kept for compatibility
    kbid?: string;
    payload?: KeyboardPayload;
    rows: number;
    cols: number;
    layers?: number;
    custom_keycodes?: CustomKeycode[];
    keymap?: number[][];
    macros?: MacroEntry[];
    macro_count?: number;
    macros_size?: number;
    combos?: ComboEntry[];
    tapdances?: TapdanceEntry[];
    key_overrides?: KeyOverrideEntry[];
    alt_repeat_keys?: AltRepeatKeyEntry[];  // NEW: Viable feature
    leaders?: LeaderEntry[];                 // NEW: Viable feature
    one_shot?: OneShotSettings;              // NEW: Viable feature
    settings?: Record<number, number>;
    tapdance_count?: number;
    combo_count?: number;
    key_override_count?: number;
    alt_repeat_key_count?: number;           // NEW
    leader_count?: number;                   // NEW
    feature_flags?: number;                  // NEW: Viable feature flags

    // Svalboard-specific
    sval_proto?: number;
    sval_firmware?: string;
    layer_colors?: Array<{ hue: number; sat: number; val: number }>;
    cosmetic?: {
        layer?: Record<string, string>;
        layer_colors?: Record<string, string>;
        macros?: Record<string, string>;
    };
    keylayout?: Record<string, any>; // Using any for now to match KLE output structure
}

export interface KeyboardPayload {
    matrix: {
        rows: number;
        cols: number;
    };
    customKeycodes?: CustomKeycode[];
    layouts?: Record<string, KeyLayout>;
    lighting?: unknown;
}

export interface KeyLayout {
    col: number;
    color: string;
    decal: boolean;
    ghost: boolean;
    h: number;
    height2: number;
    labels: string[];
    nub: boolean;
    profile: string;
    rotation_angle: number;
    rotation_x: number;
    rotation_y: number;
    row: number;
    sb: string;
    sm: string;
    st: string;
    stepped: boolean;
    text: string;
    textColor: string;
    textSize: number[];
    align?: number;
    matrix?: number[];
    w: number;
    width2: number;
    x: number;
    x2: number;
    y: number;
    y2: number;
}

export interface CustomKeycode {
    name: string;
    title: string;
    shortName: string;
}

export interface MacroEntry {
    mid: number;
    actions: MacroAction[];
}

export type MacroAction = [string, string | number];

export interface ComboEntry {
    cmbid: number;
    keys: string[];
    output: string;
}


export interface TapdanceEntry {
    idx: number; // Index in the list
    tap: string;
    hold: string;
    doubletap: string;
    taphold: string;
    tapping_term: number;
    enabled?: boolean; // Stored in bit 15 of tapping_term in protocol
}

export interface KeyOverrideEntry {
    koid: number;
    trigger: string;
    replacement: string;
    layers: number;
    trigger_mods: number;
    negative_mod_mask: number;
    suppressed_mods: number;
    options: number;
}


// Removed: QMKSettings interface (conflicted with qmk.d.ts)
// Keyboard settings values are now stored as Record<number, number> in KeyboardInfo.settings

export interface USBSendOptions {
    uint8?: boolean;
    uint16?: boolean;
    uint32?: boolean;
    index?: number;
    unpack?: string;
    bigendian?: boolean;
    slice?: number;
    bytes?: number;
    validateInput?: (data: Uint8Array) => boolean;
}

export interface VialAPI {
    what: string;
    updateKey(layer: number, row: number, col: number, keymask: number): Promise<void>;
    updateMacros(kbinfo: KeyboardInfo): Promise<void>;
    updateTapdance(kbinfo: KeyboardInfo, tdid: number): Promise<void>;
    updateCombo(kbinfo: KeyboardInfo, cmbid: number): Promise<void>;
    updateKeyoverride(kbinfo: KeyboardInfo, koid: number): Promise<void>;
    updateQMKSetting(kbinfo: KeyboardInfo, qfield: string): Promise<void>;
}

export interface KeyContent {
    type?: string;
    str?: string;
    title?: string;
    top?: string;
    layertext?: string;
    tdid?: number;
    modids?: number;
    mods?: string;
    [key: string]: any; // Allow other properties for now until fully typed
}

// ============================================================================
// Viable Protocol Types (new features not in Vial)
// ============================================================================

/**
 * Alt Repeat Key entry (6 bytes in firmware)
 * Allows remapping the repeat key to alternate keycodes
 */
export interface AltRepeatKeyEntry {
    arkid: number;              // Index
    keycode: string;            // Original keycode to match
    alt_keycode: string;        // Alternate keycode to send on repeat
    allowed_mods: number;       // Modifier mask for matching
    options: number;            // Option flags (bit 3 = enabled)
}

// Alt repeat key option bits
export const AltRepeatKeyOptions = {
    DEFAULT_TO_ALT: 1 << 0,
    BIDIRECTIONAL: 1 << 1,
    IGNORE_MOD_HANDEDNESS: 1 << 2,
    ENABLED: 1 << 3,
} as const;

/**
 * Leader key sequence entry (14 bytes in firmware)
 */
export interface LeaderEntry {
    ldrid: number;              // Index
    sequence: string[];         // Up to 5 keys in order
    output: string;             // Output keycode
    options: number;            // bit 15 = enabled
}

// Leader option bits
export const LeaderOptions = {
    ENABLED: 1 << 15,
} as const;

/**
 * One-shot key settings (3 bytes in firmware)
 */
export interface OneShotSettings {
    timeout: number;            // Timeout in ms (0 = disabled)
    tap_toggle: number;         // Number of taps to toggle (0 = disabled)
}

/**
 * Viable protocol info response
 */
export interface ViableProtocolInfo {
    protocol_version: number;   // 32-bit protocol version
    keyboard_uid: Uint8Array;   // 8-byte UID
    feature_flags: number;      // 8-bit feature flags
}

// Viable feature flags
export const ViableFeatureFlags = {
    CAPS_WORD: 1 << 0,
    LAYER_LOCK: 1 << 1,
    ONESHOT: 1 << 2,
    LEADER: 1 << 3,
} as const;

/**
 * Viable API interface (extends VialAPI for new features)
 */
export interface ViableAPI extends VialAPI {
    updateAltRepeatKey(kbinfo: KeyboardInfo, arkid: number): Promise<void>;
    updateLeader(kbinfo: KeyboardInfo, ldrid: number): Promise<void>;
    updateOneShot(kbinfo: KeyboardInfo): Promise<void>;
    saveViable(): Promise<void>;
    resetViable(): Promise<void>;
}
