/**
 * Do the three entry points actually take you there?
 *
 * The intersection promises travel into a journey. If those buttons do not move
 * the visitor to the right place, the whole claim that this is one continuous
 * descent falls over.
 */
import { pathToFileURL } from 'node:url';
const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;
const browser = await chromium.launch({ headless: false, args: ['--hide-scrollbars','--window-position=0,0','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling','--disable-features=CalculateNativeWinOcclusion'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.bringToFront();
await page.goto('http://localhost:4600/?stats', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.querySelector('canvas')?.width > 400, null, { timeout: 30000 });
await page.evaluate(() => window.__qufi.seek(28));
await page.waitForTimeout(1000);
await page.click('.enter');
await page.waitForTimeout(2400);
const h = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
// Land on the intersection (chapter index 4 of 13).
await page.evaluate(y => window.scrollTo(0, y), Math.round(h * (4.4 / 13)));
await page.waitForTimeout(1800);
for (const [i, want] of [[0, 5], [1, 6], [2, 7]]) {
  await page.evaluate(y => window.scrollTo(0, y), Math.round(h * (4.4 / 13)));
  await page.waitForTimeout(1500);
  const buttons = page.locator('.chapter-intersection .routes button');
  await buttons.nth(i).click();
  await page.waitForTimeout(2600);
  const d = await page.evaluate(() => window.__qufi.stage.depth);
  console.log(`route ${i} -> depth ${d.toFixed(2)} (wanted chapter ${want})`, Math.floor(d) === want ? 'OK' : 'WRONG');
}
// And the handover question at the end of the asset journey.
await page.evaluate(y => window.scrollTo(0, y), Math.round(h * (5.92 / 13)));
await page.waitForTimeout(1900);
const handover = page.locator('.chapter-assets .handover button');
if (await handover.count()) {
  await handover.click();
  await page.waitForTimeout(2600);
  const d = await page.evaluate(() => window.__qufi.stage.depth);
  console.log(`handover -> depth ${d.toFixed(2)} (wanted 6)`, Math.floor(d) === 6 ? 'OK' : 'WRONG');
} else { console.log('handover button not found'); }
await page.screenshot({ path: 'C:/ubtc/qufi-network/.captures/80-after-handover.png' });
await browser.close();
