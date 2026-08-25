import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;
const out = 'C:/ubtc/qufi-network/.captures';
await mkdir(out, { recursive: true });
const C = 13;
const at = (chapter, local) => (chapter + local) / C;
const STOPS = [
  ['60-intersection', at(4, 0.55)],
  ['61-asset-verify', at(5, 0.13)],
  ['62-asset-tokenise', at(5, 0.42)],
  ['63-asset-issue', at(5, 0.58)],
  ['64-asset-handover', at(5, 0.9)],
  ['65-money-flow', at(6, 0.3)],
  ['66-money-meets', at(6, 0.9)],
  ['67-settle-legs', at(7, 0.32)],
  ['68-settle-waiting', at(7, 0.5)],
  ['69-settle-dvp', at(7, 0.68)],
  ['70-settled', at(7, 0.78)],
  ['71-trust', at(8, 0.55)],
  ['72-reveal', at(9, 0.5)],
];
const browser = await chromium.launch({ headless: false, args: ['--hide-scrollbars','--window-position=0,0','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling','--disable-features=CalculateNativeWinOcclusion'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const problems = [];
page.on('console', m => { if (m.type() === 'error') problems.push(m.text()); });
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
await page.bringToFront();
await page.goto('http://localhost:4600/?stats', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.querySelector('canvas')?.width > 400, null, { timeout: 30000 });
await page.evaluate(() => window.__qufi.seek(28));
await page.waitForTimeout(1000);
await page.click('.enter');
await page.waitForTimeout(2400);
const h = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
for (const [name, f] of STOPS) {
  await page.evaluate(y => window.scrollTo(0, y), Math.round(h * f));
  await page.waitForTimeout(1750);
  await page.screenshot({ path: `${out}/${name}.png` });
  const s = await page.evaluate(() => ({
    d: +window.__qufi.stage.depth.toFixed(2),
    asset: +window.__qufi.stage.assetStage.toFixed(2),
    legA: +window.__qufi.stage.settleAsset.toFixed(2),
    legM: +window.__qufi.stage.settleMoney.toFixed(2),
    conf: +window.__qufi.stage.settleConfirm.toFixed(2),
    tx: window.__qufi.experience.get().transaction,
    fps: window.__qufi.stage.fps,
  }));
  console.log(name, JSON.stringify(s));
}
console.log(problems.length ? 'PROBLEMS: ' + problems.join(' | ') : 'no console errors');
await browser.close();
