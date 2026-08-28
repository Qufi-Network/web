/**
 * The door into the application, on both pages that carry it.
 *
 *   node tools/applink.mjs
 */
import { pathToFileURL } from 'node:url';

const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;
const out = 'C:/ubtc/qufi-network/.captures';

const browser = await chromium.launch({ headless: false, args: ['--hide-scrollbars', '--window-position=0,0'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) problems.push(label);
};
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

/* ---- the end of the walk ------------------------------------------------- */

await page.goto('http://localhost:4600/product/ubtc', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3200);
await page.keyboard.press('End');
await page.waitForTimeout(2600);

const walked = await page.evaluate(() => {
  const ending = document.querySelector('.ending');
  const link = ending?.querySelector('.applink');
  if (!link) return null;
  const box = link.getBoundingClientRect();
  return {
    shown: ending.getAttribute('data-show'),
    href: link.getAttribute('href'),
    target: link.getAttribute('target'),
    opacity: Number(getComputedStyle(ending).opacity),
    mark: Boolean(link.querySelector('.applink-mark img')?.naturalWidth),
    width: Math.round(box.width),
    glow: getComputedStyle(link).boxShadow !== 'none',
  };
});

check('the walk ends at it', Boolean(walked) && walked.shown === 'true', walked ? `opacity ${walked.opacity.toFixed(2)}` : 'not found');
if (walked) {
  check('it goes to the application', walked.href === 'https://app.ub.tc' && walked.target === '_blank', walked.href);
  check('the mark loaded', walked.mark);
  check('and it is lit', walked.glow, `${walked.width}px wide`);
}
await page.screenshot({ path: `${out}/s-applink-walk.png` });

/* ---- and the written page behind it -------------------------------------- */

// The only way to the writing is through the walk, so the harness goes the way
// a visitor does rather than by a query string the site does not have.
await page.click('.ending-go');
await page.waitForTimeout(1400);

const read = await page.evaluate(() => {
  const panel = document.querySelector('.panel');
  const link = panel?.querySelector('.applink');
  if (!link) return null;
  const box = link.getBoundingClientRect();
  const lede = panel.querySelector('.panel-lede')?.getBoundingClientRect();
  return {
    href: link.getAttribute('href'),
    width: Math.round(box.width),
    top: Math.round(box.top),
    afterLede: Boolean(lede) && box.top > lede.top,
    label: link.querySelector('.applink-label')?.textContent ?? '',
  };
});

check('the written page carries it too', Boolean(read), read ? `${read.width}px wide, ${read.label}` : 'not found');
if (read) {
  check('high on the page, under the lede', read.afterLede && read.top < 900, `${read.top}px down`);
  check('and the same door again', read.href === 'https://app.ub.tc', read.href);
}
await page.screenshot({ path: `${out}/s-applink-read.png` });

await browser.close();
console.log(problems.length ? `\nPROBLEMS: ${problems.join(', ')}` : '\nthe door is there');
process.exit(problems.length ? 1 : 0);
