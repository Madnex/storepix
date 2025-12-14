/**
 * Test variants for the fun template
 * Key variants: single vs panorama (slices: 2)
 */
export default [
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
];
