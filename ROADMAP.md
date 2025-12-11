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

## v1.x - Near Term

### More Templates
- [ ] `plain` - Screenshot only, no phone frame
- [ ] `photo` - Photo/image background support
- [ ] `split` - Side-by-side device + text (landscape-friendly)

### Additional Device Support
- [ ] iPad Pro 12.9" (2048x2732)
- [ ] iPad Pro 11" (1668x2388)
- [ ] Android phone (1080x1920)
- [ ] Android tablet 7" (1200x1920)
- [ ] Android tablet 10" (1600x2560)

### Template Improvements
- [ ] iPhone 8 Plus template variant (no Dynamic Island, home button style)
- [ ] Status bar injection (realistic time, battery, signal)
- [ ] Home indicator styling options

### Developer Experience
- [ ] Watch mode with hot reload (`storepix preview --watch`)
- [ ] Better error messages for missing screenshots
- [ ] Screenshot validation (correct dimensions, no transparency issues)
- [ ] `storepix upgrade` command to update templates without losing customizations

---

## v2.x - Future

### Advanced Features
- [ ] Video frame support (App Preview screenshots)
- [ ] A/B variants (generate multiple headline options)
- [ ] Annotation overlays (arrows, highlights, callouts)
- [ ] Batch generation from Figma/Sketch exports
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
