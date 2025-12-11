// iOS Device Definitions for App Store Screenshots
// Dimensions are the required screenshot sizes for App Store Connect

export const devices = {
  // iPhone 16 Pro Max - 6.9" display (newest requirement)
  'iphone-6.9': {
    name: 'iPhone 16 Pro Max',
    width: 1320,
    height: 2868,
    displaySize: '6.9"',
    frame: {
      borderRadius: 150,
      padding: 28,
      notch: { type: 'dynamic-island', width: 220, height: 64 }
    }
  },

  // iPhone 15 Pro Max - 6.7" display
  'iphone-6.7': {
    name: 'iPhone 15 Pro Max',
    width: 1290,
    height: 2796,
    displaySize: '6.7"',
    frame: {
      borderRadius: 146,
      padding: 27,
      notch: { type: 'dynamic-island', width: 216, height: 63 }
    }
  },

  // iPhone 14 Pro Max - 6.5" display
  'iphone-6.5': {
    name: 'iPhone 14 Pro Max',
    width: 1284,
    height: 2778,
    displaySize: '6.5"',
    frame: {
      borderRadius: 144,
      padding: 26,
      notch: { type: 'dynamic-island', width: 210, height: 62 }
    }
  },

  // iPhone 8 Plus - 5.5" display (still required for older device support)
  'iphone-5.5': {
    name: 'iPhone 8 Plus',
    width: 1242,
    height: 2208,
    displaySize: '5.5"',
    frame: {
      borderRadius: 100,
      padding: 24,
      notch: null // No notch on iPhone 8 Plus
    }
  }
};

// Default device to use if none specified
export const defaultDevice = 'iphone-6.5';

// Get all device keys
export const deviceList = Object.keys(devices);

// Get device by key, with fallback
export function getDevice(key) {
  return devices[key] || devices[defaultDevice];
}
