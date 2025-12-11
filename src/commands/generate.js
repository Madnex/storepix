import { chromium } from 'playwright';
import { existsSync, mkdirSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { pathToFileURL } from 'url';
import { devices, getDevice } from '../devices/index.js';

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

  // Template path
  const templateDir = join(configDir, 'templates', config.template || 'default');
  const htmlPath = join(templateDir, 'index.html');

  if (!existsSync(htmlPath)) {
    console.log(`  Error: Template not found`);
    console.log(`    Path: ${templateDir}`);
    console.log(`\n  Tip: Make sure your template folder contains an index.html file.`);
    console.log(`  Available templates: default, minimal, plain\n`);
    process.exit(1);
  }

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

          if (locale && config.locales?.[locale]?.[screenshot.id]) {
            const localized = config.locales[locale][screenshot.id];
            headline = localized.headline || headline;
            subheadline = localized.subheadline || subheadline;
          }

          // Build URL parameters
          const params = new URLSearchParams({
            screenshot: join(configDir, screenshot.source),
            headline,
            subheadline,
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
            // Pass theme variables
            ...(config.theme && { themeJson: JSON.stringify(config.theme) })
          });

          const url = `${pathToFileURL(htmlPath).href}?${params.toString()}`;

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

          // Small delay for any animations/rendering
          await page.waitForTimeout(300);

          // Take screenshot
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

      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`\n  Done! Generated ${totalGenerated} screenshots.\n`);
}
