import type { KeyboardInfo } from "../types/vial.types";
import { keyService } from "./key.service";
import { ViableUSB } from "./usb.service";

export class OverrideService {
    constructor(private usb: ViableUSB) { }

    async get(kbinfo: KeyboardInfo): Promise<void> {
        const override_count = kbinfo.key_override_count || 0;
        if (override_count === 0) return;

        kbinfo.key_overrides = [];

        // Use Viable protocol: direct key override get command
        for (let i = 0; i < override_count; i++) {
            const data = await this.usb.sendViable(
                ViableUSB.CMD_VIABLE_KEY_OVERRIDE_GET,
                [i],
                { uint8: true }
            ) as Uint8Array;

            // Response: [cmd_echo][index][trigger:2][replacement:2][layers:2][trigger_mods][negative_mod_mask][suppressed_mods][options]
            const dv = new DataView(data.buffer);
            kbinfo.key_overrides.push({
                koid: i,
                trigger: keyService.stringify(dv.getUint16(2, true)),
                replacement: keyService.stringify(dv.getUint16(4, true)),
                layers: dv.getUint16(6, true),
                trigger_mods: data[8],
                negative_mod_mask: data[9],
                suppressed_mods: data[10],
                options: data[11],
            });
        }
    }

    async push(kbinfo: KeyboardInfo, koid: number): Promise<void> {
        if (!kbinfo.key_overrides) return;
        const ko = kbinfo.key_overrides[koid];
        if (!ko) return;

        // Use Viable protocol: direct key override set command
        await this.usb.sendViable(ViableUSB.CMD_VIABLE_KEY_OVERRIDE_SET, [
            koid,
            ...this.LE16(keyService.parse(ko.trigger)),
            ...this.LE16(keyService.parse(ko.replacement)),
            ...this.LE16(ko.layers),
            ko.trigger_mods,
            ko.negative_mod_mask,
            ko.suppressed_mods,
            ko.options,
        ], {});
    }

    private LE16(val: number): [number, number] {
        return [val & 0xFF, (val >> 8) & 0xFF];
    }
}
