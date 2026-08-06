import { KeyboardInfo } from "../types/vial.types";
import { PendingChange } from "./changes.service";
import { customValueService } from "./custom-value.service";
import { keyService } from "./key.service";

export class ImportService {
    /**
     * Merge device-derived structural fields from a connected keyboard into
     * a file-loaded KBINFO. .viable / .vil files only carry user-editable data
     * (keymap, macros, combos, etc.) — the keyboard payload (custom_keycodes,
     * payload, menus, fragments, hardware counts, etc.) only exists at connect
     * time. Without this merge, importing a file wipes those fields and
     * downstream UI (e.g. the MousePanel SV_* keys, which read from
     * custom_keycodes) breaks until the user reconnects.
     *
     * Device wins on hardware-shaped fields; file wins on user-editable fields.
     * Caller is responsible for fragmentState merging and keylayout
     * recomposition since those mix device data with file selections.
     */
    mergeDeviceFields(newKb: KeyboardInfo, deviceKb: KeyboardInfo): void {
        // Fields that exist only in the device payload — always copy from device.
        if (deviceKb.custom_keycodes) newKb.custom_keycodes = deviceKb.custom_keycodes;
        if (deviceKb.payload) newKb.payload = deviceKb.payload;
        if (deviceKb.name && !newKb.name) newKb.name = deviceKb.name;
        if (deviceKb.feature_flags !== undefined && newKb.feature_flags === undefined) {
            newKb.feature_flags = deviceKb.feature_flags;
        }
        if (deviceKb.macros_size !== undefined) newKb.macros_size = deviceKb.macros_size;

        // VIA3 menu definitions come from the device.
        if (deviceKb.menus) newKb.menus = deviceKb.menus;

        // Hardware shape: connected device is the source of truth.
        if (deviceKb.rows) newKb.rows = deviceKb.rows;
        if (deviceKb.cols) newKb.cols = deviceKb.cols;
        if (deviceKb.layers) newKb.layers = deviceKb.layers;
        if (deviceKb.combo_count !== undefined) newKb.combo_count = deviceKb.combo_count;
        if (deviceKb.key_override_count !== undefined) newKb.key_override_count = deviceKb.key_override_count;
        if (deviceKb.macro_count !== undefined) newKb.macro_count = deviceKb.macro_count;
        if (deviceKb.tapdance_count !== undefined) newKb.tapdance_count = deviceKb.tapdance_count;
        if (deviceKb.alt_repeat_key_count !== undefined) newKb.alt_repeat_key_count = deviceKb.alt_repeat_key_count;
        if (deviceKb.leader_count !== undefined) newKb.leader_count = deviceKb.leader_count;

        // Cosmetic data: device fills in defaults, file overrides where present,
        // but layer names from the device always win (they're hardware-defined).
        if (deviceKb.cosmetic) {
            newKb.cosmetic = {
                ...deviceKb.cosmetic,
                ...(newKb.cosmetic || {}),
                layer: deviceKb.cosmetic.layer || newKb.cosmetic?.layer,
            };
        }

        // Fragment definitions: device defines what fragments exist. File only
        // carries user selections (handled by caller via fragmentState).
        if (deviceKb.fragments) newKb.fragments = deviceKb.fragments;
        if (deviceKb.composition) newKb.composition = deviceKb.composition;
    }

