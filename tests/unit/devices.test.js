import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  devices,
  defaultDevice,
  deviceList,
  getDevice,
  getDevicesByPlatform,
  requiredDevices
} from '../../src/devices/index.js';

describe('devices module', () => {
  describe('devices object', () => {
    it('should have all expected iPhone devices', () => {
      const iphoneKeys = ['iphone-6.9', 'iphone-6.7', 'iphone-6.5', 'iphone-6.3', 'iphone-6.1', 'iphone-5.5', 'iphone-4.7'];
      for (const key of iphoneKeys) {
        assert.ok(devices[key], `Missing device: ${key}`);
        assert.strictEqual(devices[key].platform, 'ios');
      }
    });

    it('should have all expected iPad devices', () => {
      const ipadKeys = ['ipad-13', 'ipad-12.9', 'ipad-11'];
      for (const key of ipadKeys) {
        assert.ok(devices[key], `Missing device: ${key}`);
        assert.strictEqual(devices[key].platform, 'ios');
      }
    });

    it('should have all expected Android devices', () => {
      const androidKeys = ['android-phone', 'android-tablet-7', 'android-tablet-10', 'android-wear', 'android-feature-graphic'];
      for (const key of androidKeys) {
        assert.ok(devices[key], `Missing device: ${key}`);
        assert.strictEqual(devices[key].platform, 'android');
      }
    });

    it('should have valid dimensions for all devices', () => {
      for (const [key, device] of Object.entries(devices)) {
        assert.ok(device.width > 0, `${key} should have positive width`);
        assert.ok(device.height > 0, `${key} should have positive height`);
        assert.ok(typeof device.name === 'string', `${key} should have name`);
        assert.ok(typeof device.displaySize === 'string', `${key} should have displaySize`);
        assert.ok(['ios', 'android'].includes(device.platform), `${key} should have valid platform`);
      }
    });

    it('should have frame configuration for non-promotional devices', () => {
      for (const [key, device] of Object.entries(devices)) {
        // Skip promotional devices (like feature graphics) which don't have frames
        if (device.type === 'promotional') {
          assert.strictEqual(device.frame, null, `${key} (promotional) should have null frame`);
          continue;
        }
        assert.ok(device.frame, `${key} should have frame config`);
        assert.ok(typeof device.frame.borderRadius === 'number', `${key} should have borderRadius`);
        assert.ok(typeof device.frame.padding === 'number', `${key} should have padding`);
      }
    });
  });

  describe('defaultDevice', () => {
    it('should be iphone-6.5', () => {
      assert.strictEqual(defaultDevice, 'iphone-6.5');
    });

    it('should exist in devices', () => {
      assert.ok(devices[defaultDevice]);
    });
  });

  describe('deviceList', () => {
    it('should contain all device keys', () => {
      assert.strictEqual(deviceList.length, Object.keys(devices).length);
      for (const key of deviceList) {
        assert.ok(devices[key], `${key} should exist in devices`);
      }
    });
  });

  describe('getDevice', () => {
    it('should return device by key', () => {
      const device = getDevice('iphone-6.9');
      assert.strictEqual(device.name, 'iPhone 16 Pro Max');
      assert.strictEqual(device.width, 1320);
      assert.strictEqual(device.height, 2868);
    });

    it('should return default device for invalid key', () => {
      const device = getDevice('nonexistent-device');
      assert.strictEqual(device, devices[defaultDevice]);
    });

    it('should return default device for undefined', () => {
      const device = getDevice(undefined);
      assert.strictEqual(device, devices[defaultDevice]);
    });
  });

  describe('getDevicesByPlatform', () => {
    it('should return only iOS devices for ios platform', () => {
      const iosDevices = getDevicesByPlatform('ios');
      assert.ok(iosDevices.length > 0);
      for (const key of iosDevices) {
        assert.strictEqual(devices[key].platform, 'ios');
      }
    });

    it('should return only Android devices for android platform', () => {
      const androidDevices = getDevicesByPlatform('android');
      assert.ok(androidDevices.length > 0);
      for (const key of androidDevices) {
        assert.strictEqual(devices[key].platform, 'android');
      }
    });

    it('should return empty array for unknown platform', () => {
      const unknownDevices = getDevicesByPlatform('windows');
      assert.strictEqual(unknownDevices.length, 0);
    });

    it('should return all 10 iOS devices', () => {
      const iosDevices = getDevicesByPlatform('ios');
      assert.strictEqual(iosDevices.length, 10); // 7 iPhones + 3 iPads
    });

    it('should return all 5 Android devices', () => {
      const androidDevices = getDevicesByPlatform('android');
      assert.strictEqual(androidDevices.length, 5);
    });
  });

  describe('requiredDevices', () => {
    it('should specify required iPhone devices', () => {
      assert.deepStrictEqual(requiredDevices.ios.iphone, ['iphone-6.9', 'iphone-6.5']);
    });

    it('should specify required iPad devices', () => {
      assert.deepStrictEqual(requiredDevices.ios.ipad, ['ipad-13']);
    });

    it('should specify required Android devices', () => {
      assert.deepStrictEqual(requiredDevices.android.phone, ['android-phone']);
      assert.deepStrictEqual(requiredDevices.android.tablet, ['android-tablet-7', 'android-tablet-10']);
    });

    it('should reference existing devices', () => {
      for (const key of requiredDevices.ios.iphone) {
        assert.ok(devices[key], `Required device ${key} should exist`);
      }
      for (const key of requiredDevices.ios.ipad) {
        assert.ok(devices[key], `Required device ${key} should exist`);
      }
    });
  });

  describe('specific device specifications', () => {
    it('should have correct dimensions for iPhone 16 Pro Max (6.9")', () => {
      const device = devices['iphone-6.9'];
      assert.strictEqual(device.width, 1320);
      assert.strictEqual(device.height, 2868);
      assert.strictEqual(device.frame.notch.type, 'dynamic-island');
    });

    it('should have correct dimensions for iPhone 8 Plus (5.5")', () => {
      const device = devices['iphone-5.5'];
      assert.strictEqual(device.width, 1242);
      assert.strictEqual(device.height, 2208);
      assert.strictEqual(device.frame.notch, null);
      assert.strictEqual(device.frame.homeButton, true);
    });

    it('should have correct dimensions for iPad Pro 13"', () => {
      const device = devices['ipad-13'];
      assert.strictEqual(device.width, 2064);
      assert.strictEqual(device.height, 2752);
    });

    it('should have correct dimensions for Android Wear', () => {
      const device = devices['android-wear'];
      assert.strictEqual(device.width, 384);
      assert.strictEqual(device.height, 384);
      assert.strictEqual(device.frame.borderRadius, 192); // Circular
    });

    it('should have correct specifications for Android Feature Graphic', () => {
      const device = devices['android-feature-graphic'];
      assert.strictEqual(device.width, 1024);
      assert.strictEqual(device.height, 500);
      assert.strictEqual(device.type, 'promotional');
      assert.strictEqual(device.frame, null);
      assert.strictEqual(device.platform, 'android');
      assert.strictEqual(device.displaySize, 'Feature Graphic');
    });
  });
});
