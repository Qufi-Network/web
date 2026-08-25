/**
 * Frame capture for art direction.
 *
 * Runs a real Chromium against the real GPU. Software rasterisation was tried
 * first and is not viable here: this scene is almost entirely additive overdraw,
 * and SwiftShader spends long enough on a single frame to block the page's main
 * thread past any sensible timeout.
 *
 * Beats are reached by scrubbing the paused timeline rather than by waiting.
 * After each seek the page is given a moment of wall clock so camera damping,
 * node drift and signal traffic settle before the shutter.
 *
 *   node tools/shoot.mjs [--mobile] [--tier low|medium|high|ultra] [--beats a,b,c]
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
const outDir = flag('out', 'C:/ubtc/qufi-network/.captures');

/** The moments the sequence is judged on. */
const ALL_BEATS = [
  ['01-void', 1.4],
  ['02-first-point', 2.6],
  ['03-relationships', 5.6],
  ['04-emergence', 9.5],
  ['05-network', 11.8],
  ['06-response', 14.2],
  ['07-traverse', 17.8],
  ['08-traverse-late', 19.6],
  ['09-core-forming', 21.8],
  ['10-core', 23.8],
  ['11-identity', 26.2],
  ['12-invitation', 29.0],
];

const only = flag('beats');
const beats = only
  ? ALL_BEATS.filter(([name]) => only.split(',').some((token) => name.includes(token)))
  : ALL_BEATS;

const run = async () => {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({
    // Headed, so the compositor is real and the GPU process is actually used.
    headless: false,
    args: [
      '--hide-scrollbars',
      '--mute-audio',
      '--window-position=0,0',
      // A window Chromium believes is occluded gets its rAF throttled to a few
      // frames a second, which starves the timeline and the resize observer
      // alike. Everything measured here would be a measurement of the throttle.
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      '--disable-features=CalculateNativeWinOcclusion',
    ],
  });

  const context = await browser.newContext(
    mobile
      ? {
          viewport: { width: 390, height: 844 },
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true,
        }
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
  // Nothing is worth photographing until the renderer has a real size.
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

  const suffix = `${mobile ? '-mobile' : ''}${tier ? `-${tier}` : ''}`;
  for (const [name, seconds] of beats) {
    await page.evaluate((t) => window.__qufi.seek(t), seconds);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: path.join(outDir, `${name}${suffix}.png`) });
    console.log('captured', name);
  }

  // Frame rate only means anything while the sequence is actually playing.
  await page.evaluate(() => window.__qufi.timeline.time(11).play());
  await page.waitForTimeout(5000);
  const running = await page.evaluate(() => ({
    fps: window.__qufi.stage.fps,
    intensity: window.__qufi.stage.intensity,
  }));

  // Pointer response: park at the invitation, then move into the network.
  await page.evaluate(() => window.__qufi.timeline.time(28).pause());
  await page.waitForTimeout(800);
  const box = page.viewportSize();
  await page.mouse.move(box.width * 0.62, box.height * 0.42);
  await page.waitForTimeout(400);
  await page.mouse.move(box.width * 0.55, box.height * 0.5, { steps: 20 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, `13-pointer${suffix}.png`) });
  const focus = await page.evaluate(() => window.__qufi.stage.focusNode);

  // And the state the visitor lands in after accepting the invitation.
  await page.click('.enter');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(outDir, `14-entered${suffix}.png`) });

  console.log(`running fps ${running.fps} at intensity ${running.intensity.toFixed(2)}`);
  console.log(`pointer focus node: ${focus}`);
  console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no console errors');

  await browser.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
