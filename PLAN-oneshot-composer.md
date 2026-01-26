# One-Shot Modifier Composer Panel

## Problem Statement

The current `QmkKeysPanel.tsx` displays 60+ individual key buttons for One-Shot Modifiers (OSM) and Mod-Tap keys. Each combination of modifiers (Ctrl, Shift, Alt, GUI) for both left and right hands is listed as a separate key. This creates:

1. **Visual clutter** - Hard to find the specific combination you want
2. **Wasted space** - Panel is ~200 lines of hardcoded keys
3. **No composition** - Users must hunt for pre-made combinations

## Proposed Solution: Modifier Composer

Replace the grid of 60+ keys with a compact **composition tool** that lets users:

1. Select which modifiers they want (Ctrl, Shift, Alt, GUI)
2. Choose hand side (Left or Right)
3. Choose mode (OSM or Mod-Tap)
4. Preview the composed keycode
5. Click or drag to assign

### UI Mockup (Sidebar Mode)

Based on the existing `OverrideModifierSelector` pattern:

```
┌─────────────────────────────────────────────┐
│  One-Shot / Mod-Tap Composer                │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  [  OSM  ] [MOD-TAP]                │   │  <-- Mode toggle
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  [LEFT] [RIGHT]                     │   │  <-- Hand toggle
│  └─────────────────────────────────────┘   │
│                                             │
│  Modifiers                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  │SHIFT │ │ CTRL │ │ ALT  │ │ GUI  │      │  <-- Toggleable buttons
│  └──────┘ └──────┘ └──────┘ └──────┘      │     (highlight when active)
│                                             │
│  Presets                                    │
│  ┌──────┐ ┌──────┐                         │
│  │ Meh  │ │Hyper │                         │  <-- Quick-set buttons
│  └──────┘ └──────┘                         │
│                                             │
│           ┌─────────┐                       │
│           │  OSM    │                       │  <-- Preview key (60x60)
│           │  C+S    │                       │      Click to assign
│           └─────────┘                       │
│                                             │
│  Select a key on the keyboard to assign    │
│                                             │
└─────────────────────────────────────────────┘
```

