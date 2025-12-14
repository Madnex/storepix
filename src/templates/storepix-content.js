/**
 * Custom content binding for storepix templates
 *
 * Usage in template HTML:
 *   <div data-storepix="fieldName">Default text</div>
 *   <img data-storepix-src="fieldName" src="./default.png">
 *
 * Usage in storepix.config.js:
 *   { id: '01', headline: '...', fieldName: 'Custom value' }
 *
 * Behavior:
 *   - Key not in config: keeps HTML default
 *   - Key set to '': hides element (display: none)
 */
function applyCustomContent(urlParams) {
  const customContent = JSON.parse(urlParams.get('customContent') || '{}');

  // Text content bindings
  document.querySelectorAll('[data-storepix]').forEach(el => {
    const field = el.dataset.storepix;
    if (!(field in customContent)) return; // keep default
    if (customContent[field] === '') {
      el.style.display = 'none';
    } else {
      el.textContent = customContent[field];
    }
  });

  // Image source bindings
  document.querySelectorAll('[data-storepix-src]').forEach(el => {
    const field = el.dataset.storepixSrc;
    if (!(field in customContent)) return; // keep default
    if (customContent[field] === '') {
      el.style.display = 'none';
    } else {
      el.src = customContent[field];
    }
  });
}
