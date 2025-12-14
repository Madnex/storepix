# Fun Template

Playful rotated device layout with support for panoramic screenshots that span multiple App Store images.

## Layout (Single Screenshot)

```
┌─────────────────────────┐
│                    ╱    │
│                 ╱───╲   │
│              ╱  │   │ ╲ │
│           ╱    │ S │   ╲│
│              │ C │      │
│              │ R │      │
│              │ E │      │
│              │ E │      │
│              │ N │      │
│               ───       │
│                         │
│  Headline               │
│  Subheadline            │
└─────────────────────────┘
```

## Layout (2-Slice Panorama)

Creates two screenshots from one render, with the device spanning across both:

```
┌─────────────────────────┬─────────────────────────┐
│                         │                         │
│  Headline 1       ╱─────│─────╲                   │
│  Subheadline 1  ╱  │    │    │  ╲   Headline 2   │
│              ╱    │ S  │  C │    ╲  Subheadline 2│
│                   │ R  │  R │                    │
│                   │ E  │  E │                    │
│                   │ E  │  E │                    │
│                   │ N  │  N │                    │
│                    ────│────                     │
│                        │                         │
│                        │                         │
└─────────────────────────┴─────────────────────────┘
         Slice 1                   Slice 2
```

## Features

- Rotated device (18°) for a playful, dynamic look
- Device positioned to extend beyond frame edges
- Support for panoramic screenshots (`slices: 2`)
- Separate headlines for each slice in panorama mode
- Light/dark theme support
- Device frame with notch/Dynamic Island support

## Config Options

### Single Screenshot

```js
{
  id: 'feature',
  source: './screenshots/feature.png',
  headline: 'Amazing Feature',
  subheadline: 'Try it now',
  theme: 'light',
  layout: 'top',  // 'top' puts text at top, device at bottom
}
```

### Panorama (2 Screenshots from 1 Source)

```js
{
  id: 'hero',
  source: './screenshots/main.png',
  slices: 2,
  headlines: ['Health made', 'Discover our'],
  subheadlines: ['simple', 'community'],
  theme: 'light',
}
```

**Output:** `hero-1.png` and `hero-2.png`

## Best For

- App Store marketing screenshots
- Creating visual continuity between screenshots
- Eye-catching, modern promotional graphics
- Apps that want a playful, non-traditional look
