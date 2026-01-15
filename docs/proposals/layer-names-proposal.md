# Proposal: Layer Names for Viable Protocol

**Date:** 2026-01-14
**Author:** Morgan (via Claude Code)
**Status:** Draft Proposal for Discussion

## Summary

Add support for user-customizable layer names that persist across sessions. Layer names would be stored both on the keyboard (EEPROM) and in `.viable` files.

## Motivation

Currently, layers are identified only by their index (0-15). Users can assign custom names in the GUI (stored in `cosmetic.layer` in the file), but these names:
- Are NOT saved to the keyboard hardware
- Are NOT restored when reconnecting to a device
- Are only persisted in `.viable` files

Users expect that when they name a layer "Gaming" or "Photoshop", that name should:
1. Be saved to the keyboard
2. Come back when they reconnect the keyboard
3. Be saved in exported `.viable` files
4. Be loaded when importing `.viable` files

## Proposed Implementation

### Protocol Extension

Add two new Viable protocol commands:

| Command | ID | Request Format | Response Format |
|---------|-----|----------------|-----------------|
| `layer_name_get` | `0x18` | `[0xDF][0x18][layer_idx]` | `[0xDF][0x18][layer_idx][name_bytes...][0x00]` |
| `layer_name_set` | `0x19` | `[0xDF][0x19][layer_idx][name_bytes...][0x00]` | `[0xDF][0x19][status]` |

**Parameters:**
- `layer_idx`: Layer index (0-15)
- `name_bytes`: UTF-8 encoded name, null-terminated
- `status`: 0 = success, 1 = error

### Name Length

**Recommendation:** Maximum 16 bytes (15 characters + null terminator)

This allows meaningful names like "Gaming", "Photoshop", "Work", "default" while keeping EEPROM usage reasonable.

With 16 layers and 16 bytes per name: **256 bytes total EEPROM usage**

### EEPROM Storage

```c
// In viable.h
#define VIABLE_LAYER_NAME_SIZE     16   // Max bytes per name (including null)
#define VIABLE_LAYER_NAME_ENTRIES  16   // One per layer
#define VIABLE_LAYER_NAMES_SIZE    (VIABLE_LAYER_NAME_SIZE * VIABLE_LAYER_NAME_ENTRIES) // 256 bytes

// Add after existing offsets
#define VIABLE_LAYER_NAMES_OFFSET  (VIABLE_EXISTING_END_OFFSET)
```

### Firmware Implementation

```c
// viable.c additions

int viable_get_layer_name(uint8_t layer, char *name, uint8_t max_len) {
    if (layer >= VIABLE_LAYER_NAME_ENTRIES) return -1;
    if (max_len < VIABLE_LAYER_NAME_SIZE) return -1;

    viable_read_eeprom(
        VIABLE_LAYER_NAMES_OFFSET + layer * VIABLE_LAYER_NAME_SIZE,
        name, VIABLE_LAYER_NAME_SIZE
    );
    name[VIABLE_LAYER_NAME_SIZE - 1] = '\0';  // Ensure null-terminated
    return 0;
}

int viable_set_layer_name(uint8_t layer, const char *name) {
    if (layer >= VIABLE_LAYER_NAME_ENTRIES) return -1;

    char buf[VIABLE_LAYER_NAME_SIZE] = {0};
    strncpy(buf, name, VIABLE_LAYER_NAME_SIZE - 1);

    viable_write_eeprom(
        VIABLE_LAYER_NAMES_OFFSET + layer * VIABLE_LAYER_NAME_SIZE,
        buf, VIABLE_LAYER_NAME_SIZE
    );
    return 0;
}

// In viable_handle_command() switch:
case viable_cmd_layer_name_get: {
    uint8_t layer = data[2];
    char name[VIABLE_LAYER_NAME_SIZE];
    if (viable_get_layer_name(layer, name, sizeof(name)) == 0) {
        memcpy(&data[3], name, VIABLE_LAYER_NAME_SIZE);
    }
    break;
}

case viable_cmd_layer_name_set: {
    uint8_t layer = data[2];
    char name[VIABLE_LAYER_NAME_SIZE];
    memcpy(name, &data[3], VIABLE_LAYER_NAME_SIZE - 1);
    name[VIABLE_LAYER_NAME_SIZE - 1] = '\0';
    data[2] = viable_set_layer_name(layer, name) == 0 ? 0 : 1;
    break;
}
```

### .viable File Format Extension

Add `layer_names` as a new top-level field:

```json
{
    "version": 1,
    "uid": "...",
    "name": "Svalboard",
    "layer_names": {
        "0": "default",
        "1": "Gaming",
        "2": "Photoshop",
        "5": "NAS"
    },
    "layout": [...],
    ...
}
```

**Notes:**
- Use object with string keys (layer indices) for sparse storage
- Only non-empty names need to be stored
- Empty string or missing key = use default name (layer index)

### GUI Implementation (viable-gui)

```python
# In keyboard_comm.py

def save_layer_names(self):
    """Save layer names to dictionary for .viable format."""
    names = {}
    for layer in range(self.layers):
        name = self.layer_names.get(layer, "")
        if name:  # Only store non-empty names
            names[str(layer)] = name
    return names

def restore_layer_names(self, data):
    """Restore layer names from .viable format."""
    if not data:
        return
    for layer_str, name in data.items():
        layer = int(layer_str)
        if 0 <= layer < self.layers:
            self.layer_names[layer] = name
            # If connected, also update hardware
            if self.connected:
                self._set_layer_name(layer, name)
```

## Alternatives Considered

### Alternative 1: Store in custom_values

Could piggyback on existing VIA custom values system, but:
- Limited to 2-byte values (not suitable for strings)
- Would need significant modification to support strings
- Less clean than dedicated commands

### Alternative 2: Store only in .viable files (GUI-only)

Could skip firmware storage entirely:
- Pros: No firmware changes needed
- Cons: Names lost when switching computers, not truly "saved to keyboard"

### Alternative 3: Longer names (32+ bytes)

Could allow longer names:
- Pros: More flexibility
- Cons: 512+ bytes EEPROM for questionable benefit

## Questions for Discussion

1. **Name length**: Is 16 bytes (15 chars) sufficient, or should we use 24 or 32?
2. **Character encoding**: UTF-8 assumed - is this acceptable?
3. **Default names**: Should firmware provide default names (e.g., "Layer 0"), or return empty and let GUI handle defaults?
4. **Synchronization**: When loading a .viable file onto a connected keyboard, should layer names be pushed to hardware automatically?

## Implementation Priority

This is a quality-of-life feature. Suggested implementation order:

1. **Phase 1**: Firmware commands (0x18/0x19) + EEPROM storage
2. **Phase 2**: viable-gui support (load/save layer names on connect)
3. **Phase 3**: .viable file format extension
4. **Phase 4**: GUI UI for editing layer names (if not already present)

## References

- Viable protocol: `viable-qmk/modules/viable-kb/core/viable.c`
- .viable file format: `viable-gui/src/main/python/protocol/keyboard_comm.py`
- Existing command IDs: 0x00-0x17 (see viable.h)
