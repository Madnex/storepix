/**
 * Creates test PNG fixtures for validation tests
 * Run once with: node tests/fixtures/create-fixtures.js
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// PNG signature
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

// Create minimal valid PNG
function createPNG(width, height, colorType = 2) {
  // Build IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);     // Width
  ihdrData.writeUInt32BE(height, 4);    // Height
  ihdrData.writeUInt8(8, 8);            // Bit depth
  ihdrData.writeUInt8(colorType, 9);    // Color type (2 = RGB, 6 = RGBA)
  ihdrData.writeUInt8(0, 10);           // Compression
  ihdrData.writeUInt8(0, 11);           // Filter
  ihdrData.writeUInt8(0, 12);           // Interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Create minimal IDAT chunk (compressed empty data)
  // This is a minimal valid zlib stream for empty/black image
  const idatData = Buffer.from([0x78, 0x9c, 0x62, 0x60, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01]);
  const idatChunk = createChunk('IDAT', idatData);

  // Create IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([PNG_SIGNATURE, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = crc32(Buffer.concat([typeBuffer, data]));

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// Simple CRC32 implementation
function crc32(buffer) {
  let crc = 0xFFFFFFFF;
  const table = makeCRCTable();

  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buffer[i]) & 0xFF];
  }

  return crc ^ 0xFFFFFFFF;
}

function makeCRCTable() {
  const table = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xEDB88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
}

// Create valid PNG for iPhone 6.5" (1284x2778)
const valid_iphone_65 = createPNG(1284, 2778);
writeFileSync(join(__dirname, 'screenshots/valid-iphone-6.5.png'), valid_iphone_65);

// Create valid PNG for iPad 13" (2064x2752)
const valid_ipad_13 = createPNG(2064, 2752);
writeFileSync(join(__dirname, 'screenshots/valid-ipad-13.png'), valid_ipad_13);

// Create PNG with wrong dimensions
const wrong_dimensions = createPNG(100, 100);
writeFileSync(join(__dirname, 'screenshots/wrong-dimensions.png'), wrong_dimensions);

// Create valid PNG with alpha channel (RGBA)
const with_alpha = createPNG(1284, 2778, 6);
writeFileSync(join(__dirname, 'screenshots/with-alpha.png'), with_alpha);

// Create fake JPEG (valid JPEG header + padding to exceed 67 bytes)
const fakeJpeg = Buffer.alloc(100);
fakeJpeg[0] = 0xFF;
fakeJpeg[1] = 0xD8;
fakeJpeg[2] = 0xFF;
writeFileSync(join(__dirname, 'screenshots/fake.jpg'), fakeJpeg);

// Create invalid file (not an image, but large enough to pass size check)
const invalid = Buffer.alloc(100);
Buffer.from('This is not a PNG file').copy(invalid);
writeFileSync(join(__dirname, 'screenshots/invalid.txt'), invalid);

// Create too small file
const tooSmall = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
writeFileSync(join(__dirname, 'screenshots/too-small.png'), tooSmall);

console.log('Test fixtures created successfully!');
