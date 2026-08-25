import { pathToFileURL } from 'node:url';
const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;
const out = 'C:/ubtc/qufi-network/.captures';
const browser = await chromium.launch({ headless: false, args: ['--hide-scrollbars','--window-position=0,0','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling','--disable-features=CalculateNativeWinOcclusion'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1 });
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
for (const [name, f] of [['40-signal', 0.5], ['41-ending', 0.96]]) {
  await page.evaluate(y => window.scrollTo(0, y), Math.round(h * f));
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('captured', name);
}
// Reach for a way in and watch the connection establish.
const box = await page.locator('.chapter-enter .actions button').first().boundingBox();
if (box) {
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/42-ending-reach.png` });
  console.log('captured 42-ending-reach');
} else { console.log('no action button found'); }
console.log('fps', await page.evaluate(() => window.__qufi.stage.fps));
await browser.close();
