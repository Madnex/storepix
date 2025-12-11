# storepix Roadmap

## v1.0 - Current

- [x] CLI with init/generate/preview commands
- [x] iOS device sizes (6.9", 6.7", 6.5", 5.5")
- [x] Two templates: default (gradient) and minimal (solid)
- [x] Localization support (multi-language output)
- [x] Theme customization via CSS variables
- [x] Light/dark theme support
- [x] Headline above/below layout variants
- [x] Templates copied to user project for full control

---

## v1.1 - Completed

### More Templates
- [x] `plain` - Screenshot only, no phone frame
- [x] `photo` - Photo/image background support
- [x] `split` - Side-by-side device + text (landscape-friendly)

### Additional Device Support
- [x] iPhone 6.3" (1206x2622) - iPhone 16 Pro, 15 Pro, etc.
- [x] iPhone 6.1" (1179x2556) - iPhone 14, 13, 12, etc.
- [x] iPhone 4.7" (750x1334) - iPhone SE, 8, 7, etc.
- [x] iPad Pro 13" (2064x2752)
- [x] iPad Pro 12.9" (2048x2732)
- [x] iPad Pro 11" (1668x2388)
- [x] Android phone (1080x1920)
- [x] Android tablet 7" (1080x1920)
- [x] Android tablet 10" (1200x1920)
- [x] Android Wear OS (384x384)

### Template Improvements
- [x] iPhone 8 Plus template variant (no Dynamic Island, home button style)
- [x] Device-specific notch/Dynamic Island rendering
- [x] Home button support for older iPhone models

### Developer Experience
- [x] Better error messages for missing screenshots
- [x] Validates screenshot files exist before processing
- [x] Validates device and locale configuration
- [x] Clear error paths and suggestions

---

## v1.x - Near Term (Completed)

### Template Improvements
- [x] Status bar injection (realistic time, battery, signal)
- [x] Home indicator styling options

### Developer Experience
- [x] Watch mode with hot reload (`storepix preview --watch`)
- [x] Screenshot validation (correct dimensions, no transparency issues)
- [x] `storepix upgrade` command to update templates without losing customizations

---

## v2.x - Future

### Advanced Features
- [ ] Annotation overlays (arrows, highlights, callouts)
- [ ] Output optimization (PNG compression with sharp/pngquant)

### CI/CD Integration
- [ ] GitHub Actions example workflow
- [ ] Pre-built Docker image
- [ ] Fastlane integration guide

### Community & Ecosystem
- [ ] Documentation website (GitHub Pages)
- [ ] Example gallery showing community screenshots
- [ ] Preset themes (5-10 color schemes out of the box)
- [ ] Template sharing / marketplace
- [ ] Contributing guide for new devices/templates

---

## Ideas / Under Consideration

- Web UI for non-technical users
- Screenshot diff tool for A/B testing
- Integration with app metadata (reading from fastlane/metadata)
- Automatic text sizing based on headline length
- RTL language support
- Accessibility contrast checking for generated images
