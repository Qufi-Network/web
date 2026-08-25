/**
 * Does the single-file build actually run?
 *
 * The bundle takes a different path through the code than the dev server does —
 * no Next runtime, no module boundaries, production React — so it gets checked
 * on its own rather than assumed to match.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;

// The host wraps the file in its own skeleton; reproduce that for the test.
const body = await readFile('C:/ubtc/qufi-network/dist/qufi.html', 'utf8');
const wrapped = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${body.split('<div id="qufi-root">')[0]}</head><body><div id="qufi-root">${body.split('<div id="qufi-root">')[1]}</body></html>`;
await writeFile('C:/ubtc/qufi-network/dist/preview.html', wrapped, 'utf8');

const browser = await chromium.launch({ headless: false, args: ['--hide-scrollbars','--window-position=0,0','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling','--disable-features=CalculateNativeWinOcclusion'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } });
const page = await ctx.newPage();
const problems = [];
page.on('console', m => { if (m.type() === 'error') problems.push(m.text()); });
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
page.on('request', r => { const u = r.url(); if (!u.startsWith('file:') && !u.startsWith('data:')) problems.push('EXTERNAL REQUEST: ' + u); });

await page.bringToFront();
await page.goto(pathToFileURL('C:/ubtc/qufi-network/dist/preview.html').href, { waitUntil: 'load' });
await page.waitForFunction(() => document.querySelector('canvas')?.width > 400, null, { timeout: 40000 });
console.log('canvas sized');

// Watch the opening play through in real time rather than scrubbing: without
// the debug handle this is the only way to see it, and it is what a visitor gets.
await page.waitForTimeout(11000);
await page.screenshot({ path: 'C:/ubtc/qufi-network/.captures/95-bundle-emergence.png' });
await page.waitForTimeout(17000);
await page.screenshot({ path: 'C:/ubtc/qufi-network/.captures/96-bundle-invitation.png' });

const enter = page.locator('.enter');
console.log('invitation present:', await enter.count() > 0);
if (await enter.count()) {
  await enter.click();
  await page.waitForTimeout(2600);
  const h = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  console.log('scroll range', h);
  await page.evaluate(y => window.scrollTo(0, y), Math.round(h * 0.35));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'C:/ubtc/qufi-network/.captures/97-bundle-qufi.png' });
  await page.evaluate(y => window.scrollTo(0, y), Math.round(h * 0.98));
  await page.waitForTimeout(2400);
  await page.screenshot({ path: 'C:/ubtc/qufi-network/.captures/98-bundle-genesis.png' });
  console.log('genesis form present:', await page.locator('.genesis button[type=submit]').count() > 0);
}
console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'no errors, no external requests');
await browser.close();
