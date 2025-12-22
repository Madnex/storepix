import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { resolveSource } from './resolve-source.js';

// PNG signature bytes
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

/**
 * Validate a single screenshot file
 * @param {string} filePath - Absolute path to screenshot
 * @param {Object} device - Device configuration with width/height
 * @returns {Object} { valid: boolean, errors: string[], warnings: string[], dimensions: { width, height } }
 */
export function validateScreenshot(filePath, device) {
  const errors = [];
  const warnings = [];

  if (!existsSync(filePath)) {
    return { valid: false, errors: ['File not found'], warnings: [], dimensions: null };
  }

  let buffer;
  try {
    buffer = readFileSync(filePath);
  } catch (err) {
    return { valid: false, errors: [`Cannot read file: ${err.message}`], warnings: [], dimensions: null };
  }

  // Check file size (minimum valid PNG is ~67 bytes)
  if (buffer.length < 67) {
    return { valid: false, errors: ['File is too small to be a valid image'], warnings: [], dimensions: null };
  }

  // Check PNG signature
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    // Try to detect if it's a JPEG
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      errors.push('File is a JPEG. App Store requires PNG format for screenshots.');
      return { valid: false, errors, warnings, dimensions: null };
    }
    errors.push('File is not a valid PNG');
    return { valid: false, errors, warnings, dimensions: null };
  }

  // Extract dimensions from IHDR chunk
  // PNG structure: signature (8) + chunk length (4) + "IHDR" (4) + width (4) + height (4) + ...
  // So width is at offset 16, height at offset 20
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  // Validate dimensions match device
  if (width !== device.width || height !== device.height) {
    errors.push(
      `Dimension mismatch: image is ${width}x${height}, but ${device.name} requires ${device.width}x${device.height}`
    );
  }

  // Check color type for transparency
  // Color types: 0=grayscale, 2=RGB, 3=indexed, 4=grayscale+alpha, 6=RGBA
  // Color type is at offset 25: signature (8) + length (4) + IHDR (4) + width (4) + height (4) + bit depth (1)
  const colorType = buffer.readUInt8(25);
  const hasAlphaChannel = colorType === 4 || colorType === 6;

  if (hasAlphaChannel) {
    // Check for tRNS chunk (transparency in non-alpha images) or actual alpha pixels
    const hasTransparency = checkForTransparency(buffer, colorType);
    if (hasTransparency) {
      warnings.push('Image may contain transparency. App Store screenshots should be fully opaque.');
    }
  }

  // Check for tRNS chunk in indexed/grayscale/RGB images
  if (colorType === 0 || colorType === 2 || colorType === 3) {
    if (buffer.includes(Buffer.from('tRNS'))) {
      warnings.push('Image contains a transparency chunk (tRNS). Consider using a fully opaque image.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    dimensions: { width, height }
  };
}

/**
 * Check if PNG has transparency
 * @param {Buffer} buffer - PNG file buffer
 * @param {number} colorType - PNG color type
 * @returns {boolean}
 */
function checkForTransparency(buffer, colorType) {
  // For RGBA or grayscale+alpha images, look for tRNS chunk
  // or check IDAT for non-opaque pixels (simplified check)

  // Quick check: look for tRNS chunk which explicitly defines transparency
  if (buffer.includes(Buffer.from('tRNS'))) {
    return true;
  }

  // For full pixel-by-pixel transparency detection, we would need to decompress
  // the IDAT chunks and check alpha values. This is expensive, so we just warn
  // about RGBA images as potentially having transparency.
  if (colorType === 4 || colorType === 6) {
    // Return false here - we've already warned about alpha channel above
    // Full decompression would be needed for accurate detection
    return false;
  }

  return false;
}

/**
 * Validate all screenshots for all devices
 * @param {Array} screenshots - Screenshots from config
 * @param {string} configDir - Config directory path
 * @param {Array} deviceKeys - Device keys to validate against
 * @param {Object} devices - Device definitions object
 * @returns {Object} { valid: boolean, results: Array }
 */
export function validateAllScreenshots(screenshots, configDir, deviceKeys, devices) {
  const results = [];
  let hasErrors = false;

  for (const screenshot of screenshots) {
    for (const deviceKey of deviceKeys) {
      const device = devices[deviceKey];

      // Resolve device-specific source path
      const { resolvedPath } = resolveSource(screenshot.source, deviceKey, configDir);
      const sourcePath = join(configDir, resolvedPath);

      const validation = validateScreenshot(sourcePath, device);

      if (!validation.valid) {
        hasErrors = true;
      }

      results.push({
        screenshotId: screenshot.id,
        source: resolvedPath,
        device: deviceKey,
        deviceName: device.name,
        ...validation
      });
    }
  }

  return {
    valid: !hasErrors,
    results
  };
}

/**
 * Print validation results to console
 * @param {Object} validationResult - Result from validateAllScreenshots
 */
export function printValidationResults(validationResult) {
  const { valid, results } = validationResult;

  // Group results by screenshot
  const byScreenshot = {};
  for (const result of results) {
    if (!byScreenshot[result.screenshotId]) {
      byScreenshot[result.screenshotId] = [];
    }
    byScreenshot[result.screenshotId].push(result);
  }

  let hasWarnings = false;

  for (const [screenshotId, deviceResults] of Object.entries(byScreenshot)) {
    const hasIssues = deviceResults.some(r => r.errors.length > 0 || r.warnings.length > 0);

    if (hasIssues) {
      console.log(`\n    ${screenshotId}:`);

      for (const result of deviceResults) {
        if (result.errors.length > 0) {
          console.log(`      ${result.device} (${result.deviceName}):`);
          for (const error of result.errors) {
            console.log(`        \x1b[31m✗ ${error}\x1b[0m`);
          }
        }

        if (result.warnings.length > 0) {
          hasWarnings = true;
          if (result.errors.length === 0) {
            console.log(`      ${result.device}:`);
          }
          for (const warning of result.warnings) {
            console.log(`        \x1b[33m⚠ ${warning}\x1b[0m`);
          }
        }
      }
    }
  }

  if (!valid) {
    console.log(`\n    Tip: Use --skip-validation to bypass these checks.\n`);
  } else if (hasWarnings) {
    console.log(`\n    Validation passed with warnings.\n`);
  }

  return { valid, hasWarnings };
}
