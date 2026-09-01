/**
 * The data room, looked at.
 *
 * The room is a reading environment rather than a scene, so what matters is
 * not frame rate but whether it holds together as a page: the column widths,
 * the density of the lists, whether a section of nine items reads as nine
 * items. This walks every kind of page in it and photographs each one at a
 * desktop size, plus the two states that only exist under a pointer or a
 * keystroke — the search dropdown and a hovered card.
 *
 *   node tools/room.mjs [width]
 */
import { pathToFileURL } from 'node:url';

const width = Number(process.argv[2] ?? 1440);
const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;
const out = 'C:/ubtc/qufi-network/.captures';

const browser = await chromium.launch({ headless: false, args: ['--hide-scrollbars'] });
const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });

const problems = [];
const note = (where, what) => {
  console.log(`  !! ${where}: ${what}`);
  problems.push(`${where}: ${what}`);
};
page.on('pageerror', (e) => note('page', e.message.slice(0, 110)));
page.on('console', (m) => {
  if (m.type() === 'error') note('console', m.text().slice(0, 110));
});

/* Anything past the right edge, and how tall the page came out. */
const check = (where) =>
  page.evaluate((w) => {
    const wide = [];
    const clipped = (node) => {
      for (let at = node.parentElement; at; at = at.parentElement) {
        const s = getComputedStyle(at);
        if (s.overflow !== 'visible' || s.clipPath !== 'none') return true;
      }
      return false;
    };
    for (const node of document.querySelectorAll('body *')) {
      const b = node.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      if (b.right <= w + 1.5 && b.left >= -1.5) continue;
      if (clipped(node)) continue;
      wide.push(`${node.tagName.toLowerCase()}.${(node.className || '').toString().split(' ')[0]} ${Math.round(b.left)}→${Math.round(b.right)}`);
    }
    return {
      wide: wide.slice(0, 6),
      height: document.documentElement.scrollHeight,
      links: document.querySelectorAll('.room a, .room button').length,
    };
  }, width);

const look = async (where, url, { full = true, wait = 900 } = {}) => {
  await page.goto(`http://localhost:4600${url}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(wait);
  const a = await check(where);
  for (const w of a.wide) note(where, `${w} runs past the right edge`);
  console.log(`${where.padEnd(30)} ${a.height}px tall, ${a.links} controls`);
  await page.screenshot({
    path: `${out}/room-${where.replace(/[^a-z0-9]+/gi, '-')}.png`,
    fullPage: full,
  });
  return a;
};

console.log(`\ndata room  ${width}px\n`);

await look('overview', '/data-room');
await look('start', '/data-room/start');
await look('section-technology', '/data-room/section/technology');
await look('section-legal', '/data-room/section/legal');
await look('document-whitepaper', '/data-room/document/technical-whitepaper');
await look('document-planned', '/data-room/document/investor-memorandum');
await look('search-empty', '/data-room/search');
await look('search-quantum', '/data-room/search?q=quantum');

/* The dropdown, which only exists while somebody is typing. */
await page.goto('http://localhost:4600/data-room', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);
await page.fill('.room-search-field input', 'vault');
await page.waitForTimeout(600);
const quick = await page.$$('.room-search-quick a');
if (!quick.length) note('search / live', 'typing produced no results');
else console.log(`${'search / live'.padEnd(30)} ${quick.length} quick results`);
await page.locator('.room-search').screenshot({ path: `${out}/room-search-live.png` });

/* A card under the pointer. */
await page.goto('http://localhost:4600/data-room/section/technology', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);
const card = await page.$('.doc-card');
if (card) {
  await card.hover();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/room-card-hover.png` });
}

await browser.close();
console.log(problems.length ? `\n${problems.length} PROBLEMS:\n  ${problems.join('\n  ')}` : '\nthe room is clean');
process.exit(problems.length ? 1 : 0);
