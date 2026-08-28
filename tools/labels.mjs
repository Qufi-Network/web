/**
 * Whether the names on the scene are actually on the scene.
 *
 * A label is gated on two things — the stage it belongs to, and whether the
 * figure it names has arrived — and either of them being wrong looks the same
 * from the outside: no caption. This says which.
 *
 *   node tools/labels.mjs [product] [route]
 */
import { pathToFileURL } from 'node:url';

const product = process.argv[2] ?? 'settle';
const target = Number(process.argv[3] ?? 1);
const NOTCH = 0.1255;

const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;

const browser = await chromium.launch({
  headless: false,
  args: ['--hide-scrollbars', '--window-position=0,0', '--disable-features=CalculateNativeWinOcclusion'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.bringToFront();
await page.goto(`http://localhost:4600/product/${product}?stats`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3400);

await page.mouse.move(720, 450);
for (let n = 0; n < Math.round(target / NOTCH); n++) await page.mouse.wheel(0, 62);
await page.waitForTimeout(1400);

const state = await page.evaluate(() => {
  const debug = window.__ubtc;
  const figures = debug.journey.figures.map((figure) => figure.id);
  return {
    at: debug.life.get().at,
    stage: debug.life.get().stage,
    marks: debug.journey.marks.map((mark) => ({
      id: mark.id,
      on: Number(mark.on.toFixed(2)),
      names: mark.names ?? null,
      presence: mark.names
        ? Number((window.__ubtcBus?.state?.[figures.indexOf(mark.names) * 4] ?? -1).toFixed(2))
        : null,
      x: Number(mark.x.toFixed(2)),
      y: Number(mark.y.toFixed(2)),
    })),
    shown: Array.from(document.querySelectorAll('.life-mark-label'))
      .filter((node) => Number(node.style.opacity || 0) > 0.05)
      .map((node) => node.dataset.id),
  };
});

console.log(`${product} at ${state.at.toFixed(2)} (stage ${state.stage})`);
for (const mark of state.marks) {
  console.log(
    `  ${mark.on > 0.05 ? 'on ' : '   '} ${mark.id.padEnd(16)} on ${mark.on.toFixed(2)}` +
      `  names ${String(mark.names).padEnd(14)}  at ${mark.x.toFixed(2)},${mark.y.toFixed(2)}`,
  );
}
console.log(`  drawn: ${state.shown.join(', ') || 'none'}`);

await browser.close();
