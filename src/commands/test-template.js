import { chromium } from 'playwright';
import { createServer } from 'http';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import handler from 'serve-handler';
import { devices, deviceList, getDevice } from '../devices/index.js';
import { getAvailableTemplates } from '../utils/template-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageTemplatesDir = join(__dirname, '..', 'templates');

// Representative devices for testing (covers key variations)
const REPRESENTATIVE_DEVICES = [
  'iphone-6.5',    // Main iPhone size (required for App Store)
  'iphone-5.5',    // Home button variant (no notch)
  'ipad-13',       // iPad (required for iPad apps)
  'android-phone', // Android
];

// Default variant if no test-variants.js exists
const DEFAULT_VARIANTS = [
  { name: 'default', headline: 'Feature Title', subheadline: 'Description text goes here' }
];

/**
 * Load test variants from template's test-variants.js
 */
async function loadVariants(template) {
  const variantsPath = join(packageTemplatesDir, template, 'test-variants.js');

  if (existsSync(variantsPath)) {
    try {
      const module = await import(pathToFileURL(variantsPath).href);
      return module.default || DEFAULT_VARIANTS;
    } catch (err) {
      console.log(`  Warning: Failed to load test-variants.js: ${err.message}`);
      return DEFAULT_VARIANTS;
    }
  }

  return DEFAULT_VARIANTS;
}

/**
 * Start HTTP server to serve templates and mock screenshots
 */
function startServer(templatesDir, mockDir, template) {
  return new Promise((resolvePromise) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, 'http://localhost');

      // Serve mock screenshots at /mock/*
      if (url.pathname.startsWith('/mock/')) {
        const filename = url.pathname.replace('/mock/', '');
        return handler(req, res, {
          public: mockDir,
          rewrites: [{ source: `/mock/${filename}`, destination: `/${filename}` }]
        });
      }

      // Serve templates
      await handler(req, res, {
        public: templatesDir,
        directoryListing: false,
        cleanUrls: false,
        rewrites: [
          { source: '/', destination: `/${template}/index.html` },
          { source: '/index.html', destination: `/${template}/index.html` },
          { source: '/styles.css', destination: `/${template}/styles.css` },
          { source: '/status-bar/ios.html', destination: '/status-bar/ios.html' },
          { source: '/status-bar/android.html', destination: '/status-bar/android.html' },
          { source: '/status-bar/styles.css', destination: '/status-bar/styles.css' },
        ]
      });
    });

    let port = 4567;
    const tryListen = () => {
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          port++;
          tryListen();
        }
      });
      server.listen(port, () => {
        resolvePromise({ server, port });
      });
    };
    tryListen();
  });
}

/**
 * Generate mock screenshot for a device
 */
