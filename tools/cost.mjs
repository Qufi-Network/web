/**
 * What the scene costs, tier by tier.
 *
 * Fill rate is the only budget in this project and it is not something that can
 * be reasoned about from the source — the same buffer is cheap in the global
 * view and expensive from inside a structure, and an integrated GPU that has
 * been rendering for an hour is slower than one that has not. So it gets
 * measured, in the two places that matter, at every tier the site ships.
 *
 *   node tools/cost.mjs [--tiers low,medium,high]
 */
import { pathToFileURL } from 'node:url';

const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;

const args = process.argv.slice(2);
const tiersFlag = args.indexOf('--tiers');
const tiers = (tiersFlag >= 0 ? args[tiersFlag + 1] : 'low,medium,high,ultra').split(',');

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

/** Frames per second over a window long enough to survive one stutter. */
const measure = async (page, seconds = 5) => {
  return page.evaluate(async (window_) => {
    let frames = 0;
    const start = performance.now();
    await new Promise((resolve) => {
      const tick = () => {
        frames++;
        if (performance.now() - start > window_ * 1000) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return Math.round((frames * 1000) / (performance.now() - start));
  }, seconds);
};

for (const tier of tiers) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
  await page.bringToFront();
  await page.goto(`http://localhost:4600/?stats&tier=${tier}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__qufi), null, { timeout: 40000 });
  await page.evaluate(() => window.__qufi.online());
  await page.waitForTimeout(2500);

  const orbitFar = await measure(page);
  await page.evaluate(() => window.__qufi.travelTo(1));
  await page.waitForTimeout(2500);
  const orbitNear = await measure(page);

  await page.evaluate(() => window.__qufi.travelTo(0.2));
  await page.evaluate(() => window.__qufi.enterSpace(2));
  await page.waitForTimeout(3400);
  const proof = await measure(page);

  await page.evaluate(() => window.__qufi.enterSpace(0));
  await page.waitForTimeout(3400);
  const core = await measure(page);

  const detail = await page.evaluate(() => ({
    dpr: Number(window.__qufi.stage.fps ? document.querySelector('canvas').width / window.innerWidth : 0).toFixed(2),
    canvas: `${document.querySelector('canvas').width}x${document.querySelector('canvas').height}`,
  }));

  console.log(
    `${tier.padEnd(7)} orbit-far ${String(orbitFar).padStart(3)}  orbit-near ${String(orbitNear).padStart(3)}  proof ${String(proof).padStart(3)}  core ${String(core).padStart(3)}   dpr ${detail.dpr}  ${detail.canvas}`,
  );
  await page.close();
}

await browser.close();
