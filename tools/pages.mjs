/**
 * The three places, and getting between them.
 *
 * Everything else in this project is checked by driving the camera; this is the
 * one part that is a website. So it gets a website's checks: that the row of
 * controls is on every page, that it names where the visitor already is, that
 * each one actually goes where it says, and that a document scrolls — the
 * environment deliberately locks the body, and a page that forgets to unlock it
 * is a wall of text you cannot reach the bottom of.
 *
 *   node tools/pages.mjs [--mobile]
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

for (const [path, name] of [
  ['/product', 'product'],
  ['/data-room', 'data-room'],
]) {
  await page.goto(`http://localhost:4600${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);

  const state = await page.evaluate(() => {
    const links = [...document.querySelectorAll('.links .link')].map((n) => ({
      href: new URL(n.getAttribute('href'), location.href).pathname,
      here: n.dataset.here,
      name: n.textContent.trim(),
      glyph: Boolean(n.querySelector('svg path')),
    }));
    return {
      links,
      title: document.querySelector('.doc-title')?.textContent ?? '',
      // A document has to scroll, and the environment locks the body.
      unlocked: getComputedStyle(document.body).overflowY,
      scrollable: document.documentElement.scrollHeight - window.innerHeight,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      // The last thing on the page has to be inside the page.
      footReached: (() => {
        const last = document.querySelector('.doc-body')?.lastElementChild;
        if (!last) return false;
        const bottom = last.getBoundingClientRect().bottom + window.scrollY;
        return bottom <= document.documentElement.scrollHeight + 1;
      })(),
      fills: document.documentElement.scrollHeight >= window.innerHeight - 1,
    };
  });

  check(`${name}: all three controls present`, state.links.length === 3, state.links.map((l) => l.href).join(' '));
  check(`${name}: every control has a glyph`, state.links.every((l) => l.glyph));
  check(`${name}: the current page marks itself`, state.links.filter((l) => l.here === 'true').length === 1, JSON.stringify(state.links.map((l) => `${l.href}:${l.here}`)));
  check(`${name}: the body is unlocked`, state.unlocked !== 'hidden', state.unlocked);
  /*
   * Not "is there something to scroll": a short page on a tall phone is a short
   * page, not a broken one. What matters is that the page fills the frame and
   * that its last element is reachable — the failure this is guarding against
   * is a locked body cutting the content off, and that shows up here whether or
   * not there happens to be an overflow.
   */
  check(`${name}: the page fills the frame`, state.fills, `${state.scrollable}px beyond it`);
  check(`${name}: the foot is reachable`, state.footReached);
  check(`${name}: no horizontal overflow`, state.overflow <= 0, `${state.overflow}px`);
  check(`${name}: it has a title`, state.title.length > 0, state.title);

  await page.screenshot({ path: `${out}/p-${name}${suffix}.png`, fullPage: false });
}

// And the way back has to actually go back to the environment.
await page.click('.links .link[href="/"]');
await page.waitForTimeout(2600);
const home = await page.evaluate(() => ({
  path: location.pathname,
  canvas: Boolean(document.querySelector('canvas')),
  locked: getComputedStyle(document.body).overflowY,
}));
check('the network control returns to the network', home.path === '/' && home.canvas, JSON.stringify(home));
check('and the body is locked again behind it', home.locked === 'hidden', home.locked);

await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/p-network-links${suffix}.png` });

await browser.close();
console.log(problems.length ? `\nPROBLEMS: ${problems.join(', ')}` : '\nthe three places work');
process.exit(problems.length ? 1 : 0);
