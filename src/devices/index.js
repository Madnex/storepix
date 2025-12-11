/**
 * Device Definitions for App Store and Play Store Screenshots
 *
 * Dimensions are the required screenshot sizes for App Store Connect and Google Play.
 * Reference: https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications
 *
 * App Store Requirements:
 * - iPhone apps: 6.9" OR 6.5" required (others auto-scale)
 * - iPad apps: 13" required (others auto-scale)
 *
 * Google Play Requirements:
 * - Phone: 9:16 portrait (min 1080x1920), 16:9 landscape (min 1920x1080)
 * - Minimum 2 screenshots, 4+ recommended for featured placement
 * - Wear OS: 1:1 aspect ratio, min 384x384, no device frames
 */

export const devices = {
  // ============================================
  // iPhone Devices
  // ============================================

  // iPhone 16 Pro Max, 16 Plus, 15 Pro Max, 15 Plus, 14 Pro Max - 6.9" display
  // REQUIRED for App Store (primary size)
  'iphone-6.9': {
    name: 'iPhone 16 Pro Max',
    width: 1320,
    height: 2868,
    displaySize: '6.9"',
    platform: 'ios',
    frame: {
      borderRadius: 150,
      padding: 28,
      notch: { type: 'dynamic-island', width: 220, height: 64 }
    }
  },

  // iPhone 15 Pro Max alternative size - 6.7" display
  'iphone-6.7': {
    name: 'iPhone 15 Pro Max',
    width: 1290,
    height: 2796,
    displaySize: '6.7"',
    platform: 'ios',
    frame: {
      borderRadius: 146,
      padding: 27,
      notch: { type: 'dynamic-island', width: 216, height: 63 }
    }
  },

  // iPhone 14 Plus, 13 Pro Max, 12 Pro Max, 11 Pro Max, XS Max, XR - 6.5" display
  // REQUIRED if 6.9" not provided
  'iphone-6.5': {
    name: 'iPhone 14 Plus',
    width: 1284,
    height: 2778,
    displaySize: '6.5"',
    platform: 'ios',
    frame: {
      borderRadius: 144,
      padding: 26,
      notch: { type: 'dynamic-island', width: 210, height: 62 }
    }
  },

  // iPhone 17 Pro, 16 Pro, 16, 15 Pro, 15, 14 Pro - 6.3" display
  // Optional - scales from 6.5" if not provided
  'iphone-6.3': {
    name: 'iPhone 16 Pro',
    width: 1206,
    height: 2622,
    displaySize: '6.3"',
    platform: 'ios',
    frame: {
      borderRadius: 140,
      padding: 25,
      notch: { type: 'dynamic-island', width: 200, height: 60 }
    }
  },

  // iPhone 16e, 14, 13, 12, 11 Pro, XS, X - 6.1" display
  // Optional - scales from 6.5" if not provided
  'iphone-6.1': {
    name: 'iPhone 14',
    width: 1179,
    height: 2556,
    displaySize: '6.1"',
    platform: 'ios',
    frame: {
      borderRadius: 138,
      padding: 24,
      notch: { type: 'notch', width: 280, height: 68 }
    }
  },

  // iPhone 8 Plus, 7 Plus, 6S Plus, 6 Plus - 5.5" display
  // Optional - scales from 6.1" if not provided
  'iphone-5.5': {
    name: 'iPhone 8 Plus',
    width: 1242,
    height: 2208,
    displaySize: '5.5"',
    platform: 'ios',
    frame: {
      borderRadius: 100,
      padding: 24,
      notch: null,
      homeButton: true
    }
  },

  // iPhone SE (2nd/3rd gen), 8, 7, 6S, 6 - 4.7" display
  // Optional - scales from 5.5" if not provided
  'iphone-4.7': {
    name: 'iPhone SE',
    width: 750,
    height: 1334,
    displaySize: '4.7"',
    platform: 'ios',
    frame: {
      borderRadius: 80,
      padding: 20,
      notch: null,
      homeButton: true
    }
  },

  // ============================================
  // iPad Devices
  // ============================================

  // iPad Pro (M5, M4, 6th-1st gen), iPad Air (M3, M2) - 13" display
  // REQUIRED for iPad apps
  'ipad-13': {
    name: 'iPad Pro 13"',
    width: 2064,
    height: 2752,
    displaySize: '13"',
    platform: 'ios',
    frame: {
      borderRadius: 40,
      padding: 20,
      notch: null
    }
  },

  // iPad Pro (2nd gen) - 12.9" display
  // Optional - scales from 13" if not provided
  'ipad-12.9': {
    name: 'iPad Pro 12.9"',
    width: 2048,
    height: 2732,
    displaySize: '12.9"',
    platform: 'ios',
    frame: {
      borderRadius: 36,
      padding: 20,
      notch: null
    }
  },

  // iPad Pro 11", iPad Air, iPad (10th gen), iPad mini - 11" display
  // Optional - scales from 13" if not provided
  'ipad-11': {
    name: 'iPad Pro 11"',
    width: 1668,
    height: 2388,
    displaySize: '11"',
    platform: 'ios',
    frame: {
      borderRadius: 36,
      padding: 18,
      notch: null
    }
  },

  // ============================================
  // Android Devices
  // ============================================

  // Standard Android phone - 9:16 aspect ratio
  // Google Play minimum for featured placement
  'android-phone': {
    name: 'Android Phone',
    width: 1080,
    height: 1920,
    displaySize: '6.0"',
    platform: 'android',
    frame: {
      borderRadius: 48,
      padding: 12,
      notch: { type: 'punch-hole', width: 40, height: 40 }
    }
  },

  // Android tablet 7" - 9:16 aspect ratio
  'android-tablet-7': {
    name: 'Android Tablet 7"',
    width: 1080,
    height: 1920,
    displaySize: '7"',
    platform: 'android',
    frame: {
      borderRadius: 24,
      padding: 16,
      notch: null
    }
  },

  // Android tablet 10" - 10:16 aspect ratio
  'android-tablet-10': {
    name: 'Android Tablet 10"',
    width: 1200,
    height: 1920,
    displaySize: '10"',
    platform: 'android',
    frame: {
      borderRadius: 32,
      padding: 20,
      notch: null
    }
  },

  // Wear OS - 1:1 aspect ratio
  // No device frames allowed per Google Play guidelines
  'android-wear': {
    name: 'Wear OS',
    width: 384,
    height: 384,
    displaySize: '1.4"',
    platform: 'android',
    frame: {
      borderRadius: 192, // Circular
      padding: 0,
      notch: null
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

// Get devices by platform
export function getDevicesByPlatform(platform) {
  return Object.entries(devices)
    .filter(([_, device]) => device.platform === platform)
    .map(([key]) => key);
}

// Get required devices for each platform
export const requiredDevices = {
  ios: {
    iphone: ['iphone-6.9', 'iphone-6.5'], // One of these required
    ipad: ['ipad-13'] // Required for iPad apps
  },
  android: {
    phone: ['android-phone'],
    tablet: ['android-tablet-7', 'android-tablet-10']
  }
};
