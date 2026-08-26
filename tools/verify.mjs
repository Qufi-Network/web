/**
 * The paths that are not the happy path.
 *
 * Reduced motion, a missing GPU, and keyboard-only use are the three ways this
 * site can fail a visitor completely rather than partially, so they get checked
 * explicitly rather than assumed. Every one of them has to arrive at the same
 * content: eight spaces, in order, with the same words in them.
 *
 *   node tools/verify.mjs
 */
import { pathToFileURL } from 'node:url';

const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;

const out = 'C:/ubtc/qufi-network/.captures';
const args = [
  '--hide-scrollbars',
  '--window-position=0,0',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-background-timer-throttling',
  '--disable-features=CalculateNativeWinOcclusion',
];

const browser = await chromium.launch({ headless: false, args });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

/* ---- reduced motion -------------------------------------------------------
 * The composition, not the choreography. A visitor who has asked for less
 * movement should arrive in the network rather than watch it be built, and
 * should still be able to go everywhere.
 */
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 810 },
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.bringToFront();
  await page.goto('http://localhost:4600/?stats', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__qufi), null, { timeout: 40000 });
  await page.waitForTimeout(3000);

  const state = await page.evaluate(() => {
    const snap = window.__qufi.nav.get();
    return { mode: snap.mode, title: snap.title, hud: document.querySelector('.hud')?.dataset.show };
  });
  check('reduced motion lands in the network', state.mode === 'ORBIT', JSON.stringify(state));
  check('reduced motion shows the interface', state.hud === 'true');

  // And the camera should be sitting still rather than drifting.
  const first = await page.evaluate(() => ({ ...window.__qufi.stage.camera }));
  await page.waitForTimeout(2500);
  const second = await page.evaluate(() => ({ ...window.__qufi.stage.camera }));
  const moved = Math.hypot(second.px - first.px, second.py - first.py, second.pz - first.pz);
  check('reduced motion holds the camera', moved < 2.5, `${moved.toFixed(2)} units in 2.5s`);

  await page.screenshot({ path: `${out}/v1-reduced-motion.png` });
  await ctx.close();
}

/* ---- no GPU ---------------------------------------------------------------
 * Nobody arrives at a black rectangle. The still network and the full document
 * take over, which is also where a lost context lands.
 */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
      if (String(kind).startsWith('webgl')) return null;
      return original.call(this, kind, ...rest);
    };
  });
  await page.bringToFront();
  await page.goto('http://localhost:4600/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const state = await page.evaluate(() => ({
    flag: document.documentElement.dataset.webgl,
    fallback: Boolean(document.querySelector('.static-network svg')),
    headings: [...document.querySelectorAll('.document h2')].map((h) => h.textContent),
    visible: getComputedStyle(document.querySelector('.document')).position,
  }));
  check('no GPU sets the flag', state.flag === 'false');
  check('no GPU draws the still network', state.fallback);
  check('no GPU reveals the document', state.visible === 'relative');
  check('the document carries all eight spaces', state.headings.length >= 8, `${state.headings.length} headings`);

  await page.screenshot({ path: `${out}/v2-no-webgl.png`, fullPage: false });
  await ctx.close();
}

/* ---- keyboard -------------------------------------------------------------
 * Exploration must not depend on a pointer. The numbers go to the spaces, the
 * arrows move through one, and Escape comes back out.
 */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } });
  const page = await ctx.newPage();
  await page.bringToFront();
  await page.goto('http://localhost:4600/?stats', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__qufi), null, { timeout: 40000 });
  await page.evaluate(() => window.__qufi.online());
  await page.waitForTimeout(1500);

  await page.keyboard.press('4');
  await page.waitForTimeout(3200);
  const entered = await page.evaluate(() => window.__qufi.nav.get());
  check('a number key enters its space', entered.mode === 'INSIDE' && entered.active === 3, JSON.stringify({ mode: entered.mode, active: entered.active }));

  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(700);
  }
  const advanced = await page.evaluate(() => window.__qufi.nav.get());
  // Through the sequence, and still in the space the number key chose: an arrow
  // that carries the visitor out of it is worse than one that does nothing.
  check(
    'arrows move through the sequence',
    advanced.beat > 0 && advanced.active === 3,
    `space ${advanced.active}, beat ${advanced.beat}`,
  );
  await page.screenshot({ path: `${out}/v3-keyboard-inside.png` });

  await page.keyboard.press('Escape');
  await page.waitForTimeout(2600);
  const left = await page.evaluate(() => window.__qufi.nav.get().mode);
  check('escape returns to the network', left === 'ORBIT', left);

  /*
   * Every control that is on screen has to be reachable, and has to say what it
   * is. Controls inside a layer that is currently hidden are deliberately taken
   * out of the tab order — the closing statement is a button in the markup long
   * before it is a button on screen — so the check has to ask what the visitor
   * can see rather than what the document contains.
   */
  const reachable = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.hud button, .centre button')];
    return nodes
      .filter((n) => !n.closest('[aria-hidden="true"]'))
      .map((n) => ({
        label: (n.getAttribute('aria-label') ?? n.textContent ?? '').trim().slice(0, 40),
        tabbable: n.tabIndex >= 0,
      }));
  });
  check('every visible control is tabbable', reachable.every((n) => n.tabbable), `${reachable.length} controls`);
  check('every visible control is named', reachable.every((n) => n.label.length > 0));

  await ctx.close();
}

await browser.close();
console.log(problems.length ? `\nPROBLEMS: ${problems.join(', ')}` : '\nall paths ok');
process.exit(problems.length ? 1 : 0);
