import { existsSync } from 'fs';
import { join, dirname, basename } from 'path';

/**
 * Extract device type from device key
 * e.g., 'iphone-6.9' → 'iphone', 'ipad-13' → 'ipad', 'android-phone' → 'android'
 */
export function getDeviceType(deviceKey) {
  if (deviceKey.startsWith('iphone-')) return 'iphone';
  if (deviceKey.startsWith('ipad-')) return 'ipad';
  if (deviceKey.startsWith('android-')) return 'android';
  return null;
}

/**
 * Build the device-specific source path
 * e.g., './screenshots/01_home.png' + 'iphone' → './screenshots/iphone/01_home.png'
 */
export function buildDeviceSpecificPath(sourcePath, deviceType) {
  const sourceDir = dirname(sourcePath);
  const sourceFile = basename(sourcePath);
  return join(sourceDir, deviceType, sourceFile);
}

/**
 * Resolve screenshot source path based on device type
 *
 * Checks for device-specific source in subfolders:
 *   screenshots/iphone/01_home.png  (for iphone-* devices)
 *   screenshots/ipad/01_home.png    (for ipad-* devices)
 *   screenshots/android/01_home.png (for android-* devices)
 *
 * Falls back to original source path if device-specific version doesn't exist.
 *
 * @param {string} sourcePath - Original source path from config (e.g., './screenshots/01_home.png')
 * @param {string} deviceKey - Device key (e.g., 'iphone-6.9', 'ipad-13')
 * @param {string} configDir - Directory containing the config file
 * @returns {{ resolvedPath: string, isDeviceSpecific: boolean }} Resolved source path and whether it's device-specific
 */
export function resolveSource(sourcePath, deviceKey, configDir) {
  const deviceType = getDeviceType(deviceKey);

  if (!deviceType) {
    return { resolvedPath: sourcePath, isDeviceSpecific: false };
  }

  // Build device-specific path: ./screenshots/01_home.png → ./screenshots/iphone/01_home.png
  const deviceSpecificPath = buildDeviceSpecificPath(sourcePath, deviceType);

  // Check if device-specific file exists
  const absoluteDevicePath = join(configDir, deviceSpecificPath);

  if (existsSync(absoluteDevicePath)) {
    return { resolvedPath: deviceSpecificPath, isDeviceSpecific: true };
  }

  // Fall back to original source
  return { resolvedPath: sourcePath, isDeviceSpecific: false };
}

/**
 * Check if a source file exists for a given device
 * Checks device-specific path first, then falls back to base path
 *
 * @param {string} sourcePath - Original source path from config
 * @param {string} deviceKey - Device key
 * @param {string} configDir - Directory containing the config file
 * @returns {boolean} Whether a valid source exists for this device
 */
export function sourceExistsForDevice(sourcePath, deviceKey, configDir) {
  const { resolvedPath } = resolveSource(sourcePath, deviceKey, configDir);
  const absolutePath = join(configDir, resolvedPath);
  return existsSync(absolutePath);
}
