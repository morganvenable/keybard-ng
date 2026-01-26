/**
 * Modifier Composer Utility
 *
 * Generates OSM (One-Shot Modifier) and Mod-Tap keycodes from modifier selections.
 */

export interface ModifierState {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  gui: boolean;
}

export type ModifierMode = 'osm' | 'modtap';

/**
 * Build an OSM keycode string from modifier state
 *
 * Examples:
 * - { ctrl: true }, left -> "OSM(MOD_LCTL)"
 * - { ctrl: true, shift: true }, left -> "OSM(MOD_LCTL|MOD_LSFT)"
 * - { ctrl: true, shift: true, alt: true }, left -> "OSM(MOD_MEH)"
 * - all four, left -> "OSM(MOD_HYPR)"
 */
export function buildOsmKeycode(mods: ModifierState, rightSide: boolean): string | null {
  const { ctrl, shift, alt, gui } = mods;
  const count = [ctrl, shift, alt, gui].filter(Boolean).length;

  if (count === 0) return null;

  const side = rightSide ? 'R' : 'L';

  // Check for Meh (Ctrl+Shift+Alt) and Hyper (all four)
  if (ctrl && shift && alt && gui) {
    return rightSide ? "OSM(MOD_RCTL|MOD_RSFT|MOD_RALT|MOD_RGUI)" : "OSM(MOD_HYPR)";
  }
  if (ctrl && shift && alt && !gui) {
    return rightSide ? "OSM(MOD_RCTL|MOD_RSFT|MOD_RALT)" : "OSM(MOD_MEH)";
  }

  // Build from individual modifiers
  const parts: string[] = [];
  if (ctrl) parts.push(`MOD_${side}CTL`);
  if (shift) parts.push(`MOD_${side}SFT`);
  if (alt) parts.push(`MOD_${side}ALT`);
  if (gui) parts.push(`MOD_${side}GUI`);

  return `OSM(${parts.join('|')})`;
}

/**
 * Build a Mod-Tap keycode string from modifier state
 *
 * Mod-Tap uses template keycodes like LCTL_T(kc) where (kc) is a placeholder.
 * For multiple modifiers, there are named combinations.
 *
 * Examples:
 * - { ctrl: true }, left -> "LCTL_T(kc)"
 * - { ctrl: true, shift: true }, left -> "C_S_T(kc)"
 * - { ctrl: true, shift: true, alt: true }, left -> "MEH_T(kc)"
 */
export function buildModTapKeycode(mods: ModifierState, rightSide: boolean): string | null {
  const { ctrl, shift, alt, gui } = mods;
  const count = [ctrl, shift, alt, gui].filter(Boolean).length;

  if (count === 0) return null;

  const side = rightSide ? 'R' : 'L';

  // Hyper (all four)
  if (ctrl && shift && alt && gui) {
    return rightSide ? "RHYP_T(kc)" : "HYPR_T(kc)";
  }

  // Meh (Ctrl+Shift+Alt)
  if (ctrl && shift && alt && !gui) {
    return rightSide ? "RMEH_T(kc)" : "MEH_T(kc)";
  }

  // Single modifiers
  if (count === 1) {
    if (ctrl) return `${side}CTL_T(kc)`;
    if (shift) return `${side}SFT_T(kc)`;
    if (alt) return `${side}ALT_T(kc)`;
    if (gui) return `${side}GUI_T(kc)`;
  }

  // Two modifiers - use named combinations
  if (count === 2) {
    if (ctrl && shift) return rightSide ? "RCS_T(kc)" : "C_S_T(kc)";
    if (ctrl && alt) return rightSide ? "RCA_T(kc)" : "LCA_T(kc)";
    if (ctrl && gui) return rightSide ? "RCG_T(kc)" : "LCG_T(kc)";
    if (shift && alt) return rightSide ? "RSA_T(kc)" : "LSA_T(kc)";
    if (shift && gui) return rightSide ? "RSG_T(kc)" : "SGUI_T(kc)";
    if (alt && gui) return rightSide ? "RAG_T(kc)" : "LAG_T(kc)";
  }

  // Three modifiers (excluding Meh which is handled above)
  if (count === 3) {
    if (ctrl && shift && gui) return rightSide ? "RCSG_T(kc)" : "LCSG_T(kc)";
    if (ctrl && alt && gui) return rightSide ? "RCAG_T(kc)" : "LCAG_T(kc)";
    if (shift && alt && gui) return rightSide ? "RSAG_T(kc)" : "LSAG_T(kc)";
  }

  return null;
}