async function generateMockScreenshot(page, device, deviceKey, outputPath) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: ${device.width}px;
          height: ${device.height}px;
          background: linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 50%, #e8e8e8 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .device-name {
          font-size: ${Math.round(device.width * 0.055)}px;
          font-weight: 600;
          color: #555;
          margin-bottom: ${Math.round(device.height * 0.015)}px;
        }
        .dimensions {
          font-size: ${Math.round(device.width * 0.04)}px;
          color: #777;
          font-weight: 500;
        }
        .device-key {
          font-size: ${Math.round(device.width * 0.03)}px;
          color: #999;
          margin-top: ${Math.round(device.height * 0.01)}px;
          font-family: ui-monospace, monospace;
        }
      </style>
    </head>
    <body>
      <div class="device-name">${device.name}</div>
      <div class="dimensions">${device.width} × ${device.height}</div>
      <div class="device-key">${deviceKey}</div>
    </body>
    </html>
  `;

  await page.setViewportSize({ width: device.width, height: device.height });
  await page.setContent(html);
  await page.screenshot({ path: outputPath, type: 'png' });
}

/**
 * Render a single variant for a device
 */
async function renderVariant(browser, baseUrl, mockDir, renderDir, deviceKey, variant) {
  const device = getDevice(deviceKey);
  const slices = variant.slices || 1;
  const isPanorama = slices > 1;

  const viewportWidth = device.width * slices;
  const viewportHeight = device.height;

  const ctx = await browser.newContext({
    viewport: { width: viewportWidth, height: viewportHeight },
    deviceScaleFactor: 1
  });
  const pg = await ctx.newPage();

  // Build URL with parameters
  const params = new URLSearchParams({
    screenshot: `/mock/${deviceKey}.png`,
    headline: variant.headline || 'Feature Title',
    subheadline: variant.subheadline || 'Description text goes here',
    theme: variant.theme || 'light',
    layout: variant.layout || 'top',
    slices: slices.toString(),
    deviceWidth: device.width.toString(),
    deviceHeight: device.height.toString(),
    platform: device.platform,
    notchType: device.frame?.notch?.type || 'none',
    notchWidth: (device.frame?.notch?.width || 0).toString(),
    notchHeight: (device.frame?.notch?.height || 0).toString(),
    hasHomeButton: (device.frame?.homeButton || false).toString(),
  });

  // Add headlines/subheadlines arrays for panorama mode
  if (isPanorama && variant.headlines) {
    params.set('headlines', JSON.stringify(variant.headlines));
  }
  if (isPanorama && variant.subheadlines) {
    params.set('subheadlines', JSON.stringify(variant.subheadlines));
  }

  await pg.goto(`${baseUrl}?${params.toString()}`, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(500);

  const results = [];

  if (isPanorama) {
    // Capture each slice
    for (let i = 0; i < slices; i++) {
      const filename = `${variant.name}-${deviceKey}-${i + 1}.png`;
      const outputPath = join(renderDir, filename);

      await pg.screenshot({
        path: outputPath,
        type: 'png',
        clip: {
          x: i * device.width,
          y: 0,
          width: device.width,
          height: device.height
        }
      });

      results.push({
        variantName: variant.name,
        deviceKey,
        device,
        filename,
        sliceIndex: i + 1,
        totalSlices: slices,
        variant
      });
    }
  } else {
    const filename = `${variant.name}-${deviceKey}.png`;
    const outputPath = join(renderDir, filename);

    await pg.screenshot({
      path: outputPath,
      type: 'png',
      clip: { x: 0, y: 0, width: device.width, height: device.height }
    });

    results.push({
      variantName: variant.name,
      deviceKey,
      device,
      filename,
      sliceIndex: null,
      totalSlices: 1,
      variant
    });
  }

  await ctx.close();
  return results;
}

/**
 * Generate HTML gallery page organized by variants
 */
function generateGalleryHtml(template, variants, results, outputDir) {
  // Group results by variant
  const byVariant = {};
  for (const r of results) {
    if (!byVariant[r.variantName]) {
      byVariant[r.variantName] = [];
    }
    byVariant[r.variantName].push(r);
  }

  const variantSections = variants.map(variant => {
    const variantResults = byVariant[variant.name] || [];
    const variantDesc = [];
    if (variant.theme) variantDesc.push(`theme: ${variant.theme}`);
    if (variant.layout) variantDesc.push(`layout: ${variant.layout}`);
    if (variant.slices) variantDesc.push(`slices: ${variant.slices}`);

    return `
    <section class="variant-section" data-variant="${variant.name}">
      <h2>
        <code>${variant.name}</code>
        ${variantDesc.length > 0 ? `<span class="variant-desc">${variantDesc.join(', ')}</span>` : ''}
      </h2>
      <div class="device-grid">
        ${variantResults.map(r => `
        <div class="device-card" data-platform="${r.device.platform}" data-variant="${r.variantName}">
          <img src="output/${r.filename}" alt="${r.variantName} - ${r.device.name}" loading="lazy">
          <div class="device-info">
            <div class="device-name">${r.device.name}${r.totalSlices > 1 ? ` (slice ${r.sliceIndex}/${r.totalSlices})` : ''}</div>
            <div class="device-meta">${r.device.width} × ${r.device.height} &middot; <code>${r.deviceKey}</code></div>
          </div>
        </div>
        `).join('')}
      </div>
    </section>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>storepix - ${template} template test</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f7;
      color: #1d1d1f;
      line-height: 1.5;
      min-height: 100vh;
    }

    .header {
      background: #fff;
      border-bottom: 1px solid #d2d2d7;
      padding: 20px 40px;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .header h1 code {
      background: #e8e8ed;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 20px;
    }

    .header-meta {
      display: flex;
      gap: 24px;
      align-items: center;
      flex-wrap: wrap;
    }

    .stat {
      font-size: 14px;
      color: #6e6e73;
    }

    .stat strong {
      color: #1d1d1f;
    }

    .container {
      max-width: 1800px;
      margin: 0 auto;
      padding: 40px;
    }

    .variant-section {
      margin-bottom: 48px;
    }

    .variant-section h2 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #1d1d1f;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .variant-section h2 code {
      background: #0071e3;
      color: #fff;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 14px;
    }

    .variant-desc {
      font-size: 13px;
      font-weight: 400;
      color: #6e6e73;
    }

    .device-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 24px;
    }

    .device-card {
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }

    .device-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    }

    .device-card img {
      width: 100%;
      height: auto;
      display: block;
      background: #f5f5f7;
    }

    .device-info {
      padding: 14px 16px;
    }

    .device-name {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .device-meta {
      font-size: 12px;
      color: #6e6e73;
    }

    .device-meta code {
      background: #f5f5f7;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 11px;
    }

    /* Modal */
    .modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.92);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }

    .modal.active { display: flex; }

    .modal img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 8px;
    }

    .modal-close {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 44px;
      height: 44px;
      border: none;
      background: rgba(255,255,255,0.15);
      border-radius: 50%;
      color: #fff;
      font-size: 24px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .modal-close:hover {
      background: rgba(255,255,255,0.25);
    }

    .modal-info {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.75);
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      white-space: nowrap;
    }

    .modal-info code {
      background: rgba(255,255,255,0.15);
      padding: 2px 8px;
      border-radius: 4px;
      margin-left: 8px;
    }
  </style>
