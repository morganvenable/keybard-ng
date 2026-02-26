import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { QMKService } from '../../src/services/qmk.service';
import { createMockUSB, type MockUSBControl } from '../mocks/usb.mock';
import { createTestKeyboardInfo } from '../fixtures/keyboard-info.fixture';
import type { ViableUSB } from '../../src/services/usb.service';

// Mock the QMK settings constants
vi.mock('../../src/constants/qmk-settings', () => ({
  QMK_SETTINGS: {
    tabs: [
      {
        name: 'General',
        fields: [
          { qsid: 1, width: 1, type: 'boolean', title: 'NKRO' },
          { qsid: 2, width: 2, type: 'integer', title: 'Tapping Term' },
          { qsid: 3, width: 1, type: 'boolean', title: 'Permissive Hold' }
        ]
      },
      {
        name: 'RGB',
        fields: [
          { qsid: 4, width: 1, type: 'integer', title: 'RGB Mode' },
          { qsid: 5, width: 4, type: 'integer', title: 'RGB Speed' }
        ]
      }
    ]
  }
}));

// Create a properly typed mock interface
interface MockViableUSB extends ViableUSB {
  sendViable: Mock;
}

describe('QMKService', () => {
  let qmkService: QMKService;
  let mockUSB: MockViableUSB;
  let usbControl: MockUSBControl;

  beforeEach(() => {
    const { mock, control } = createMockUSB();
    mockUSB = mock as MockViableUSB;
    usbControl = control;
    qmkService = new QMKService(mockUSB);

    // Mock sendViable for QMK settings
    mockUSB.sendViable = vi.fn();
  });

  describe('get', () => {
    it('should retrieve supported QMK settings', async () => {
      // Arrange
      const kbinfo = createTestKeyboardInfo();
      usbControl.setConnected(true);

      // Mock sendViable to distinguish between query and get
      mockUSB.sendViable.mockImplementation((cmd: number, args: number[], options?: any) => {
        if (cmd === 0x10) { // CMD_VIABLE_QMK_SETTINGS_QUERY
          // Return QSIDs 1, 2, 3 and then terminate
          const cur = args[0] | (args[1] << 8);
          if (cur === 0) return Promise.resolve(new Uint16Array([1, 2, 3, 0xffff]));
          return Promise.resolve(new Uint16Array([0xffff]));
        }
        if (cmd === 0x11) { // CMD_VIABLE_QMK_SETTINGS_GET
          const qsid = args[0];
          if (qsid === 1) return Promise.resolve([0, 0, 1]); // byte
          if (qsid === 2) return Promise.resolve([0, 0, 200, 0]); // uint16
          if (qsid === 3) return Promise.resolve([0, 0, 0]); // byte
        }
        return Promise.resolve(undefined);
      });

      // Act
      await qmkService.get(kbinfo);

      // Assert
      expect(kbinfo.settings).toEqual({
        1: 1,
        2: 200,
        3: 0
      });
    });

    it('should handle keyboards with no QMK settings', async () => {
      // Arrange
      const kbinfo = createTestKeyboardInfo();
      usbControl.setConnected(true);

      // Mock empty query response
      mockUSB.sendViable.mockResolvedValueOnce(new Uint16Array([0xffff]));

      // Act
      await qmkService.get(kbinfo);

      // Assert
      expect(kbinfo.settings).toEqual({});
    });

    it('should handle partial QMK settings support', async () => {
      // Arrange
      const kbinfo = createTestKeyboardInfo();
      usbControl.setConnected(true);

      // Mock sendViable to distinguish between query and get
      mockUSB.sendViable.mockImplementation((cmd: number, args: number[]) => {
        if (cmd === 0x10) { // CMD_VIABLE_QMK_SETTINGS_QUERY
          const cur = args[0] | (args[1] << 8);
          if (cur === 0) return Promise.resolve(new Uint16Array([1, 4, 0xffff]));
          return Promise.resolve(new Uint16Array([0xffff]));
        }
        if (cmd === 0x11) { // CMD_VIABLE_QMK_SETTINGS_GET
          const qsid = args[0];
          if (qsid === 1) return Promise.resolve([0, 0, 1]);
          if (qsid === 4) return Promise.resolve([0, 0, 5]);
        }
        return Promise.resolve(undefined);
      });

      // Act
      await qmkService.get(kbinfo);

      // Assert
      expect(kbinfo.settings).toEqual({
        1: 1,
        4: 5
      });
      expect(kbinfo.settings![2]).toBeUndefined(); // QSID 2 not supported
      expect(kbinfo.settings![3]).toBeUndefined(); // QSID 3 not supported
    });

    it('should handle different width QMK settings correctly', async () => {
      // Arrange
      const kbinfo = createTestKeyboardInfo();
      usbControl.setConnected(true);

      // Mock sendViable to distinguish between query and get
      mockUSB.sendViable.mockImplementation((cmd: number, args: number[]) => {
        if (cmd === 0x10) { // CMD_VIABLE_QMK_SETTINGS_QUERY
          const cur = args[0] | (args[1] << 8);
          if (cur === 0) return Promise.resolve(new Uint16Array([1, 2, 3, 4, 5, 0xffff]));
          return Promise.resolve(new Uint16Array([0xffff]));
        }
        if (cmd === 0x11) { // CMD_VIABLE_QMK_SETTINGS_GET
          const qsid = args[0];
          if (qsid === 1) return Promise.resolve([0, 0, 1]);
          if (qsid === 2) return Promise.resolve([0, 0, 0x34, 0x12]);
          if (qsid === 3) return Promise.resolve([0, 0, 0]);
          if (qsid === 4) return Promise.resolve([0, 0, 10]);
          if (qsid === 5) return Promise.resolve([0, 0, 0x78, 0x56, 0x34, 0x12]);
        }
        return Promise.resolve(undefined);
      });

      // Act
      await qmkService.get(kbinfo);

      // Assert
      expect(kbinfo.settings).toEqual({
        1: 1,
        2: 0x1234,
        3: 0,
        4: 10,
        5: 0x12345678
      });
    });

    it('should handle multiple query pages', async () => {
      // Arrange
      const kbinfo = createTestKeyboardInfo();
      usbControl.setConnected(true);

      // Create array of 20 QSIDs to force pagination
      const qsids = Array.from({ length: 20 }, (_, i) => i + 1);

      // Mock sendViable with pagination
      mockUSB.sendViable.mockImplementation((cmd: number, args: number[]) => {
        if (cmd === 0x10) {
          const cur = args[0] | (args[1] << 8);
          if (cur === 0) return Promise.resolve(new Uint16Array(qsids.slice(0, 16)));
          if (cur === 16) return Promise.resolve(new Uint16Array([...qsids.slice(16), 0xffff]));
          return Promise.resolve(new Uint16Array([0xffff]));
        }
        if (cmd === 0x11) {
          return Promise.resolve([0, 0, (args[0] || 0) * 10]);
        }
        return Promise.resolve(undefined);
      });

      // Act
      await qmkService.get(kbinfo);

      // Assert
      expect(mockUSB.sendViable).toHaveBeenCalledWith(
        expect.anything(),
        [0, 0],
        expect.objectContaining({ uint16: true })
      );
      expect(mockUSB.sendViable).toHaveBeenCalledWith(
        expect.anything(),
        [16, 0],
        expect.objectContaining({ uint16: true })
      );
    });

    it('should handle USB disconnection during settings retrieval', async () => {
      // Arrange
      const kbinfo = createTestKeyboardInfo();
      usbControl.setConnected(false);

      mockUSB.sendViable.mockRejectedValue(new Error('USB device not connected'));

      // Act & Assert
      await expect(qmkService.get(kbinfo)).rejects.toThrow('USB device not connected');
    });

    it('should handle array or typed array responses', async () => {
      // Arrange
      const kbinfo = createTestKeyboardInfo();
      usbControl.setConnected(true);

      // Mock sendViable with regular array
      mockUSB.sendViable.mockImplementation((cmd: number, args: number[]) => {
        if (cmd === 0x10) {
          const cur = args[0] | (args[1] << 8);
          if (cur === 0) return Promise.resolve([1, 2, 0xffff]);
          return Promise.resolve([0xffff]);
        }
        if (cmd === 0x11) {
          if (args[0] === 1) return Promise.resolve([0, 0, 1]);
          if (args[0] === 2) return Promise.resolve([0, 0, 200, 0]);
        }
        return Promise.resolve(undefined);
      });

      // Act
      await qmkService.get(kbinfo);

      // Assert
      expect(kbinfo.settings).toBeDefined();
      expect(kbinfo.settings![1]).toBe(1);
    });
  });

  describe('push', () => {
    it('should push individual QMK setting', async () => {
      // Arrange
      const kbinfo = createTestKeyboardInfo({
        settings: { 1: 1, 2: 300, 3: 0 }
      });
      usbControl.setConnected(true);
      mockUSB.sendViable.mockResolvedValue(undefined);

      // Act - push single setting
      await qmkService.push(kbinfo, 1);

      // Assert - verify call for the specific QSID
      expect(mockUSB.sendViable).toHaveBeenCalledWith(
        0x12, // CMD_VIABLE_QMK_SETTINGS_SET
        [1, 0, 1, 0, 0, 0], // QSID 1 (LE16) + value 1 (LE32)
        {} // options
      );
    });

    it('should throw error when no settings available to push', async () => {
      // Arrange
      const kbinfo = createTestKeyboardInfo({ settings: undefined });
      usbControl.setConnected(true);

      // Act & Assert
      await expect(qmkService.push(kbinfo, 1)).rejects.toThrow('No settings available to push');
    });

    it('should handle USB disconnection during settings push', async () => {
      // Arrange
      const kbinfo = createTestKeyboardInfo({ settings: { 1: 1 } });
      usbControl.setConnected(false);

      mockUSB.sendViable.mockRejectedValue(new Error('USB device not connected'));

      // Act & Assert
      await expect(qmkService.push(kbinfo, 1)).rejects.toThrow('USB device not connected');
    });

    it('should encode values as LE32 correctly', async () => {
      // Arrange
      const kbinfo = createTestKeyboardInfo({
        settings: {
          1: 255, // Will be encoded as LE32
          2: 65535, // Will be encoded as LE32
          5: 0x12345678 // Will be encoded as LE32
        }
      });
      usbControl.setConnected(true);

      let capturedArgs: number[] | null = null;
      mockUSB.sendViable.mockImplementation((_cmd: number, args: number[]) => {
        capturedArgs = args;
        return Promise.resolve(undefined);
      });

      // Act - push QSID 5 with value 0x12345678
      await qmkService.push(kbinfo, 5);

      // Assert - LE16(5) + LE32(0x12345678)
      expect(capturedArgs).toEqual([5, 0, 0x78, 0x56, 0x34, 0x12]); // LE16 + LE32
    });
  });

  describe('Edge cases', () => {
    it('should handle malformed query responses', async () => {
      // Arrange
      const kbinfo = createTestKeyboardInfo();
      usbControl.setConnected(true);

      // Mock malformed response
      mockUSB.sendViable.mockResolvedValueOnce(undefined);

      // Act
      await qmkService.get(kbinfo);

      // Assert
      expect(kbinfo.settings).toEqual({});
    });

    it('should skip unknown QSIDs', async () => {
      // Arrange
      const kbinfo = createTestKeyboardInfo();
      usbControl.setConnected(true);

      // Mock response with QSID 999 which isn't in our mock settings
      // Mock response with QSID 999 which isn't in our mock settings
      mockUSB.sendViable.mockImplementation((cmd: number, args: number[]) => {
        if (cmd === 0x10) {
          const cur = args[0] | (args[1] << 8);
          if (cur === 0) return Promise.resolve(new Uint16Array([999, 0xffff]));
          return Promise.resolve(new Uint16Array([0xffff]));
        }
        return Promise.resolve(undefined);
      });

      // Act
      await qmkService.get(kbinfo);

      // Assert - should complete without fetching QSID 999
      expect(kbinfo.settings).toEqual({});
      expect(mockUSB.sendViable).toHaveBeenCalledTimes(2); // One found, one empty terminator
    });

    it('should handle settings with value 0', async () => {
      // Arrange
      const kbinfo = createTestKeyboardInfo();
      usbControl.setConnected(true);

      // Mock sendViable
      // Mock sendViable
      mockUSB.sendViable.mockImplementation((cmd: number, args: number[]) => {
        if (cmd === 0x10) {
          const cur = args[0] | (args[1] << 8);
          if (cur === 0) return Promise.resolve(new Uint16Array([1, 2, 0xffff]));
          return Promise.resolve(new Uint16Array([0xffff]));
        }
        if (cmd === 0x11) return Promise.resolve([0, 0, 0]);
        return Promise.resolve(undefined);
      });

      // Act
      await qmkService.get(kbinfo);

      // Assert
      expect(kbinfo.settings).toEqual({
        1: 0,
        2: 0
      });
    });
  });
});
