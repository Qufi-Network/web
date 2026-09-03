/**
 * The viewer, driven.
 *
 * Checks the three things that matter about a document nobody is meant to be
 * able to save: that it renders at all, that the pages are actually drawn
 * rather than reported, and that none of the ordinary ways out of a browser
 * with a file are open.
 *
 *   node tools/paper.mjs [id]
 */
import { pathToFileURL } from 'node:url';

const id = process.argv[2] ?? 'investor-memorandum';
const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;

const problems = [];
const note = (what) => {
  console.log(`  !! ${what}`);
  problems.push(what);
};

const browser = await chromium.launch({ headless: false, args: ['--hide-scrollbars'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => note(`page error: ${e.message.slice(0, 110)}`));
page.on('console', (m) => {
  if (m.type() === 'error') note(`console: ${m.text().slice(0, 110)}`);
});

await page.goto(`http://localhost:4600/data-room/view/${id}`, { waitUntil: 'domcontentloaded' });

// The first canvas is the signal that pdf.js got the bytes and drew them.
await page.waitForSelector('.paper-page', { timeout: 30000 }).catch(() => {
  note('no page was ever drawn');
});
await page.waitForTimeout(4000);

const seen = await page.evaluate(() => {
  const canvases = [...document.querySelectorAll('canvas.paper-page')];
  // A canvas can exist and be blank. Sample the middle of the first one and
  // check something was actually painted there.
  let painted = false;
  if (canvases[0]) {
    const c = canvases[0];
    const data = c.getContext('2d').getImageData(c.width / 2 - 40, c.height / 2 - 40, 80, 80).data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 12 || data[i + 1] > 12 || data[i + 2] > 12) {
        painted = true;
        break;
      }
    }
  }
  return {
    pages: canvases.length,
    painted,
    state: document.querySelector('.reader')?.dataset.state,
    where: document.querySelector('.reader-where')?.textContent?.trim(),
    // Anything offering the file directly would be a hole in the whole idea.
    downloads: document.querySelectorAll('a[download], a[href$=".pdf"]').length,
    embeds: document.querySelectorAll('embed, object, iframe').length,
  };
});

if (!seen.pages) note('no pages rendered');
if (!seen.painted) note('the first page is blank');
if (seen.state !== 'ready') note(`viewer state is "${seen.state}"`);
if (seen.downloads) note(`${seen.downloads} download links on the page`);
if (seen.embeds) note(`${seen.embeds} embeds — the native PDF viewer would carry a toolbar`);

console.log(`${id}: ${seen.pages} pages drawn, painted=${seen.painted}, "${seen.where}"`);

// The context menu is where "save image as" lives.
const menu = await page.evaluate(() => {
  const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
  document.querySelector('canvas.paper-page')?.dispatchEvent(event);
  return event.defaultPrevented;
});
if (!menu) note('the context menu is not suppressed over a page');

// And Ctrl+S.
const save = await page.evaluate(() => {
  const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true });
  document.dispatchEvent(event);
  return event.defaultPrevented;
});
if (!save) note('Ctrl+S is not intercepted');

await page.screenshot({ path: `C:/ubtc/qufi-network/.captures/paper-${id}.png` });
await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(900);
await page.screenshot({ path: `C:/ubtc/qufi-network/.captures/paper-${id}-2.png` });

await browser.close();
console.log(problems.length ? `\n${problems.length} PROBLEMS:\n  ${problems.join('\n  ')}` : '\nclean');
process.exit(problems.length ? 1 : 0);
