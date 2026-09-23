import { describe, it, expect, vi } from 'vitest';
import { CustomValueService } from '../../src/services/custom-value.service';
import type { ViableUSB } from '../../src/services/usb.service';
import { SVALBOARD_POINTING_MENU } from '../fixtures/pointing-menu.fixture';

const KEY = 'id_automouse_skip_scroll';

/** Minimal USB stand-in: answers GETs from a `channel:id -> bytes` table, records SETs/SAVEs. */
function makeService(deviceValues: Record<string, number[]> = {}) {
    const usb = {
        customValueGet: vi.fn(async (channel: number, valueId: number, width: number) =>
            new Uint8Array(deviceValues[`${channel}:${valueId}`] ?? new Array(width).fill(0))),
        customValueSet: vi.fn(async () => undefined),
        customValueSave: vi.fn(async () => undefined),
    };
    return { usb, service: new CustomValueService(usb as unknown as ViableUSB) };
}

describe('CustomValueService: svalboard auto mouse skip-scroll value', () => {
    it('discovers the toggle nested under the showIf group as channel 0 / id 11, one byte wide', () => {
        const { service } = makeService();
        const refs = service.extractAllItemsWithRefs(SVALBOARD_POINTING_MENU);
        const found = refs.find((r) => r.ref.key === KEY);
        expect(found).toBeDefined();
        expect(found!.ref).toMatchObject({ channel: 0, valueId: 11 });
        expect(service.getByteWidth(found!.item)).toBe(1);
    });

    it('bulk-loads it from the device at connect time and caches the integer value', async () => {
        const { service, usb } = makeService({ '0:11': [1] });
        const entries = await service.loadAllMenuValues(SVALBOARD_POINTING_MENU);
        expect(usb.customValueGet).toHaveBeenCalledWith(0, 11, 1);
        expect(entries.find((e) => e.key === KEY)).toEqual({ key: KEY, channel: 0, valueId: 11, data: [1] });
        expect(service.getCached(KEY)).toBe(1);
    });

    it('setValue writes a single byte to channel 0 / id 11 and updates the cache', async () => {
        const { service, usb } = makeService();
        await service.setValue(KEY, 1, SVALBOARD_POINTING_MENU);
        expect(usb.customValueSet).toHaveBeenCalledWith(0, 11, [1]);
        expect(service.getCached(KEY)).toBe(1);
    });
});
