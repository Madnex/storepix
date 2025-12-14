/**
 * Test configuration for the split template
 */
export default {
  devices: 'default',

  variants: [
    {
      name: 'light-left',
      theme: 'light',
      layout: 'left',
      headline: 'Feature Title',
      subheadline: 'Description text goes here'
    },
    {
      name: 'dark-left',
      theme: 'dark',
      layout: 'left',
      headline: 'Feature Title',
      subheadline: 'Description text goes here'
    },
    {
      name: 'light-right',
      theme: 'light',
      layout: 'right',
      headline: 'Feature Title',
      subheadline: 'Description text goes here'
    }
  ]
};
