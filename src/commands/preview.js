import { createServer } from 'http';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { pathToFileURL } from 'url';
import handler from 'serve-handler';
import { devices, getDevice, defaultDevice } from '../devices/index.js';
import { templateExistsInProject, tryAddTemplate, getAvailableTemplates } from '../utils/template-helper.js';

// SSE clients for watch mode
let sseClients = [];

/**
 * Send message to all SSE clients
 * @param {Object} data - Data to send
 */
function broadcastSSE(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(message);
    } catch {
      // Client disconnected
    }
  });
}

/**
 * Reload script to inject into HTML when watch mode is active
 */
const RELOAD_SCRIPT = `
<script>
(function() {
  var evtSource = new EventSource('/__storepix_sse');
  evtSource.onmessage = function(event) {
    try {
      var data = JSON.parse(event.data);
      if (data.type === 'reload') {
        console.log('[storepix] Reloading...', data.category || '');
        window.location.reload();
      }
    } catch (e) {
      console.error('[storepix] SSE parse error:', e);
    }
  };
  evtSource.onerror = function() {
    console.log('[storepix] Connection lost, reconnecting...');
  };
  console.log('[storepix] Watch mode active');
})();
</script>
`;

/**
 * Open browser window at device size using Playwright
 * @param {string} url - URL to open
 * @param {Object} device - Device definition with width/height
 * @param {number} slices - Number of slices for panorama mode (default 1)
 */
async function openBrowserWindow(url, device, slices = 1) {
  try {
    const { chromium } = await import('playwright');

    // For panorama mode, width is multiplied by slices
    const viewportWidth = device.width * slices;
    const viewportHeight = device.height;

    // Calculate a reasonable scale factor to fit on screen
    // Most screens are 1440-2560 wide, so we scale down large devices
    const maxWidth = 1600;
    const maxHeight = 900;
    const scale = Math.min(
      maxWidth / viewportWidth,
      maxHeight / viewportHeight,
      0.5 // Max 50% scale for readability
    );

    // Window size on screen (scaled down to fit)
    const windowWidth = Math.round(viewportWidth * scale);
    const windowHeight = Math.round(viewportHeight * scale);

    const sizeInfo = slices > 1
      ? `${windowWidth}x${windowHeight} (${Math.round(scale * 100)}% of ${viewportWidth}x${viewportHeight}, ${slices} slices)`
      : `${windowWidth}x${windowHeight} (${Math.round(scale * 100)}% of ${device.width}x${device.height})`;

    console.log(`  Opening browser at ${sizeInfo}`);

    const browser = await chromium.launch({
      headless: false,
      args: [
        `--window-size=${windowWidth + 16},${windowHeight + 100}`, // Add chrome UI space
      ]
    });

    // Use full device resolution for viewport, but scale display via deviceScaleFactor
    // This makes the template render at correct dimensions while fitting on screen
    const context = await browser.newContext({
      viewport: { width: viewportWidth, height: viewportHeight },
      deviceScaleFactor: scale, // Scale down the rendering
    });

    const page = await context.newPage();
    await page.goto(url);

    // Keep browser open - return cleanup function
    return async () => {
      await browser.close();
    };
  } catch (err) {
    console.log(`\n  Warning: Could not open browser window.`);
    console.log(`  Make sure Playwright is installed: npx playwright install chromium\n`);
    return null;
  }
}

