# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Directory: keybard-ng-viable (viable-protocol-migration branch)

| Property | Value |
|----------|-------|
| **Branch** | `viable-protocol-migration` |
| **Dev Server Port** | 5171 |
| **URL** | http://localhost:5171/keybard-ng/ |

### Quick Start

```bash
npm run dev    # Starts on port 5171 automatically
```

---

## Related Repositories

| Repository | Branch | Purpose |
|------------|--------|---------|
| `viable-qmk` | `svalboard` | QMK firmware with Viable protocol |
| `viable-gui` | `viable` | Reference Python GUI implementation |
| `keybard-ng` (upstream) | `main` | Original Vial-compatible GUI |

## Project Overview

KeyBard-NG is a React 19 + TypeScript web application for configuring Viable-compatible keyboards (especially Svalboard) via WebHID API. It enables real-time keymap editing, macro programming, and QMK settings management.

**Note:** This project is migrating from the Vial protocol to the Viable protocol. The Viable protocol uses a client ID wrapper (`0xDD`) for multi-client concurrent access and adds features like alt-repeat keys, leader sequences, and one-shot settings.

## Development Commands

```bash
npm run dev            # Start dev server (port depends on branch, see below)
npm run build          # Production build (TypeScript check + Vite build)
npm test               # Run all tests
npm run test:watch     # Watch mode for development
npm run test:coverage  # Tests with coverage report (75-90% thresholds)
npm run test:ui        # Interactive Vitest UI
```

## Multi-Branch Parallel Development

This project supports running multiple branches simultaneously on different ports. The `vite.config.ts` automatically detects the git branch and assigns a specific port.

### Port Assignments

| Branch | Port | URL |
|--------|------|-----|
| `main` | 5170 | http://localhost:5170/keybard-ng/ |
| `viable-protocol-migration` | 5171 | http://localhost:5171/keybard-ng/ |
| `feature/explore-layouts` | 5172 | http://localhost:5172/keybard-ng/ |
| (other branches) | 5173 | http://localhost:5173/keybard-ng/ |

### Branch Indicator

In development mode, the current branch name is displayed in the sidebar footer (bottom left, small gray text). This helps identify which branch you're viewing when multiple servers are running.

### Git Worktrees

To run multiple branches simultaneously, use git worktrees:

```bash
# Create a worktree for another branch
git worktree add ../keybard-ng-explore feature/explore-layouts

# Install dependencies in the worktree
cd ../keybard-ng-explore && npm install

# Start dev server (will use the branch-specific port)
npm run dev

# When done, remove the worktree
git worktree remove ../keybard-ng-explore
```

### Directory Layout

| Directory | Branch | Port | Purpose |
|-----------|--------|------|---------|
| `keybard-ng/` | `main` | 5170 | Stable main branch |
| `keybard-ng-viable/` | `viable-protocol-migration` | 5171 | Viable protocol development |
| `keybard-ng-explore/` | `feature/explore-layouts` | 5172 | Layout library feature |

### Configuration

The port assignment and branch detection are configured in `vite.config.ts`:
- `getGitBranch()` - Detects current branch via `git branch --show-current`
- `getPortForBranch()` - Maps branch names to ports
- `__GIT_BRANCH__` - Injected global for UI display
- `strictPort: true` - Fails if port is in use (no auto-increment)

## Architecture

### Layer Structure
```
UI Components → React Contexts → Services → VialUSB → WebHID API → Physical Keyboard
```

### Key Architectural Patterns

**Context-Based State Management:** Seven specialized contexts handle different domains:
- `VialContext` - Keyboard state and operations
- `KeyBindingContext` - Key selection and editing
- `ChangesContext` - Change tracking
- `LayerContext` - Layer management
- `PanelsContext` - UI panel visibility
- `SettingsContext` - Application settings
- `LayoutSettingsContext` - Keyboard layout preferences

**Service Layer:** Each feature has a dedicated service class that encapsulates protocol details:
- `VialService` - Core Vial protocol (keyboard loading, keymap read/write)
- `VialUSB` - WebHID API abstraction with 32-byte message protocol
- `KeyService` - Keycode parsing and stringification
- `QMKService` - QMK settings management
- `SvalService` - Svalboard-specific features
- `MacroService`, `TapdanceService`, `ComboService`, `OverrideService` - Feature-specific services

