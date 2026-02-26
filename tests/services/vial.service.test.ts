import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VialService } from '../../src/services/vial.service';
import { createTestKeyboardInfo } from '../fixtures/keyboard-info.fixture';

// Mock the key service
vi.mock('../../src/services/key.service', () => ({
  keyService: {
    stringify: vi.fn((keycode: number) => `KC_${keycode.toString(16).toUpperCase()}`),
    parse: vi.fn((keystr: string) => parseInt(keystr.replace('KC_', ''), 16)),
    generateAllKeycodes: vi.fn()
  }
}));

// Mock js-lzma
// @ts-ignore
import LZMA from 'js-lzma';
vi.mock('js-lzma', () => ({
  default: {
    decompressFile: vi.fn((_inStream, outStream) => {
      const data = '{"matrix":{"rows":4,"cols":12},"customKeycodes":[],"lighting":"none","menus":[],"viable":{"tap_dance":2,"leader":1},"fragments":[],"composition":[]}';
      const bytes = new TextEncoder().encode(data);
      bytes.forEach(b => outStream.writeByte(b));
    })
  }
}));

// Mock sval service
vi.mock('../../src/services/sval.service', () => ({
  svalService: {
    check: vi.fn(),
    pull: vi.fn(),
    setupCosmeticLayerNames: vi.fn(),
    syncCosmeticLayerColors: vi.fn()
  }
}));

// Mock kle service
vi.mock('../../src/services/kle.service', () => ({
  KleService: vi.fn().mockImplementation(() => ({
    deserializeToKeylayout: vi.fn()
  }))
}));

import { svalService } from '../../src/services/sval.service';