</head>
<body>
  <header class="header">
    <h1>Template: <code>${template}</code></h1>
    <div class="header-meta">
      <span class="stat"><strong>${variants.length}</strong> variant${variants.length > 1 ? 's' : ''}</span>
      <span class="stat"><strong>${results.length}</strong> images</span>
      <span class="stat">Devices: <strong>${REPRESENTATIVE_DEVICES.length}</strong></span>
    </div>
  </header>

  <main class="container">
    ${variantSections}
  </main>

  <div class="modal" id="modal">
    <button class="modal-close">&times;</button>
    <img src="" alt="">
    <div class="modal-info"></div>
  </div>

  <script>
    const cards = document.querySelectorAll('.device-card');
    const modal = document.getElementById('modal');
    const modalImg = modal.querySelector('img');
    const modalInfo = modal.querySelector('.modal-info');
    const modalClose = modal.querySelector('.modal-close');

    cards.forEach(card => {
      card.addEventListener('click', () => {
        const img = card.querySelector('img');
        const name = card.querySelector('.device-name').textContent;
        const variant = card.dataset.variant;

        modalImg.src = img.src;
        modalInfo.innerHTML = '<code>' + variant + '</code> ' + name;
        modal.classList.add('active');
      });
    });

    modalClose.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') modal.classList.remove('active');
    });
  </script>
</body>
</html>`;

  writeFileSync(join(outputDir, 'index.html'), html);
}

/**
 * Open gallery in browser
 */
async function openGallery(galleryPath) {
  try {
    const browser = await chromium.launch({
      headless: false,
      args: ['--window-size=1400,950']
    });

    const context = await browser.newContext({
      viewport: { width: 1400, height: 900 }
    });

    const page = await context.newPage();
    await page.goto(`file://${galleryPath}`);

    return async () => browser.close();
  } catch {
    return null;
  }
}

