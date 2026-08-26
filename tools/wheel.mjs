/**
 * Does the wheel reach the route.
 *
 * The smallest possible question, asked on its own, because "the site did not
 * scroll" has half a dozen causes and only one of them is the director: the
 * listener may not be attached, the events may be landing on something else,
 * the handler may be returning early, or the value may be moving and then being
 * overwritten. This reports each notch as it lands.
 *
 *   node tools/wheel.mjs
 */
import { pathToFileURL } from 'node:url';

const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;

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

const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
await page.bringToFront();
await page.goto('http://localhost:4600/?stats', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__qufi), null, { timeout: 40000 });
await page.evaluate(() => window.__qufi.online());
await page.waitForTimeout(2000);

// Count the events the page actually receives, separately from what the
// director does with them.
await page.evaluate(() => {
  window.__wheels = 0;
  document
    .querySelector('canvas')
    .addEventListener('wheel', () => {
      window.__wheels++;
    }, { capture: true });
});

await page.mouse.move(760, 380);
for (let i = 0; i < 12; i++) {
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(160);
  const state = await page.evaluate(() => ({
    wheels: window.__wheels,
    routeBy: window.__qufi.request.routeBy,
    travel: Number(window.__qufi.nav.get().travel.toFixed(4)),
    mode: window.__qufi.nav.get().mode,
    active: window.__qufi.nav.get().active,
  }));
  console.log(`notch ${String(i + 1).padStart(2)}  ${JSON.stringify(state)}`);
}

await browser.close();
