/**
 * The products page, looked at properly.
 *
 * A page of three figures beside three columns has two failure modes a
 * screenshot of the top will not show: a figure that has come adrift from the
 * words it belongs to, and a status marker that has quietly gone missing from
 * one of them. So each product is scrolled to in turn, measured against its own
 * column, and photographed.
 *
 *   node tools/products.mjs [--mobile]
 */
import { pathToFileURL } from 'node:url';

const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;

const mobile = process.argv.includes('--mobile');
const out = 'C:/ubtc/qufi-network/.captures';
const suffix = mobile ? '-m' : '';

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

const ctx = await browser.newContext(
  mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
);
const page = await ctx.newPage();
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) problems.push(label);
};
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

await page.bringToFront();
await page.goto('http://localhost:4600/product', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1400);

const shape = await page.evaluate(() => {
  const products = [...document.querySelectorAll('.product')].map((el) => ({
    name: el.querySelector('.product-name')?.textContent ?? '',
    tone: getComputedStyle(el).getPropertyValue('--tone').trim(),
    figure: Boolean(el.querySelector('.figure path')),
    strokes: el.querySelectorAll('.figure path, .figure circle').length,
    parts: el.querySelectorAll('.product-parts div').length,
    status: el.querySelector('.product-status')?.textContent?.trim() ?? '',
    live: el.querySelector('.product-status')?.dataset.live,
  }));
  return {
    products,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    // Every figure has to take the colour of its own product, or the page is
    // three of the same thing in three positions.
    tones: new Set(products.map((p) => p.tone)).size,
  };
});

check('three products', shape.products.length === 3, shape.products.map((p) => p.name).join(' / '));
check('each has a figure', shape.products.every((p) => p.figure));
check(
  'each figure is drawn rather than placed',
  shape.products.every((p) => p.strokes >= 5),
  shape.products.map((p) => p.strokes).join(' / '),
);
check('three distinct colours', shape.tones === 3, shape.products.map((p) => p.tone).join(' '));
check('each says what state it is in', shape.products.every((p) => p.status.length > 8));
check(
  'and only the deployed one claims to be',
  shape.products.filter((p) => p.live === 'true').length === 1,
  shape.products.map((p) => `${p.name}:${p.live}`).join(' '),
);
check('no horizontal overflow', shape.overflow <= 0, `${shape.overflow}px`);

for (const [i, product] of shape.products.entries()) {
  await page.evaluate((index) => {
    document.querySelectorAll('.product')[index].scrollIntoView({
      // Its top, not its middle: on a phone the figure sits above the words and
      // centring the block puts the figure above the fold.
      block: 'start',
      behavior: 'instant',
    });
    window.scrollBy(0, -90);
  }, i);
  await page.waitForTimeout(500);

  const framed = await page.evaluate((index) => {
    const el = document.querySelectorAll('.product')[index];
    const figure = el.querySelector('.figure').getBoundingClientRect();
    const words = el.querySelector('.product-words').getBoundingClientRect();
    // Two layouts, two questions. Side by side, the figure has to share the
    // vertical band with its words rather than float over the next product's.
    // Stacked, it has to sit directly above them with nothing in between.
    const stacked = figure.bottom <= words.top + 2;
    return {
      figureVisible: figure.bottom > -1 && figure.top < window.innerHeight && figure.width > 40,
      together: stacked
        ? words.top - figure.bottom < 80
        : figure.top < words.bottom && figure.bottom > words.top,
      layout: stacked ? 'stacked' : 'beside',
      width: Math.round(figure.width),
    };
  }, i);

  check(
    `${product.name}: the figure is on screen with its words`,
    framed.figureVisible && framed.together,
    `${framed.layout}, ${framed.width}px wide`,
  );
  await page.screenshot({ path: `${out}/pr-${i}${suffix}.png` });
}

await browser.close();
console.log(problems.length ? `\nPROBLEMS: ${problems.join(', ')}` : '\nthe products read');
process.exit(problems.length ? 1 : 0);
