/**
 * A product journey, walked.
 *
 * The same question as the route on the front of the site, asked of a smaller
 * one: does the wheel carry the visitor through every stage in order, does the
 * camera stay continuous while it does, and does the scene actually change —
 * a journey whose stages all look identical is a slideshow of one frame.
 *
 *   node tools/journey.mjs [--path /product/ubtc] [--notches 90] [--mobile]
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const route = flag('path', '/product/ubtc');
const notches = Number(flag('notches', 90));
const mobile = args.includes('--mobile');
const out = 'C:/ubtc/qufi-network/.captures';
const slug = route.replace(/\W+/g, '-').replace(/^-|-$/g, '');
const suffix = mobile ? '-m' : '';

await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  headless: false,
  args: [
    '--hide-scrollbars',
    '--mute-audio',
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
    : { viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1 },
);
const page = await ctx.newPage();
const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`error: ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

await page.bringToFront();
await page.goto(`http://localhost:4600${route}?stats`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__ubtc), null, { timeout: 40000 });
await page.waitForFunction(() => document.querySelector('canvas')?.width > 400, null, {
  timeout: 20000,
});
await page.waitForTimeout(2200);

const size = page.viewportSize();
await page.mouse.move(size.width * 0.6, size.height * 0.4);

const look = () =>
  page.evaluate(() => {
    const snap = window.__ubtc.life.get();
    const c = window.__ubtc.stage.camera;
    return {
      at: snap.at,
      stage: snap.stage,
      beat: snap.beat,
      px: c.px,
      py: c.py,
      pz: c.pz,
      fps: window.__ubtc.stage.fps,
      title: document.querySelector('.space-title')?.textContent ?? '',
    };
  });

const total = await page.evaluate(() => window.__ubtc.STAGES.length);
let previous = await look();
const seen = [];
const steps = [];
let last = -1;

for (let i = 0; i < notches; i++) {
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(110);
  const now = await look();
  steps.push(Math.hypot(now.px - previous.px, now.py - previous.py, now.pz - previous.pz));

  if (now.stage !== last) {
    last = now.stage;
    seen.push(now.stage);
    await page.waitForTimeout(420);
    await page.screenshot({ path: path.join(out, `j-${slug}-${now.stage}${suffix}.png`) });
    console.log(`${String(now.stage).padStart(2)}  ${now.title}`);
  }
  previous = now;
}

const end = await look();
await page.screenshot({ path: path.join(out, `j-${slug}-end${suffix}.png`) });

const sorted = [...steps].sort((a, b) => a - b);
const median = sorted[Math.floor(sorted.length / 2)] || 0.001;
console.log(`\nstages in order: ${seen.join(' ')}`);
console.log(`reached stage ${end.stage} of ${total - 1} at ${end.at.toFixed(2)}   ${end.fps} fps`);
console.log(`typical notch ${median.toFixed(2)} units`);

const expected = Array.from({ length: total }, (_, i) => i);
if (seen.join(',') !== expected.join(',')) {
  problems.push(`out of order: ${seen.join(',')} (wanted ${expected.join(',')})`);
}
if (end.stage !== total - 1) problems.push(`the wheel did not reach the last stage`);

await browser.close();
console.log(problems.length ? `\nPROBLEMS:\n${problems.join('\n')}` : '\nthe journey runs');
process.exit(problems.length ? 1 : 0);
