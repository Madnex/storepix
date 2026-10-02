/** Upload display groups are separate from render/device presets.
 * Verified 2026-10-02 against Apple's screenshot specifications:
 * https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
 * Only groups used by bundled iOS presets are listed, not every Apple platform.
 */
export const uploadTargets = {
  'app-store-iphone-6.9': [[1260, 2736], [1290, 2796], [1320, 2868]],
  'app-store-iphone-6.5': [[1284, 2778], [1242, 2688]],
  'app-store-iphone-6.3': [[1179, 2556], [1206, 2622]],
  'app-store-iphone-6.1': [[1170, 2532], [1125, 2436], [1080, 2340]],
  'app-store-iphone-5.5': [[1242, 2208]],
  'app-store-iphone-4.7': [[750, 1334]],
  'app-store-ipad-13': [[2064, 2752], [2048, 2732]],
  'app-store-ipad-12.9': [[2048, 2732]],
  'app-store-ipad-11': [[1488, 2266], [1668, 2420], [1668, 2388], [1640, 2360]]
};

export const presetUploadTargets = {
  'iphone-6.9': 'app-store-iphone-6.9', 'iphone-6.7': 'app-store-iphone-6.9',
  'iphone-6.5': 'app-store-iphone-6.5', 'iphone-6.3': 'app-store-iphone-6.3',
  // Retain the historical preset dimensions for compatibility; these belong to 6.3" uploads.
  'iphone-6.1': 'app-store-iphone-6.3',
  'iphone-5.5': 'app-store-iphone-5.5', 'iphone-4.7': 'app-store-iphone-4.7',
  'ipad-13': 'app-store-ipad-13', 'ipad-12.9': 'app-store-ipad-12.9', 'ipad-11': 'app-store-ipad-11'
};

export function acceptsUploadSize(target, width, height) {
  return uploadTargets[target]?.some(([w, h]) => (width === w && height === h) || (width === h && height === w)) ?? false;
}
