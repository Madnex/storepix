import { chromium } from 'playwright';
import { createServer } from 'http';
import { existsSync, mkdirSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { pathToFileURL } from 'url';
import handler from 'serve-handler';
import { devices, getDevice } from '../devices/index.js';
import { validateAllScreenshots, printValidationResults } from '../utils/validation.js';
import { templateExistsInProject, tryAddTemplate, getAvailableTemplates } from '../utils/template-helper.js';

/**
 * Start a local HTTP server to serve template files
 * This is needed because fetch() doesn't work with file:// URLs
 */
function startServer(configDir, template) {
  return new Promise((resolvePromise) => {
    const server = createServer(async (req, res) => {
      await handler(req, res, {
        public: configDir,
        directoryListing: false,
        cleanUrls: false,
        trailingSlash: false,
        rewrites: [
          { source: '/', destination: `/templates/${template}/index.html` },
          { source: '/index.html', destination: `/templates/${template}/index.html` },
          { source: '/styles.css', destination: `/templates/${template}/styles.css` },
          // Custom content helper script
          { source: '/storepix-content.js', destination: '/templates/storepix-content.js' },
          // Status bar files - explicit rewrites for each file
          { source: '/status-bar/ios.html', destination: '/templates/status-bar/ios.html' },
          { source: '/status-bar/android.html', destination: '/templates/status-bar/android.html' },
          { source: '/status-bar/styles.css', destination: '/templates/status-bar/styles.css' },
        ]
      });
    });

    // Find available port starting from 3456
    let port = 3456;
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

export async function generate(options) {
  const configPath = resolve(options.config);

  // Load config
  if (!existsSync(configPath)) {
    console.log(`\n  Error: Config file not found`);
    console.log(`    Path: ${configPath}`);
    console.log(`\n  Tip: Run "npx storepix init" to create a new project.\n`);
    process.exit(1);
  }

  const configDir = dirname(configPath);

  let config;
  try {
    config = (await import(pathToFileURL(configPath).href)).default;
  } catch (err) {
    console.log(`\n  Error: Failed to load config file`);
    console.log(`    Path: ${configPath}`);
    console.log(`    ${err.message}\n`);
    process.exit(1);
  }

  console.log('\n  storepix - Generating App Store Screenshots\n');

  // Validate screenshots array exists
  if (!config.screenshots || !Array.isArray(config.screenshots) || config.screenshots.length === 0) {
    console.log(`  Error: No screenshots defined in config`);
    console.log(`    Add a "screenshots" array to your storepix.config.js\n`);
    process.exit(1);
  }

  // Validate screenshot source files exist
  const missingScreenshots = [];
  for (const screenshot of config.screenshots) {
    if (!screenshot.source) {
      console.log(`  Error: Screenshot "${screenshot.id}" is missing a "source" path\n`);
      process.exit(1);
    }
    const sourcePath = join(configDir, screenshot.source);
    if (!existsSync(sourcePath)) {
      missingScreenshots.push({ id: screenshot.id, path: sourcePath, source: screenshot.source });
    }
  }

  if (missingScreenshots.length > 0) {
    console.log(`  Error: Screenshot source files not found\n`);
    for (const missing of missingScreenshots) {
      console.log(`    - ${missing.id}: ${missing.source}`);
      console.log(`      Expected at: ${missing.path}`);
    }
    console.log(`\n  Tip: Add your app screenshots to the "screenshots" folder.\n`);
    process.exit(1);
  }

  // Determine devices to generate
  const deviceKeys = options.device
    ? [options.device]
    : (config.devices || ['iphone-6.5']);

  // Validate devices
  for (const key of deviceKeys) {
    if (!devices[key]) {
      console.log(`  Error: Unknown device "${key}"`);
      console.log(`\n  Available devices:`);
      const iosDevices = Object.entries(devices).filter(([_, d]) => d.platform === 'ios');
      const androidDevices = Object.entries(devices).filter(([_, d]) => d.platform === 'android');
      console.log(`    iOS: ${iosDevices.map(([k]) => k).join(', ')}`);
      console.log(`    Android: ${androidDevices.map(([k]) => k).join(', ')}\n`);
      process.exit(1);
    }
  }

  // Determine locales
  const locales = options.locale
    ? [options.locale]
    : (config.locales ? Object.keys(config.locales) : [null]);

  // Validate specified locale exists
  if (options.locale && config.locales && !config.locales[options.locale]) {
    console.log(`  Error: Unknown locale "${options.locale}"`);
    console.log(`    Available: ${Object.keys(config.locales).join(', ')}\n`);
    process.exit(1);
  }

  // Determine template (CLI option overrides config)
  const template = options.template || config.template || 'default';

  // Check if template exists in project, try to add it if not
  if (!templateExistsInProject(configDir, template)) {
    console.log(`  Template "${template}" not found in project, attempting to add it...`);
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
  const htmlPath = join(templateDir, 'index.html');

  // Validate screenshot dimensions (unless skipped)
  if (!options.skipValidation) {
    console.log('  Validating screenshots...');
    const validation = validateAllScreenshots(config.screenshots, configDir, deviceKeys, devices);
    const { valid, hasWarnings } = printValidationResults(validation);

    if (!valid) {
      console.log('  Validation failed. Fix the errors above or use --skip-validation to proceed anyway.\n');
      process.exit(1);
    }

    if (!hasWarnings) {
      console.log('  All screenshots validated.\n');
    }
  }

  // Start local HTTP server (needed for fetch() to work in templates)
  const { server, port } = await startServer(configDir, template);
  const baseUrl = `http://localhost:${port}`;

  // Launch browser
  const browser = await chromium.launch();

  let totalGenerated = 0;

  try {
    for (const deviceKey of deviceKeys) {
      const device = getDevice(deviceKey);
      console.log(`  Device: ${device.name} (${device.width}x${device.height})`);

      const context = await browser.newContext({
        viewport: { width: device.width, height: device.height },
        deviceScaleFactor: 1
      });
      const page = await context.newPage();

      for (const locale of locales) {
        const localeSuffix = locale ? `/${locale}` : '';
        const outputBaseDir = join(
          configDir,
          config.output?.dir || './output',
          locale || '',
          deviceKey
        );

        // Ensure output directory exists
        mkdirSync(outputBaseDir, { recursive: true });

        if (locale) {
          console.log(`    Locale: ${locale}`);
        }

        for (const screenshot of config.screenshots) {
          // Get localized text if available
          let headline = screenshot.headline;
          let subheadline = screenshot.subheadline;
          let headlines = screenshot.headlines;
          let subheadlines = screenshot.subheadlines;

          if (locale && config.locales?.[locale]?.[screenshot.id]) {
            const localized = config.locales[locale][screenshot.id];
            headline = localized.headline || headline;
            subheadline = localized.subheadline || subheadline;
            headlines = localized.headlines || headlines;
            subheadlines = localized.subheadlines || subheadlines;
          }

          // Collect custom content (any keys not reserved by storepix)
          const reservedKeys = new Set([
            'id', 'source', 'theme', 'layout', 'slices',
            'headline', 'subheadline', 'headlines', 'subheadlines',
            'background'
          ]);
          const customContent = {};
          for (const [key, value] of Object.entries(screenshot)) {
            if (!reservedKeys.has(key)) {
              customContent[key] = value;
            }
          }
          // Merge with locale overrides for custom content
          if (locale && config.locales?.[locale]?.[screenshot.id]) {
            const localized = config.locales[locale][screenshot.id];
            for (const [key, value] of Object.entries(localized)) {
              if (!reservedKeys.has(key)) {
                customContent[key] = value;
              }
            }
          }

          // Determine number of slices (for panorama mode)
          const slices = screenshot.slices || 1;
          const isPanorama = slices > 1;

          // Build URL parameters
          // Use relative path for screenshot so it's served via HTTP
          const params = new URLSearchParams({
            screenshot: screenshot.source,
            background: screenshot.background || '',
            headline: headline || '',
            subheadline: subheadline || '',
            theme: screenshot.theme || 'light',
            layout: screenshot.layout || 'top',
            // Pass device info for CSS scaling
            deviceWidth: device.width.toString(),
            deviceHeight: device.height.toString(),
            // Pass device frame info for template customization
            platform: device.platform || 'ios',
            notchType: device.frame?.notch?.type || 'none',
            notchWidth: (device.frame?.notch?.width || 0).toString(),
            notchHeight: (device.frame?.notch?.height || 0).toString(),
            hasHomeButton: (device.frame?.homeButton || false).toString(),
            // Panorama/slicing
            slices: slices.toString(),
            // Status bar configuration
            statusBar: (config.statusBar?.enabled ?? false).toString(),
            statusBarTime: config.statusBar?.time || '9:41',
            statusBarBattery: (config.statusBar?.battery ?? 100).toString(),
            statusBarShowPercent: (config.statusBar?.showBatteryPercent ?? true).toString(),
            statusBarStyle: config.statusBar?.style || 'auto',
            // Pass theme variables
            ...(config.theme && { themeJson: JSON.stringify(config.theme) })
          });

          // Add headlines/subheadlines arrays for panorama mode
          if (isPanorama && headlines) {
            params.set('headlines', JSON.stringify(headlines));
          }
          if (isPanorama && subheadlines) {
            params.set('subheadlines', JSON.stringify(subheadlines));
          }

          // Add custom content for data-storepix bindings
          if (Object.keys(customContent).length > 0) {
            params.set('customContent', JSON.stringify(customContent));
          }

          const url = `${baseUrl}?${params.toString()}`;

          // For panorama, we need a wider viewport
          if (isPanorama) {
            await page.setViewportSize({
              width: device.width * slices,
              height: device.height
            });
          }

          await page.goto(url, { waitUntil: 'networkidle' });

          // Wait for screenshot image to load with better error handling
          const imgSelector = '#screenshot-img';
          try {
            await page.waitForSelector(imgSelector, { state: 'visible', timeout: 5000 });
          } catch {
            console.log(`      Warning: Screenshot image element not found in template`);
          }

          const imageLoadResult = await page.evaluate(() => {
            return new Promise((resolve) => {
              const img = document.getElementById('screenshot-img');
              if (!img) {
                resolve({ success: true, reason: 'no-img-element' });
                return;
              }
              if (img.complete && img.naturalWidth > 0) {
                resolve({ success: true, width: img.naturalWidth, height: img.naturalHeight });
              } else if (img.complete && img.naturalWidth === 0) {
                resolve({ success: false, reason: 'image-load-failed' });
              } else {
                img.onload = () => resolve({ success: true, width: img.naturalWidth, height: img.naturalHeight });
                img.onerror = () => resolve({ success: false, reason: 'image-load-error' });
              }
            });
          });

          if (!imageLoadResult.success) {
            console.log(`      Warning: Failed to load image for ${screenshot.id}`);
            console.log(`        Source: ${screenshot.source}`);
          }

          // Wait for status bar to load if enabled
          if (config.statusBar?.enabled) {
            await page.waitForTimeout(500);
          }

          // Small delay for any animations/rendering
          await page.waitForTimeout(300);

          if (isPanorama) {
            // Capture full panorama and slice it
            for (let i = 0; i < slices; i++) {
              const sliceId = `${screenshot.id}-${i + 1}`;
              const outputPath = join(outputBaseDir, `${sliceId}.png`);

              await page.screenshot({
                path: outputPath,
                type: 'png',
                clip: {
                  x: i * device.width,
                  y: 0,
                  width: device.width,
                  height: device.height
                }
              });

              const stats = statSync(outputPath);
              console.log(`      ${sliceId}.png (${(stats.size / 1024).toFixed(0)} KB)`);
              totalGenerated++;
            }

            // Reset viewport to normal size for next screenshot
            await page.setViewportSize({
              width: device.width,
              height: device.height
            });
          } else {
            // Normal single screenshot
            const outputPath = join(outputBaseDir, `${screenshot.id}.png`);
            await page.screenshot({
              path: outputPath,
              type: 'png',
              clip: { x: 0, y: 0, width: device.width, height: device.height }
            });

            const stats = statSync(outputPath);
            console.log(`      ${screenshot.id}.png (${(stats.size / 1024).toFixed(0)} KB)`);
            totalGenerated++;
          }
        }
      }

      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\n  Done! Generated ${totalGenerated} screenshots.\n`);
}
