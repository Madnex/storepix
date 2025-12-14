/**
 * Test configuration for the panorama template
 * Tests single mode and panorama (slices: 2)
 */
export default {
  devices: 'default',

  variants: [
    {
      name: 'single-light',
      theme: 'light',
      layout: 'top',
      headline: 'Feature Title',
      subheadline: 'Description text goes here'
    },
    {
      name: 'single-dark',
      theme: 'dark',
      layout: 'top',
      headline: 'Feature Title',
      subheadline: 'Description text goes here'
    },
    {
      name: 'panorama',
      theme: 'light',
      slices: 2,
      headlines: ['First Headline', 'Second Headline'],
      subheadlines: ['First subheadline', 'Second subheadline']
    }
  ]
};
