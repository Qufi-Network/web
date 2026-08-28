/**
 * The hand, sampled to points.
 *
 * Same treatment as the uBTC mark: taken off the artwork at build time rather
 * than approximated in code, because a hand drawn from an anatomy description
 * reads as a diagram of a hand and this one has to read as somebody's hand.
 * The source is the VEYNS render — a palm turned to the camera with the
 * vascular network lit through it — which is exactly the picture a palm-vein
 * reader is looking at.
 *
 * Two classes of point come out: the skin, sampled by how lit it is, and the
 * veins, which are the red ones. The scene draws them in different colours and
 * lights the veins second, because that is the order a reader works in.
 *
 *   node tools/build/mkhand.mjs
 */
import sharp from 'sharp';
import fs from 'node:fs';

const SOURCE = 'C:/ubtc/veyns-journey/public/veyns-hand.png';

/*
 * The hand only.
 *
 * The render is a whole web page: there is a wordmark down the left, a caption
 * over the palm and a column of copy at the right, and every one of them is
 * brighter than skin. Cropping takes most of it and the two blocks below take
 * the rest — measured off the image rather than guessed, and worth stating
 * explicitly so the next person can see why they are there.
 */
const CROP = { left: 430, top: 24, width: 1100, height: 776 };
/*
 * The caption sits on the palm, so cutting it out leaves a hole in the hand.
 * Points there are taken as plain skin instead — the palm is skin under the
 * words, and a hand with a rectangle missing from it is worse than one with a
 * patch of even density in the middle.
 */
const HOLE = [{ x0: 812, x1: 1004, y0: 496, y1: 570 }];
/** And this block of copy is over the background, so it is simply dropped. */
const DROP = [{ x0: 1286, x1: 1536, y0: 548, y1: 704 }];

const WIDE = 460;

/*
 * Blurred a little before sampling.
 *
 * The render is a photograph: at pixel level the hand is speckle and specular
 * highlight, and thresholding that gives an outline of glints rather than a
 * hand. Softening it first turns the hand into the solid mass it looks like
 * from a normal viewing distance, which is what wants sampling.
 */
const { data, info } = await sharp(SOURCE)
  .extract(CROP)
  .resize({ width: WIDE })
  .blur(1.6)
  .raw()
  .toBuffer({ resolveWithObject: true });

console.log('sampling', info.width, 'x', info.height, info.channels, 'channels');

let seed = 0x2f6b3c11;
const rng = () => {
  seed ^= seed << 13;
  seed >>>= 0;
  seed ^= seed >> 17;
  seed ^= seed << 5;
  seed >>>= 0;
  return seed / 4294967296;
};

const scale = info.width / CROP.width;
const within = (list, x, y) => {
  const px = CROP.left + x / scale;
  const py = CROP.top + y / scale;
  return list.some((m) => px >= m.x0 && px <= m.x1 && py >= m.y0 && py <= m.y1);
};

const COUNT = 6200;
const points = [];
let guard = 0;
let veins = 0;

while (points.length < COUNT && guard++ < COUNT * 500) {
  const x = Math.floor(rng() * info.width);
  const y = Math.floor(rng() * info.height);
  if (within(DROP, x, y)) continue;
  const patch = within(HOLE, x, y);

  const i = (y * info.width + x) * info.channels;
  const r = data[i] / 255;
  const g = data[i + 1] / 255;
  const b = data[i + 2] / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // The veins are the red in the picture: red well above the other two. Not
  // under the caption, where the red is a word rather than a vein.
  const vein = !patch && r > 0.34 && r - Math.max(g, b) > 0.13;
  // Skin is anything lit enough to be hand rather than background. The
  // threshold is deliberately high — the render has a lot of faint particle
  // haze around the hand, and sampling that gives a cloud with a hand in it.
  if (!vein && !patch && lum < 0.135) continue;

  /*
   * Accepted flat rather than in proportion to how lit it is.
   *
   * Weighting by brightness sounds right and is not: the render lights the
   * palm and the heel of the hand and leaves the fingers in shadow, so a
   * weighted sample produces a bright blob with no fingers on it. What the
   * shape needs is even density — the shading can come from the scan.
   */
  if (!vein && rng() > 0.9) continue;
  if (vein && rng() > 0.6 + r * 0.4) continue;

  /*
   * Mirrored.
   *
   * In the render the hand enters from the lower left with the fingers up and
   * to the right. It has to come in from the right here, so the whole thing is
   * flipped — which is also anatomically fine, because a mirrored right hand is
   * a left hand and people have both.
   */
  points.push([
    -((x / (info.width - 1)) * 2 - 1),
    (1 - y / (info.height - 1)) * 2 - 1,
    vein ? 1 : 0,
  ]);
  if (vein) veins++;
}

const aspect = info.height / info.width;
console.log('sampled', points.length, 'of which vein', veins, ' aspect', aspect.toFixed(3));

const q = (v) => Math.round(v * 1000) / 1000;
const body = points.map(([x, y, v]) => `${q(x)},${q(y * aspect)},${v}`).join(',');

fs.writeFileSync(
  'assets/hand-points.ts',
  `/**
 * A hand, sampled to points.
 *
 * Generated by \\\`tools/build/mkhand.mjs\\\` from the VEYNS render and checked in
 * rather than sampled at runtime: the scene builds its geometry in one pass on
 * load, and a hand that arrived a moment later would arrive after the buffer it
 * belongs in had been built.
 *
 * Three numbers a point: x and y with the artwork's own aspect already in them,
 * and whether the point is skin or one of the veins under it. What a palm-vein
 * reader looks at is the second of those, so the two are kept apart.
 */
export const HAND_POINTS = new Float32Array([${body}]);

/** Points, not numbers. */
export const HAND_POINT_COUNT = ${points.length};
`,
);
console.log('wrote assets/hand-points.ts');

// And a picture of what was sampled, because a point cloud that is wrong is
// only obvious when you look at it.
const preview = 900;
const canvas = Buffer.alloc(preview * Math.round(preview * aspect) * 4, 0);
// Opaque black, so the preview shows what the scene will: light on darkness.
for (let i = 3; i < canvas.length; i += 4) canvas[i] = 255;
const ph = Math.round(preview * aspect);
for (const [x, y, v] of points) {
  const px = Math.round(((x + 1) / 2) * (preview - 1));
  const py = Math.round(((1 - (y + 1) / 2)) * (ph - 1));
  const at = (py * preview + px) * 4;
  // Additive, so density reads the way it will on screen.
  canvas[at] = Math.min(255, canvas[at] + (v ? 150 : 60));
  canvas[at + 1] = Math.min(255, canvas[at + 1] + (v ? 70 : 46));
  canvas[at + 2] = Math.min(255, canvas[at + 2] + (v ? 40 : 30));
  canvas[at + 3] = 255;
}
await sharp(canvas, { raw: { width: preview, height: ph, channels: 4 } })
  .png()
  .toFile('.captures/hand-sampled.png');
console.log('wrote .captures/hand-sampled.png');
