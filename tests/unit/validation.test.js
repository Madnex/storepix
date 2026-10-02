import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { validateScreenshot, validateAllScreenshots } from '../../src/utils/validation.js';
import { devices } from '../../src/devices/index.js';
const fixture = name => fileURLToPath(new URL(`../fixtures/screenshots/${name}`, import.meta.url));
const device = devices['iphone-6.5'];

describe('decoded image validation', () => {
  it('accepts real PNG and JPEG sources', async () => {
    assert.equal((await validateScreenshot(fixture('valid-iphone-6.5.png'), device)).valid, true);
    assert.equal((await validateScreenshot(fixture('valid.jpg'), device)).valid, true);
  });
  it('accepts differing source dimensions but rejects incorrect output dimensions', async () => {
    const source = await validateScreenshot(fixture('wrong-dimensions.png'), device);
    assert.equal(source.valid, true); assert.ok(source.warnings.length);
    assert.equal((await validateScreenshot(fixture('wrong-dimensions.png'), device, { output: true })).valid, false);
  });
  it('warns on source alpha and rejects output alpha even if dimensions match', async () => {
    const result = await validateScreenshot(fixture('with-alpha.png'), device);
    assert.equal(result.valid, true); assert.ok(result.warnings.some(w => w.includes('alpha')));
    assert.equal((await validateScreenshot(fixture('with-alpha.png'), device, { output: true })).valid, false);
  });
  it('rejects missing, fake, truncated, and invalid images', async () => {
    for (const name of ['missing.png', 'fake.jpg', 'invalid.txt', 'too-small.png']) assert.equal((await validateScreenshot(fixture(name), device)).valid, false, name);
    const png = await readFile(fixture('valid-iphone-6.5.png'));
    assert.equal((await validateScreenshot(png.subarray(0, png.length / 2), device)).valid, false);
  });
  it('allows one source to be composed onto multiple device canvases', async () => {
    const configDir = fileURLToPath(new URL('../fixtures/', import.meta.url));
    const result = await validateAllScreenshots([{ id: 'home', source: 'screenshots/valid-iphone-6.5.png' }], configDir, ['iphone-6.5', 'iphone-6.9'], devices);
    assert.equal(result.valid, true); assert.equal(result.results.length, 2);
  });
});
