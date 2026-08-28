import sharp from 'sharp';
import fs from 'node:fs';

const src = 'assets/ubtc-icon.png';
const trimmed = await sharp(src).trim({ threshold: 6 }).toBuffer();
const meta = await sharp(trimmed).metadata();
console.log('trimmed', meta.width, meta.height);

// The button artwork: small, and still crisp at twice the size it is drawn.
const art = await sharp(trimmed).resize({ width: 224, height: 224, fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } }).png({ compressionLevel: 9, palette: true, quality: 92 }).toBuffer();
fs.writeFileSync('assets/ubtc-icon-trimmed.png', art);
console.log('art bytes', art.length, '-> base64', Math.ceil(art.length*4/3));

// And the sampling grid for the point cloud.
const N = 256;
const { data, info } = await sharp(trimmed)
  .resize({ width: N, height: N, fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } })
  .raw().toBuffer({ resolveWithObject: true });
console.log('raw', info.width, info.height, info.channels);
fs.writeFileSync('tools/build/icon-raw.json', JSON.stringify({ w: info.width, h: info.height, c: info.channels, data: Array.from(data) }));
