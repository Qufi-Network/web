/**
 * The whole site, scrolled.
 *
 * The claim this makes is that one wheel carries the visitor from the open
 * network, through the Core and everything it does, out to post-quantum
 * signing, through that, and on through all eight spaces without ever stopping
 * — so the check is to actually scroll it, from one end to the other, and watch
 * two things: that the spaces arrive in order, and that the camera never jumps.
 *
 * A seam between two segments is the failure this design can have and a
 * screenshot cannot show it, so the route is also evaluated directly — two
 * thousand points across the whole thing, with nothing moving — where a
 * discontinuity is unmistakable rather than arguable.
 *
 *   node tools/route.mjs [--notches 150] [--mobile]
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? Number(args[index + 1]) : fallback;
};
const notches = flag('notches', 150);
const mobile = args.includes('--mobile');
const out = 'C:/ubtc/qufi-network/.captures';
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
await page.goto('http://localhost:4600/?stats', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__qufi), null, { timeout: 40000 });
await page.waitForFunction(() => document.querySelector('canvas').width > 400, null, {
  timeout: 20000,
});
await page.evaluate(() => window.__qufi.online());
await page.waitForTimeout(2200);

const size = page.viewportSize();
await page.mouse.move(size.width * 0.55, size.height * 0.45);

// Count what the canvas actually receives, separately from what the director
// does with it. "The site did not scroll" has two very different causes and
// this is the line between them.
await page.evaluate(() => {
  window.__wheels = 0;
  document
    .querySelector('canvas')
    .addEventListener('wheel', () => {
      window.__wheels++;
    }, { capture: true });
});

/** Everything worth knowing about one moment on the route. */
const look = () =>
  page.evaluate(() => {
    const snap = window.__qufi.nav.get();
    const c = window.__qufi.stage.camera;
    return {
      mode: snap.mode,
      active: snap.active,
      beat: snap.beat,
      stage: snap.stage,
      travel: snap.travel,
      px: c.px,
      py: c.py,
      pz: c.pz,
      fps: window.__qufi.stage.fps,
      wheels: window.__wheels,
    };
  });

let previous = await look();
const steps = [];
let worstStep = 0;
let worstAt = null;
const seen = [];
const shots = [];
let lastActive = -2;

for (let i = 0; i < notches; i++) {
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(110);
  const now = await look();

  const moved = Math.hypot(now.px - previous.px, now.py - previous.py, now.pz - previous.pz);
  steps.push(moved);
  if (moved > worstStep) {
    worstStep = moved;
    worstAt = { from: previous.travel.toFixed(3), to: now.travel.toFixed(3), active: now.active };
  }

  if (now.active !== lastActive) {
    lastActive = now.active;
    seen.push(now.active);
    // One frame the moment each space takes the frame, in the order the wheel
    // actually delivers them.
    if (now.active >= 0) shots.push({ name: `r-${now.active}-arrive`, at: i });
  }
  // And one at the far side of each space, where its sequence has run out.
  if (now.active >= 0 && now.stage > 0.86 && !shots.some((s) => s.name === `r-${now.active}-deep`)) {
    shots.push({ name: `r-${now.active}-deep`, at: i });
  }

  if (shots.length && shots[shots.length - 1].at === i) {
    // No settling wait: the route keeps moving under it, and a frame captured
    // half a second later is a frame of somewhere else under this one's name.
    await page.screenshot({ path: path.join(out, `${shots[shots.length - 1].name}${suffix}.png`) });
  }

  previous = now;
}

const end = await look();
await page.screenshot({ path: path.join(out, `r-end${suffix}.png`) });

console.log(`spaces, in the order the wheel delivered them: ${seen.join(' ')}`);
console.log(
  `route reached ${end.travel.toFixed(3)} of 1   mode ${end.mode}   ${end.fps} fps   ${end.wheels}/${notches} wheel events landed`,
);
/*
 * Continuity, asked of the function rather than of the scrolling.
 *
 * Sampling by wheel notch cannot answer this: a flight from a wide shot of the
 * whole network into the Core covers a hundred and twenty units in four
 * notches, and a seam covers a similar distance in one, so both look like a
 * large step. The route is one function of one number, though, so it can be
 * evaluated at whatever resolution the question deserves — two thousand points
 * across the whole thing, with nothing moving — and a discontinuity is then
 * unmistakable rather than arguable.
 */
const continuity = await page.evaluate(() => {
  const length = window.__qufi.probe.length;
  const at = window.__qufi.probe.cameraAt;
  const samples = 2000;
  const step = length / samples;
  let worst = 0;
  let worstAt = 0;
  let previous = at(0);
  for (let i = 1; i <= samples; i++) {
    const now = at(i * step);
    const moved = Math.hypot(now.px - previous.px, now.py - previous.py, now.pz - previous.pz);
    if (moved > worst) {
      worst = moved;
      worstAt = i * step;
    }
    previous = now;
  }
  return { worst, worstAt, step };
});

console.log(`largest single-notch camera move: ${worstStep.toFixed(2)} units ${JSON.stringify(worstAt)}`);
console.log(
  `continuity: worst ${continuity.worst.toFixed(2)} units over ${continuity.step.toFixed(4)} of a space, at ${continuity.worstAt.toFixed(3)}`,
);
console.log(`captured ${shots.length} frames`);

// The order has to be the open network, then 01 through 08, then the open
// network again. Anything else means the route is not a route.
const expected = [-1, 0, 1, 2, 3, 4, 5, 6, 7, -1];
if (seen.join(',') !== expected.join(',')) {
  problems.push(`out of order: ${seen.join(',')} (wanted ${expected.join(',')})`);
}
if (end.travel < 0.98) problems.push(`the wheel did not reach the end (${end.travel.toFixed(3)})`);
/*
 * At two thousand samples the fastest legitimate move on the route — the first
 * arrival — covers about a unit and a half per sample. Ten is far past anything
 * an eased flight produces and far short of what a seam would.
 */
if (continuity.worst > 10) {
  problems.push(
    `the route is discontinuous: ${continuity.worst.toFixed(1)} units in one sample at ${continuity.worstAt.toFixed(3)}`,
  );
}

await browser.close();
console.log(problems.length ? `\nPROBLEMS:\n${problems.join('\n')}` : '\nthe route is continuous');
process.exit(problems.length ? 1 : 0);
