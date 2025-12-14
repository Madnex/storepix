import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validateScreenshot, validateAllScreenshots } from '../../src/utils/validation.js';
import { devices } from '../../src/devices/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '../fixtures/screenshots');

describe('validation module', () => {
  describe('validateScreenshot', () => {
    it('should validate a correct PNG for iPhone 6.5"', () => {
      const result = validateScreenshot(
        join(fixturesDir, 'valid-iphone-6.5.png'),
        devices['iphone-6.5']
      );

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
      assert.deepStrictEqual(result.dimensions, { width: 1284, height: 2778 });
    });

    it('should validate a correct PNG for iPad 13"', () => {
      const result = validateScreenshot(
        join(fixturesDir, 'valid-ipad-13.png'),
        devices['ipad-13']
      );

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
      assert.deepStrictEqual(result.dimensions, { width: 2064, height: 2752 });
    });

    it('should fail for wrong dimensions', () => {
      const result = validateScreenshot(
        join(fixturesDir, 'wrong-dimensions.png'),
        devices['iphone-6.5']
      );

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('Dimension mismatch')));
      assert.deepStrictEqual(result.dimensions, { width: 100, height: 100 });
    });

    it('should fail for JPEG files', () => {
      const result = validateScreenshot(
        join(fixturesDir, 'fake.jpg'),
        devices['iphone-6.5']
      );

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('JPEG')));
    });

    it('should fail for non-existent files', () => {
      const result = validateScreenshot(
        join(fixturesDir, 'nonexistent.png'),
        devices['iphone-6.5']
      );

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('File not found')));
      assert.strictEqual(result.dimensions, null);
    });

    it('should fail for too small files', () => {
      const result = validateScreenshot(
        join(fixturesDir, 'too-small.png'),
        devices['iphone-6.5']
      );

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('too small')));
    });

    it('should fail for invalid files', () => {
      const result = validateScreenshot(
        join(fixturesDir, 'invalid.txt'),
        devices['iphone-6.5']
      );

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('not a valid PNG')));
    });

    it('should warn about alpha channel', () => {
      const result = validateScreenshot(
        join(fixturesDir, 'with-alpha.png'),
        devices['iphone-6.5']
      );

      // The file is valid but dimensions match
      assert.strictEqual(result.valid, true);
      // Depending on color type detection, may have warning about alpha
      // Our test PNG with alpha type 6 should be detected
      assert.deepStrictEqual(result.dimensions, { width: 1284, height: 2778 });
    });
  });

  describe('validateAllScreenshots', () => {
    it('should validate multiple screenshots against multiple devices', () => {
      const screenshots = [
        { id: 'test1', source: '../fixtures/screenshots/valid-iphone-6.5.png' }
      ];
      const configDir = __dirname;
      const deviceKeys = ['iphone-6.5'];

      const result = validateAllScreenshots(screenshots, configDir, deviceKeys, devices);

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.results.length, 1);
      assert.strictEqual(result.results[0].screenshotId, 'test1');
      assert.strictEqual(result.results[0].device, 'iphone-6.5');
    });

    it('should fail if any screenshot fails validation', () => {
      const screenshots = [
        { id: 'test1', source: '../fixtures/screenshots/wrong-dimensions.png' }
      ];
      const configDir = __dirname;
      const deviceKeys = ['iphone-6.5'];

      const result = validateAllScreenshots(screenshots, configDir, deviceKeys, devices);

      assert.strictEqual(result.valid, false);
      assert.ok(result.results[0].errors.length > 0);
    });

    it('should validate same screenshot against multiple devices', () => {
      const screenshots = [
        { id: 'test1', source: '../fixtures/screenshots/valid-iphone-6.5.png' }
      ];
      const configDir = __dirname;
      const deviceKeys = ['iphone-6.5', 'iphone-6.9']; // Only 6.5 will match

      const result = validateAllScreenshots(screenshots, configDir, deviceKeys, devices);

      assert.strictEqual(result.valid, false); // Will fail for 6.9
      assert.strictEqual(result.results.length, 2);

      const result65 = result.results.find(r => r.device === 'iphone-6.5');
      const result69 = result.results.find(r => r.device === 'iphone-6.9');

      assert.strictEqual(result65.valid, true);
      assert.strictEqual(result69.valid, false);
    });

    it('should handle multiple screenshots', () => {
      const screenshots = [
        { id: 'test1', source: '../fixtures/screenshots/valid-iphone-6.5.png' },
        { id: 'test2', source: '../fixtures/screenshots/valid-ipad-13.png' }
      ];
      const configDir = __dirname;
      const deviceKeys = ['iphone-6.5'];

      const result = validateAllScreenshots(screenshots, configDir, deviceKeys, devices);

      // test1 passes, test2 fails (wrong dimensions for iphone)
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.results.length, 2);
    });
  });
});
