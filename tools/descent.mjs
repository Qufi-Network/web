/**
 * Photographs the descent.
 *
 * Enters the network, then drives the scrollbar to each chapter and waits for
 * the smoothing to settle before the shutter. Scroll position is set directly
 * rather than animated: the page smooths the value it derives from the scroll,
 * not the scroll itself, so an instant jump still arrives cleanly.
 *
 *   node tools/descent.mjs [--mobile] [--tier low|medium|high|ultra]
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
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const mobile = args.includes('--mobile');
const tier = flag('tier');
const outDir = flag('out', 'C:/ubtc/qufi-network/.captures');

/** Fractions of total scroll worth looking at, named for what should be there. */
const STOPS = [
  ['20-discovery-open', 0.015],
  ['21-discovery-trust', 0.06],
  ['22-discovery-labels', 0.11],
  ['23-transition-begin', 0.19],
  ['24-transition-break', 0.25],
  ['25-transition-deadline', 0.275],
  ['26-qufi-reveal', 0.31],
  ['27-qufi-capabilities', 0.38],
  ['28-signal-start', 0.45],
  ['29-signal-mid', 0.52],
  ['30-signal-end', 0.565],
  ['31-protocol', 0.64],
  ['32-protocol-terms', 0.71],
  ['33-live', 0.79],
  ['34-enter-missing', 0.9],
  ['35-enter-yours', 0.96],
  ['36-enter-actions', 0.995],
];

const run = async () => {
  await mkdir(outDir, { recursive: true });

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

  const context = await browser.newContext(
    mobile
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
      : { viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1 },
  );

  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`error: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('crash', () => problems.push('PAGE CRASHED'));

  const query = new URLSearchParams({ stats: '' });
  if (tier) query.set('tier', tier);

  await page.bringToFront();
  await page.goto(`http://localhost:4600/?${query}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('canvas')?.width > 400, null, {
    timeout: 30000,
  });

  const info = await page.evaluate(() => {
    const gl = document.querySelector('canvas').getContext('webgl2');
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown',
      tier: window.__qufi.experience.get().tier,
    };
  });
  console.log(JSON.stringify(info));

  // Skip the opening and accept the invitation, which is what opens the descent.
  await page.evaluate(() => window.__qufi.seek(28));
  await page.waitForTimeout(1200);
  await page.click('.enter');
  await page.waitForTimeout(2600);

  const height = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  console.log('scroll range', height);

  const suffix = `${mobile ? '-mobile' : ''}${tier ? `-${tier}` : ''}`;
  for (const [name, fraction] of STOPS) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(height * fraction));
    // Long enough for the scroll smoothing, the camera damping and the copy
    // transitions all to finish.
    await page.waitForTimeout(1700);
    await page.screenshot({ path: path.join(outDir, `${name}${suffix}.png`) });
    console.log('captured', name);
  }

  const final = await page.evaluate(() => ({
    fps: window.__qufi.stage.fps,
    depth: +window.__qufi.stage.depth.toFixed(2),
    instabilitySeen: window.__qufiMaxInstability ?? null,
  }));
  console.log('final', JSON.stringify(final));
  console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no console errors');

  await browser.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
