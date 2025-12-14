/**
 * Test configuration for the tilt template
 *
 * Angle presets:
 * - default: rotate -30deg, skew 30deg (strong tilt)
 * - gentle: rotate -20deg, skew 20deg (subtle tilt)
 * - steep: rotate -40deg, skew 40deg (dramatic tilt)
 * - reverse: rotate 30deg, skew -30deg (opposite direction)
 */
export default {
  devices: 'all',

  variants: [
    // Default angle (-30deg rotate, 30deg skew)
    {
      name: 'light',
      theme: 'light',
      headline: 'Try top-rated\nbeauty\nessentials',
      subheadline: 'Shop exclusive deals!'
    },
    {
      name: 'dark',
      theme: 'dark',
      headline: 'More beauty',
      subheadline: 'Build your perfect routine'
    },

    // Gentle angle (-20deg rotate, 20deg skew)
    {
      name: 'gentle-light',
      theme: 'light',
      tiltRotate: '-20deg',
      tiltSkew: '20deg',
      headline: 'Gentle Tilt',
      subheadline: 'A more subtle angle'
    },

    // Steep angle (-40deg rotate, 40deg skew)
    {
      name: 'steep-dark',
      theme: 'dark',
      tiltRotate: '-40deg',
      tiltSkew: '40deg',
      headline: 'Steep Tilt',
      subheadline: 'A more dramatic angle'
    },

    // Reverse angle (tilts the other way)
    {
      name: 'reverse-light',
      theme: 'light',
      tiltRotate: '30deg',
      tiltSkew: '-30deg',
      headline: 'Reverse Tilt',
      subheadline: 'Tilted the other direction'
    },

    // Center layout
    {
      name: 'center-light',
      theme: 'light',
      layout: 'center',
      headline: 'Your App',
      subheadline: 'The best way to get things done'
    }
  ]
};
