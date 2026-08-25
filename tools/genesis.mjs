import { pathToFileURL } from 'node:url';
const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;
const out = 'C:/ubtc/qufi-network/.captures';
const browser = await chromium.launch({ headless: false, args: ['--hide-scrollbars','--window-position=0,0','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling','--disable-features=CalculateNativeWinOcclusion'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.bringToFront();
await page.goto('http://localhost:4600/?stats', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.querySelector('canvas')?.width > 400, null, { timeout: 40000 });
await page.evaluate(() => window.__qufi.seek(28));
await page.waitForTimeout(1000);
await page.click('.enter');
await page.waitForTimeout(2400);
const h = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
await page.evaluate(y => window.scrollTo(0, y), Math.round(h * (12.6 / 13)));
await page.waitForTimeout(2200);
await page.screenshot({ path: `${out}/90-genesis.png` });
console.log('captured form');

// Fill it in and watch the node connect.
await page.fill('input[name="name"]', 'Alexander Reay');
await page.waitForTimeout(700);
await page.fill('input[name="email"]', 'alexander@example.com');
await page.fill('input[name="organisation"]', 'QUFI');
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/91-genesis-filled.png` });

// Validation should reject a bad address rather than accepting it.
await page.fill('input[name="email"]', 'not-an-email');
await page.click('.genesis button[type="submit"]');
await page.waitForTimeout(800);
const err = await page.textContent('.genesis-error');
console.log('validation:', JSON.stringify((err || '').trim()));

await page.fill('input[name="email"]', 'alexander@example.com');
await page.click('.genesis button[type="submit"]');
await page.waitForTimeout(2600);
await page.screenshot({ path: `${out}/92-genesis-done.png` });
const done = await page.textContent('.genesis');
console.log('after submit:', JSON.stringify((done || '').replace(/\s+/g, ' ').trim().slice(0, 160)));
console.log('reach:', await page.evaluate(() => window.__qufi.stage.reach));
await browser.close();
