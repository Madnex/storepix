import sharp from 'sharp';
import { StorepixError } from './errors.js';
import { validateScreenshot } from './validation.js';

/** Wait for a template's async work, fonts, image decoding, and CSS image assets. */
export async function readyForCapture(page, timeout = 15000) {
  await page.evaluate(async timeout => {
    let timer;
    const ready = async () => {
      await window.storepixReady;
      if (window.storepixRenderError) throw new Error(window.storepixRenderError);
      // Compatibility for older bundled templates without storepixReady.
      const params = new URLSearchParams(location.search);
      if (params.get('statusBar') === 'true' && document.querySelector('#status-bar-container') && !document.querySelector('#status-bar')) {
        await new Promise(resolve => {
          const observer = new MutationObserver(() => {
            if (document.querySelector('#status-bar')) { observer.disconnect(); resolve(); }
          });
          observer.observe(document.documentElement, { subtree: true, childList: true });
        });
      }
      await document.fonts.ready;
      for (const font of document.fonts) if (font.status === 'error') throw new Error(`Font failed: ${font.family}`);
      await Promise.all([...document.images].filter(img => img.getAttribute('src') && getComputedStyle(img).display !== 'none').map(img => img.decode()));
      const urls = new Set();
      for (const el of document.querySelectorAll('*')) {
        for (const pseudo of [null, '::before', '::after']) {
          const style = getComputedStyle(el, pseudo);
          for (const field of ['backgroundImage', 'maskImage', 'borderImageSource']) {
            for (const match of style[field].matchAll(/url\(["']?(.*?)["']?\)/g)) urls.add(match[1]);
          }
        }
      }
      await Promise.all([...urls].map(src => { const img = new Image(); img.src = src; return img.decode(); }));
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    };
    try {
      await Promise.race([ready(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Template readiness timed out')), timeout); })]);
    } finally { clearTimeout(timer); }
  }, timeout);
}

export async function renderJob(browser, baseUrl, job, { timeout = 15000, onExternalRequest } = {}) {
  const context = await browser.newContext({ viewport: job.viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  try {
    const page = await context.newPage();
    const failures = [];
    page.on('request', request => {
      if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(baseUrl).origin) onExternalRequest?.(request.url());
    });
    page.on('pageerror', error => failures.push(error.message));
    page.on('requestfailed', request => failures.push(`${request.url()}: ${request.failure()?.errorText}`));
    page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
    await page.goto(baseUrl + job.url, { waitUntil: 'load', timeout });
    await readyForCapture(page, timeout);
    if (failures.length) throw new Error(failures.join('\n'));
    const panorama = await captureStable(page, job.viewport, timeout);
    if (failures.length) throw new Error(failures.join('\n'));
    const images = [];
    for (let i = 0; i < job.slices; i++) {
      const image = await sharp(panorama).extract({ left: i * job.device.width, top: 0, width: job.device.width, height: job.device.height })
        .flatten({ background: '#fff' }).removeAlpha().toColourspace('srgb').png({ compressionLevel: 9 }).toBuffer();
      const validation = await validateScreenshot(image, job.device, { output: true, uploadTarget: job.uploadTarget });
      if (!validation.valid) throw new Error(validation.errors.join('\n'));
      images.push(image);
    }
    return images;
  } catch (cause) {
    throw new StorepixError('RENDER', `${job.id} (${job.deviceKey}${job.locale ? `, ${job.locale}` : ''}): ${cause.message}`, { cause });
  } finally { await context.close(); }
}

/** Drain active work before rejecting, so callers can safely close shared resources. */
export async function runPool(items, concurrency, run) {
  let next = 0, failure;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (!failure && next < items.length) {
      const index = next++;
      try { await run(items[index], index); } catch (error) { failure ??= error; }
    }
  }));
  if (failure) throw failure;
}

// Require two matching frames instead of a fixed delay. Browser/OS rasterization
// may still differ between runs; this detects changing artwork within a job.
async function captureStable(page, viewport, timeout) {
  const deadline = Date.now() + timeout;
  let previous;
  while (Date.now() < deadline) {
    const image = await page.screenshot({ type: 'png', animations: 'disabled', caret: 'hide', timeout: Math.max(1, deadline - Date.now()),
      clip: { x: 0, y: 0, ...viewport } });
    if (previous?.equals(image)) return image;
    previous = image;
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  }
  throw new Error('Artwork did not settle before capture timeout');
}
