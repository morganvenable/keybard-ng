# Viable Alt-Repeat Key: Missing QMK Hook

## Summary

The Viable alt-repeat key configuration is stored and loaded from EEPROM correctly, but the firmware never hooks into QMK's callback to actually use the configured mappings. As a result, `QK_ALT_REPEAT_KEY` only uses QMK's built-in defaults (navigation opposites like Left→Right) and ignores any mappings configured via the Viable protocol.

## What Works

- Protocol commands `0x07` (get) and `0x08` (set) work correctly
- EEPROM storage/retrieval works (`viable_get_alt_repeat_key`, `viable_set_alt_repeat_key`)
- Lookup function exists: `viable_get_alt_repeat_keycode()` in `viable_alt_repeat_key.c`
- Entries are loaded into memory on init via `viable_reload_alt_repeat_key()`

## What's Missing

The lookup function is never called. QMK's alt-repeat system uses a weak callback `get_alt_repeat_key_keycode_user()` defined in `quantum/repeat_key.c:280`. Viable needs to override this callback to use its configured mappings.

## Suggested Fix

Add to `modules/viable-kb/core/viable_alt_repeat_key.c`:

```c
uint16_t get_alt_repeat_key_keycode_user(uint16_t keycode, uint8_t mods) {
    uint16_t alt = viable_get_alt_repeat_keycode(keycode, mods);
    if (alt != KC_NO) return alt;

    // Check reverse for bidirectional entries
    alt = viable_get_reverse_alt_repeat_keycode(keycode, mods);
    if (alt != KC_NO) return alt;

    return KC_TRNS; // Fall through to QMK defaults
}
```

## Files Involved

- `modules/viable-kb/core/viable_alt_repeat_key.c` - has lookup functions, needs the hook
- `modules/viable-kb/core/viable.h` - may need to declare `viable_get_alt_repeat_keycode()` if not already exported
- `quantum/repeat_key.c:280` - QMK's weak default implementation that needs overriding

## Testing

1. Configure an alt-repeat entry via GUI (e.g., A → B)
2. Enable the entry
3. Press A, then press `QK_ALT_REPEAT_KEY`
4. Expected: outputs B
5. Current: outputs nothing (no default for letter keys)
