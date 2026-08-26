/**
 * The finger.
 *
 * On a phone the words take the bottom half of the screen, which is exactly
 * where a thumb starts a swipe — so the two things this checks are that a
 * gesture beginning on the reading column moves the network anyway, and that
 * letting go does not stop it dead. Neither is visible in a screenshot and both
 * are the difference between a site that scrolls and one that fights.
 *
 * Real touch events through the debugger rather than synthetic ones, because a
 * synthetic TouchEvent proves the handler is attached and nothing else.
 *
 *   node tools/swipe.mjs
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

const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) problems.push(label);
};
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

await page.bringToFront();
await page.goto('http://localhost:4600/?stats', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__qufi), null, { timeout: 40000 });
await page.evaluate(() => window.__qufi.online());
await page.waitForTimeout(2200);

const travel = () => page.evaluate(() => window.__qufi.nav.get().travel);

/** One swipe up the screen, from `y` by `distance` pixels, over `steps`. */
const swipe = async (x, y, distance, steps, pause) => {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }],
  });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y - (distance * i) / steps }],
    });
    if (pause) await page.waitForTimeout(pause);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};

/* ---- a swipe that starts on the words ------------------------------------ */
{
  const box = await page.evaluate(() => {
    const el = document.querySelector('.space-body') ?? document.querySelector('.space');
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  const before = await travel();
  await swipe(box.x, box.y, 300, 12, 16);
  await page.waitForTimeout(900);
  const after = await travel();
  check(
    'a swipe that starts on the reading column moves the network',
    after - before > 0.02,
    `${before.toFixed(3)} -> ${after.toFixed(3)} from (${Math.round(box.x)}, ${Math.round(box.y)})`,
  );
}

/* ---- and one that ends in a flick ---------------------------------------- */
{
  await page.evaluate(() => window.__qufi.travelTo(0.25));
  await page.waitForTimeout(1600);
  const before = await travel();
  // Fast and short: the kind of gesture that should keep going after release.
  await swipe(195, 640, 260, 6, 8);
  const atRelease = await travel();
  await page.waitForTimeout(1100);
  const settled = await travel();
  check(
    'a flick carries on after the finger leaves',
    settled - atRelease > 0.008,
    `${before.toFixed(3)} -> ${atRelease.toFixed(3)} at release -> ${settled.toFixed(3)} settled`,
  );
}

/* ---- and a tap on the map still selects rather than scrolling ------------- */
{
  const before = await travel();
  const dot = await page.evaluate(() => {
    const r = document.querySelectorAll('.constellation-node')[5].getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [dot] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(3400);
  const state = await page.evaluate(() => window.__qufi.nav.get());
  check('a tap on the map still goes to that space', state.active === 5, `active ${state.active}`);
  void before;
  await page.screenshot({ path: `${out}/s-tapped.png` });
}

/* ---- the whole route, by thumb ------------------------------------------- */
{
  await page.evaluate(() => window.__qufi.travelTo(0));
  await page.waitForTimeout(1800);
  /*
   * Sampled through the gesture rather than after it.
   *
   * One swipe covers most of a space and the flick carries it into the next, so
   * looking only once a swipe has finished sees every other one and concludes
   * the route skips them. What is being checked is that the route passes
   * through all of them, which means watching while it does.
   */
  const seen = new Set();
  for (let i = 0; i < 26; i++) {
    await swipe(195, 620, 320, 8, 10);
    for (let sample = 0; sample < 5; sample++) {
      await page.waitForTimeout(150);
      seen.add(await page.evaluate(() => window.__qufi.nav.get().active));
    }
  }
  const end = await travel();
  check('the thumb reaches every space', seen.size >= 9, `${[...seen].sort((a, b) => a - b).join(' ')}`);
  check('and the end of the route', end > 0.97, end.toFixed(3));
  await page.screenshot({ path: `${out}/s-end.png` });
}

await browser.close();
console.log(problems.length ? `\nPROBLEMS: ${problems.join(', ')}` : '\nthe finger works');
process.exit(problems.length ? 1 : 0);