/**
 * Build a keycode based on mode
 */
export function buildKeycode(mods: ModifierState, rightSide: boolean, mode: ModifierMode): string | null {
  if (mode === 'osm') {
    return buildOsmKeycode(mods, rightSide);
  } else {
    return buildModTapKeycode(mods, rightSide);
  }
}

/**
 * Get a short label for the modifier combination
 * Used for displaying in the preview key
 *
 * Examples:
 * - { ctrl: true } -> "C"
 * - { ctrl: true, shift: true } -> "C+S"
 * - all four -> "Hyper"
 */
export function getModifierLabel(mods: ModifierState): string {
  const { ctrl, shift, alt, gui } = mods;
  const count = [ctrl, shift, alt, gui].filter(Boolean).length;

  if (count === 0) return "";
  if (ctrl && shift && alt && gui) return "Hyper";
  if (ctrl && shift && alt && !gui) return "Meh";

  const parts: string[] = [];
  if (ctrl) parts.push("C");
  if (shift) parts.push("S");
  if (alt) parts.push("A");
  if (gui) parts.push("G");

  return parts.join("+");
}

/**
 * Parse a keycode string back into modifier state
 * Useful for initializing the composer from an existing keycode
 */
export function parseModifiers(keycode: string): { mods: ModifierState; rightSide: boolean; mode: ModifierMode } | null {
  if (!keycode) return null;

  const defaultMods: ModifierState = { ctrl: false, shift: false, alt: false, gui: false };

  // Check for OSM
  const osmMatch = keycode.match(/^OSM\((.+)\)$/);
  if (osmMatch) {
    const inner = osmMatch[1];
    const rightSide = inner.includes('_R') || inner.includes('RHYP') || inner.includes('RMEH');

    return {
      mods: {
        ctrl: inner.includes('CTL') || inner.includes('MEH') || inner.includes('HYPR'),
        shift: inner.includes('SFT') || inner.includes('MEH') || inner.includes('HYPR'),
        alt: inner.includes('ALT') || inner.includes('MEH') || inner.includes('HYPR'),
        gui: inner.includes('GUI') || inner.includes('HYPR'),
      },
      rightSide,
      mode: 'osm',
    };
  }

  // Check for Mod-Tap (ends with _T(kc) or _T(something))
  const modTapMatch = keycode.match(/^(\w+)_T\(/);
  if (modTapMatch) {
    const prefix = modTapMatch[1];

    // Parse the prefix - check for Hyper/Meh first
    if (prefix === 'HYPR' || prefix === 'RHYP') {
      return { mods: { ctrl: true, shift: true, alt: true, gui: true }, rightSide: prefix === 'RHYP', mode: 'modtap' };
    }
    if (prefix === 'MEH' || prefix === 'RMEH') {
      return { mods: { ctrl: true, shift: true, alt: true, gui: false }, rightSide: prefix === 'RMEH', mode: 'modtap' };
    }

    // Single/dual modifier prefixes
    const mods = { ...defaultMods };
    const isRight = prefix.startsWith('R') || prefix.startsWith('RC') || prefix.startsWith('RS') || prefix.startsWith('RA');

    if (prefix.includes('C') || prefix.includes('CTL')) mods.ctrl = true;
    if (prefix.includes('S') || prefix.includes('SFT')) mods.shift = true;
    if (prefix.includes('A') || prefix.includes('ALT')) mods.alt = true;
    if (prefix.includes('G') || prefix.includes('GUI')) mods.gui = true;

    return { mods, rightSide: isRight, mode: 'modtap' };
  }

  return null;
}

/**
 * Preset configurations
 */
export const PRESETS = {
  meh: { ctrl: true, shift: true, alt: true, gui: false } as ModifierState,
  hyper: { ctrl: true, shift: true, alt: true, gui: true } as ModifierState,
} as const;