export async function preview(options) {
  const configPath = resolve(options.config);
  const port = parseInt(options.port, 10);
  const watchMode = options.watch || false;
  const shouldOpen = options.open || false;
  const deviceKey = options.device;

  // Load config
  if (!existsSync(configPath)) {
    console.log(`\n  Config file not found: ${configPath}`);
    console.log('  Run "npx storepix init" first to create a project.\n');
    process.exit(1);
  }

  const configDir = dirname(configPath);
  let config = (await import(pathToFileURL(configPath).href)).default;

  // Determine template (CLI option overrides config)
  const template = options.template || config.template || 'default';

  // Check if template exists in project, try to add it if not
  if (!templateExistsInProject(configDir, template)) {
    console.log(`\n  Template "${template}" not found in project, attempting to add it...`);
    const result = tryAddTemplate(configDir, template);
    if (result.success) {
      console.log(`  ${result.message}\n`);
    } else {
      console.log(`\n  Error: ${result.message}`);
      console.log(`\n  Tip: Run "npx storepix add-template <name>" to add a template.`);
      console.log(`  Available templates: ${getAvailableTemplates().join(', ')}\n`);
      process.exit(1);
    }
  }

  const templateDir = join(configDir, 'templates', template);

  // Create server
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    const pathname = url.pathname;

    // SSE endpoint for watch mode
    if (watchMode && pathname === '/__storepix_sse') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      // Send initial ping
      res.write('data: {"type":"connected"}\n\n');

      sseClients.push(res);

      req.on('close', () => {
        sseClients = sseClients.filter(client => client !== res);
      });

      return;
    }

    // For watch mode, inject reload script into HTML responses
    if (watchMode && (pathname === '/' || pathname === '/index.html' || pathname.endsWith('.html'))) {
      try {
        let filePath;
        if (pathname === '/' || pathname === '/index.html') {
          filePath = join(configDir, 'templates', template, 'index.html');
        } else {
          filePath = join(configDir, pathname.slice(1));
        }

        if (existsSync(filePath)) {
          let html = readFileSync(filePath, 'utf-8');
          // Inject reload script before </body>
          if (html.includes('</body>')) {
            html = html.replace('</body>', `${RELOAD_SCRIPT}</body>`);
          } else {
            html += RELOAD_SCRIPT;
          }

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
          return;
        }
      } catch (err) {
        // Fall through to serve-handler
      }
    }

    // Default file serving
    try {
      await handler(req, res, {
        public: configDir,
        directoryListing: false,
        rewrites: [
          // Serve template index at root
          { source: '/', destination: `/templates/${template}/index.html` },
          { source: '/index.html', destination: `/templates/${template}/index.html` },
          // Serve template assets (CSS, JS, images) from template directory
          { source: '/styles.css', destination: `/templates/${template}/styles.css` },
          // Custom content helper script
          { source: '/storepix-content.js', destination: '/templates/storepix-content.js' },
          { source: '/status-bar/**', destination: `/templates/status-bar/**` },
        ]
      });
    } catch (err) {
      res.statusCode = 500;
      res.end('Server error');
    }
  });

  // Start file watcher in watch mode
  let watcher = null;
  if (watchMode) {
    try {
      const { FileWatcher, categorizeChange } = await import('../utils/watcher.js');

      const watchPaths = [
        join(configDir, 'templates'),
        join(configDir, 'screenshots'),
        configPath
      ];

      watcher = new FileWatcher(watchPaths).start();

      watcher.on('change', async ({ type, path }) => {
        const category = categorizeChange(path, configDir);
        const relativePath = path.replace(configDir, '').replace(/^[\/\\]/, '');

        console.log(`  [watch] ${type}: ${relativePath}`);

        // Reload config if config file changed
        if (category === 'config') {
          try {
            // Use timestamp to bust module cache
            const configUrl = `${pathToFileURL(configPath).href}?t=${Date.now()}`;
            config = (await import(configUrl)).default;
            console.log('  [watch] Config reloaded');
          } catch (err) {
            console.log(`  [watch] Config error: ${err.message}`);
          }
        }

        // Notify connected browsers to reload
        broadcastSSE({ type: 'reload', category, path: relativePath });
      });

      watcher.on('error', (err) => {
        console.log(`  [watch] Error: ${err.message}`);
      });

      watcher.on('ready', () => {
        console.log('  [watch] Watching for changes...\n');
      });

    } catch (err) {
      console.log(`\n  Warning: Watch mode requires chokidar package.`);
      console.log(`  Install it with: npm install chokidar\n`);
      console.log(`  Starting preview without watch mode...\n`);
    }
  }

  // Determine which device to use for browser window
  let selectedDevice = null;
  if (shouldOpen) {
    if (deviceKey) {
      selectedDevice = getDevice(deviceKey);
      if (!devices[deviceKey]) {
        console.log(`\n  Warning: Unknown device "${deviceKey}", using ${defaultDevice}`);
      }
    } else if (config.devices && config.devices.length > 0) {
      // Use first device from config
      selectedDevice = getDevice(config.devices[0]);
    } else {
      selectedDevice = getDevice(defaultDevice);
    }
  }

  let closeBrowser = null;

  server.listen(port, async () => {
    console.log(`\n  storepix preview server running\n`);
    console.log(`  Template: ${template}`);
    console.log(`  URL: http://localhost:${port}`);
    if (watchMode && watcher) {
      console.log(`  Watch mode: enabled`);
    }
    console.log();

    // Build URL with first screenshot and device params
    let previewUrl = `http://localhost:${port}`;
    let previewSlices = 1;
    if (config.screenshots && config.screenshots.length > 0) {
      const s = config.screenshots[0];
      previewSlices = s.slices || 1;

      const params = new URLSearchParams({
        screenshot: s.source,
        headline: s.headline || '',
        subheadline: s.subheadline || '',
        theme: s.theme || 'light',
        layout: s.layout || 'top',
        slices: previewSlices.toString()
      });

      // Add headlines/subheadlines arrays for panorama mode
      if (previewSlices > 1) {
        if (s.headlines) {
          params.set('headlines', JSON.stringify(s.headlines));
        }
        if (s.subheadlines) {
          params.set('subheadlines', JSON.stringify(s.subheadlines));
        }
      }

      // Add device parameters if opening browser
      if (shouldOpen && selectedDevice) {
        const device = selectedDevice;
        params.set('deviceWidth', device.width.toString());
        params.set('deviceHeight', device.height.toString());
        params.set('platform', device.platform);
        params.set('notchType', device.frame?.notch?.type || 'none');
        params.set('hasHomeButton', (device.frame?.homeButton || false).toString());

        // Add status bar params if enabled
        if (config.statusBar?.enabled) {
          params.set('statusBar', 'true');
          params.set('statusBarTime', config.statusBar?.time || '9:41');
          params.set('statusBarBattery', (config.statusBar?.battery ?? 100).toString());
          params.set('statusBarShowPercent', (config.statusBar?.showBatteryPercent ?? true).toString());
          params.set('statusBarStyle', config.statusBar?.style || 'auto');
        }

        // Add theme params
        if (config.theme) {
          params.set('themeJson', JSON.stringify(config.theme));
        }
      }

      previewUrl = `http://localhost:${port}?${params.toString()}`;
      const panoramaInfo = previewSlices > 1 ? ` (${previewSlices}-slice panorama)` : '';
      console.log(`  Preview first screenshot${panoramaInfo}:`);
      console.log(`  ${previewUrl}\n`);
    }

    // Open browser window if requested
    if (shouldOpen && selectedDevice) {
      closeBrowser = await openBrowserWindow(previewUrl, selectedDevice, previewSlices);
    }

    console.log('  Press Ctrl+C to stop\n');
  });

  // Cleanup on exit
  process.on('SIGINT', async () => {
    console.log('\n  Shutting down...');
    if (closeBrowser) await closeBrowser();
    if (watcher) watcher.stop();
    server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    if (closeBrowser) await closeBrowser();
    if (watcher) watcher.stop();
    server.close();
    process.exit(0);
  });
}
