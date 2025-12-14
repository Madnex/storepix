# storepix

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

```bash
npx storepix init
```

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
npx storepix generate --skip-validation    # Skip dimension validation

# Preview
npx storepix preview                   # Start preview server
npx storepix preview --watch           # Enable hot reload
npx storepix preview --open            # Open browser at device size
npx storepix preview --device ipad-13  # Preview specific device

# Templates
npx storepix add-template split        # Add a template to your project
npx storepix upgrade                   # Upgrade templates to latest version
npx storepix upgrade --dry-run         # Preview changes without applying

# Testing
npx storepix test-template default     # Test template across all devices
npx storepix test-template fun --device iphone-6.5  # Test specific device
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

## Templates

### `default`
Gradient background with device mockup and decorative blur elements. Great for marketing screenshots.

### `minimal`
Solid color background with device mockup. Clean and professional.

### `plain`
Screenshot only, no device frame. Useful for Play Store or custom framing.

### `photo`
Background image support with device mockup. For lifestyle or contextual shots.

### `split`
Side-by-side text and device layout. Works well for iPad and landscape.

### `fun`
Rotated device at an angle with panorama support. Eye-catching and playful.

Add templates to your project:

```bash
npx storepix add-template photo
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

Changes to templates, CSS, or config automatically refresh the browser.

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
