/**
 * Walking the network.
 *
 * Runs a real Chromium against the real GPU, plays the opening, then enters
 * every space in turn and travels through it — which is the only way to find
 * out whether a structure reads as the thing it is supposed to be, whether the
 * words land somewhere legible, and whether the frame rate survives standing
 * inside a structure that fills the frame.
 *
 * Software rasterisation is not viable here: the scene is almost entirely
 * additive overdraw, and SwiftShader spends long enough on one frame to block
 * the page past any sensible timeout.
 *
 *   node tools/network.mjs [--mobile] [--tier low|medium|high|ultra]
 *                          [--only opening|orbit|spaces] [--stage 0.5]
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const playwright = await import(
  pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href
);
const { chromium } = playwright.default ?? playwright;

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const mobile = args.includes('--mobile');
const tier = flag('tier');
const only = flag('only');
const outDir = flag('out', 'C:/ubtc/qufi-network/.captures');
const suffix = `${mobile ? '-m' : ''}${tier ? `-${tier}` : ''}`;

/** Moments of the opening worth looking at. */
const OPENING = [
  ['a1-void', 0.9],
  ['a2-first-point', 2.0],
  ['a3-relationships', 3.6],
  ['a4-emergence', 5.6],
  ['a5-online', 7.4],
  ['a6-traverse', 9.2],
  ['a7-core', 11.6],
  ['a8-title', 15.0],
  ['a9-pullback', 19.4],
];

/** How deep into the global traverse to photograph it. */
const TRAVELS = [0, 0.3, 0.62, 1];

/** How far into each space to photograph it. */
const STAGES = [0.02, 0.5, 0.95];

const run = async () => {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--hide-scrollbars',
      '--mute-audio',
      '--window-position=0,0',
      // A window Chromium believes is occluded gets its rAF throttled to a few
      // frames a second, which starves the frame loop and the resize observer
      // alike. Everything measured here would be a measurement of the throttle.
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      '--disable-features=CalculateNativeWinOcclusion',
    ],
  });

  const context = await browser.newContext(
    mobile
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
      : { viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1 },
  );

  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

  const query = new URLSearchParams({ stats: '' });
  if (tier) query.set('tier', tier);
  await page.bringToFront();
  await page.goto(`http://localhost:4600/?${query}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__qufi), null, { timeout: 40000 });
  await page.waitForFunction(() => document.querySelector('canvas').width > 400, null, {
    timeout: 20000,
  });

  const renderer = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas.getContext('webgl2');
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      canvas: `${canvas.width}x${canvas.height}`,
      gpu: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown',
      tier: window.__qufi.experience.get().tier,
    };
  });
  console.log(JSON.stringify(renderer));

  const shoot = async (name) => {
    await page.screenshot({ path: path.join(outDir, `${name}${suffix}.png`) });
    console.log('captured', name);
  };

  /* ---- the opening ------------------------------------------------------- */
  if (!only || only === 'opening') {
    for (const [name, seconds] of OPENING) {
      await page.evaluate((t) => window.__qufi.seek(t), seconds);
      // Camera damping, node drift and traffic all need a moment of wall clock
      // to settle after a scrub, or every frame is photographed mid-correction.
      await page.waitForTimeout(1300);
      await shoot(name);
    }
  }

  /* ---- the global view --------------------------------------------------- */
  await page.evaluate(() => window.__qufi.online());
  await page.waitForTimeout(2200);

  if (!only || only === 'orbit') {
    for (const t of TRAVELS) {
      await page.evaluate((v) => window.__qufi.travelTo(v), t);
      // Travel is damped toward its target rather than set, so it needs a beat
      // of wall clock to actually arrive before the shutter.
      await page.mouse.move(720, 400);
      await page.waitForTimeout(2400);
      await shoot(`b-orbit-${String(Math.round(t * 100)).padStart(3, '0')}`);
    }
  }

  /* ---- every space ------------------------------------------------------- */
  const spaces = await page.evaluate(() =>
    window.__qufi.spaceRuntime.map((_, index) => index),
  );

  if (!only || only === 'spaces') {
    const report = [];
    for (const index of spaces) {
      await page.evaluate((i) => window.__qufi.enterSpace(i), index);
      await page.waitForTimeout(3200);

      for (const at of STAGES) {
        await page.evaluate((v) => window.__qufi.stageTo(v), at);
        await page.waitForTimeout(1800);
        await shoot(`c${index}-${String(Math.round(at * 100)).padStart(3, '0')}`);
      }

      const state = await page.evaluate(() => ({
        fps: window.__qufi.stage.fps,
        stage: window.__qufi.nav.get().stage,
        beat: window.__qufi.nav.get().beat,
        title: document.querySelector('.space-title')?.textContent ?? '',
      }));
      report.push(`${index}: ${state.fps}fps  beat ${state.beat}  ${state.title.slice(0, 42)}`);

      await page.evaluate(() => window.__qufi.returnToNetwork());
      await page.waitForTimeout(2600);
    }
    console.log(report.join('\n'));
  }

  /* ---- the middle of the Core -------------------------------------------- */
  await page.evaluate(() => window.__qufi.enterSpace(0));
  await page.waitForTimeout(3200);
  // Driven by the wheel rather than written, because reaching the middle of the
  // Core is a thing the visitor does and it has to be reachable by doing it.
  await page.mouse.move(700, 420);
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(260);
  }
  await page.waitForTimeout(2400);
  await shoot('d-centre');

  /* ---- what it costs ------------------------------------------------------ */
  await page.evaluate(() => window.__qufi.returnToNetwork());
  await page.waitForTimeout(3000);
  const running = await page.evaluate(() => window.__qufi.stage.fps);
  console.log(`global view: ${running} fps`);

  console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no console errors');
  await browser.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
