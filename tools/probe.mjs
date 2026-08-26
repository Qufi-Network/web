/**
 * A window into the director.
 *
 * When the scene disagrees with what the state says, this is the shortest way
 * to find out which of the two is lying: it drives the same commands the
 * interface does and reports what the navigation store and the camera actually
 * did, frame by frame.
 *
 *   node tools/probe.mjs
 */
import { pathToFileURL } from 'node:url';

const playwright = await import(
  pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href
);
const { chromium } = playwright.default ?? playwright;

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
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.bringToFront();
await page.goto('http://localhost:4600/?stats', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__qufi), null, { timeout: 40000 });

const look = async (label) => {
  const state = await page.evaluate(() => {
    const snap = window.__qufi.nav.get();
    const c = window.__qufi.stage.camera;
    return {
      mode: snap.mode,
      active: snap.active,
      stage: Number(snap.stage.toFixed(3)),
      travel: Number(snap.travel.toFixed(3)),
      dist: Number(Math.hypot(c.px, c.py, c.pz).toFixed(1)),
      fov: Number(c.fov.toFixed(1)),
      focus: window.__qufi.spaceRuntime.map((r) => Number(r.focus.toFixed(2))).join(','),
      panel: document.querySelector('.space')?.getAttribute('data-show'),
    };
  });
  console.log(label.padEnd(22), JSON.stringify(state));
};

await page.evaluate(() => window.__qufi.online());
await page.waitForTimeout(1500);
await look('online');

await page.evaluate(() => window.__qufi.enterSpace(0));
for (const wait of [400, 800, 1200, 1600, 2400]) {
  await page.waitForTimeout(wait);
  await look(`enter core +${wait}`);
}

await page.evaluate(() => window.__qufi.stageTo(0.5));
await page.waitForTimeout(1800);
await look('stage 0.5');

await page.evaluate(() => window.__qufi.enterSpace(4));
await page.waitForTimeout(3400);
await look('enter movement');

await page.evaluate(() => window.__qufi.returnToNetwork());
await page.waitForTimeout(2800);
await look('returned');

await browser.close();