**USB Communication:** VialUSB class handles queue-based async operations with command/response protocol.

### Import Aliases
```typescript
@/           → src/
@services/   → src/services/
@contexts/   → src/contexts/
@components/ → src/components/
@types/      → src/types/
@constants/  → src/constants/
```

### Key Constants
- `KEYMAP` - Maps keycode names to numeric codes
- `CODEMAP` - Reverse mapping (code to name)
- `KEYALIASES` - Alternative keycode names

## Testing

Tests use Vitest with jsdom environment. WebHID API is mocked in `tests/setup.ts`.

**Test Structure:**
- `tests/services/` - Service layer tests
- `tests/components/` - Component tests
- `tests/contexts/` - Context tests
- `tests/fixtures/` - Test keyboard definitions and keymaps
- `tests/mocks/` - Mock implementations (especially USB)

**Coverage Thresholds:** 90% branches, 75% functions/lines/statements

## Key Components

- `KeyboardConnector` - Main orchestration component
- `Keyboard` - Keyboard layout renderer
- `Key` - Individual key component with binding support
- `MatrixTester` - USB polling and key press detection
- `QMKSettings` - QMK settings UI panel
- `MainScreen` - Root application UI

## Documentation

Comprehensive docs in `/docs/`:
- `ARCHITECTURE.md` - System design and data flow
- `API.md` - Service API reference
- `COMPONENTS.md` - Component hierarchy and patterns
- `TYPES.md` - TypeScript type reference

## Viable Protocol Migration

### Protocol Differences from Vial

| Aspect | Vial | Viable |
|--------|------|--------|
| **Wrapper** | None | `0xDD` client ID wrapper |
| **Protocol Prefix** | `0xFE` | `0xDF` (Viable) / `0xFE` (VIA, wrapped) |
| **Client Auth** | None | 20-byte nonce bootstrap, TTL-based renewal |
| **Detection** | HID filter | `viable:` prefix in USB serial |

### Message Format

```
Bootstrap:  [0xDD][0x00000000][nonce:20] → [0xDD][0x00000000][nonce:20][client_id:4][ttl:2]
Viable cmd: [0xDD][client_id:4][0xDF][cmd][args...] → [0xDD][client_id:4][0xDF][response...]
VIA cmd:    [0xDD][client_id:4][0xFE][via_cmd...] → [0xDD][client_id:4][0xFE][response...]
```

### Viable Command IDs (0xDF protocol)

- `0x00` - get_info (protocol version, UID, feature flags)
- `0x01/0x02` - tap_dance get/set
- `0x03/0x04` - combo get/set
- `0x05/0x06` - key_override get/set
- `0x07/0x08` - alt_repeat_key get/set (NEW)
- `0x09/0x0A` - one_shot get/set (NEW)
- `0x0B` - save, `0x0C` - reset
- `0x0D/0x0E` - definition size/chunk
- `0x10-0x13` - QMK settings query/get/set/reset
- `0x14/0x15` - leader get/set (NEW)

## VIA3 Custom UI System

The keyboard definition JSON includes a `menus` array that defines dynamic, keyboard-specific settings UI. This enables keyboards like Svalboard to expose custom settings (DPI, scroll mode, layer colors) without hardcoding them in the GUI.

### Menu Structure

```json
{
  "menus": [
    {
      "label": "Pointing Device",
      "content": [
        {
          "label": "Left Pointer",
          "content": [
            {
              "label": "DPI",
              "type": "dropdown",
              "options": ["200", "400", "800", "1600"],
              "content": ["id_left_dpi", 0, 0]
            },
            {
              "label": "Scroll Mode",
              "type": "toggle",
              "content": ["id_left_scroll", 0, 1]
            }
          ]
        }
      ]
    }
  ]
}
```

### Control Types

| Type | Description | Options Format |
|------|-------------|----------------|
| `dropdown` | Select from list | `["opt1", "opt2", ...]` |
| `toggle` | Boolean switch | None |
| `range` | Slider/number input | `[min, max]` |
| `color` | HSV color picker | None |

