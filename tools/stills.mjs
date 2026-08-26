/**
 * A handful of frames worth looking at.
 *
 * Not a check — the harnesses do that. This is for judging the thing: a few
 * positions on the route, photographed at whatever size the argument asks for,
 * so a composition decision can be made from a picture rather than a number.
 *
 *   node tools/stills.mjs [--mobile]
 */
import { pathToFileURL } from 'node:url';

const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;

const mobile = process.argv.includes('--mobile');
const out = 'C:/ubtc/qufi-network/.captures';
const suffix = mobile ? '-m' : '';

/** Positions on the route, as a share of the whole journey. */
const STILLS = [
  ['open', 0.04],
  ['core', 0.15],
  ['core-deep', 0.19],
  ['signing', 0.27],
  ['proof', 0.37],
  ['collateral', 0.47],
  ['movement', 0.57],
  ['recovery', 0.67],
  ['networks', 0.77],
  ['flows', 0.87],
  ['close', 0.99],
];

const browser = await chromium.launch({
  headless: false,
  args: [
    '--hide-scrollbars',
    '--mute-audio',
    '--window-position=0,0',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    '--disable-features=CalculateNativeWinOcclusion',
  ],
});

const ctx = await browser.newContext(
  mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1 },
);
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('pageerror:', e.message));

await page.bringToFront();
await page.goto('http://localhost:4600/?stats', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__qufi), null, { timeout: 40000 });
await page.waitForFunction(() => document.querySelector('canvas').width > 300, null, {
  timeout: 20000,
});
await page.evaluate(() => window.__qufi.online());
await page.waitForTimeout(2400);

// Out of the way, so nothing is lit by a pointer that is not there.
await page.mouse.move(mobile ? 8 : 20, mobile ? 8 : 20);

for (const [name, at] of STILLS) {
  await page.evaluate((t) => window.__qufi.travelTo(t), at);
  // Long enough for the route to arrive and for the structure to settle into
  // whatever it does at that point in its sequence.
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${out}/still-${name}${suffix}.png` });
  const fps = await page.evaluate(() => window.__qufi.stage.fps);
  console.log(`${name.padEnd(11)} ${fps} fps`);
}

await browser.close();
