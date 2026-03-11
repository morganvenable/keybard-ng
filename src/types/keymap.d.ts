// a KeyString is like KC_A for the A key
export type KeyString = string | number;

export type CodeMap = Record<number, KeyString>;

export type KeyMapEntry = {
    code: number;
    qmkid: KeyString;
    str: string;
    title: string;
    type?: 'macro' | 'layer' | 'tapdance' | 'altrepeat' | 'leaders';
    idx?: number;
    subtype?: string;
};

export type KeyMap = Record<KeyString, KeyMapEntry>;

export type KeyAliases = Record<KeyString, KeyString>