### Content Array Format

`["value_id", channel, value_index]`

- `value_id` - Human-readable identifier for the setting
- `channel` - VIA channel ID (usually 0 for keyboard-specific)
- `value_index` - Index within the channel's value space

### Conditional Visibility

```json
{
  "showIf": "{id_automouse_enable} == 1",
  "content": [ /* shown only when automouse is enabled */ ]
}
```

### Implementation Plan for Svalboard Settings Panel

1. **Parse menus from keyboard definition** during `loadKeyboard()`
2. **Create dynamic UI renderer** that maps menu structure to React components
3. **Implement value get/set** via `CMD_VIA_GET_KEYBOARD_VALUE` / `CMD_VIA_SET_KEYBOARD_VALUE` with custom channel routing
4. **Add showIf evaluator** for conditional UI visibility
5. **Persist changes** via `id_custom_save` command

## Migration Status: keybard-ng → viable-gui Feature Parity

This section tracks progress toward full feature parity with viable-gui.

### Feature Implementation Status

| Feature | Protocol | Backend | UI Panel | Live Update | Status |
|---------|----------|---------|----------|-------------|--------|
| Keymaps | VIA | ✅ | ✅ | ✅ | Complete |
| Macros | VIA | ✅ | ✅ | ❌ | UI works, no live update |
| Tap Dances | 0x01/0x02 | ✅ | ✅ | ⚠️ Stub | Need to wire callback |
| Combos | 0x03/0x04 | ✅ | ✅ | ⚠️ Stub | Need to wire callback |
| Key Overrides | 0x05/0x06 | ✅ | ✅ | ⚠️ Stub | Need to wire callback |
| **Alt-Repeat Keys** | 0x07/0x08 | ✅ | ❌ | ❌ | **Needs UI panel** |
| **One-Shot Settings** | 0x09/0x0A | ✅ | ❌ | ❌ | **Needs UI panel** |
| QMK Settings | 0x10-0x13 | ✅ | ✅ | N/A | Complete |
| **Leader Sequences** | 0x14/0x15 | ✅ | ❌ | ❌ | **Needs UI panel** |
| Layer State | 0x16/0x17 | ❌ | ❌ | ❌ | Not implemented |
| Fragments | 0x18-0x1A | ✅ | ✅ | N/A | Complete |
| Print Layers | N/A | ✅ | ✅ | N/A | Complete |

### Priority Tasks

#### HIGH - Missing UI Panels
1. **Alt-Repeat Keys Panel** - Create `AltRepeatPanel.tsx`
   - List entries: keycode → alternate keycode
   - Support allowed modifiers and enabled toggle
   - Wire to `vialService.updateAltRepeatKey()`

2. **Leader Sequences Panel** - Create `LeadersPanel.tsx`
   - List entries: sequence (up to 5 keys) → output keycode
   - Support enabled toggle
   - Wire to `vialService.updateLeader()`

3. **One-Shot Settings** - Add to Settings or QMK Settings panel
   - Timeout slider (ms)
   - Tap-toggle count input
   - Wire to `vialService.updateOneShot()`

#### MEDIUM - Fix Live Updating
4. **Fix Combo live update** - `KeyBindingContext.tsx:223`
   - Replace stub with `comboService.push()`

5. **Fix Tap Dance live update** - `KeyBindingContext.tsx:240`
   - Replace stub with `tapdanceService.push()`

6. **Fix Override live update** - `KeyBindingContext.tsx:257`
   - Replace stub with `overrideService.push()`

#### LOW - Future Enhancements
7. **VIA3 Dynamic Menus** - See implementation plan above
8. **Layer State Commands** - Protocol 0x16/0x17
9. **Undo/Redo** - Deferred (large lift)

### Key Files Reference

**Service Layer (Backend):**
- `src/services/vial.service.ts` - Alt-repeat, leader, one-shot methods
- `src/services/usb.service.ts` - All Viable command IDs defined

**Type Definitions:**
- `src/types/vial.types.ts` - AltRepeatKeyEntry, LeaderEntry, OneShotSettings