    async syncWithKeyboard(
        newKb: KeyboardInfo,
        currentKb: KeyboardInfo,
        queue: (desc: string, cb: () => Promise<void>, metadata?: Partial<PendingChange>) => Promise<void>,
        services: any
    ): Promise<void> {
        if (!currentKb) return;

        console.log("Syncing imported keyboard...", newKb);

        // Copy hardware properties from connected keyboard (these are not in save files)
        // macros_size is required for the macro buffer allocation
        newKb.macros_size = currentKb.macros_size;

        // 1. Sync Keymap
        // Use hardware dimensions from currentKb for iteration
        if (newKb.keymap && currentKb.keymap) {
            const layers = Math.min(newKb.layers || 0, currentKb.layers || 0);
            const rows = currentKb.rows;
            const cols = currentKb.cols;

            for (let l = 0; l < layers; l++) {
                if (!newKb.keymap[l]) continue;
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        // Map using file's cols for reading, hardware cols for writing
                        const newCols = newKb.cols || cols;
                        const keyIndex = (r * newCols) + c;
                        const newVal = newKb.keymap[l][keyIndex];
                        const oldVal = currentKb.keymap?.[l]?.[keyIndex];

                        if (newVal !== undefined && newVal !== oldVal) {
                            const keyLabel = keyService.stringify(newVal);
                            await queue(
                                `Update key L${l} R${r} C${c} to ${keyLabel}`,
                                async () => {
                                    await services.vialService.updateKey(l, r, c, newVal);
                                },
                                {
                                    type: "key",
                                    layer: l,
                                    row: r,
                                    col: c,
                                    keycode: newVal,
                                    previousValue: oldVal
                                }
                            );
                        }
                    }
                }
            }
        }

        // 2. Sync Macros
        if (JSON.stringify(newKb.macros) !== JSON.stringify(currentKb.macros)) {
            await queue(
                "Update All Macros",
                async () => {
                    await services.vialService.updateMacros(newKb);
                },
                { type: "macro" }
            );
        }

        // 3. Sync Combos
        const newCombos = newKb.combos;
        const currentCombos = currentKb.combos;

        if (newCombos && currentCombos) {
            for (let idx = 0; idx < newCombos.length; idx++) {
                const combo = newCombos[idx];
                const oldCombo = currentCombos[idx];
                if (JSON.stringify(combo) !== JSON.stringify(oldCombo)) {
                    await queue(
                        `Update Combo ${idx}`,
                        async () => {
                            await services.vialService.updateCombo(newKb, idx);
                        },
                        { type: "combo", comboId: idx }
                    );
                }
            }
        }

        // 4. Sync Tapdances
        const newTds = newKb.tapdances;
        const oldTds = currentKb.tapdances;

        if (newTds && oldTds) {
            for (let idx = 0; idx < newTds.length; idx++) {
                const td = newTds[idx];
                const oldTd = oldTds[idx];
                if (JSON.stringify(td) !== JSON.stringify(oldTd)) {
                    await queue(
                        `Update Tapdance ${idx}`,
                        async () => {
                            await services.vialService.updateTapdance(newKb, idx);
                        },
                        { type: "tapdance", tapdanceId: idx }
                    );
                }
            }
        }

        // 5. Sync Key Overrides
        const newOverrides = newKb.key_overrides;
        const currentOverrides = currentKb.key_overrides;

        if (newOverrides && currentOverrides) {
            for (let idx = 0; idx < newOverrides.length; idx++) {
                const ko = newOverrides[idx];
                const oldKo = currentOverrides[idx];
                if (JSON.stringify(ko) !== JSON.stringify(oldKo)) {
                    await queue(
                        `Update Key Override ${idx}`,
                        async () => {
                            await services.vialService.updateKeyoverride(newKb, idx);
                        },
                        { type: "override" }
                    );
                }
            }
        }

        // 6. Sync QMK Settings
        if (newKb.settings && currentKb.settings) {
            for (const key of Object.keys(newKb.settings)) {
                const qsid = parseInt(key);
                const newVal = newKb.settings![qsid];
                const oldVal = currentKb.settings![qsid];

                if (newVal !== oldVal) {
                    await queue(
                        `Update QMK Setting ${qsid}`,
                        async () => {
                            await services.vialService.updateQMKSetting(newKb, qsid);
                        },
                        { type: "key" }
                    );
                }
            }
        }

        // 7. Sync VIA3 Custom Values (DPI, scroll mode, automouse, bump filter, etc.)
        if (newKb.custom_values && newKb.custom_values.length > 0 && currentKb.menus) {
            // Walk connected keyboard's menu tree to get channel/valueId/width for each key
            const menuItemsWithRefs = customValueService.extractAllItemsWithRefs(currentKb.menus);
            const menuRefMap = new Map(menuItemsWithRefs.map(({ item, ref }) => [ref.key, { item, ref }]));

            const channelsToSave = new Set<number>();

            for (const entry of newKb.custom_values) {
                const menuEntry = menuRefMap.get(entry.key);
                if (!menuEntry) {
                    console.warn(`[Import] Custom value key "${entry.key}" not found in connected keyboard menus, skipping`);
                    continue;
                }

                const { item, ref } = menuEntry;
                const width = customValueService.getByteWidth(item);

                // Prepare data bytes - handle backward compat:
                // Old format: data: [integer] where the single number is the full value
                // New format: data: [byte0, byte1, ...] raw little-endian bytes
                let dataBytes: number[];
                if (entry.data.length === 1 && width > 1) {
                    // Old format: single integer, expand to bytes
                    dataBytes = customValueService.intToBytes(entry.data[0], width);
                } else {
                    dataBytes = entry.data.slice(0, width);
                    // Pad if needed
                    while (dataBytes.length < width) {
                        dataBytes.push(0);
                    }
                }

                await queue(
                    `Update custom value ${entry.key}`,
                    async () => {
                        await customValueService.setRaw(ref.channel, ref.valueId, dataBytes);
                    },
                    { type: "custom_ui" as any }
                );

                channelsToSave.add(ref.channel);
            }

            // Save each affected channel
            for (const channel of channelsToSave) {
                await queue(
                    `Save custom values channel ${channel}`,
                    async () => {
                        await customValueService.save(channel);
                    },
                    { type: "custom_ui" as any }
                );
            }
        }
    }
}

export const importService = new ImportService();