### UI Mockup (Bottom Bar Mode)

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ [OSM|MT] [L|R] │ [SHIFT][CTRL][ALT][GUI] │ [Meh][Hyp] │ ┌─────┐ Select key to    │
│                │                          │            │ │ OSM │ assign           │
│                │                          │            │ │ C+S │                  │
│                │                          │            │ └─────┘                  │
└────────────────────────────────────────────────────────────────────────────────────┘
```

## Keycode Composition Logic

### OSM Keycodes (from keygen.ts analysis)

Base address: `0x52a0`

Modifier bits:
- Ctrl:  0x01
- Shift: 0x02
- Alt:   0x04
- GUI:   0x08
- Right: 0x10 (added to switch to right-hand modifiers)

Examples:
- `OSM(MOD_LCTL)` = 0x52a1 (base + 0x01)
- `OSM(MOD_LCTL|MOD_LSFT)` = 0x52a3 (base + 0x03)
- `OSM(MOD_RCTL)` = 0x52b1 (base + 0x11)

### String Generation

```typescript
function buildOsmKeycode(mods: { ctrl: boolean, shift: boolean, alt: boolean, gui: boolean }, rightSide: boolean): string {
  const parts: string[] = [];
  const side = rightSide ? 'R' : 'L';

  if (mods.ctrl) parts.push(`MOD_${side}CTL`);
  if (mods.shift) parts.push(`MOD_${side}SFT`);
  if (mods.alt) parts.push(`MOD_${side}ALT`);
  if (mods.gui) parts.push(`MOD_${side}GUI`);

  // Handle Meh/Hyper shortcuts
  if (parts.length === 3 && !mods.gui) return `OSM(MOD_${rightSide ? 'R' : ''}MEH)`;
  if (parts.length === 4) return `OSM(MOD_${rightSide ? 'R' : ''}HYPR)`;

  return `OSM(${parts.join('|')})`;
}
```

### Mod-Tap Keycodes

Mod-Tap uses template keycodes like `LCTL_T(kc)` where `(kc)` is a placeholder.

For combinations:
- Single mod: `LCTL_T`, `LSFT_T`, `LALT_T`, `LGUI_T`
- Dual mods: `C_S_T`, `LCA_T`, `LSA_T`, `LCG_T`, `LAG_T`, `SGUI_T`
- Triple: `LCAG_T`, `MEH_T`
- Quad: `HYPR_T`

And right-side variants: `RCTL_T`, `RCS_T`, etc.

## Component Structure

### Files to Create

```
src/layout/SecondarySidebar/Panels/OneShotComposerPanel.tsx  # New panel
src/utils/modifierComposer.ts                                 # Composition logic
```

### Files to Modify

```
src/layout/SecondarySidebar/SecondarySidebar.tsx  # Register new panel
src/layout/BottomPanel/BottomPanel.tsx            # Register for bottom bar
src/layout/Sidebar.tsx                            # Update menu entry (rename from "One-Shot")
```

### File to Delete (Optional)

```
src/layout/SecondarySidebar/Panels/QmkKeysPanel.tsx  # Replaced by new panel
```

## Existing Pattern: OverrideModifierSelector

**Key discovery**: `src/layout/SecondarySidebar/components/BindingEditor/OverrideModifierSelector.tsx` already implements a beautiful modifier selector pattern:

```
┌──────────────────────────────────────────────────────┐
│  [NONE]  [SHIFT]  [CTRL]  [ALT]  [GUI]              │
│           ▼                                          │
│         [L] [R]    (expands when modifier selected) │
└──────────────────────────────────────────────────────┘
```

**Features we can reuse:**
- Expandable buttons that reveal L/R sub-toggles
- Bitmask-based state management (`MOD_BITS`)
- Smooth height transitions
- Visual active states

**Key difference for OneShot:**
- Override allows mixing L and R (e.g., LCTRL + RSHIFT)
- OneShot uses **all left** or **all right** (never mixed)
- So we need a simpler Hand toggle (not per-modifier L/R)

**Adaptation approach:**
1. Create `OneShotModifierSelector` based on `OverrideModifierSelector`
2. Remove per-modifier L/R toggles
3. Add top-level Hand toggle (Left/Right)
4. Add Mode toggle (OSM/Mod-Tap) at top

## Implementation Steps

### Phase 1: Create Composition Utilities

1. Create `src/utils/modifierComposer.ts`:
   - `buildOsmKeycode(mods, isRight)` - Generate OSM keycode string
   - `buildModTapKeycode(mods, isRight)` - Generate Mod-Tap keycode string
   - `getModifierLabel(mods)` - Generate short label (e.g., "C+S+A")
   - `parseModifiers(keycode)` - Reverse: extract modifier state from keycode

### Phase 2: Create OneShotComposerPanel Component

1. Create new panel component with:
   - Mode toggle (OSM / Mod-Tap) using shadcn toggle group
   - Hand toggle (Left / Right)
   - Modifier checkboxes with visual styling
   - Preset buttons (Meh = C+S+A, Hyper = C+S+A+G)
   - Preview key component (reusing existing `Key` component)
   - "No modifiers selected" empty state

2. State management:
   ```typescript
   interface ComposerState {
     mode: 'osm' | 'modtap';
     rightSide: boolean;
     ctrl: boolean;
     shift: boolean;
     alt: boolean;
     gui: boolean;
   }
   ```

### Phase 3: Wire Up Assignment

1. On checkbox change: Update preview key with composed keycode
2. On preview key click: Call `assignKeycode(composedKeycode)` (existing context)
3. Support drag-and-drop using existing Key component's drag capability

### Phase 4: Add Both Layout Modes

1. Implement sidebar layout (vertical, spacious)
2. Implement bottom bar layout (horizontal, compact)
3. Test both modes thoroughly

### Phase 5: Register Panel

1. Add case to `SecondarySidebar.tsx` `renderContent()` switch
2. Add case to `BottomPanel.tsx` `renderContent()` switch
3. Update sidebar menu entry in `Sidebar.tsx`

### Phase 6: Clean Up

1. Remove old QmkKeysPanel.tsx (or keep as legacy option)
2. Update CLAUDE.md documentation

## Design Decisions

### Why Toggle Groups Instead of Dropdown?

- Faster interaction (single click vs click-then-select)
- Visual state is immediately apparent
- Follows existing patterns in the codebase (e.g., size toggles)

### Why Checkboxes for Modifiers?

- Mirrors the ComboEditor's multi-select pattern
- Users familiar with modifier checkboxes from other tools
- Easy to see which are active at a glance

### Preset Buttons (Meh/Hyper)

- Common use case: quickly select Meh (C+S+A) or Hyper (C+S+A+G)
- Single click to set all appropriate checkboxes
- Reduces clicks for power users

### Preview Key

- Shows exactly what will be assigned
- Uses existing Key component for consistency
- Draggable for users who prefer drag-and-drop

## Testing Plan

1. **Unit tests** for `modifierComposer.ts`:
   - All 15 OSM left combinations generate correct keycodes
   - All 15 OSM right combinations generate correct keycodes
   - Mod-Tap generates correct template keycodes
   - Edge case: no modifiers selected

2. **Visual tests** (manual or screenshot):
   - Sidebar layout renders correctly
   - Bottom bar layout renders correctly
   - Preview key updates on toggle change
   - Disabled state when no modifiers selected

3. **Integration tests**:
   - Click preview key assigns to selected keyboard key
   - Drag preview key to keyboard key assigns correctly

## Estimated Scope

- New lines of code: ~300-400
- Files affected: 5-6
- Complexity: Low-medium (mostly UI composition)

## TODO: Visual Polish

- [ ] Clean up the L/R sliding toggle switch visuals (colors, sizing, alignment)
- [ ] Review overall panel spacing and typography
- [ ] Ensure consistent styling with other panels in the app

## Open Questions

1. Should we keep the old panel as a "classic view" option?
2. Should the preview key be disabled or just grayed when no mods selected?
3. Should we add keyboard shortcuts (e.g., C for Ctrl toggle)?
