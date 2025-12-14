/**
 * Test configuration for the minimal template
 */
export default {
  devices: 'all',

  variants: [
    {
      name: 'light-top',
      theme: 'light',
      layout: 'top',
      headline: 'Feature Title',
      subheadline: 'Description text goes here'
    },
    {
      name: 'dark-top',
      theme: 'dark',
      layout: 'top',
      headline: 'Feature Title',
      subheadline: 'Description text goes here'
    },
    {
      name: 'light-bottom',
      theme: 'light',
      layout: 'bottom',
      headline: 'Feature Title',
      subheadline: 'Description text goes here'
    }
  ]
};
