# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] - 2026-10-02

### Migration
- Requires Node.js 22.12 or newer. Reinstall Chromium with `npx playwright install chromium`.
- Run `storepix upgrade --force` in existing projects to adopt the updated templates; review customization backups.
- Library callers must handle rejected promises; `preview()` returns a session with an async `close()` method.

### Added
- Shared preview/export rendering with screenshot, device, and locale selectors and live config error recovery.
- Local Inter fonts, asynchronous template readiness, bounded render workers, and optional output caching.
- Sharp-based source decoding, opaque PNG output validation/compression, and single-capture panorama slicing.
- Landscape canvas option and real-browser CI coverage for rendering, reloads, cache invalidation, and failure cleanup.

### Fixed
- Release browser/server/watcher resources on failure; library commands reject instead of exiting the host process.
- Accept JPEG/WebP and differently sized source images; reject corrupt pixel data and invalid final exports.
- Correct unsupported template claims and generate the README template table from schemas.

### Changed
- Update Commander to 15.0.0, Playwright to 1.63.0, and serve-handler to 6.1.7; refresh transitive dependencies.
- Require Node.js 22.12 or newer, matching Commander 15; test Node.js 22.12, 24, and 26 in CI.
- Document Chromium installation and dependency/architecture review findings.

## [0.1.0] - 2024-12-14

### Added
- Initial release
- CLI commands:
  - `init` - Initialize a new storepix project
  - `generate` - Generate App Store screenshots using Playwright
  - `preview` - Start local preview server with hot reload
  - `upgrade` - Upgrade templates to latest version
  - `add-template` - Add additional templates to existing project
  - `test-template` - Test templates across all devices
- Device support:
  - iPhone: 6.9", 6.7", 6.5", 6.3", 6.1", 5.5", 4.7"
  - iPad: 13", 12.9", 11"
  - Android: phone, tablet 7", tablet 10", Wear OS
- Templates:
  - `default` - Gradient background with device frame
  - `minimal` - Solid color background
  - `photo` - Background image support
  - `split` - Side-by-side text and device layout
  - `panorama` - Multi-slice panorama mode
- Features:
  - Status bar injection with customizable time/battery
  - Watch mode with hot reload
  - Localization support
  - CSS variable theming
  - Template upgrade system with diff preview

[Unreleased]: https://github.com/Madnex/storepix/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Madnex/storepix/releases/tag/v0.1.0
