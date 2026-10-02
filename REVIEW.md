# Storepix review — 2026-10-01

## Implementation update — 2026-10-02

The recommendations below have now been implemented: shared render jobs and a
selector-based preview; config error recovery; local Inter fonts and explicit
readiness; decoded sources and opaque validated outputs; upload-size groups
separate from device presets; loopback servers and failure cleanup; structured
library errors; bounded workers, optional content-hash caching, and panorama
slicing; real-browser CI; and corrected/generated template documentation.

Sharp 0.35.5 is now a runtime dependency. Inter files were vendored from
Fontsource Inter 5.3.0 with the SIL Open Font License; Fontsource is not a runtime
dependency. Existing templates remain user-owned and require an explicit upgrade
to adopt the new template code.

The decoder exposed that the old image fixtures contained valid-looking headers
but corrupt pixel streams. The fixture generator now creates real images; tests
also cover truncated data and output alpha rejection.

Capture waits for two matching frames, but the large-iPad benchmark still found
small Chromium rasterization differences on transformed edges between runs,
including sequential runs. This is not a guarantee of cross-run byte equality.
Use a pinned browser, OS, and fonts plus tolerant visual comparisons for broader
visual regression coverage. The pixel test in CI verifies exact colors and slice
boundaries for a controlled template.

Final local verification: 71 unit/command tests and six Chromium integration
tests pass on Node 24.12.0/macOS; the template gallery command, generated-doc
check, CLI startup, package contents, and dependency audit also pass. The audit
reports zero findings. Two-worker runs of eight large iPad panorama slices were
faster than sequential runs in local checks (roughly 2.4–3.0 seconds versus
4.1–4.9 seconds after stable-frame capture); these are illustrative timings, not
a portable performance guarantee.

The Node/Ubuntu CI matrix is configured but has not been executed remotely here.
The original findings below describe the pre-change code.

## What it does

Storepix 0.2.0 is a CLI and JavaScript library that turns existing app screenshots
into marketing images. It copies editable HTML/CSS templates into a project,
loads a JavaScript config, serves the project locally, and uses Playwright's
Chromium to export PNGs at configured device dimensions. It loops over devices,
locales, and screenshots; panorama mode captures adjacent clips of a wide page.

It also provides a preview server with SSE reloads, template upgrades/backups,
schema checks, generated config types, and a template test gallery. The actual
bundled templates are default, minimal, photo, panorama, and feature-graphic.
It does not capture the running mobile app or upload images to either store.

## Dependency update

| Package | Previously locked | Updated |
| --- | --- | --- |
| chokidar | 5.0.0 | 5.0.0 (already latest) |
| commander | 14.0.2 | 15.0.0 |
| playwright / playwright-core | 1.57.0 | 1.63.0 |
| serve-handler | 6.1.6 | 6.1.7 |

The previous Playwright manifest range began at 1.49.0; it now begins at 1.63.0.
Registry `latest` tags were checked directly. The refreshed dependency tree
clears the three high-severity npm audit findings in serve-handler/minimatch/
brace-expansion; the post-update audit reports zero findings.

Commander 15 requires Node 22.12+. Its ESM migration fits this project's existing
ES modules, and its changed positive/negative option defaults do not affect the
lone `--no-open` / `--no-parallel` options here. Package engines and CI now match
that requirement. This is a runtime compatibility change for consumers; the old
Node 18 claim was already incompatible with Chokidar 5 and Commander 14.

