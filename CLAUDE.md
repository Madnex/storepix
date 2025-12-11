# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

storepix is an npm CLI tool that generates App Store screenshots using HTML/CSS templates. Users run `npx storepix init` to scaffold a project, customize templates, and run `npx storepix generate` to create screenshots.

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
│   └── index.js        # iOS device definitions (dimensions, frame specs)
└── templates/
    ├── default/        # Gradient background template
    │   ├── index.html
    │   └── styles.css
    └── minimal/        # Solid background template
        ├── index.html
        └── styles.css
```

### Key Patterns

**Templates are user-owned**: When `init` runs, templates are copied to the user's project. Users can modify HTML/CSS freely.

**Config-driven generation**: `storepix.config.js` defines screenshots, devices, locales, and theme variables.

**CSS scaling**: Templates use a `--scale` CSS variable to adapt layouts to different device dimensions. Base design is 1284x2778 (iPhone 6.5").

**URL parameters**: The generate command passes config to templates via URL query parameters. Templates read these with JavaScript and apply them.

### Device Support (iOS only for v1)

- `iphone-6.9`: 1320x2868 (iPhone 16 Pro Max)
- `iphone-6.7`: 1290x2796 (iPhone 15 Pro Max)
- `iphone-6.5`: 1284x2778 (iPhone 14 Pro Max)
- `iphone-5.5`: 1242x2208 (iPhone 8 Plus)

### Dependencies

- `playwright` - Headless browser for screenshot capture
- `commander` - CLI framework
- `serve-handler` - Preview server

## Testing

Test the CLI locally:

```bash
node src/cli.js init --dir ./test-project
# Add a screenshot to ./test-project/screenshots/
node src/cli.js generate --config ./test-project/storepix.config.js
```

## Publishing

```bash
npm version patch|minor|major
npm publish
```
