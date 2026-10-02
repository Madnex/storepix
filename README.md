# storepix

[![npm version](https://img.shields.io/npm/v/storepix.svg)](https://www.npmjs.com/package/storepix)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/Madnex/storepix/actions/workflows/ci.yml/badge.svg)](https://github.com/Madnex/storepix/actions/workflows/ci.yml)

Generate beautiful App Store and Play Store screenshots with HTML/CSS templates.

## Features

- **Quick start**: Initialize, configure, generate - done!
- **Full control**: Templates are plain HTML/CSS in your project - customize everything
- **Multiple platforms**: iPhone, iPad, and Android device sizes included
- **Localization**: Generate screenshots in multiple languages
- **Live preview**: Watch mode with hot reload for rapid iteration
- **Status bar**: Optional iOS/Android status bar injection
- **Panorama mode**: Create multi-screenshot scrolling effects
- **No lock-in**: Your templates, your code, your rules

## Installation

Requires Node.js 22.12 or newer (Node.js 24 LTS recommended).

```bash
npx storepix init
npx playwright install chromium
```

After upgrading storepix, rerun the browser installation command to install
the Chromium revision required by the updated Playwright dependency.

This creates a `storepix/` folder in your project with:

```
storepix/
├── storepix.config.js    # Your configuration
├── screenshots/          # Put your app screenshots here
├── output/              # Generated images appear here
└── templates/
    └── default/         # Customize freely!
```

## Usage

### 1. Add your screenshots

Drop your app screenshots into `storepix/screenshots/`.

### 2. Configure

Edit `storepix.config.js`:

```javascript
export default {
  template: 'default',
  devices: ['iphone-6.9', 'iphone-6.5'],

  screenshots: [
    {
      id: '01_home',
      source: './screenshots/home.png',
      headline: 'Track your',
      subheadline: 'daily moods',
      theme: 'light',
      layout: 'top',
    },
  ],

  theme: {
    primary: '#007AFF',
  },
};
```

### 3. Generate

```bash
npx storepix generate
```

Screenshots are saved to `storepix/output/`.

## Commands

```bash
# Initialize
npx storepix init                      # Initialize project
npx storepix init --template minimal   # Use different template

# Generate
npx storepix generate                  # Generate all screenshots
npx storepix generate --device iphone-6.9  # Single device
npx storepix generate --locale de      # Single locale
npx storepix generate --skip-validation    # Skip source/schema checks
npx storepix generate --concurrency 2      # Bounded parallel generation
npx storepix generate --no-parallel        # One render job at a time
npx storepix generate --orientation landscape
npx storepix generate --cache              # Reuse unchanged local artwork

# Preview
npx storepix preview                   # Start preview server
npx storepix preview --watch           # Enable hot reload
npx storepix preview --open            # Open browser at device size
npx storepix preview --device ipad-13  # Preview specific device

# Templates
npx storepix add-template photo        # Add a template to your project
npx storepix upgrade                   # Upgrade templates to latest version
npx storepix upgrade --dry-run         # Preview changes without applying

# TypeScript
npx storepix types                     # Generate TypeScript definitions

# Testing
npx storepix test-template default     # Test template across all devices
npx storepix test-template panorama --device iphone-6.5  # Test specific device
```

## Device Sizes

### iPhone (Required for App Store)

| Key | Size | Dimensions | Device |
|-----|------|------------|--------|
| `iphone-6.9` | 6.9" | 1320x2868 | iPhone 16 Pro Max |
| `iphone-6.7` | 6.7" | 1290x2796 | iPhone 15 Pro Max |
| `iphone-6.5` | 6.5" | 1284x2778 | iPhone 14 Plus |
| `iphone-6.3` | 6.3" | 1206x2622 | iPhone 16 Pro |
| `iphone-6.1` | 6.1" | 1179x2556 | iPhone 14 |
| `iphone-5.5` | 5.5" | 1242x2208 | iPhone 8 Plus |
| `iphone-4.7` | 4.7" | 750x1334 | iPhone SE |

App Store requires `iphone-6.9` or `iphone-6.5`. Other sizes auto-scale.

### iPad (Required for iPad apps)

| Key | Size | Dimensions | Device |
|-----|------|------------|--------|
| `ipad-13` | 13" | 2064x2752 | iPad Pro 13" |
| `ipad-12.9` | 12.9" | 2048x2732 | iPad Pro 12.9" |
| `ipad-11` | 11" | 1668x2388 | iPad Pro 11" |

App Store requires `ipad-13` for iPad apps.

### Android (Google Play)

| Key | Size | Dimensions | Device |
|-----|------|------------|--------|
| `android-phone` | 6.0" | 1080x1920 | Android Phone |
| `android-tablet-7` | 7" | 1080x1920 | Android Tablet 7" |
| `android-tablet-10` | 10" | 1200x1920 | Android Tablet 10" |
| `android-wear` | 1.4" | 384x384 | Wear OS |
| `android-feature-graphic` | - | 1024x500 | Feature Graphic |

The Feature Graphic is a promotional banner required for Google Play Store listings.

## Templates

<!-- templates:start -->
| Template | Description |
| --- | --- |
| `default` | Gradient background with decorative blur effects |
| `feature-graphic` | Android Play Store feature graphic (1024x500) |
| `minimal` | Clean solid-color background without decorative elements |
| `panorama` | Rotated device with panoramic screenshot support spanning multiple images |
| `photo` | Full-bleed background image with device frame overlay |
<!-- templates:end -->

Each template supports different configuration options. The `init` command generates template-specific config examples.

### `default`
Gradient background with device mockup and decorative blur elements. Great for marketing screenshots.

```javascript
{ headline: 'Title', subheadline: 'Description', theme: 'light', layout: 'top' }
```

### `minimal`
Solid color background with device mockup. Clean and professional.

```javascript
{ headline: 'Title', subheadline: 'Description', theme: 'light', layout: 'top' }
```

### `photo`
Background image support with device mockup. For lifestyle or contextual shots.

```javascript
{
  headline: 'Title',
  subheadline: 'Description',
  background: './backgrounds/lifestyle.jpg',  // Photo template only
}
```

### `panorama`

Rotated device at an angle with multi-slice panorama support. Eye-catching and playful.

```javascript
// Single mode
{ headline: 'Title', subheadline: 'Description', theme: 'light' }

// Panorama mode (generates multiple connected images)
{
  slices: 2,
  headlines: ['First', 'Second'],       // Array for panorama mode
  subheadlines: ['Desc 1', 'Desc 2'],   // Array for panorama mode
}
```

### `feature-graphic`

Google Play Store feature graphic (1024x500). Auto-selected when using `android-feature-graphic` device.

```javascript
{
  id: 'feature',
  headline: 'My App Name',
  subheadline: 'The best way to...',
  logo: './assets/app-icon.png',  // Optional app icon
  theme: 'light',
}
```

No `source` screenshot is needed - this template generates a promotional banner with your text and optional logo. The gradient background uses your `theme.primary` color.

Add templates to your project:

```bash
npx storepix add-template photo
```

## Config Validation

storepix validates your config against template schemas during generation:

```text
Config validation:
  ⚠ [01_home] Field "background" is only used by photo template, not "default"
  ✗ [02_hero] Panorama mode (slices > 1) requires "headlines" array
```

- **Errors** (✗) block generation until fixed
- **Warnings** (⚠) allow generation but notify you of potential issues

Use `--skip-validation` to bypass source and schema checks. Final output validation always runs.

## TypeScript Support

Generate TypeScript definitions for IDE autocomplete:

```bash
npx storepix types
```

This creates `storepix.d.ts` in your project. Add to your config file:

```javascript
// @ts-check
/** @type {import('./storepix.d.ts').StorepixConfig} */
export default {
  // IDE autocomplete works here!
};
```

## Customization

Templates are plain HTML/CSS - modify anything:

- Add Tailwind via CDN
- Use custom fonts
- Restructure the layout
- Copy a template and make your own

## Status Bar

Add a realistic iOS or Android status bar to your screenshots:

```javascript
export default {
  statusBar: {
    enabled: true,
    time: '9:41',
    battery: 100,
    showBatteryPercent: true,
    style: 'auto', // 'light', 'dark', or 'auto'
  },
  // ...
};
```

Note: Provide screenshots WITHOUT visible status bars for best results. The status bar is drawn on top of your screenshot.

## Panorama Mode

Create connected screenshots that span multiple App Store slides:

```javascript
export default {
  screenshots: [
    {
      id: 'panorama',
      source: './screenshots/wide-view.png',
      slices: 2,  // Split into 2 screenshots
      headlines: ['First Slide', 'Second Slide'],
      subheadlines: ['Description 1', 'Description 2'],
    },
  ],
};
```

This generates `panorama-1.png` and `panorama-2.png` that connect seamlessly.

## Localization

```javascript
export default {
  screenshots: [
    { id: 'home', headline: 'Track your', subheadline: 'moods' },
  ],

  locales: {
    en: {
      home: { headline: 'Track your', subheadline: 'moods' },
    },
    de: {
      home: { headline: 'Verfolge deine', subheadline: 'Stimmungen' },
    },
  },
};
```

Output:
```
output/
├── en/
│   └── iphone-6.5/
│       └── home.png
└── de/
    └── iphone-6.5/
        └── home.png
```

## Watch Mode

Enable hot reload for rapid template development:

```bash
npx storepix preview --watch --open
```

The preview includes screenshot, device, and locale selectors and uses the same render
parameters as export. Changes to templates, assets, or config refresh the selected
artwork. Invalid config edits appear as errors; fixing the file resumes preview.
The server listens only on 127.0.0.1.

## Upgrading Templates

When storepix releases template updates, upgrade your project:

```bash
npx storepix upgrade --dry-run   # Preview changes
npx storepix upgrade             # Apply updates
npx storepix upgrade --show-diff # See detailed changes
```

Your local modifications are backed up and can be merged manually.

## Testing Templates

Generate a visual gallery to test templates across all device sizes:

```bash
npx storepix test-template default
```

This creates mock screenshots for each device and opens a gallery in your browser for visual inspection.

## License

MIT

## Rendering and validation

PNG, JPEG, and WebP sources are decoded before rendering. Source images can have
any dimensions; smaller sources produce a scaling warning. Outputs are compressed
RGB PNGs with no alpha channel, validated against the selected canvas dimensions.
Panoramas are captured once, then split into adjacent images. Output files are
replaced atomically after validation. Failed jobs reject the command; already
completed jobs remain on disk.

Built-in templates bundle Inter under its SIL Open Font License, so they render
without Google Fonts. Custom fonts can be supplied with local CSS/font files;
Inter does not cover every writing system. Existing projects retain their
user-owned templates: run `storepix upgrade --force` to adopt the new template
code (review the backups if you have customizations).

Custom templates may set `window.storepixReady` to a Promise for asynchronous
layout or data work. Generation waits up to 15 seconds for that Promise, fonts,
image decoding, and CSS images. Rejected promises, browser script errors, missing
assets, and timeouts fail generation. Capture disables CSS animations, hides
the caret, and requires two matching frames. Small Chromium rasterization
differences can still occur between runs, especially on transformed edges;
byte-identical exports across browsers or operating systems are not guaranteed. Custom asynchronous work must be included in the ready Promise.

`--concurrency` is a maximum (default 2, range 1–8). Storepix reduces workers for
large canvases using a 24-million-pixel budget; this is a scheduling heuristic,
not a hard process memory limit. `--no-parallel` forces one worker.

`--cache` is opt-in for deterministic projects. It fingerprints local project
files, renderer code, and browser version, and verifies output hashes before reuse.
Changes to any project file conservatively invalidate jobs. Renders that request
external HTTP assets are not cached. Symlinked assets are not supported by the
cache. Disable caching when templates depend on time, randomness, environment
variables, or dependencies outside the project. Remove `.storepix-cache.json`
to clear the cache.

Upload display groups are defined separately in `src/devices/upload-targets.js`.
For compatibility, `iphone-6.1` retains its historical 1179×2556 canvas, which
belongs to Apple’s 6.3-inch upload group; `iphone-6.7` maps to the 6.9-inch group.

Device keys are rendering presets, not an exhaustive list of physical models or
store acceptance rules. `orientation: 'landscape'` swaps the preset dimensions
(except the fixed feature graphic). Check the current
[Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
and [Google Play asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151)
for submission requirements. Custom template layouts may need landscape tuning.

## JavaScript API

`generate({ config })` returns `{ files, workers, cached }` and rejects on errors.
`preview({ config, port: 0, watch: true })` returns `{ url, close }`; call
`await close()` when finished. Library commands throw instead of exiting the
host process. `StorepixError` exposes a `code` for configuration, source,
template, or render errors; underlying system errors can retain their native code.
The CLI reports errors and sets a nonzero exit code.

## Development checks

`npm test` runs unit and command integration tests. After installing Chromium,
`npm run test:render` exercises all templates offline, preview reloads, readiness
failures, panorama pixels, output validation, caching, and cleanup. CI runs these
on Ubuntu 24.04 using the locked Playwright browser and bundled fonts.
`npm run docs:templates` regenerates the template table from bundled schemas.
