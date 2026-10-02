/** Rebuild real, decodable image fixtures: node tests/fixtures/create-fixtures.js */
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
const root = new URL('./screenshots/', import.meta.url);
for (const [name, width, height, channels] of [
  ['valid-iphone-6.5.png', 1284, 2778, 3], ['valid-ipad-13.png', 2064, 2752, 3],
  ['wrong-dimensions.png', 100, 100, 3], ['with-alpha.png', 1284, 2778, 4]
]) {
  const buffer = await sharp({ create: { width, height, channels, background: { r: 30, g: 100, b: 180, alpha: 0.5 } } }).png().toBuffer();
  await writeFile(new URL(name, root), buffer);
}
const jpeg = await sharp({ create: { width: 120, height: 240, channels: 3, background: '#36a' } }).jpeg().toBuffer();
await writeFile(new URL('valid.jpg', root), jpeg);
