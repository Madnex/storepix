import { chromium } from 'playwright';
import { existsSync, mkdirSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { pathToFileURL } from 'url';
import { devices, getDevice } from '../devices/index.js';

export async function generate(options) {
  const configPath = resolve(options.config);

  // Load config
  if (!existsSync(configPath)) {
    console.log(`\n  Config file not found: ${configPath}`);
    console.log('  Run "npx storepix init" first to create a project.\n');
    process.exit(1);
  }

  const configDir = dirname(configPath);
  const config = (await import(pathToFileURL(configPath).href)).default;

  console.log('\n  storepix - Generating App Store Screenshots\n');

  // Determine devices to generate
  const deviceKeys = options.device
    ? [options.device]
    : (config.devices || ['iphone-6.5']);

  // Validate devices
  for (const key of deviceKeys) {
    if (!devices[key]) {
      console.log(`  Unknown device: ${key}`);
      console.log(`  Available: ${Object.keys(devices).join(', ')}\n`);
      process.exit(1);
    }
  }

  // Determine locales
  const locales = options.locale
    ? [options.locale]
    : (config.locales ? Object.keys(config.locales) : [null]);

  // Template path
  const templateDir = join(configDir, 'templates', config.template || 'default');
  const htmlPath = join(templateDir, 'index.html');

  if (!existsSync(htmlPath)) {
    console.log(`  Template not found: ${templateDir}`);
    console.log('  Make sure your template has an index.html file.\n');
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
            // Pass theme variables
            ...(config.theme && { themeJson: JSON.stringify(config.theme) })
          });

          const url = `${pathToFileURL(htmlPath).href}?${params.toString()}`;

          await page.goto(url, { waitUntil: 'networkidle' });

          // Wait for screenshot image to load
          await page.waitForSelector('#screenshot-img', { state: 'visible' });
          await page.evaluate(() => {
            return new Promise((resolve) => {
              const img = document.getElementById('screenshot-img');
              if (img && img.complete) {
                resolve();
              } else if (img) {
                img.onload = resolve;
                img.onerror = resolve;
              } else {
                resolve();
              }
            });
          });

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