describe('VialService', () => {
  let vialService: VialService;
  let mockUSB: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create a comprehensive USB mock
    mockUSB = {
      send: vi.fn(),
      sendVial: vi.fn(),
      sendViable: vi.fn(),
      getViaBuffer: vi.fn(),
      getDynamicEntries: vi.fn(),
      open: vi.fn().mockResolvedValue(true),
      close: vi.fn().mockResolvedValue(undefined)
    };


    // Setup default mock responses
    mockUSB.send.mockImplementation((cmd: number, args: number[], options?: any) => {
      if (cmd === 0x01) { // VIA protocol version
        if (options?.unpack === 'B>H' && options?.index === 1) {
          return Promise.resolve(0x0C);
        }
        return Promise.resolve(new Uint8Array([0x01, 0x00, 0x0C]));
      }
      if (cmd === 0x11) { // Layer count
        if (options?.uint8 && options?.index === 1) {
          return Promise.resolve(4);
        }
        return Promise.resolve(new Uint8Array([0x11, 4]));
      }
      if (cmd === 0x0C) { // Macro count
        if (options?.uint8 && options?.index === 1) {
          return Promise.resolve(2);
        }
        return Promise.resolve(new Uint8Array([0x0C, 2]));
      }
      if (cmd === 0x0D) { // Macro buffer size
        if (options?.unpack === 'B>H' && options?.index === 1) {
          return Promise.resolve(256);
        }
        return Promise.resolve(new Uint8Array([0x0D, 0x01, 0x00]));
      }
      if (cmd === 0x02) { // Get keyboard value (for matrix polling)
        // Return matrix state data
        const response = new Uint8Array(32);
        response[0] = 0x02; // CMD_VIA_GET_KEYBOARD_VALUE
        response[1] = 0x03; // VIA_SWITCH_MATRIX_STATE
        response[2] = 0x00; // Offset (matches service logic)
        // Row 0: col 0 and 2 pressed (data starts at index 3)
        response[3] = 0b00000101;
        // Row 1: no keys pressed
        response[4] = 0b00000000;
        return Promise.resolve(response);
      }
      if (cmd === 0x05) { // Set keycode
        return Promise.resolve(new Uint8Array([0x05]));
      }
      if (cmd === 0x12) { // Get keymap buffer
        // This should not be called directly, getViaBuffer handles it
        return Promise.resolve(new Uint8Array(32));
      }
      return Promise.resolve(new Uint8Array(32));
    });

    mockUSB.sendVial.mockImplementation((cmd: number, args: number[], options?: any) => {
      if (cmd === 0x00) { // Get keyboard ID (legacy)
        if (options?.unpack === 'I<Q') {
          return Promise.resolve([6, BigInt('0x1234567890ABCDEF')]);
        }
        return Promise.resolve(new Uint8Array([0xFE, 0x00, 0x06, 0, 0, 0, 0xEF, 0xCD, 0xAB, 0x90, 0x78, 0x56, 0x34, 0x12]));
      }
      if (cmd === 0x01) { // Get size (legacy)
        if (options?.uint32 && options?.index === 0) {
          return Promise.resolve(100); // Small payload for testing
        }
        return Promise.resolve(new Uint8Array([100, 0, 0, 0]));
      }
      if (cmd === 0x02) { // Get definition (legacy)
        if (options?.uint8) {
          // Return mock compressed data
          const data = new Uint8Array(32);
          data[0] = 0xFD; // XZ magic bytes
          data[1] = 0x37;
          data[2] = 0x7A;
          data[3] = 0x58;
          data[4] = 0x5A;
          return Promise.resolve(data);
        }
        return Promise.resolve(new Uint8Array(32));
      }
      if (cmd === 0x0D) { // Dynamic entry op
        return Promise.resolve(new Uint8Array([0xFE, 0x0D]));
      }
      return Promise.resolve(new Uint8Array(32));
    });

    // Viable protocol mock
    mockUSB.sendViable.mockImplementation((cmd: number, args: number[], options?: any) => {
      if (cmd === 0x00) { // CMD_VIABLE_GET_INFO
        // Response format: [protocol_version:4][uid:8][feature_flags:1]
        // Protocol version = 6 (0x00000006), UID = 0x1234567890ABCDEF, feature_flags = 0
        if (options?.uint8) {
          const response = new Uint8Array(14);
          response[0] = 0x00; // cmd_echo
          // Protocol version (LE32): 6
          response[1] = 0x06;
          response[2] = 0x00;
          response[3] = 0x00;
          response[4] = 0x00;
          // UID (8 bytes): will be converted to hex string for kbid
          response[5] = 0xEF;
          response[6] = 0xCD;
          response[7] = 0xAB;
          response[8] = 0x90;
          response[9] = 0x78;
          response[10] = 0x56;
          response[11] = 0x34;
          response[12] = 0x12;
          // Feature flags
          response[13] = 0x00;
          return Promise.resolve(response);
        }
        return Promise.resolve(new Uint8Array(13));
      }
      if (cmd === 0x05) { // CMD_VIABLE_DEFINITION_SIZE
        if (options?.uint32 && options?.index === 0) {
          return Promise.resolve(100); // Small payload for testing
        }
        return Promise.resolve(new Uint8Array([100, 0, 0, 0]));
      }
      if (cmd === 0x06) { // CMD_VIABLE_DEFINITION_CHUNK
        if (options?.uint8) {
          // Return mock compressed data
          const data = new Uint8Array(32);
          data[0] = 0xFD; // XZ magic bytes
          data[1] = 0x37;
          data[2] = 0x7A;
          data[3] = 0x58;
          data[4] = 0x5A;
          return Promise.resolve(data);
        }
        return Promise.resolve(new Uint8Array(32));
      }
      return Promise.resolve(new Uint8Array(32));
    });

    mockUSB.getViaBuffer.mockImplementation((cmd: number, size: number, options?: any) => {
      // Return mock keymap data
      if (options?.uint16) {
        // When uint16 is true, return array of numbers
        const data: number[] = [];
        for (let i = 0; i < size / 2; i++) {
          data.push(i);  // Return sequential keycodes as numbers
        }
        return Promise.resolve(data);
      } else {
        // Return Uint8Array for byte data
        const buffer = new Uint8Array(size);
        // Fill with sequential keycodes for testing
        for (let i = 0; i < size / 2; i++) {
          buffer[i * 2] = (i >> 8) & 0xFF; // Big endian high byte
          buffer[i * 2 + 1] = i & 0xFF;    // Big endian low byte
        }
        return Promise.resolve(buffer);
      }
    });

    mockUSB.getDynamicEntries.mockResolvedValue([]);

    vialService = new VialService(mockUSB);
  });

  describe('init', () => {
    it('should initialize without errors', async () => {
      const kbinfo = createTestKeyboardInfo();
      await expect(vialService.init(kbinfo)).resolves.toBeUndefined();
    });
  });

  describe('getKeyboardInfo', () => {
    it('should retrieve VIA protocol version', async () => {
      const kbinfo = createTestKeyboardInfo();
      await vialService.getKeyboardInfo(kbinfo);
      expect(kbinfo.via_proto).toBe(0x0C);
    });

    it('should retrieve Vial protocol version', async () => {
      const kbinfo = createTestKeyboardInfo();
      await vialService.getKeyboardInfo(kbinfo);
      expect(kbinfo.vial_proto).toBe(6);
    });

    it('should retrieve keyboard ID', async () => {
      const kbinfo = createTestKeyboardInfo();
      await vialService.getKeyboardInfo(kbinfo);
      // The UID bytes are converted to hex string
      expect(kbinfo.kbid).toBe('1234567890abcdef');
    });

    it('should handle USB disconnection during info retrieval', async () => {
      const kbinfo = createTestKeyboardInfo();
      mockUSB.send.mockRejectedValue(new Error('USB disconnected'));
      await expect(vialService.getKeyboardInfo(kbinfo)).rejects.toThrow('USB disconnected');
    });

    it('should retrieve matrix size', async () => {
      const kbinfo = createTestKeyboardInfo();
      await vialService.getKeyboardInfo(kbinfo);
      expect(kbinfo.rows).toBe(4);
      expect(kbinfo.cols).toBe(12);
    });
  });

  describe('getFeatures', () => {
    it('should retrieve macro count and buffer size', async () => {
      const kbinfo = createTestKeyboardInfo();
      await vialService.getFeatures(kbinfo);
      expect(kbinfo.macro_count).toBe(2);
      expect(kbinfo.macros_size).toBe(256);
    });

    it('should handle keyboards with no macros', async () => {
      const kbinfo = createTestKeyboardInfo();
      mockUSB.send.mockImplementation((cmd: number, args: number[], options?: any) => {
        if (cmd === 0x0C) { // Macro count
          if (options?.uint8 && options?.index === 1) {
            return Promise.resolve(0);
          }
        }
        if (cmd === 0x0D) { // Macro buffer size
          if (options?.unpack === 'B>H' && options?.index === 1) {
            return Promise.resolve(0);
          }
        }
        return Promise.resolve(new Uint8Array(32));
      });

      await vialService.getFeatures(kbinfo);
      expect(kbinfo.macro_count).toBe(0);
      expect(kbinfo.macros_size).toBe(0);
    });
  });

  describe('getKeyMap', () => {
    it('should retrieve keymap for all layers', async () => {
      const kbinfo = createTestKeyboardInfo();
      kbinfo.rows = 2;
      kbinfo.cols = 2;

      await vialService.getKeyMap(kbinfo);

      expect(kbinfo.keymap).toHaveLength(4); // 4 layers
      expect(kbinfo.keymap?.[0]).toHaveLength(4); // 2x2 = 4 keys per layer
      expect(kbinfo.keymap?.[0][0]).toBe(0); // First key (numeric keycode)
    });

    it('should throw error if layer count is not available', async () => {
      const kbinfo = createTestKeyboardInfo();
      mockUSB.send.mockImplementation((cmd: number) => {
        if (cmd === 0x11) { // Layer count
          return Promise.resolve(undefined);
        }
        return Promise.resolve(new Uint8Array(32));
      });

      await expect(vialService.getKeyMap(kbinfo)).rejects.toThrow('Failed to get layer count');
    });

    it('should handle empty keymap', async () => {
      const kbinfo = createTestKeyboardInfo();
      kbinfo.rows = 0;
      kbinfo.cols = 0;
      mockUSB.send.mockImplementation((cmd: number, args: number[], options?: any) => {
        if (cmd === 0x11) { // Layer count
          if (options?.uint8 && options?.index === 1) {
            return Promise.resolve(1);
          }
        }
        return Promise.resolve(new Uint8Array(32));
      });

      await vialService.getKeyMap(kbinfo);

      expect(kbinfo.keymap).toHaveLength(1);
      expect(kbinfo.keymap?.[0]).toHaveLength(0);
    });

    it('should throw error if getViaBuffer returns non-array', async () => {
      const kbinfo = createTestKeyboardInfo();
      // Mock getViaBuffer to return something that is not an array (though typing says it should be)
      mockUSB.getViaBuffer.mockResolvedValue(new Uint8Array(0) as any);

      await expect(vialService.getKeyMap(kbinfo)).rejects.toThrow('Expected array of keycodes from getViaBuffer');
    });
  });

  describe('load', () => {
    it('should load complete keyboard information', async () => {
      const kbinfo = createTestKeyboardInfo();
      kbinfo.rows = 2;
      kbinfo.cols = 2;

      const result = await vialService.load(kbinfo);

      expect(result).toBe(kbinfo);
      expect(kbinfo.via_proto).toBe(0x0C);
      expect(kbinfo.viable_proto).toBe(6);
      expect(kbinfo.kbid).toBe('1234567890abcdef');
      expect(kbinfo.macro_count).toBe(2);
      expect(kbinfo.keymap).toHaveLength(4);
    });

    it('should process kle payload if present', async () => {
      const kbinfo = createTestKeyboardInfo();
      kbinfo.payload = {
        layouts: {
          keymap: []
        },
        matrix: { rows: 2, cols: 2 },
        customKeycodes: []
      } as any;

      const mockDeserialize = vi.fn().mockReturnValue({});
      // Access the private kle service (since it's instantiated in constructor)
      // Note: Since we mocked the module, the instance method should be mockable via the prototype or if checking call
      // Better: we can mock implementation of the kle instance attached to vialService
      (vialService as any).kle.deserializeToKeylayout = mockDeserialize;

      // Mock getKeyboardInfo to prevent it from overwriting our payload
      vi.spyOn(vialService, 'getKeyboardInfo').mockResolvedValue(kbinfo);

      await vialService.load(kbinfo);
      expect(mockDeserialize).toHaveBeenCalled();
      expect((kbinfo as any).keylayout).toBeDefined();
    });

    it('should catch error during kle deserialization', async () => {
      const kbinfo = createTestKeyboardInfo();
      kbinfo.payload = {
        layouts: {
          keymap: []
        },
        matrix: { rows: 2, cols: 2 },
        customKeycodes: []
      } as any;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
      const mockDeserialize = vi.fn().mockImplementation(() => { throw new Error('KLE fail'); });
      (vialService as any).kle.deserializeToKeylayout = mockDeserialize;

      // Mock getKeyboardInfo to prevent it from overwriting our payload
      vi.spyOn(vialService, 'getKeyboardInfo').mockResolvedValue(kbinfo);

      await vialService.load(kbinfo);

      expect(mockDeserialize).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to deserialize keylayout:', expect.any(Error));
    });

    it('should detect WebHID support', () => {
      // Should be true by default due to setup.ts
      expect(VialService.isWebHIDSupported()).toBe(true);

      // Test false case by temporarily removing hid
      const originalHid = (global as any).navigator.hid;
      delete (global as any).navigator.hid;

      try {
        expect(VialService.isWebHIDSupported()).toBe(false);
      } finally {
        (global as any).navigator.hid = originalHid;
      }
    });

    it('should handle errors during load gracefully', async () => {
      const kbinfo = createTestKeyboardInfo();
      mockUSB.sendViable.mockRejectedValue(new Error('Load failed'));

      await expect(vialService.load(kbinfo)).rejects.toThrow('Load failed');
    });

    it('should detect and pull Svalboard features', async () => {
      const kbinfo = createTestKeyboardInfo();
      vi.mocked(svalService.check).mockResolvedValue(true);

      await vialService.load(kbinfo);

      expect(svalService.check).toHaveBeenCalledWith(kbinfo);
      expect(svalService.pull).toHaveBeenCalledWith(kbinfo);
    });
  });

  describe('pollMatrix', () => {
    it('should return matrix state as boolean array', async () => {
      const kbinfo = createTestKeyboardInfo();
      kbinfo.rows = 2;
      kbinfo.cols = 8;

      const matrix = await vialService.pollMatrix(kbinfo);

      expect(matrix).toHaveLength(2);
      expect(matrix[0]).toEqual([true, false, true, false, false, false, false, false]);
      expect(matrix[1]).toEqual([false, false, false, false, false, false, false, false]);
    });

    it('should handle larger matrices', async () => {
      const kbinfo = createTestKeyboardInfo();
      kbinfo.rows = 4;
      kbinfo.cols = 16;

      mockUSB.send.mockImplementation(() => {
        const response = new Uint8Array(32);
        response[0] = 0x02; // CMD_VIA_GET_KEYBOARD_VALUE
        response[1] = 0x03; // VIA_SWITCH_MATRIX_STATE
        response[2] = 0x00; // Offset byte
        // Each row needs 2 bytes for 16 columns (data starts at index 3)
        // Reverse byte order: cols 8-15 come FIRST in the protocol row, cols 0-7 SECOND
        response[3] = 0x00; // Row 0, cols 8-15
        response[4] = 0xFF; // Row 0, cols 0-7
        response[5] = 0xFF; // Row 1, cols 8-15
        response[6] = 0x00; // Row 1, cols 0-7
        response[7] = 0x55; // Row 2, cols 8-15
        response[8] = 0xAA; // Row 2, cols 0-7
        response[9] = 0x00; // Row 3, cols 8-15
        response[10] = 0x00; // Row 3, cols 0-7
        return Promise.resolve(response);
      });

      const matrix = await vialService.pollMatrix(kbinfo);

      expect(matrix).toHaveLength(4);
      expect(matrix[0][0]).toBe(true);  // First bit of 0xFF
      expect(matrix[1][8]).toBe(true);  // First bit of second byte (0xFF)
      expect(matrix[2][1]).toBe(true); // Second bit of 0xAA (10101010)
    });

    it('should handle response data shorter than expected', async () => {
      const kbinfo = createTestKeyboardInfo();
      kbinfo.rows = 4;
      kbinfo.cols = 8;
      // 4 rows * 1 byte/row = 4 bytes needed. Offset 3. Total 7 bytes.
      mockUSB.send.mockResolvedValue(new Uint8Array([0x02, 0x03, 0x00, 0xFF, 0x00])); // Only 2 rows worth

      const matrix = await vialService.pollMatrix(kbinfo);
      expect(matrix).toHaveLength(2); // Should break early
    });

    it('should handle mismatched command echo in matrix response', async () => {
      const kbinfo = createTestKeyboardInfo();
      kbinfo.rows = 2;
      kbinfo.cols = 8;
      // If echo doesn't match, offset remains 0
      mockUSB.send.mockResolvedValue(new Uint8Array([0x00, 0x00, 0x00, 0xFF, 0xAA]));
      const matrix = await vialService.pollMatrix(kbinfo);
      expect(matrix).toHaveLength(2);
      expect(matrix[0][0]).toBe(false); // 0x00
    });
  });

  describe('updateKey', () => {
    it('should update a key at specific position', async () => {
      await vialService.updateKey(0, 1, 2, 0x0004);

      expect(mockUSB.send).toHaveBeenCalledWith(
        0x05, // CMD_VIA_SET_KEYCODE
        [0, 1, 2, 0, 4], // layer, row, col, BE16(keymask)
        {} // options
      );
    });

    it('should encode keymask as big endian', async () => {
      await vialService.updateKey(2, 3, 7, 0x1234);

      expect(mockUSB.send).toHaveBeenCalledWith(
        0x05,
        [2, 3, 7, 0x12, 0x34], // 0x1234 in big endian
        {} // options
      );
    });

    it('should handle USB disconnection during update', async () => {
      mockUSB.send.mockRejectedValue(new Error('USB disconnected'));

      await expect(vialService.updateKey(0, 0, 0, 0x0004)).rejects.toThrow('USB disconnected');
    });
  });

  describe('USB disconnection scenarios', () => {
    it('should handle disconnection during keymap loading', async () => {
      const kbinfo = createTestKeyboardInfo();
      mockUSB.getViaBuffer.mockRejectedValue(new Error('USB disconnected'));

      await expect(vialService.getKeyMap(kbinfo)).rejects.toThrow('USB disconnected');
    });

    it('should handle permission denied errors', async () => {
      const kbinfo = createTestKeyboardInfo();
      mockUSB.send.mockRejectedValue(new DOMException('Permission denied'));

      await expect(vialService.getKeyboardInfo(kbinfo)).rejects.toThrow('Permission denied');
    });
  });

  describe('LZMA decompression error handling', () => {
    it('should handle js-lzma decompression error', async () => {
      // Mock to throw error during decompression
      vi.mocked(LZMA.decompressFile).mockImplementationOnce(() => {
        throw new Error('LZMA decompression failed');
      });

      const kbinfo = createTestKeyboardInfo();

      // Mock sendVial to return proper responses for getting keyboard info
      mockUSB.sendVial.mockImplementation((cmd: number, _args: number[], options?: any) => {
        if (cmd === 0x01) { // Get size
          if (options?.uint32 && options?.index === 0) {
            return Promise.resolve(100);
          }
        }
        if (cmd === 0x02) { // Get definition - this will trigger XZ decompression
          if (options?.uint8) {
            // Return XZ compressed data
            const data = new Uint8Array(32);
            data[0] = 0xFD; // XZ magic bytes
            data[1] = 0x37;
            data[2] = 0x7A;
            data[3] = 0x58;
            data[4] = 0x5A;
            return Promise.resolve(data);
          }
        }
        return Promise.resolve(new Uint8Array(32));
      });

      // The getKeyboardInfo method internally calls methods that use LZMA decompression
      await expect(vialService.getKeyboardInfo(kbinfo)).rejects.toThrow('LZMA decompression failed');
    });
  });

  describe('update methods', () => {
    it('should delegate updateMacros to macro service', async () => {
      const kbinfo = createTestKeyboardInfo();
      // Spy on the private macro service
      const spy = vi.spyOn((vialService as any).macro, 'push').mockResolvedValue(undefined);

      await vialService.updateMacros(kbinfo);
      expect(spy).toHaveBeenCalledWith(kbinfo);
    });

    it('should delegate updateTapdance to tapdance service', async () => {
      const kbinfo = createTestKeyboardInfo();
      const spy = vi.spyOn((vialService as any).tapdance, 'push').mockResolvedValue(undefined);

      await vialService.updateTapdance(kbinfo, 1);
      expect(spy).toHaveBeenCalledWith(kbinfo, 1);
    });

    it('should delegate updateCombo to combo service', async () => {
      const kbinfo = createTestKeyboardInfo();
      const spy = vi.spyOn((vialService as any).combo, 'push').mockResolvedValue(undefined);

      await vialService.updateCombo(kbinfo, 2);
      expect(spy).toHaveBeenCalledWith(kbinfo, 2);
    });

    it('should delegate updateKeyoverride to override service', async () => {
      const kbinfo = createTestKeyboardInfo();
      const spy = vi.spyOn((vialService as any).override, 'push').mockResolvedValue(undefined);

      await vialService.updateKeyoverride(kbinfo, 3);
      expect(spy).toHaveBeenCalledWith(kbinfo, 3);
    });

    it('should delegate updateQMKSetting to qmk service', async () => {
      const kbinfo = createTestKeyboardInfo();
      const spy = vi.spyOn((vialService as any).qmk, 'push').mockResolvedValue(undefined);

      await vialService.updateQMKSetting(kbinfo, 4);
      expect(spy).toHaveBeenCalledWith(kbinfo, 4);
    });
  });

  describe('isLayerEmpty', () => {
    it('should return true for empty layers (0, -1, 255)', () => {
      expect(vialService.isLayerEmpty([0, 0, 0])).toBe(true);
      expect(vialService.isLayerEmpty([-1, -1])).toBe(true);
      expect(vialService.isLayerEmpty([255, 255])).toBe(true);
      expect(vialService.isLayerEmpty([0, -1, 255])).toBe(true);
    });

    it('should return false if any key is defined', () => {
      expect(vialService.isLayerEmpty([0, 4, 0])).toBe(false);
      expect(vialService.isLayerEmpty([65, -1])).toBe(false);
    });

    it('should return true for empty array', () => {
      expect(vialService.isLayerEmpty([])).toBe(true);
    });

    it('should return true for layer with only 255s or 0s', () => {
      expect(vialService.isLayerEmpty([255, 255, 0, 0, -1])).toBe(true);
      expect(vialService.isLayerEmpty([255, 1, 0])).toBe(false);
    });
  });

  describe('One-shot settings', () => {
    it('should retrieve one-shot settings', async () => {
      const kbinfo = createTestKeyboardInfo();
      mockUSB.sendViable.mockImplementation((cmd: number) => {
        if (cmd === 0x09) { // CMD_VIABLE_ONE_SHOT_GET
          const response = new Uint8Array(4);
          response[0] = 0x09; // cmd_echo
          response[1] = 0x2C; // timeout low (300 = 0x012C)
          response[2] = 0x01; // timeout high
          response[3] = 0x01; // tap_toggle
          return Promise.resolve(response);
        }
        return Promise.resolve(new Uint8Array(32));
      });

      await vialService.getOneShot(kbinfo);
      expect(kbinfo.one_shot).toEqual({
        timeout: 300,
        tap_toggle: 1
      });
    });

    it('should update one-shot settings', async () => {
      const kbinfo = createTestKeyboardInfo();
      kbinfo.one_shot = { timeout: 300, tap_toggle: 1 };

      await vialService.updateOneShot(kbinfo);
      expect(mockUSB.sendViable).toHaveBeenCalledWith(
        0x0a, // CMD_VIABLE_ONE_SHOT_SET
        [0x2c, 0x01, 0x01],
        {}
      );
    });
  });

  describe('Alt Repeat Keys', () => {
    it('should retrieve alt repeat keys', async () => {
      const kbinfo = createTestKeyboardInfo();
      kbinfo.alt_repeat_key_count = 1;
      mockUSB.sendViable.mockImplementation((cmd: number) => {
        if (cmd === 0x07) { // CMD_VIABLE_ALT_REPEAT_KEY_GET
          const response = new Uint8Array(8);
          response[0] = 0x07; // cmd_echo
          response[1] = 0x00; // index
          response[2] = 0x04; // keycode A low
          response[3] = 0x00; // keycode A high
          response[4] = 0x05; // alt_keycode B low
          response[5] = 0x00; // alt_keycode B high
          response[6] = 0x01; // allowed_mods
          response[7] = 0x00; // options
          return Promise.resolve(response);
        }
        return Promise.resolve(new Uint8Array(32));
      });

      await vialService.getAltRepeatKeys(kbinfo);
      expect(kbinfo.alt_repeat_keys).toHaveLength(1);
      expect(kbinfo.alt_repeat_keys![0].keycode).toBe('KC_4');
    });

    it('should skip if count is 0', async () => {
      const kbinfo = createTestKeyboardInfo();
      kbinfo.alt_repeat_key_count = 0;
      await vialService.getAltRepeatKeys(kbinfo);
      expect(kbinfo.alt_repeat_keys).toBeUndefined();
    });
  });

  describe('Leader sequences', () => {
    it('should retrieve leader sequences', async () => {
      const kbinfo = createTestKeyboardInfo();
      kbinfo.leader_count = 1;
      mockUSB.sendViable.mockImplementation((cmd: number) => {
        if (cmd === 0x14) { // CMD_VIABLE_LEADER_GET is 0x14
          const response = new Uint8Array(20);
          response[0] = 0x14; // cmd_echo
          response[1] = 0x00; // index
          const dv = new DataView(response.buffer);
          dv.setUint16(2, 0x04, true); // KC_A
          dv.setUint16(4, 0x00, true); // seq1 empty
          dv.setUint16(12, 0x05, true); // output KC_B
          dv.setUint16(14, 0x0001, true); // options
          return Promise.resolve(response);
        }
        return Promise.resolve(new Uint8Array(32));
      });

      await vialService.getLeaders(kbinfo);
      expect(kbinfo.leaders).toHaveLength(1);
      expect(kbinfo.leaders![0].sequence).toEqual(['KC_4']);
      expect(kbinfo.leaders![0].output).toBe('KC_5');
    });

    it('should skip if count is 0', async () => {
      const kbinfo = createTestKeyboardInfo();
      kbinfo.leader_count = 0;
      await vialService.getLeaders(kbinfo);
      expect(kbinfo.leaders).toBeUndefined();
    });
  });

  describe('Layer state', () => {
    it('should retrieve layer state mask', async () => {
      mockUSB.sendViable.mockImplementation((cmd: number, args: any, options: any) => {
        if (cmd === 0x16 && options?.uint32) { // CMD_VIABLE_LAYER_STATE_GET is 0x16
          return Promise.resolve(0x0000000F); // Layers 0,1,2,3 active
        }
        return Promise.resolve(0);
      });

      const mask = await vialService.getLayerStateMask();
      expect(mask).toBe(0x0F);
    });

    it('should determine active layer index from mask', () => {
      expect(vialService.getActiveLayerIndexFromMask(0x00000001)).toBe(0);
      expect(vialService.getActiveLayerIndexFromMask(0x00000002)).toBe(1);
      expect(vialService.getActiveLayerIndexFromMask(0x00000008)).toBe(3);
      expect(vialService.getActiveLayerIndexFromMask(0x80000000)).toBe(31);
      expect(vialService.getActiveLayerIndexFromMask(0)).toBe(0);
    });

    it('should retrieve active layer index', async () => {
      vi.spyOn(vialService, 'getLayerStateMask').mockResolvedValue(0x04); // Layer 2 active
      const index = await vialService.getActiveLayerIndex();
      expect(index).toBe(2);
    });
  });

  describe('Alt Repeat Key', () => {
    it('should update alt repeat key entry', async () => {
      const kbinfo = createTestKeyboardInfo();
      kbinfo.alt_repeat_keys = [{
        arkid: 0,
        keycode: 'KC_A',
        alt_keycode: 'KC_B',
        allowed_mods: 0x01,
        options: 0
      }];

      await vialService.updateAltRepeatKey(kbinfo, 0);
      expect(mockUSB.sendViable).toHaveBeenCalledWith(
        0x08, // CMD_VIABLE_ALT_REPEAT_KEY_SET
        expect.any(Array),
        {}
      );
    });
  });

  describe('Leader sequences', () => {
    it('should update leader entry', async () => {
      const kbinfo = createTestKeyboardInfo();
      kbinfo.leaders = [{
        ldrid: 0,
        sequence: ['KC_A', 'KC_B'],
        output: 'KC_C',
        options: 1
      }];

      await vialService.updateLeader(kbinfo, 0);

      expect(mockUSB.sendViable).toHaveBeenCalledWith(
        0x15, // CMD_VIABLE_LEADER_SET is 0x15
        expect.any(Array),
        {}
      );
    });
  });

  describe('Utility methods', () => {
    it('should provide access to child services', () => {
      expect(vialService.getFragmentService()).toBeDefined();
      expect(vialService.getFragmentComposer()).toBeDefined();
    });

    it('should save and reset via USB', async () => {
      await vialService.saveViable();
      expect(mockUSB.sendViable).toHaveBeenCalledWith(0x0b, [], {});

      await vialService.resetViable();
      expect(mockUSB.sendViable).toHaveBeenCalledWith(0x0c, [], {});
    });

    it('should update fragment selection', async () => {
      const kbinfo = createTestKeyboardInfo();
      const spy = vi.spyOn((vialService as any).fragment, 'setSelection').mockResolvedValue(true);

      const result = await vialService.updateFragmentSelection(kbinfo, 1, 2);
      expect(result).toBe(true);
      expect(spy).toHaveBeenCalledWith(kbinfo, 1, 2);
    });
  });
});
