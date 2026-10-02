import { it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildRenderJobs } from '../../src/utils/render-jobs.js';
import { runPool } from '../../src/utils/render.js';

it('shares localized content, source resolution, and all render parameters', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'storepix-jobs-'));
  try {
    await mkdir(join(dir, 'screenshots/iphone'), { recursive: true });
    await writeFile(join(dir, 'screenshots/iphone/home.png'), 'exists');
    const config = { template: 'photo', devices: ['iphone-6.5'], theme: { primary: '#123' }, statusBar: { enabled: true, battery: 0 },
      screenshots: [{ id: 'home', source: 'screenshots/home.png', background: 'background.jpg', headline: 'Base', badge: 'Base' }],
      locales: { de: { home: { headline: '', badge: 'Neu' } } } };
    const [job] = buildRenderJobs(config, dir);
    const params = new URL(job.url, 'http://localhost').searchParams;
    assert.equal(params.get('screenshot'), '/screenshots/iphone/home.png');
    assert.equal(params.get('background'), '/background.jpg');
    assert.equal(params.get('headline'), '');
    assert.equal(params.get('statusBarBattery'), '0');
    assert.equal(params.get('statusBar'), 'true');
    assert.deepEqual(JSON.parse(params.get('customContent')), { badge: 'Neu' });
    assert.deepEqual(JSON.parse(params.get('themeJson')), config.theme);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
it('validates device, locale, paths, output collisions, slices, and orientation', () => {
  const config = { screenshots: [{ id: 'home', source: 'home.png' }] };
  for (const options of [{ device: 'unknown' }, { locale: 'fr' }, { orientation: 'sideways' }]) assert.throws(() => buildRenderJobs(config, '/tmp/project', options), { code: 'CONFIG' });
  for (const screenshot of [{ id: '../escape', source: 'x' }, { id: 'home', source: '../x' }, { id: 'home', source: 'x', slices: 1.5 }]) assert.throws(() => buildRenderJobs({ screenshots: [screenshot] }, '/tmp/project'), { code: 'CONFIG' });
  assert.throws(() => buildRenderJobs({ screenshots: [config.screenshots[0], config.screenshots[0]] }, '/tmp/project'), /Duplicate output/);
  const [landscape] = buildRenderJobs(config, '/tmp/project', { orientation: 'landscape' });
  assert.deepEqual(landscape.viewport, { width: 2778, height: 1284 });
  const [promo] = buildRenderJobs({ devices: ['android-feature-graphic'], screenshots: [{ id: 'banner', headline: 'App' }] }, '/tmp/project');
  assert.equal(promo.template, 'feature-graphic');
});
it('bounds concurrency and drains active work before returning an error', async () => {
  let active = 0, max = 0;
  await assert.rejects(runPool([0, 1, 2, 3], 2, async item => {
    active++; max = Math.max(max, active);
    try { await new Promise(resolve => setTimeout(resolve, item ? 30 : 5)); if (!item) throw new Error('failed'); }
    finally { active--; }
  }), /failed/);
  assert.equal(max, 2); assert.equal(active, 0);
});
