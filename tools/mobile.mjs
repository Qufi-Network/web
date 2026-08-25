import { pathToFileURL } from 'node:url';
const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;
const out = 'C:/ubtc/qufi-network/.captures';
const browser = await chromium.launch({ headless: false, args: ['--hide-scrollbars','--window-position=0,0','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling','--disable-features=CalculateNativeWinOcclusion'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.bringToFront();
await page.goto('http://localhost:4600/?stats', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.querySelector('canvas')?.width > 300, null, { timeout: 30000 });
console.log('tier', await page.evaluate(() => window.__qufi.experience.get().tier));
await page.evaluate(() => window.__qufi.seek(26));
await page.waitForTimeout(1600);
await page.screenshot({ path: `${out}/m1-identity.png` });
await page.evaluate(() => window.__qufi.seek(28.5));
await page.waitForTimeout(1400);
await page.tap('.enter');
await page.waitForTimeout(2600);
const h = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
const C = 13; const at = (c, l) => (c + l) / C;
for (const [n, f] of [['m2-discovery', at(0,0.5)], ['m4-qufi', at(2,0.5)], ['m8-intersection', at(4,0.55)], ['m9-assets', at(5,0.2)], ['m10-money', at(6,0.35)], ['m11-settle', at(7,0.7)], ['m12-reveal', at(9,0.5)], ['m7-ending', at(12,0.9)]]) {
  await page.evaluate(y => window.scrollTo(0, y), Math.round(h * f));
  await page.waitForTimeout(1700);
  await page.screenshot({ path: `${out}/${n}.png` });
  console.log('captured', n);
}
// Horizontal overflow is the classic failure on a fixed-viewport layout.
const overflow = await page.evaluate(() => ({
  docWidth: document.documentElement.scrollWidth,
  winWidth: window.innerWidth,
  fps: window.__qufi.stage.fps,
}));
console.log('overflow check', JSON.stringify(overflow));
await browser.close();
