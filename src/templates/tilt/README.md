# Tilt Template

3D perspective phone mockup with text on the left and a tilted device on the right.

## Layout

```
┌─────────────────────────┐
│                    ░░░░░│
│                  ░░░░░░░│
│                ┌──────┐░│
│                │┌────┐│░│
│                ││    ││ │
│  Headline      ││ S  ││ │
│  Subheadline   ││ C  ││ │
│                ││ R  ││ │
│                ││ E  ││ │
│                ││ E  ││ │
│                ││ N  ││ │
│                │└────┘│ │
│                └──────┘ │
│                         │
└─────────────────────────┘
```

## Features

- 3D perspective effect using CSS skew transforms
- Phone back edge and side buttons visible
- Headline + subheadline positioned at bottom left
- Customizable tilt angle via `tiltRotate` and `tiltSkew`
- Light/dark theme support
- `layout: 'center'` moves text to top center with device below

## Angle Presets

| Preset | tiltRotate | tiltSkew | Effect |
|--------|------------|----------|--------|
| Default | -30deg | 30deg | Standard tilt |
| Gentle | -20deg | 20deg | Subtle angle |
| Steep | -40deg | 40deg | Dramatic angle |
| Reverse | 30deg | -30deg | Opposite direction |

## Configuration

```js
{
  name: 'custom-angle',
  theme: 'light',
  tiltRotate: '-25deg',
  tiltSkew: '25deg',
  headline: 'Your Feature',
  subheadline: 'Description here'
}
```

## Best For

- Premium app marketing
- Beauty, lifestyle, and fashion apps
- Hero images and landing pages
- When you want a dynamic, modern look
