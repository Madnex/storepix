import { chromium } from 'playwright';
import { createServer } from 'http';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import handler from 'serve-handler';
import { devices, deviceList, getDevice } from '../devices/index.js';
import { getAvailableTemplates } from '../utils/template-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageTemplatesDir = join(__dirname, '..', 'templates');

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
 * Generate HTML gallery page
 */
function generateGalleryHtml(template, results, outputDir) {
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

    .filters {
      display: flex;
      gap: 12px;
      margin-top: 16px;
    }

    .filter-btn {
      padding: 6px 14px;
      border: 1px solid #d2d2d7;
      border-radius: 20px;
      background: #fff;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .filter-btn:hover {
      border-color: #0071e3;
      color: #0071e3;
    }

    .filter-btn.active {
      background: #0071e3;
      border-color: #0071e3;
      color: #fff;
    }

    .container {
      max-width: 1800px;
      margin: 0 auto;
      padding: 40px;
    }

    .platform-section {
      margin-bottom: 48px;
    }

    .platform-section h2 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #1d1d1f;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .platform-badge {
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 4px;
    }

    .platform-badge.ios { background: #e3f2fd; color: #1976d2; }
    .platform-badge.android { background: #e8f5e9; color: #388e3c; }

    .device-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
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

    .device-card.hidden {
      display: none;
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
      <span class="stat"><strong>${results.length}</strong> devices tested</span>
      <span class="stat">iOS: <strong>${results.filter(r => r.device.platform === 'ios').length}</strong></span>
      <span class="stat">Android: <strong>${results.filter(r => r.device.platform === 'android').length}</strong></span>
    </div>
    <div class="filters">
      <button class="filter-btn active" data-filter="all">All</button>
      <button class="filter-btn" data-filter="ios">iOS</button>
      <button class="filter-btn" data-filter="android">Android</button>
      <button class="filter-btn" data-filter="iphone">iPhone</button>
      <button class="filter-btn" data-filter="ipad">iPad</button>
    </div>
  </header>

  <main class="container">
    <section class="platform-section" data-platform="ios">
      <h2><span class="platform-badge ios">iOS</span> iPhone & iPad</h2>
      <div class="device-grid">
        ${results.filter(r => r.device.platform === 'ios').map(r => `
        <div class="device-card" data-platform="${r.device.platform}" data-type="${r.deviceKey.startsWith('ipad') ? 'ipad' : 'iphone'}" data-device="${r.deviceKey}">
          <img src="output/${r.deviceKey}.png" alt="${r.device.name}" loading="lazy">
          <div class="device-info">
            <div class="device-name">${r.device.name} (${r.device.displaySize})</div>
            <div class="device-meta">${r.device.width} × ${r.device.height} &middot; <code>${r.deviceKey}</code></div>
          </div>
        </div>
        `).join('')}
      </div>
    </section>

    <section class="platform-section" data-platform="android">
      <h2><span class="platform-badge android">Android</span> Phone, Tablet & Wear</h2>
      <div class="device-grid">
        ${results.filter(r => r.device.platform === 'android').map(r => `
        <div class="device-card" data-platform="${r.device.platform}" data-type="android" data-device="${r.deviceKey}">
          <img src="output/${r.deviceKey}.png" alt="${r.device.name}" loading="lazy">
          <div class="device-info">
            <div class="device-name">${r.device.name} (${r.device.displaySize})</div>
            <div class="device-meta">${r.device.width} × ${r.device.height} &middot; <code>${r.deviceKey}</code></div>
          </div>
        </div>
        `).join('')}
      </div>
    </section>
  </main>

  <div class="modal" id="modal">
    <button class="modal-close">&times;</button>
    <img src="" alt="">
    <div class="modal-info"></div>
  </div>

  <script>
    // Filter functionality
    const filterBtns = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.device-card');
    const sections = document.querySelectorAll('.platform-section');

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;

        cards.forEach(card => {
          let show = false;
          if (filter === 'all') show = true;
          else if (filter === 'ios') show = card.dataset.platform === 'ios';
          else if (filter === 'android') show = card.dataset.platform === 'android';
          else if (filter === 'iphone') show = card.dataset.type === 'iphone';
          else if (filter === 'ipad') show = card.dataset.type === 'ipad';

          card.classList.toggle('hidden', !show);
        });

        // Hide empty sections
        sections.forEach(section => {
          const hasVisible = section.querySelectorAll('.device-card:not(.hidden)').length > 0;
          section.style.display = hasVisible ? '' : 'none';
        });
      });
    });

    // Modal functionality
    const modal = document.getElementById('modal');
    const modalImg = modal.querySelector('img');
    const modalInfo = modal.querySelector('.modal-info');
    const modalClose = modal.querySelector('.modal-close');

    cards.forEach(card => {
      card.addEventListener('click', () => {
        const img = card.querySelector('img');
        const name = card.querySelector('.device-name').textContent;
        const meta = card.querySelector('.device-meta');
        const deviceKey = card.dataset.device;

        modalImg.src = img.src;
        modalInfo.innerHTML = name + '<code>' + deviceKey + '</code>';
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
  const deviceKeys = options.device ? [options.device] : deviceList;

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

  console.log(`\n  storepix test-template\n`);
  console.log(`  Template: ${template}`);
  console.log(`  Devices: ${deviceKeys.length}`);
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

    // Phase 2: Start server and render template for each device
    console.log('  Rendering template for each device...');
    const { server, port } = await startServer(packageTemplatesDir, mockDir, template);
    const baseUrl = `http://localhost:${port}`;

    for (const deviceKey of deviceKeys) {
      const device = getDevice(deviceKey);

      const ctx = await browser.newContext({
        viewport: { width: device.width, height: device.height },
        deviceScaleFactor: 1
      });
      const pg = await ctx.newPage();

      // Build URL with parameters
      const params = new URLSearchParams({
        screenshot: `/mock/${deviceKey}.png`,
        headline: 'Feature Title',
        subheadline: 'Description text goes here',
        theme: 'light',
        layout: 'top',
        deviceWidth: device.width.toString(),
        deviceHeight: device.height.toString(),
        platform: device.platform,
        notchType: device.frame?.notch?.type || 'none',
        notchWidth: (device.frame?.notch?.width || 0).toString(),
        notchHeight: (device.frame?.notch?.height || 0).toString(),
        hasHomeButton: (device.frame?.homeButton || false).toString(),
      });

      await pg.goto(`${baseUrl}?${params.toString()}`, { waitUntil: 'networkidle' });
      await pg.waitForTimeout(500);

      const outputPath = join(renderDir, `${deviceKey}.png`);
      await pg.screenshot({
        path: outputPath,
        type: 'png',
        clip: { x: 0, y: 0, width: device.width, height: device.height }
      });

      await ctx.close();

      results.push({ deviceKey, device });
      process.stdout.write(`    ${deviceKey}\r`);
    }

    server.close();
    console.log(`  Rendered ${results.length} screenshots\n`);

    // Phase 3: Generate gallery HTML
    console.log('  Creating gallery...');
    generateGalleryHtml(template, results, outputDir);
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