Sources: [Commander migration notes](https://github.com/tj/commander.js/releases/tag/v15.0.0),
[Playwright release](https://github.com/microsoft/playwright/releases/tag/v1.63.0),
[browser installation](https://playwright.dev/docs/browsers).

### Verification

- All 74 existing tests passed on Node 24.12.0; CLI help also passed.
- Ran the actual generator using Playwright 1.63.0's Chromium for all five
  templates and two locales, including status bars and a two-slice panorama.
  All 12 PNGs were generated and their dimensions verified. This is a render
  smoke test, not a pixel comparison against the previous browser.
- `npm outdated --json` returned `{}`; `npm audit --json` reported zero findings.
- The updated Node 22.12/24/26 CI matrix has not been run locally in full.

## Improvements, in recommended order

These were the prioritized findings from the original code inspection; see the implementation update above.

1. **Make preview match export.** `preview.js` and `generate.js` independently build
   template URLs. Preview omits some export fields, resolves sources differently,
   and only supplies device/theme/status-bar parameters with `--open`. Config
   reload changes a server variable, but the browser reloads its old query string;
   the selected template is also fixed at startup. Extract one render-job builder
   and serve a fresh selected job on each preview request. Add screenshot, device,
   and locale selectors to make the preview useful beyond the first screenshot.
2. **Make rendering deterministic.** Generation uses `networkidle`, then fixed
   300/500 ms sleeps; failed screenshot loads only warn. Establish a bounded
   template-ready contract covering images, fonts, and fetched status bars. Fail
   on missing assets, disable animations for capture, and bundle fonts so exports
   do not depend on Google Fonts availability. Playwright already exposes the
   needed screenshot controls; this does not require switching renderers.
3. **Validate final exports separately from source images.** Input dimensions are
   currently required to equal the final canvas even though the template scales
   the source inside a frame. JPEG rejection incorrectly claims Apple requires
   PNG, and the alpha check can silently accept RGBA. Use an image decoder for
   input metadata and validate output size, format, and alpha. Apple accepts JPEG
   and PNG but disallows alpha channels/transparency. Model supported upload
   dimensions separately from physical device names, including orientation.
4. **Fix resource lifecycle and library errors.** Browser launch occurs before
   the generation `try/finally`, so a failed launch leaves the server running.
   Non-port-conflict server errors do not reject startup. Bind local servers to
   loopback, ensure cleanup covers startup failures, and throw structured errors
   from library functions instead of calling `process.exit()`.
5. **Add actual rendering coverage in CI.** Existing tests cover initialization,
   upgrades, devices, diffs, and PNG-header checks, but not exported artwork.
   Test localized text, panoramas, status bars, promotional assets, missing assets,
   preview reloads, and cleanup. Pin the browser/OS/fonts for visual baselines.
6. **Improve throughput after measuring it.** `--no-parallel` is exposed but the
   generator runs sequentially and never reads the option. Use a small bounded
   page pool, cache unchanged jobs, and consider capturing panoramas once before
   slicing them. Measure memory at large iPad/panorama sizes before choosing a
   default concurrency.
7. **Correct documentation drift.** README advertises a `plain` template that is
   absent; ROADMAP marks `plain` and `split` complete and uses versions unrelated
   to package version 0.2.0. Generate template lists from the bundled schemas and
   keep supported upload dimensions linked to the store specifications.

Sources: [Playwright page API](https://playwright.dev/docs/api/class-page),
[Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications).

## Are there better rendering approaches now?

**Keep Playwright as the default.** The product's central feature is arbitrary,
user-owned HTML/CSS, including scripts, fetched fragments, rotations, and effects.
A browser preserves that capability. Switching to another browser driver would
not by itself solve readiness, validation, preview parity, or font reproducibility.

**Consider Sharp as a complementary image pipeline.** It supports image metadata,
compositing, PNG output controls, and extraction. It could validate/flatten final
exports, compress PNGs, and split a single panorama capture. It could also provide
a faster browser-free path for simple fixed image/frame compositions. Benchmark
first: it adds a native dependency and does not render arbitrary HTML/CSS.

**Satori plus an SVG rasterizer is an optional separate template format.** It can
produce SVG without Chromium, but supports only a subset of HTML/CSS and has a
different rendering model. Existing templates are not drop-in compatible. It is
worth considering only if a constrained declarative template API becomes a goal.

Sources: [Sharp compositing](https://sharp.pixelplumbing.com/api-composite/),
[Sharp output options](https://sharp.pixelplumbing.com/api-output/),
[Satori capabilities and limitations](https://github.com/vercel/satori).
