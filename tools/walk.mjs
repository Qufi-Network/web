/**
 * Stills along a walkthrough.
 *
 * Home, then a counted number of wheel notches, so every frame comes out at the
 * same place on the route on every run and two runs can be compared. What it is
 * for is looking at: whether the scene is composed, whether the subject is in
 * the frame, whether the thing the writing is describing is on screen while it
 * is being described.
 *
 *   node tools/walk.mjs [product] [stops]
 */
import { pathToFileURL } from 'node:url';

const product = process.argv[2] ?? 'ubtc';
const stops = Number(process.argv[3] ?? 13);
/*
 * A phone is not a small desktop, it is a different composition: the words go
 * under the scene rather than beside it, and the camera aims below its subject
 * to lift it into the top half. That is worth looking at rather than assuming.
 */
const tall = process.argv[4] === 'mobile';

const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;
const out = 'C:/ubtc/qufi-network/.captures';

/**
 * One notch of the wheel, in route units.
 *
 * Measured rather than derived: the driver does not deliver a wheel event with
 * the deltaY it was handed, so the arithmetic the director does on the way in
 * is not the arithmetic that describes what arrives.
 */
const NOTCH = 0.1255;

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

const page = await browser.newPage({
  viewport: tall ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  deviceScaleFactor: tall ? 2 : 1,
  isMobile: tall,
  hasTouch: tall,
});
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console: ${m.text().slice(0, 200)}`);
});

await page.bringToFront();
await page.goto(`http://localhost:4600/product/${product}?stats`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3600);

const total = await page.evaluate(() => window.__ubtc?.journey?.stages?.length ?? 0);
if (!total) {
  console.log('no journey on the page');
  console.log(problems.join('\n'));
  await browser.close();
  process.exit(1);
}
console.log(`${product}: ${total} stages`);

/*
 * Wait for the page to be warm before measuring it.
 *
 * A dev server compiles on first request and the client rehydrates after that,
 * and a harness that starts walking during either one measures the build rather
 * than the scene — which looks exactly like a performance regression, reads as
 * twenty frames a second, and backs the input queue up until the run stalls.
 */
for (let tries = 0; tries < 24; tries++) {
  const fps = await page.evaluate(() => window.__ubtc?.stage.fps ?? 0);
  if (fps >= 35) break;
  await page.waitForTimeout(500);
}

await page.mouse.move(720, 450);

for (let i = 0; i < stops; i++) {
  const at = (i / (stops - 1)) * total;
  await page.keyboard.press('Home');
  await page.waitForTimeout(200);

  /*
   * Jumped to the stage, then walked the rest.
   *
   * The director takes a digit as "go to stage n", and using it turns fifty
   * wheel events into at most a handful. That matters for more than patience:
   * every notch is a round trip to the browser, and sending fifty of them at a
   * scene drawing at thirty frames a second backs the queue up until the
   * harness is measuring its own impatience rather than the page.
   */
  // The furthest stage whose arrival point is still behind where we are going,
  // so what is left to walk is always forwards and always short.
  const stage = Math.max(1, Math.min(total, Math.floor(at - 0.3) + 1));
  const notches = Math.max(0, Math.round((at - (stage - 1 + 0.3)) / NOTCH));
  if (!tall && stage >= 1 && at > 0.05) {
    await page.keyboard.press(String(stage));
    await page.waitForTimeout(260);
  }
  if (tall) {
    // A context with touch enabled does not deliver wheel events at all, so on
    // a phone the route is driven the way a thumb drives it.
    const cdp = await page.context().newCDPSession(page);
    const swipes = Math.ceil((at * 220) / 320);
    for (let n = 0; n < swipes; n++) {
      const from = { x: 195, y: 620 };
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: from.x, y: from.y }],
      });
      for (let step = 1; step <= 8; step++) {
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: from.x, y: from.y - (step * 320) / 8 }],
        });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(40);
    }
    await cdp.detach();
  } else {
    for (let n = 0; n < notches; n++) await page.mouse.wheel(0, 62);
  }
  await page.waitForTimeout(1100);

  const state = await page.evaluate(() => {
    const life = window.__ubtc.life.get();
    const cam = window.__ubtc.stage.camera;
    return {
      at: life.at,
      stage: life.stage,
      fps: Math.round(window.__ubtc.stage.fps),
      px: cam.px,
      py: cam.py,
      pz: cam.pz,
      fov: cam.fov,
    };
  });
  console.log(
    `  ${String(i).padStart(2, '0')}  asked ${at.toFixed(2)}  at ${state.at.toFixed(2)}` +
      `  stage ${state.stage}  ${state.fps}fps  eye ${state.px.toFixed(0)},${state.py.toFixed(0)},${state.pz.toFixed(0)}` +
      `  fov ${state.fov.toFixed(0)}`,
  );
  await page.screenshot({ path: `${out}/w-${product}${tall ? '-m' : ''}-${String(i).padStart(2, '0')}.png` });
}

await browser.close();
console.log(problems.length ? `\nPROBLEMS:\n  ${problems.slice(0, 6).join('\n  ')}` : '\nno errors');
process.exit(problems.length ? 1 : 0);
