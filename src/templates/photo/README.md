# Photo Template

Full-bleed background image with device mockup overlay.

## Layout

```
┌─────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓ BACKGROUND ▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓ IMAGE ▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓ Headline ▓▓▓▓▓▓▓▓▓▓│
│▓▓▓▓▓ Subheadline ▓▓▓▓▓▓▓│
│▓▓▓▓ ┌─────────┐ ▓▓▓▓▓▓▓▓│
│▓▓▓▓ │  ┌───┐  │ ▓▓▓▓▓▓▓▓│
│▓▓▓▓ │  │ S │  │ ▓▓▓▓▓▓▓▓│
│▓▓▓▓ │  │ C │  │ ▓▓▓▓▓▓▓▓│
│▓▓▓▓ │  │ R │  │ ▓▓▓▓▓▓▓▓│
│▓▓▓▓ │  │ E │  │ ▓▓▓▓▓▓▓▓│
│▓▓▓▓ │  │ E │  │ ▓▓▓▓▓▓▓▓│
│▓▓▓▓ │  │ N │  │ ▓▓▓▓▓▓▓▓│
│▓▓▓▓ │  └───┘  │ ▓▓▓▓▓▓▓▓│
│▓▓▓▓ └─────────┘ ▓▓▓▓▓▓▓▓│
└─────────────────────────┘
```

## Features

- Full-bleed background image
- Semi-transparent overlay for text readability
- Headline + subheadline text
- Device frame with notch/Dynamic Island/home button
- Optional status bar overlay
- Light/dark theme support
- `layout: 'bottom'` moves text below device

## Config

Add `background` to your screenshot config:

```js
screenshots: [
  {
    id: 'hero',
    screenshot: 'home.png',
    background: 'lifestyle-photo.jpg',  // <-- background image
    headline: 'Your App',
  }
]
```

## Best For

- Lifestyle/contextual marketing shots
- Apps with strong visual identity
- Travel, photography, or social apps
- Creating emotional connection with users
