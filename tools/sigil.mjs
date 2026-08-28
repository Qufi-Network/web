/**
 * The mark arriving into the corner of a card.
 *
 * Three things worth checking and none of them visible in a still: that it is
 * hidden until the card is approached, that it wears that product's colour
 * rather than the site's blue, and that it is genuinely cropped by the card
 * rather than sitting neatly inside it — a mark that fits is a logo, and the
 * whole point is that this one is coming in.
 *
 *   node tools/sigil.mjs
 */
import { pathToFileURL } from 'node:url';

const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;
const out = 'C:/ubtc/qufi-network/.captures';

const browser = await chromium.launch({
  headless: false,
  args: [
    '--hide-scrollbars',
    '--window-position=0,0',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    '--disable-features=CalculateNativeWinOcclusion',
  ],
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) problems.push(label);
};
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

await page.bringToFront();
await page.goto('http://localhost:4600/product', { waitUntil: 'domcontentloaded' });
/*
 * Somewhere that is not a card.
 *
 * The pointer does not start nowhere — it starts wherever the driver left it,
 * which on this layout can be inside one of the four. Parking it in a corner is
 * the difference between measuring the resting state and measuring whatever the
 * mouse happened to be sitting on.
 */
await page.mouse.move(4, 4);
await page.waitForTimeout(1600);

const read = (index) =>
  page.evaluate((i) => {
    const door = document.querySelectorAll('.door')[i];
    // The page can be remounted underneath a run by a hot reload; saying so is
    // more use than a stack trace from inside the browser.
    if (!door) return { name: `door ${i}`, missing: true, opacity: -1 };
    const sigil = door.querySelector('.door-sigil');
    const fill = door.querySelector('.door-sigil-fill');
    const card = door.getBoundingClientRect();
    const box = sigil.getBoundingClientRect();
    return {
      name: door.querySelector('.door-name')?.textContent ?? '',
      opacity: Number(getComputedStyle(sigil).opacity),
      colour: getComputedStyle(fill).backgroundColor,
      tone: getComputedStyle(door).getPropertyValue('--tone').trim(),
      // Past the card's own corner on both edges: that is the crop.
      pastRight: Math.round(box.right - card.right),
      pastBottom: Math.round(box.bottom - card.bottom),
    };
  }, index);

const resting = [];
for (let i = 0; i < 4; i++) resting.push(await read(i));
check(
  'at rest the mark is not there',
  resting.every((r) => r.opacity < 0.02),
  resting.map((r) => r.opacity.toFixed(2)).join(' '),
);

for (let i = 0; i < 4; i++) {
  /*
   * Scrolled into view first, then the pointer put on it by hand.
   *
   * The driver's own hover scrolls and moves in one step, and on a page that is
   * still settling that lands the pointer on whichever card has arrived under
   * it rather than on the one that was asked for — which reads as the wrong
   * card lighting up and looks exactly like a CSS bug. Doing the two halves
   * separately, with the box measured after the scroll, removes the question.
   */
  /*
   * Back to the corner first.
   *
   * The pointer travels in a straight line to wherever it is sent, and on a two
   * by two grid that line goes through the other cards. Parking it off the grid
   * between each one means what is measured afterwards is the card being
   * approached rather than the trail left getting there.
   */
  await page.mouse.move(4, 4);
  await page.waitForTimeout(700);
  await page.evaluate((index) => {
    document.querySelectorAll('.door')[index].scrollIntoView({ block: 'center', behavior: 'instant' });
  }, i);
  await page.waitForTimeout(320);
  const spot = await page.evaluate((index) => {
    const box = document.querySelectorAll('.door')[index].getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }, i);
  await page.mouse.move(spot.x, spot.y);
  // Long enough for this one to arrive and for the ones the pointer crossed on
  // the way to have gone again.
  await page.waitForTimeout(1200);
  const near = await read(i);

  check(`${near.name}: it arrives on approach`, near.opacity > 0.9, near.opacity.toFixed(2));
  check(
    `${near.name}: it is cropped by both edges`,
    near.pastRight > 20 && near.pastBottom > 20,
    `${near.pastRight}px past the right, ${near.pastBottom}px past the bottom`,
  );

  // The fill is the product's colour at low alpha, so what matters is the hue.
  const tone = near.tone.replace('#', '');
  const want = [0, 2, 4].map((at) => Number.parseInt(tone.slice(at, at + 2), 16));
  const got = (near.colour.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const same = want.every((v, at) => Math.abs(v - got[at]) < 6);
  check(`${near.name}: in its own colour`, same, `${near.colour} against ${near.tone}`);

  // And the one being approached is the only one wearing it.
  const others = [];
  for (let j = 0; j < 4; j++) if (j !== i) others.push((await read(j)).opacity);
  check(
    `${near.name}: and only on that card`,
    others.every((o) => o < 0.02),
    others.map((o) => o.toFixed(2)).join(' '),
  );

  if (i === 0) await page.screenshot({ path: `${out}/s-door-hover.png` });
}

await browser.close();
console.log(problems.length ? `\nPROBLEMS: ${problems.join(', ')}` : '\nthe mark arrives');
process.exit(problems.length ? 1 : 0);
