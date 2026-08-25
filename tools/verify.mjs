/**
 * The paths that are not the happy path.
 *
 * Reduced motion, a missing GPU, and keyboard-only use are the three ways this
 * site can fail a visitor completely rather than partially, so they get checked
 * explicitly rather than assumed.
 */
import { pathToFileURL } from 'node:url';
const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;
const out = 'C:/ubtc/qufi-network/.captures';
const args = ['--hide-scrollbars','--window-position=0,0','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling','--disable-features=CalculateNativeWinOcclusion'];

const browser = await chromium.launch({ headless: false, args });

// ---- reduced motion -------------------------------------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.bringToFront();
  await page.goto('http://localhost:4600/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}/50-reduced-motion.png` });
  const state = await page.evaluate(() => ({
    wordmark: getComputedStyle(document.querySelector('.wordmark-a')).opacity,
    enterVisible: document.querySelector('.invitation')?.dataset.show,
  }));
  console.log('reduced motion:', JSON.stringify(state));
  await ctx.close();
}

// ---- keyboard -------------------------------------------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } });
  const page = await ctx.newPage();
  await page.bringToFront();
  await page.goto('http://localhost:4600/?stats', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__qufi), null, { timeout: 30000 });
  await page.evaluate(() => window.__qufi.seek(28));
  await page.waitForTimeout(1200);
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    return el ? `${el.tagName}.${el.className}` : 'none';
  });
  await page.screenshot({ path: `${out}/51-keyboard-focus.png` });
  console.log('first tab stop:', focused);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2400);
  console.log('entered via keyboard:', await page.evaluate(() => window.__qufi.experience.get().phase));
  await ctx.close();
}

// ---- no WebGL -------------------------------------------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } });
  const page = await ctx.newPage();
  // Deny the context the same way a locked-down machine would.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (String(type).startsWith('webgl')) return null;
      return original.call(this, type, ...rest);
    };
  });
  await page.bringToFront();
  await page.goto('http://localhost:4600/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/52-no-webgl.png`, fullPage: false });
  const fallback = await page.evaluate(() => ({
    flag: document.documentElement.dataset.webgl,
    heading: document.querySelector('.document h1')?.textContent,
    documentVisible: document.querySelector('.document')?.getBoundingClientRect().width > 100,
    svg: Boolean(document.querySelector('.static-network svg')),
  }));
  console.log('no webgl:', JSON.stringify(fallback));
  await ctx.close();
}

await browser.close();
