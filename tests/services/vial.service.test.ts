import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ViableService } from '../../src/services/vial.service';
import { ViableUSB } from '../../src/services/usb.service';
import { createTestKeyboardInfo } from '../fixtures/keyboard-info.fixture';
import { keyService } from '../../src/services/key.service';
import LZMA from 'js-lzma';

vi.mock('../../src/services/key.service', () => ({
  keyService: {
    stringify: vi.fn((keycode: number) => `KC_${keycode.toString(16).toUpperCase()}`),
    parse: vi.fn((keystr: string) => parseInt(keystr.replace('KC_', ''), 16)),
    generateAllKeycodes: vi.fn()
  }
}));

vi.mock('js-lzma', () => ({
  default: {
    decompressFile: vi.fn()
  }
}));

const defaultPayload = {
  name: 'Test Keyboard',
  matrix: { rows: 2, cols: 3 },
  customKeycodes: [],
  viable: {
    tap_dance: 0,
    combo: 0,
    key_override: 0,
    alt_repeat_key: 0,
    leader: 0
  }
};

describe('ViableService', () => {
  let viableService: ViableService;
  let mockUSB: any;
  let definitionBytes: Uint8Array;

  beforeEach(() => {
    vi.clearAllMocks();

    definitionBytes = new Uint8Array(Array.from({ length: 32 }, (_, i) => i));

    vi.mocked(LZMA.decompressFile).mockImplementation((_inStream: any, outStream: any) => {
      const bytes = new TextEncoder().encode(JSON.stringify(defaultPayload));
      for (const b of bytes) {
        outStream.writeByte(b);
      }
    });

    mockUSB = {
      send: vi.fn(),
      sendViable: vi.fn(),
      getViaBuffer: vi.fn(),
      pushViaBuffer: vi.fn(),
      open: vi.fn().mockResolvedValue(true),
      close: vi.fn().mockResolvedValue(undefined),
      getDeviceName: vi.fn().mockReturnValue('Mock Device')
    };

    mockUSB.send.mockImplementation((cmd: number, _args: number[], options?: any) => {
      if (cmd === ViableUSB.CMD_VIA_GET_PROTOCOL_VERSION && options?.unpack === 'B>H' && options?.index === 1) {
        return Promise.resolve(0x0c);
      }
      if (cmd === ViableUSB.CMD_VIA_GET_LAYER_COUNT && options?.uint8 && options?.index === 1) {
        return Promise.resolve(2);
      }
      if (cmd === ViableUSB.CMD_VIA_MACRO_GET_COUNT && options?.uint8 && options?.index === 1) {
        return Promise.resolve(0);
      }
      if (cmd === ViableUSB.CMD_VIA_MACRO_GET_BUFFER_SIZE && options?.unpack === 'B>H' && options?.index === 1) {
        return Promise.resolve(0);
      }
      if (cmd === ViableUSB.CMD_VIA_GET_KEYBOARD_VALUE) {
        const response = new Uint8Array(32);
        response[0] = ViableUSB.CMD_VIA_GET_KEYBOARD_VALUE;
        response[1] = ViableUSB.VIA_SWITCH_MATRIX_STATE;
        response[3] = 0b00000101; // row 0
        response[4] = 0b00000000; // row 1
        return Promise.resolve(response);
      }
      return Promise.resolve(new Uint8Array(32));
    });

    mockUSB.sendViable.mockImplementation((cmd: number, args: number[]) => {
      if (cmd === ViableUSB.CMD_VIABLE_GET_INFO) {
        return Promise.resolve(
          new Uint8Array([
            ViableUSB.CMD_VIABLE_GET_INFO,
            0x06, 0x00, 0x00, 0x00, // protocol version
            0xef, 0xcd, 0xab, 0x90, 0x78, 0x56, 0x34, 0x12, // uid LE
            0x00 // feature flags
          ])
        );
      }

      if (cmd === ViableUSB.CMD_VIABLE_DEFINITION_SIZE) {
        return Promise.resolve(definitionBytes.length);
      }

      if (cmd === ViableUSB.CMD_VIABLE_DEFINITION_CHUNK) {
        const offset = (args[0] || 0) | ((args[1] || 0) << 8);
        const requestedSize = args[2] || 0;
        const chunk = definitionBytes.slice(offset, offset + requestedSize);
        return Promise.resolve(
          new Uint8Array([
            ViableUSB.CMD_VIABLE_DEFINITION_CHUNK,
            args[0] || 0,
            args[1] || 0,
            chunk.length,
            ...chunk
          ])
        );
      }

      return Promise.resolve(new Uint8Array(32));
    });

    mockUSB.getViaBuffer.mockImplementation((cmd: number, size: number, options?: any) => {
      if (cmd === ViableUSB.CMD_VIA_KEYMAP_GET_BUFFER && options?.uint16) {
        return Promise.resolve(Array.from({ length: size / 2 }, (_, i) => i));
      }
      return Promise.resolve(new Uint8Array(size));
    });

    viableService = new ViableService(mockUSB);
  });

  describe('init', () => {
    it('should initialize without errors', async () => {
      const kbinfo = createTestKeyboardInfo();
      await expect(viableService.init(kbinfo)).resolves.toBeUndefined();
    });
  });

  describe('getKeyboardInfo', () => {
    it('should retrieve protocol, id, and matrix from viable definition', async () => {
      const kbinfo = createTestKeyboardInfo();

      await viableService.getKeyboardInfo(kbinfo);

      expect(kbinfo.via_proto).toBe(0x0c);
      expect(kbinfo.viable_proto).toBe(6);
      expect(kbinfo.kbid).toBe('1234567890abcdef');
      expect(kbinfo.rows).toBe(2);
      expect(kbinfo.cols).toBe(3);
      expect(kbinfo.name).toBe('Test Keyboard');
    });

    it('should handle USB disconnection during info retrieval', async () => {
      const kbinfo = createTestKeyboardInfo();
      mockUSB.send.mockRejectedValue(new Error('USB disconnected'));

      await expect(viableService.getKeyboardInfo(kbinfo)).rejects.toThrow('USB disconnected');
    });
  });

  describe('getFeatures', () => {
    it('should retrieve macro count and buffer size', async () => {
      const kbinfo = createTestKeyboardInfo();

      mockUSB.send.mockImplementation((cmd: number, _args: number[], options?: any) => {
        if (cmd === ViableUSB.CMD_VIA_MACRO_GET_COUNT && options?.uint8 && options?.index === 1) {
          return Promise.resolve(2);
        }
        if (cmd === ViableUSB.CMD_VIA_MACRO_GET_BUFFER_SIZE && options?.unpack === 'B>H' && options?.index === 1) {
          return Promise.resolve(256);
        }
        return Promise.resolve(new Uint8Array(32));
      });

      await viableService.getFeatures(kbinfo);

      expect(kbinfo.macro_count).toBe(2);
      expect(kbinfo.macros_size).toBe(256);
    });
  });

  describe('getKeyMap', () => {
    it('should retrieve keymap for all layers', async () => {
      const kbinfo = createTestKeyboardInfo({ rows: 2, cols: 2 });

      await viableService.getKeyMap(kbinfo);

      expect(kbinfo.keymap).toHaveLength(2);
      expect(kbinfo.keymap?.[0]).toEqual([0, 1, 2, 3]);
      expect(kbinfo.keymap?.[1]).toEqual([4, 5, 6, 7]);
    });

    it('should throw error if layer count is not available', async () => {
      const kbinfo = createTestKeyboardInfo({ rows: 2, cols: 2 });

      mockUSB.send.mockImplementation((cmd: number, _args: number[], options?: any) => {
        if (cmd === ViableUSB.CMD_VIA_GET_LAYER_COUNT && options?.uint8 && options?.index === 1) {
          return Promise.resolve(undefined);
        }
        return Promise.resolve(new Uint8Array(32));
      });

      await expect(viableService.getKeyMap(kbinfo)).rejects.toThrow('Failed to get layer count');
    });
  });

  describe('load', () => {
    it('should load complete keyboard information', async () => {
      const kbinfo = createTestKeyboardInfo();

      const result = await viableService.load(kbinfo);

      expect(result).toBe(kbinfo);
      expect(kbinfo.via_proto).toBe(0x0c);
      expect(kbinfo.viable_proto).toBe(6);
      expect(kbinfo.kbid).toBe('1234567890abcdef');
      expect(kbinfo.keymap).toHaveLength(2);
      expect(keyService.generateAllKeycodes).toHaveBeenCalledWith(kbinfo);
    });

    it('should propagate load errors', async () => {
      const kbinfo = createTestKeyboardInfo();
      mockUSB.sendViable.mockRejectedValue(new Error('Load failed'));

      await expect(viableService.load(kbinfo)).rejects.toThrow('Load failed');
    });
  });

  describe('pollMatrix', () => {
    it('should return matrix state as boolean array', async () => {
      const kbinfo = createTestKeyboardInfo({ rows: 2, cols: 8 });

      const matrix = await viableService.pollMatrix(kbinfo);

      expect(matrix).toHaveLength(2);
      expect(matrix[0]).toEqual([true, false, true, false, false, false, false, false]);
      expect(matrix[1]).toEqual([false, false, false, false, false, false, false, false]);
    });

    it('should handle larger matrices with row byte-order mapping', async () => {
      const kbinfo = createTestKeyboardInfo({ rows: 4, cols: 16 });

      mockUSB.send.mockImplementation((cmd: number) => {
        if (cmd !== ViableUSB.CMD_VIA_GET_KEYBOARD_VALUE) {
          return Promise.resolve(new Uint8Array(32));
        }

        const response = new Uint8Array(32);
        response[0] = ViableUSB.CMD_VIA_GET_KEYBOARD_VALUE;
        response[1] = ViableUSB.VIA_SWITCH_MATRIX_STATE;

        // start at offset 3, 2 bytes per row
        response[3] = 0x00; response[4] = 0x01; // row 0 => col 0 true
        response[5] = 0x01; response[6] = 0x00; // row 1 => col 8 true
        response[7] = 0x00; response[8] = 0x02; // row 2 => col 1 true
        response[9] = 0x00; response[10] = 0x00; // row 3 => none

        return Promise.resolve(response);
      });

      const matrix = await viableService.pollMatrix(kbinfo);

      expect(matrix).toHaveLength(4);
      expect(matrix[0][0]).toBe(true);
      expect(matrix[1][8]).toBe(true);
      expect(matrix[2][1]).toBe(true);
    });
  });

  describe('updateKey', () => {
    it('should update a key at specific position', async () => {
      await viableService.updateKey(0, 1, 2, 0x0004);

      expect(mockUSB.send).toHaveBeenCalledWith(
        ViableUSB.CMD_VIA_SET_KEYCODE,
        [0, 1, 2, 0, 4],
        {}
      );
    });

    it('should encode keymask as big endian', async () => {
      await viableService.updateKey(2, 3, 7, 0x1234);

      expect(mockUSB.send).toHaveBeenCalledWith(
        ViableUSB.CMD_VIA_SET_KEYCODE,
        [2, 3, 7, 0x12, 0x34],
        {}
      );
    });

    it('should handle USB disconnection during update', async () => {
      mockUSB.send.mockRejectedValue(new Error('USB disconnected'));

      await expect(viableService.updateKey(0, 0, 0, 0x0004)).rejects.toThrow('USB disconnected');
    });
  });

  describe('LZMA decompression error handling', () => {
    it('should surface js-lzma decompression errors', async () => {
      vi.mocked(LZMA.decompressFile).mockImplementationOnce(() => {
        throw new Error('LZMA decompression failed');
      });

      const kbinfo = createTestKeyboardInfo();

      await expect(viableService.getKeyboardInfo(kbinfo)).rejects.toThrow('LZMA decompression failed');
    });
  });
});
