# storepix

Generate beautiful App Store screenshots with HTML/CSS templates.

## Features

- **Quick start**: Initialize, configure, generate - done!
- **Full control**: Templates are plain HTML/CSS in your project - customize everything
- **Multiple devices**: Generate all required iOS sizes at once
- **Localization**: Generate screenshots in multiple languages
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
  devices: ['iphone-6.5'],

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
npx storepix init                     # Initialize project
npx storepix init --template minimal  # Use different template
npx storepix generate                 # Generate all screenshots
npx storepix generate --device iphone-6.9  # Single device
npx storepix generate --locale de     # Single locale
npx storepix preview                  # Start preview server
```

## Device Sizes

| Key | Size | Dimensions | Device |
|-----|------|------------|--------|
| `iphone-6.9` | 6.9" | 1320x2868 | iPhone 16 Pro Max |
| `iphone-6.7` | 6.7" | 1290x2796 | iPhone 15 Pro Max |
| `iphone-6.5` | 6.5" | 1284x2778 | iPhone 14 Pro Max |
| `iphone-5.5` | 5.5" | 1242x2208 | iPhone 8 Plus |

## Templates

### `default`
Clean gradient background with device mockup and decorative blur elements.

### `minimal`
Simple solid background with device mockup. Clean and professional.

## Customization

Templates are plain HTML/CSS - modify anything:

- Add Tailwind via CDN
- Use custom fonts
- Create animations
- Restructure the layout
- Copy a template and make your own

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

## License

MIT
