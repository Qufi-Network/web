/**
 * The three things across the top, on one line.
 *
 * The mark, the ways out and the coordinate are three separate fixed elements
 * of three different heights. Aligning them is the kind of thing that looks
 * right in one viewport and wrong in the next, so it is measured rather than
 * eyeballed: the centre of each box, at several widths, against the others.
 *
 *   node tools/topbar.mjs
 */
import { pathToFileURL } from 'node:url';

const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;

const out = 'C:/ubtc/qufi-network/.captures';
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

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

for (const [width, height] of [
  [1920, 1080],
  [1440, 810],
  [1120, 700],
  [900, 640],
]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.bringToFront();
  await page.goto('http://localhost:4600/?stats', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__qufi), null, { timeout: 40000 });
  await page.evaluate(() => window.__qufi.online());
  await page.waitForTimeout(1600);

  const bar = await page.evaluate(() => {
    const middle = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { mid: r.top + r.height / 2, top: r.top, bottom: r.bottom };
    };
    return {
      mark: middle('.hud-mark'),
      links: middle('.links'),
      coordinate: middle('.coordinate'),
    };
  });

  const centres = [bar.mark, bar.links, bar.coordinate].filter(Boolean).map((b) => b.mid);
  const drift = Math.max(...centres) - Math.min(...centres);
  const highest = Math.min(...[bar.mark, bar.links, bar.coordinate].filter(Boolean).map((b) => b.top));

  check(
    `${width}x${height}: the three sit on one line`,
    drift < 1.5,
    `centres ${centres.map((c) => c.toFixed(1)).join(' / ')}`,
  );
  check(`${width}x${height}: and clear of the edge`, highest > 12, `${highest.toFixed(0)}px from the top`);

  if (width === 1440) {
    await page.screenshot({ path: `${out}/t-topbar.png`, clip: { x: 0, y: 0, width, height: 130 } });
  }
  await page.close();
}

await browser.close();
console.log(problems.length ? `\nPROBLEMS: ${problems.join(', ')}` : '\nthe top line holds');
process.exit(problems.length ? 1 : 0);