**UI Patterns to Follow:**
- `src/layout/SecondarySidebar/Panels/TapdancePanel.tsx` - List + editor pattern
- `src/layout/SecondarySidebar/Panels/CombosPanel.tsx` - Multi-key sequence UI
- `src/layout/SecondarySidebar/Panels/OverridesPanel.tsx` - Toggle UI pattern

**Live Updating:**
- `src/contexts/KeyBindingContext.tsx:223-270` - Stub callbacks to fix
- `src/contexts/ChangesContext.tsx` - Queue system infrastructure

## Browser-Based Test Plan (Claude-in-Chrome)

This test plan can be executed autonomously via Claude-in-Chrome browser automation against `http://localhost:5173/keybard-ng/`. Tests are organized by feature area and include expected results.

### Prerequisites
- Dev server running: `npm run dev`
- Browser tab open to KeyBard application
- Keyboard data loaded (file import or connected keyboard)

### Test Suite 1: Sidebar Navigation

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **1.1 Open Keyboard Panel** | Click "Keyboard" in sidebar | Secondary panel shows QWERTY key picker |
| **1.2 Open Special Panel** | Click "Special" in sidebar | Panel shows Media, Audio, Backlight, Steno sections |
| **1.3 Open One-Shot Panel** | Click "One-Shot" in sidebar | Panel shows one-shot modifier keys (OSM) |
| **1.4 Open Layer Keys Panel** | Click "Layer Keys" in sidebar | Panel shows MO, DF, TG, TT, OSL, TO tabs |
| **1.5 Open Mouse Panel** | Click "Mouse" in sidebar | Panel shows mouse buttons, movement, wheel, Svalboard keys |
| **1.6 Open Tap Dances Panel** | Click "Tap Dances" in sidebar | Panel shows tap dance list with Tap/Hold/Tap-Hold/Double-Tap columns |
| **1.7 Open Macros Panel** | Click "Macros" in sidebar | Panel shows macro list with action sequences |
| **1.8 Open Combos Panel** | Click "Combos" in sidebar | Panel shows combo list with input keys → output |
| **1.9 Open Overrides Panel** | Click "Overrides" in sidebar | Panel shows override list with trigger → replacement |
| **1.10 Open Fragments Panel** | Click "Fragments" in sidebar | Panel shows fragment selection dropdowns |
| **1.11 Open About Panel** | Click "About" in sidebar | Panel shows application info |
| **1.12 Open Matrix Tester** | Click "Matrix Tester" in sidebar | Matrix tester view appears |
| **1.13 Open Settings Panel** | Click "Settings" in sidebar | Settings panel opens with category tabs |
| **1.14 Hide Menu Toggle** | Click "Hide Menu" | Left sidebar collapses; click again to expand |

### Test Suite 2: Settings Panel

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **2.1 General Tab** | Open Settings → Click "General" | Shows Live Updating, Typing binds key, Serial Assignment, International Keyboards, QMK Settings |
| **2.2 Pointing Tab** | Open Settings → Click "Pointing" | Shows DPI sliders (left/right), scroll settings |
| **2.3 Import/Export Tab** | Open Settings → Click "Import / Export" | Shows Import..., Export..., Print Layers... options |
| **2.4 Toggle Live Updating** | In General tab, toggle "Live Updating" | Toggle switches state; bottom bar shows "Live Updating" or "Update Changes" button |
| **2.5 Open Export Dialog** | Click "Export..." | Dialog opens with format dropdown (Viable/VIL/KBI) and Include Macros toggle |
| **2.6 Cancel Export Dialog** | In Export dialog, click "Cancel" | Dialog closes without action |
| **2.7 Open Print Dialog** | Click "Print Layers..." | Dialog opens showing keyboard name and non-empty layer count |
| **2.8 Cancel Print Dialog** | In Print dialog, click "Cancel" | Dialog closes without action |
| **2.9 Change International Keyboard** | Change "International Keyboards" dropdown | Selection updates (verify dropdown value changes) |

