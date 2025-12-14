# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

storepix is an npm CLI tool that generates App Store and Play Store screenshots using HTML/CSS templates. Users run `npx storepix init` to scaffold a project, customize templates, and run `npx storepix generate` to create screenshots.

## Build & Run Commands

```bash
npm install                    # Install dependencies
node src/cli.js --help         # Show CLI help
node src/cli.js init           # Initialize a new project
node src/cli.js generate       # Generate screenshots
node src/cli.js preview        # Start preview server
```

## Architecture

### Directory Structure

```
src/
├── cli.js              # CLI entry point (Commander.js)
├── index.js            # Public API exports
├── commands/
│   ├── init.js         # Scaffolds project with templates
│   ├── generate.js     # Runs Playwright to capture screenshots
│   └── preview.js      # Starts local preview server
├── devices/
│   └── index.js        # Device definitions (iOS, iPad, Android)
└── templates/
    ├── default/        # Gradient background with device frame
    ├── minimal/        # Solid background with device frame
    ├── plain/          # Screenshot only, no device frame
    ├── photo/          # Photo/image background with device frame
    └── split/          # Side-by-side text and device layout
```

### Key Patterns

**Templates are user-owned**: When `init` runs, templates are copied to the user's project. Users can modify HTML/CSS freely.

**Config-driven generation**: `storepix.config.js` defines screenshots, devices, locales, and theme variables.

**CSS scaling**: Templates use a `--scale` CSS variable to adapt layouts to different device dimensions. Base design is 1284x2778 (iPhone 6.5").

**URL parameters**: The generate command passes config to templates via URL query parameters including device info (platform, notchType, hasHomeButton) for adaptive rendering.

### Device Support

**iPhone:**
- `iphone-6.9`: 1320x2868 (iPhone 16 Pro Max) - Required for App Store
- `iphone-6.7`: 1290x2796 (iPhone 15 Pro Max)
- `iphone-6.5`: 1284x2778 (iPhone 14 Plus) - Required fallback
- `iphone-6.3`: 1206x2622 (iPhone 16 Pro)
- `iphone-6.1`: 1179x2556 (iPhone 14)
- `iphone-5.5`: 1242x2208 (iPhone 8 Plus) - Has home button, no notch
- `iphone-4.7`: 750x1334 (iPhone SE)

**iPad:**
- `ipad-13`: 2064x2752 (iPad Pro 13") - Required for iPad apps
- `ipad-12.9`: 2048x2732 (iPad Pro 12.9")
- `ipad-11`: 1668x2388 (iPad Pro 11")

**Android:**
- `android-phone`: 1080x1920 (9:16 portrait)
- `android-tablet-7`: 1080x1920 (7" tablet)
- `android-tablet-10`: 1200x1920 (10" tablet)
- `android-wear`: 384x384 (Wear OS, 1:1 square)

### Templates

| Template | Description | Use Case |
|----------|-------------|----------|
| `default` | Gradient background with decorative blurs | App Store marketing |
| `minimal` | Solid color background | Clean, simple look |
| `plain` | Screenshot only, no frame | Play Store, custom framing |
| `photo` | Background image support | Lifestyle/contextual shots |
| `split` | Side-by-side text + device | iPad, landscape-friendly |

### Dependencies

- `playwright` - Headless browser for screenshot capture
- `commander` - CLI framework
- `serve-handler` - Preview server

## Testing

Test projects are in `tmp/` (gitignored):

```bash
# Initialize test project
node src/cli.js init --dir ./tmp/test --template default

# Copy test screenshots
cp /path/to/screenshots/*.png ./tmp/test/screenshots/

# Generate screenshots
node src/cli.js generate --config ./tmp/test/storepix.config.js

# Preview template
node src/cli.js preview --config ./tmp/test/storepix.config.js
```

## Git Workflow

**Branches:**
- `main` - Production, protected, only merge via PR
- `development` - Active development

**Day-to-day:**
```bash
git checkout development
# make changes
git commit -m "feat: description"
git push
```

## Releasing

Releases are synced between GitHub and npm via git tags.

**1. Create release PR:**
```bash
gh pr create --base main --head development --title "Release vX.Y.Z"
```

**2. After PR merged, release:**
```bash
git checkout main
git pull
npm version patch|minor|major   # Updates package.json + creates git tag
npm publish                      # Publishes to npm
git push --follow-tags           # Pushes commit + tag to GitHub
```

**3. Create GitHub release (optional but recommended):**
```bash
gh release create v0.1.0 --generate-notes
```

This keeps versions aligned:
- `npm version` creates tag `v0.1.0`
- `npm publish` publishes version `0.1.0` to npm
- `gh release create v0.1.0` creates GitHub release from same tag
