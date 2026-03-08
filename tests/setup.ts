import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock WebHID API globally
export const createMockHIDDevice = () => ({
  productId: 0x1234,
  vendorId: 0x5678,
  productName: 'Test Keyboard',
  opened: false,
  collections: [{
    usage: 0x61,
    usagePage: 0xff60,
    inputReports: [],
    outputReports: [],
    featureReports: []
  }],
  open: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  sendReport: vi.fn().mockResolvedValue(undefined),
  sendFeatureReport: vi.fn().mockResolvedValue(undefined),
  receiveFeatureReport: vi.fn().mockResolvedValue(new DataView(new ArrayBuffer(32))),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn().mockReturnValue(true),
  oninputreport: null
});

// Setup global navigator.hid mock
Object.defineProperty(global.navigator, 'hid', {
  value: {
    requestDevice: vi.fn(),
    getDevices: vi.fn().mockResolvedValue([]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
  configurable: true
});

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  // Reset the mock implementations to defaults
  const hid = global.navigator.hid as any;
  hid.getDevices.mockResolvedValue([]);
  hid.requestDevice.mockResolvedValue([createMockHIDDevice()]);
});

// Suppress expected console warnings during tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  console.warn = (...args: any[]) => {
    // Suppress WebHID-related warnings during tests
    if (args[0]?.includes?.('WebHID') || args[0]?.includes?.('USB')) {
      return;
    }
    originalConsoleWarn(...args);
  };

  console.error = (...args: any[]) => {
    // Suppress expected errors during tests
    if (args[0]?.includes?.('Failed to connect') ||
        args[0]?.includes?.('USB device not connected')) {
      return;
    }
    originalConsoleError(...args);
  };
});

afterAll(() => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Export types for TypeScript support
declare global {
  interface Navigator {
    hid: {
      requestDevice: ReturnType<typeof vi.fn>;
      getDevices: ReturnType<typeof vi.fn>;
      addEventListener: ReturnType<typeof vi.fn>;
      removeEventListener: ReturnType<typeof vi.fn>;
    };
  }
}

export {};