/**
 * The products page, looked at properly.
 *
 * The figures are the navigation here, so the checks are about that: that every
 * product has one, that they are drawn rather than placed, that choosing one
 * actually opens it, and that the panel underneath belongs to whichever is
 * chosen. Then the two things a page like this quietly gets wrong — a status
 * marker that has gone missing, and a rollout whose dates say one thing while
 * its rail says another.
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
await page.waitForTimeout(1500);

const picks = await page.evaluate(() =>
  [...document.querySelectorAll('.pick')].map((n) => ({
    name: n.querySelector('.pick-name')?.textContent ?? '',
    tone: getComputedStyle(n).getPropertyValue('--tone').trim(),
    strokes: n.querySelectorAll('.figure path, .figure circle').length,
    moving: n.querySelectorAll('.figure [class*="figure-"]').length,
  })),
);

check('every product has a figure to be chosen by', picks.length >= 4, picks.map((p) => p.name).join(' / '));
check(
  'each figure is drawn rather than placed',
  picks.every((p) => p.strokes >= 5),
  picks.map((p) => p.strokes).join(' / '),
);
check(
  'each has its own colour',
  new Set(picks.map((p) => p.tone)).size === picks.length,
  picks.map((p) => p.tone).join(' '),
);
check('no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 0);

let liveClaims = 0;

for (const [i, pick] of picks.entries()) {
  await page.click(`.pick >> nth=${i}`);
  await page.waitForTimeout(900);

  const panel = await page.evaluate(() => {
    const el = document.querySelector('.panel');
    const chosen = document.querySelector('.pick[data-here="true"] .pick-name')?.textContent ?? '';
    const rail = el.querySelector('.timeline-rail');
    return {
      chosen,
      // The panel has to be the one the chosen tab points at.
      labelled: el.getAttribute('aria-labelledby'),
      id: el.id,
      lede: el.querySelector('.panel-lede')?.textContent?.trim() ?? '',
      status: el.querySelector('.panel-status')?.textContent?.trim() ?? '',
      live: el.querySelector('.panel-status')?.dataset.live,
      anchor: el.querySelector('.anchor-value')?.textContent?.trim() ?? null,
      stops: [...el.querySelectorAll('.stop')].map((s) => ({
        where: s.querySelector('.stop-where')?.textContent ?? '',
        when: s.querySelector('.stop-when')?.textContent ?? '',
        state: s.dataset.state,
      })),
      solid: rail ? getComputedStyle(rail).getPropertyValue('--solid').trim() : null,
    };
  });

  if (panel.live === 'true') liveClaims++;

  check(`${pick.name}: choosing it opens it`, panel.chosen === pick.name, `showing ${panel.chosen}`);
  check(`${pick.name}: the panel is named by its tab`, panel.labelled === `tab-${panel.id.replace('panel-', '')}`);
  check(`${pick.name}: it says what state it is in`, panel.status.length > 6, panel.status);

  if (panel.stops.length) {
    /*
     * The rail and the dates have to agree. `--solid` is how far along the line
     * is drawn as real, and it has to reach the last stop that is running or
     * being built — a rail lit past a date that has not happened is the exact
     * thing a rollout diagram must not do.
     */
    const lastReal = panel.stops.reduce((at, s, index) => (s.state === 'planned' ? at : index), 0);
    const expected = ((lastReal / (panel.stops.length - 1)) * 100).toFixed(0);
    const actual = Number.parseFloat(panel.solid).toFixed(0);
    check(
      `${pick.name}: the rail is lit as far as the dates allow`,
      expected === actual,
      `${panel.stops.length} stops, lit to ${actual}% (dates say ${expected}%)`,
    );
    console.log(
      `      ${panel.stops.map((s) => `${s.where} (${s.when})`).join('  →  ')}`,
    );
  }

  await page.screenshot({ path: `${out}/pk-${i}${suffix}.png` });
}

check('only one product claims to be running', liveClaims === 1, `${liveClaims} claim it`);

// And the one fact this page exists to carry.
await page.click('.pick >> nth=0');
await page.waitForTimeout(700);
const prefix = await page.evaluate(() => ({
  value: document.querySelector('.anchor-field[data-lit="true"] .anchor-value')?.textContent?.trim(),
  writes: document.querySelector('.anchor-writes')?.textContent?.trim(),
}));
check('the chain prefix is on the page', prefix.value === 'QUANTUM:', String(prefix.value));
check('and says which instructions write it', /Mint/.test(prefix.writes) && /Transfer/.test(prefix.writes) && /Redeem/.test(prefix.writes), prefix.writes);

await browser.close();
console.log(problems.length ? `\nPROBLEMS: ${problems.join(', ')}` : '\nthe products read');
process.exit(problems.length ? 1 : 0);
