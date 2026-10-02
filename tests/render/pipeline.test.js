import { Server } from 'node:http';
import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { generate } from '../../src/commands/generate.js';
import { preview } from '../../src/commands/preview.js';
import { startServer } from '../../src/utils/server.js';
import { buildRenderJobs } from '../../src/utils/render-jobs.js';
import { renderJob } from '../../src/utils/render.js';

let dir, browser;
const writeConfig = async config => { await writeFile(join(dir, 'config.mjs'), `export default ${JSON.stringify(config)};\n`); };
const base = () => ({ template: 'default', devices: ['android-wear'], screenshots: [{ id: 'home', source: './source.png', headline: 'Hello', subheadline: 'World' }] });

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'storepix-render-'));
  await cp(new URL('../../src/templates/', import.meta.url), join(dir, 'templates'), { recursive: true });
  await sharp({ create: { width: 384, height: 384, channels: 3, background: '#336699' } }).png().toFile(join(dir, 'source.png'));
  browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
});
after(async () => { await browser?.close(); await rm(dir, { recursive: true, force: true }); });

describe('real Chromium pipeline', { concurrency: false }, () => {
  it('exports all bundled templates offline, with locales, status bars and panorama slices', async () => {
    const server = await startServer(dir);
    // Prevent external requests: bundled artwork must be self-contained.
    const originalNewContext = browser.newContext.bind(browser);
    const patched = mock.method(browser, 'newContext', async options => {
      const context = await originalNewContext(options);
      await context.route('**/*', route => route.request().url().startsWith(server.url) ? route.continue() : route.abort());
      return context;
    });
    try {
      for (const template of ['default', 'minimal', 'photo', 'panorama', 'feature-graphic']) {
        const config = { ...base(), template, statusBar: { enabled: true }, locales: { en: {}, de: { home: { headline: 'Hallo' } } } };
        if (template === 'photo') config.screenshots[0].background = './source.png';
        if (template === 'panorama') Object.assign(config.screenshots[0], { slices: 2, headlines: ['First', 'Second'], subheadlines: ['One', 'Two'] });
        if (template === 'feature-graphic') { config.devices = ['android-feature-graphic']; delete config.screenshots[0].source; config.screenshots[0].logo = './source.png'; }
        for (const job of buildRenderJobs(config, dir)) {
          const images = await renderJob(browser, server.url, job);
          assert.equal(images.length, job.slices);
          for (const image of images) {
            const meta = await sharp(image).metadata();
            assert.equal(meta.width, job.device.width); assert.equal(meta.height, job.device.height); assert.equal(meta.hasAlpha, false);
          }
        }
      }
    } finally { patched.mock.restore(); await server.close(); }
  });

  it('captures one ready panorama and produces exact neighboring pixels', async () => {
    await mkdir(join(dir, 'templates/custom'), { recursive: true });
    await writeFile(join(dir, 'templates/custom/index.html'), `<!doctype html><style>body{margin:0;background:red}#right{position:absolute;left:384px;width:384px;height:384px;background:blue}</style><script>window.storepixReady=new Promise(resolve=>setTimeout(()=>{document.body.innerHTML='<div id="right"></div>';resolve()},100));</script>`);
    const config = { ...base(), template: 'custom' }; config.screenshots[0].slices = 2;
    await writeConfig(config);
    const result = await generate({ config: join(dir, 'config.mjs'), concurrency: 2 });
    assert.equal(result.files.length, 2);
    const colors = [];
    for (const file of result.files) colors.push([...await sharp(file).extract({ left: 200, top: 200, width: 1, height: 1 }).raw().toBuffer()]);
    assert.deepEqual(colors, [[255, 0, 0], [0, 0, 255]]);
  });

  it('fails on missing images, stylesheets, scripts, and hung readiness instead of exporting incomplete artwork', async () => {
    const server = await startServer(dir);
    try {
      for (const html of ['<img src="/missing.png">', '<link rel="stylesheet" href="/missing.css">', '<script>throw new Error("template bug")</script>', '<script>window.storepixReady=new Promise(()=>{})</script>']) {
        await writeFile(join(dir, 'templates/custom/index.html'), html);
        const [job] = buildRenderJobs({ ...base(), template: 'custom' }, dir);
        await assert.rejects(renderJob(browser, server.url, job, { timeout: 500 }), { code: 'RENDER' });
      }
    } finally { await server.close(); }
  });

  it('updates preview selection, localized content, and template after config edits; recovers from invalid edits', async () => {
    const config = { ...base(), devices: ['android-wear', 'android-phone'], locales: { en: {}, de: { home: { headline: 'Hallo' } } } };
    config.screenshots.push({ id: 'other', source: './source.png', headline: 'Other', subheadline: 'Screen' });
    await writeConfig(config);
    const session = await preview({ config: join(dir, 'config.mjs'), port: 0, watch: true });
    const page = await browser.newPage();
    try {
      await page.goto(session.url);
      await page.locator('#locale').selectOption('de');
      await page.waitForFunction(() => document.querySelector('iframe').contentDocument?.querySelector('#headline')?.textContent === 'Hallo');
      await page.locator('#screenshot').selectOption('other');
      await page.locator('#device').selectOption('android-phone');
      await page.waitForFunction(() => document.querySelector('iframe').width === '1080');
      config.template = 'minimal'; config.screenshots[1].headline = 'Changed';
      await writeConfig(config);
      await page.waitForFunction(() => document.querySelector('iframe').contentDocument?.querySelector('#headline')?.textContent === 'Changed');
      assert.match(await page.locator('iframe').getAttribute('src'), /minimal/);
      await writeFile(join(dir, 'config.mjs'), 'export default { broken');
      await page.waitForFunction(() => document.querySelector('#error').textContent.includes('Failed to load config'));
      await writeConfig(config);
      await page.waitForFunction(() => document.querySelector('#error').textContent === '');
      const response = await fetch(session.url + '/__storepix/jobs');
      const { jobs } = await response.json();
      assert.deepEqual(jobs.map(job => job.url), buildRenderJobs(config, dir).map(job => job.url));
    } finally { await page.close(); await session.close(); }
    await assert.rejects(fetch(session.url));
  });

  it('invalidates cached outputs when artwork or an output file changes', async () => {
    const config = base(); await writeConfig(config);
    const options = { config: join(dir, 'config.mjs'), cache: true };
    const first = await generate(options); assert.equal(first.cached, 0);
    const second = await generate(options); assert.equal(second.cached, 1);
    await writeFile(first.files[0], 'corrupt');
    assert.equal((await generate(options)).cached, 0);
    config.screenshots[0].headline = 'New artwork'; await writeConfig(config);
    assert.equal((await generate(options)).cached, 0);
  });

  it('rejects occupied ports and closes the server when Chromium launch fails', async () => {
    const server = await startServer(dir);
    try { await assert.rejects(startServer(dir, { port: Number(new URL(server.url).port) }), { code: 'EADDRINUSE' }); }
    finally { await server.close(); }
    await writeConfig(base());
    let activeServer, address;
    const listen = Server.prototype.listen;
    const listenMock = mock.method(Server.prototype, 'listen', function (...args) { activeServer = this; return listen.apply(this, args); });
    const patched = mock.method(chromium, 'launch', async () => { address = activeServer.address(); throw new Error('browser unavailable'); });
    try { await assert.rejects(generate({ config: join(dir, 'config.mjs') }), /browser unavailable/); }
    finally { patched.mock.restore(); listenMock.mock.restore(); }
    assert.equal(activeServer.listening, false);
    await assert.rejects(fetch('http://127.0.0.1:' + address.port));
  });
});