export async function testTemplate(template, options) {
  // Validate template
  const availableTemplates = getAvailableTemplates();
  if (!availableTemplates.includes(template)) {
    console.log(`\n  Error: Unknown template "${template}"`);
    console.log(`\n  Available templates:`);
    console.log(`    ${availableTemplates.join(', ')}\n`);
    process.exit(1);
  }

  const outputDir = resolve(options.output || './.storepix-test');
  const shouldOpen = options.open !== false;

  // Use representative devices unless specific device requested
  const deviceKeys = options.device ? [options.device] : REPRESENTATIVE_DEVICES;

  // Validate device if specified
  if (options.device && !devices[options.device]) {
    console.log(`\n  Error: Unknown device "${options.device}"`);
    console.log(`\n  Available devices:`);
    const iosDevices = deviceList.filter(k => devices[k].platform === 'ios');
    const androidDevices = deviceList.filter(k => devices[k].platform === 'android');
    console.log(`    iOS: ${iosDevices.join(', ')}`);
    console.log(`    Android: ${androidDevices.join(', ')}\n`);
    process.exit(1);
  }

  // Load variants
  const variants = await loadVariants(template);

  console.log(`\n  storepix test-template\n`);
  console.log(`  Template: ${template}`);
  console.log(`  Variants: ${variants.length} (${variants.map(v => v.name).join(', ')})`);
  console.log(`  Devices: ${deviceKeys.length} (${deviceKeys.join(', ')})`);
  console.log(`  Output: ${outputDir}\n`);

  // Clean and create output directory
  if (existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true });
  }
  mkdirSync(outputDir, { recursive: true });

  const mockDir = join(outputDir, 'mock-screenshots');
  const renderDir = join(outputDir, 'output');
  mkdirSync(mockDir, { recursive: true });
  mkdirSync(renderDir, { recursive: true });

  const browser = await chromium.launch();
  const results = [];

  try {
    // Phase 1: Generate mock screenshots
    console.log('  Generating mock screenshots...');
    const context = await browser.newContext();
    const page = await context.newPage();

    for (const deviceKey of deviceKeys) {
      const device = getDevice(deviceKey);
      const mockPath = join(mockDir, `${deviceKey}.png`);
      await generateMockScreenshot(page, device, deviceKey, mockPath);
      process.stdout.write(`    ${deviceKey}\r`);
    }
    await context.close();
    console.log(`  Generated ${deviceKeys.length} mock screenshots\n`);

    // Phase 2: Start server and render all variants
    console.log('  Rendering variants...');
    const { server, port } = await startServer(packageTemplatesDir, mockDir, template);
    const baseUrl = `http://localhost:${port}`;

    let totalRendered = 0;
    for (const variant of variants) {
      for (const deviceKey of deviceKeys) {
        const variantResults = await renderVariant(browser, baseUrl, mockDir, renderDir, deviceKey, variant);
        results.push(...variantResults);
        totalRendered += variantResults.length;
        process.stdout.write(`    ${variant.name}/${deviceKey} (${totalRendered} images)\r`);
      }
    }

    server.close();
    console.log(`  Rendered ${results.length} screenshots\n`);

    // Phase 3: Generate gallery HTML
    console.log('  Creating gallery...');
    generateGalleryHtml(template, variants, results, outputDir);
    const galleryPath = join(outputDir, 'index.html');
    console.log(`  Gallery: ${galleryPath}\n`);

    // Phase 4: Open in browser
    if (shouldOpen) {
      const closeBrowser = await openGallery(galleryPath);

      if (closeBrowser) {
        console.log('  Browser opened. Press Ctrl+C to close.\n');

        process.on('SIGINT', async () => {
          console.log('\n  Closing...');
          await closeBrowser();
          process.exit(0);
        });

        // Keep process alive
        await new Promise(() => {});
      } else {
        console.log(`  Open in browser: file://${galleryPath}\n`);
      }
    } else {
      console.log(`  Done! Open the gallery:\n`);
      console.log(`    file://${galleryPath}\n`);
    }

  } finally {
    await browser.close();
  }
}
