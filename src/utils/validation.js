import { acceptsUploadSize } from '../devices/upload-targets.js';
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolveSource } from './resolve-source.js';

/** Decode input images. Source dimensions need not equal the marketing canvas. */
export async function validateScreenshot(filePath, device, { output = false, uploadTarget } = {}) {
  const errors = [], warnings = [];
  if (typeof filePath === 'string' && !existsSync(filePath)) return { valid: false, errors: ['File not found'], warnings, dimensions: null };
  try {
    const image = sharp(filePath, { failOn: 'warning' });
    const metadata = await image.metadata();
    if (!['png', 'jpeg', 'webp'].includes(metadata.format) || (output && metadata.format !== 'png')) errors.push(output ? 'Output must be PNG.' : 'Source must be PNG, JPEG, or WebP.');
    if ((metadata.pages || 1) !== 1) errors.push('Animated images are not supported.');
    // stats() decodes the pixels, catching corrupt/truncated data that metadata() alone accepts.
    await image.stats();
    const rotated = [5, 6, 7, 8].includes(metadata.orientation);
    const dimensions = { width: rotated ? metadata.height : metadata.width, height: rotated ? metadata.width : metadata.height };
    if (device && (dimensions.width !== device.width || dimensions.height !== device.height)) {
      const message = `Dimension mismatch: image is ${dimensions.width}x${dimensions.height}, canvas is ${device.width}x${device.height}.`;
      if (output) errors.push(message);
      else if (dimensions.width < device.width || dimensions.height < device.height) warnings.push(`${message} Source will be scaled inside the template.`);
    }
    if (output && uploadTarget && !acceptsUploadSize(uploadTarget, dimensions.width, dimensions.height)) errors.push(`Unsupported dimensions for ${uploadTarget}.`);
    if (metadata.hasAlpha) {
      if (output) errors.push('Output must not have an alpha channel.');
      else warnings.push('Source has an alpha channel; exported artwork will be flattened onto an opaque background.');
    }
    return { valid: !errors.length, errors, warnings, dimensions };
  } catch (error) {
    return { valid: false, errors: [`Cannot decode image: ${error.message}`], warnings, dimensions: null };
  }
}

export async function validateAllScreenshots(screenshots, configDir, deviceKeys, devices) {
  const results = [];
  for (const screenshot of screenshots) for (const key of deviceKeys) {
    const device = devices[key];
    if (device.type === 'promotional') continue;
    const source = screenshot.source && resolveSource(screenshot.source, key, configDir).resolvedPath;
    const validation = source ? await validateScreenshot(join(configDir, source), device) : { valid: false, errors: ['Missing source'], warnings: [], dimensions: null };
    results.push({ screenshotId: screenshot.id, source, device: key, deviceName: device.name, ...validation });
  }
  return { valid: results.every(result => result.valid), results };
}

export function printValidationResults({ valid, results }) {
  let hasWarnings = false;
  for (const result of results) {
    for (const error of result.errors) console.log(`  ✗ ${result.screenshotId} (${result.device}): ${error}`);
    for (const warning of result.warnings) { hasWarnings = true; console.log(`  ⚠ ${result.screenshotId} (${result.device}): ${warning}`); }
  }
  return { valid, hasWarnings };
}
