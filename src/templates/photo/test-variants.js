/**
 * Test variants for the photo template
 * Note: Background image not available in test mode, so we test layout variations
 */
export default [
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
];
