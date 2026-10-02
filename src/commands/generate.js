import { chromium } from 'playwright';
import { mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { openRenderCache } from '../utils/render-cache.js';
import { randomUUID } from 'node:crypto';
import { loadConfig, buildRenderJobs, ensureTemplates } from '../utils/render-jobs.js';
import { startServer } from '../utils/server.js';
import { renderJob, runPool } from '../utils/render.js';
import { validateScreenshot } from '../utils/validation.js';
import { validateConfig } from '../utils/config-validation.js';
import { StorepixError } from '../utils/errors.js';

export async function generate(options = {}) {
  const configPath = resolve(options.config || './storepix/storepix.config.js');
  const configDir = dirname(configPath);
  const config = await loadConfig(configPath);
  if (config.output?.format && config.output.format !== 'png') throw new StorepixError('CONFIG', 'Only PNG output is supported.');
  const jobs = buildRenderJobs(config, configDir, options);
  ensureTemplates(jobs, configDir);
  const concurrency = options.parallel === false ? 1 : Number(options.concurrency ?? 2);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new StorepixError('CONFIG', 'Concurrency must be an integer from 1 to 8.');
  // Bound large panorama/iPad jobs to about 24 million canvas pixels in flight.
  const workers = Math.min(concurrency, Math.max(1, Math.floor(24_000_000 / Math.max(...jobs.map(job => job.viewport.width * job.viewport.height)))));
  if (!options.skipValidation) {
    const checked = new Set();
    for (const job of jobs) {
      const validation = validateConfig({ ...config, template: job.template, screenshots: [job.screenshot] }, configDir);
      if (!validation.valid) throw new StorepixError('CONFIG', validation.errors.join('\n'));
      const source = new URL(job.url, 'http://localhost').searchParams.get('screenshot');
      if (job.device.type !== 'promotional' && source.startsWith('/') && !checked.has(source)) {
        checked.add(source);
        const result = await validateScreenshot(resolve(configDir, '.' + decodeURIComponent(source)), job.device);
        if (!result.valid) throw new StorepixError('SOURCE', `${job.id}: ${result.errors.join('\n')}`);
        for (const warning of result.warnings) console.log(`  ⚠ ${job.id}: ${warning}`);
      }
    }
  }
  let server, browser;
  const files = [];
  let cached = 0;
  try {
    server = await startServer(configDir);
    browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
    const cache = options.cache ? await openRenderCache(configDir, resolve(configDir, config.output?.dir || 'output'), browser.version()) : null;
    await runPool(jobs, workers, async job => {
      if (await cache?.has(job)) { cached++; files.push(...job.paths); return; }
      let external = false;
      const images = await renderJob(browser, server.url, job, { onExternalRequest: () => { external = true; } });
      for (let i = 0; i < images.length; i++) {
        const path = job.paths[i];
        await mkdir(dirname(path), { recursive: true });
        const temporary = `${path}.${randomUUID()}.tmp`;
        try { await writeFile(temporary, images[i]); await rename(temporary, path); }
        finally { await rm(temporary, { force: true }); }
        files.push(path);
        console.log(`  ${path} (${Math.round(images[i].length / 1024)} KB)`);
      }
      if (!external) cache?.put(job, images);
    });
    await cache?.save();
  } finally {
    try { await browser?.close(); } finally { await server?.close(); }
  }
  console.log(`\n  Done! Generated ${files.length} screenshots (${workers} workers, ${cached} cached jobs).\n`);
  return { files: files.sort(), workers, cached };
}
