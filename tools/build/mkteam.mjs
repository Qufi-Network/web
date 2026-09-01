/**
 * The team photographs, prepared for the page.
 *
 * Square, because the frame around them is square and a portrait cropped by CSS
 * is a portrait cropped wherever the box happens to fall. Sharp picks the crop
 * by where the attention in the picture is, which on a headshot is the face.
 *
 * Four hundred and eighty across for all three: one of the originals is only
 * that big, and three photographs at one size look like a team while three at
 * three sizes look like whatever was to hand.
 *
 *   node tools/build/mkteam.mjs
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const FROM = 'C:/Users/Z BOOK/Downloads';
const TO = 'C:/ubtc/qufi-network/public/team';

/*
 * `crop` is an explicit box taken before the resize, for a picture where the
 * automatic choice puts the face too far away. Eric's original is a standing
 * portrait with a lot of jacket in it, and cropping to where the attention is
 * still leaves his head half the size of the other two — so his is measured by
 * hand, to put his face at the same distance as theirs.
 */
const PEOPLE = [
  { id: 'alex', file: 'AlexCEO.jpeg' },
  { id: 'sam', file: 'mr-Samson.jpeg' },
  { id: 'eric', file: 'eric.jpeg', crop: { left: 200, top: 120, width: 720, height: 720 } },
];

const SIZE = 480;

fs.mkdirSync(TO, { recursive: true });

for (const person of PEOPLE) {
  const source = path.join(FROM, person.file);
  if (!fs.existsSync(source)) {
    console.log(`missing: ${person.file}`);
    continue;
  }

  const meta = await sharp(source).metadata();
  const out = path.join(TO, `${person.id}.webp`);

  const pipeline = sharp(source);
  if (person.crop) pipeline.extract(person.crop);

  await pipeline
    .resize({
      width: SIZE,
      height: SIZE,
      fit: 'cover',
      // Crop to where the picture is looking, not to its middle: two of these
      // are standing portraits and a centre crop takes the chest.
      position: sharp.strategy.attention,
    })
    .webp({ quality: 86 })
    .toFile(out);

  const after = fs.statSync(out);
  console.log(
    `${person.id.padEnd(5)} ${person.file.padEnd(20)} ${meta.width}x${meta.height} -> ${SIZE}x${SIZE}  ${Math.round(after.size / 1024)}KB`,
  );
}