### Test Suite 3: Layer Navigation

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **3.1 Switch to Layer 1** | Click layer "1" tab | Keyboard display updates to show Layer 1 keys |
| **3.2 Switch to Layer 2** | Click layer "2" tab | Keyboard display updates to show Layer 2 keys |
| **3.3 Switch to NAS Layer** | Click "NAS" tab | Keyboard display updates to show NAS layer |
| **3.4 Switch to Fn Keys Layer** | Click "Fn Keys" tab | Keyboard display shows function keys |
| **3.5 Switch to Mouse Layer** | Click "Mouse" tab | Keyboard display shows mouse layer |
| **3.6 Return to Default Layer** | Click "default" tab | Keyboard returns to default layer view |
| **3.7 Hide Blank Layers** | Click "Hide Blank Layers" button | Empty layers are hidden from tab bar |

### Test Suite 4: Key Selection & Binding

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **4.1 Select a Key** | Click any key on keyboard layout | Key highlights with selection indicator |
| **4.2 Open Keyboard Picker** | With key selected, click "Keyboard" panel | QWERTY picker visible, can assign new keycode |
| **4.3 Clear Selection** | Press Escape or click elsewhere | Key selection clears |
| **4.4 Select Different Key** | Click different key | Previous selection clears, new key selected |

### Test Suite 5: Combo Panel Interaction

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **5.1 View Combo List** | Open Combos panel | Shows numbered combo entries (0, 1, 2...) |
| **5.2 View Combo Details** | Look at combo entry | Shows input keys (e.g., "D + F") and output key |
| **5.3 Click Combo Entry** | Click on a combo row | Entry becomes editable/selectable |
| **5.4 Scroll Combo List** | Scroll in combo panel | Can view all combo slots |

### Test Suite 6: Tap Dance Panel Interaction

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **6.1 View Tap Dance List** | Open Tap Dances panel | Shows entries with Tap/Hold/Tap-Hold/Double-Tap columns |
| **6.2 View TD Entry Details** | Look at tap dance row | Shows assigned keys for each action type |
| **6.3 Click TD Slot** | Click on a tap dance slot (Tap, Hold, etc.) | Slot becomes selectable for binding |

### Test Suite 7: Override Panel Interaction

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **7.1 View Override List** | Open Overrides panel | Shows override entries with trigger → replacement |
| **7.2 Toggle Override** | Click ON/OFF toggle on an override | Toggle switches state |

### Test Suite 8: Size Controls

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **8.1 Set Normal Size** | Click "NORMAL" button in bottom bar | Keyboard renders at normal size |
| **8.2 Set Medium Size** | Click "MEDIUM" button | Keyboard renders at medium size |
| **8.3 Set Small Size** | Click "SMALL" button | Keyboard renders at small size |

### Test Suite 9: File Import (UI Only)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **9.1 Open Import Dialog** | Settings → Import/Export → Click "Import..." | File picker dialog triggers (native browser dialog) |

### Test Suite 10: Print Layers (UI Verification)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **10.1 Open Print Dialog** | Settings → Import/Export → Print Layers | Dialog shows with keyboard name and layer count |
| **10.2 Verify Layer Count** | Check "Non-empty layers" count | Count matches actual non-empty layers in keymap |
| **10.3 Execute Print** | Click "Print" button | Browser print dialog appears |

### Test Execution Commands

To run these tests via Claude-in-Chrome:

```
1. Get tab context: mcp__claude-in-chrome__tabs_context_mcp
2. Navigate if needed: mcp__claude-in-chrome__navigate (url: "http://localhost:5173/keybard-ng/")
3. Find elements: mcp__claude-in-chrome__find (query: "element description")
4. Click elements: mcp__claude-in-chrome__computer (action: "left_click", ref: "ref_X")
5. Take screenshots: mcp__claude-in-chrome__computer (action: "screenshot")
6. Read page structure: mcp__claude-in-chrome__read_page (filter: "interactive")
```

### Limitations

**Cannot Test Without Hardware:**
- Actual USB communication with keyboard
- Live keycode changes persisting to device
- Matrix tester key detection
- Connect/disconnect flow with real keyboard

**Can Test (UI Only):**
- All panel navigation and visibility
- Settings toggles and dropdowns
- Dialog open/close flows
- Visual keyboard layout rendering
- Layer switching (UI state)
- Key selection highlighting
- Export dialog options
- Print dialog information
