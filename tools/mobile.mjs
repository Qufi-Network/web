/**
 * The whole site on a phone.
 *
 * Not a look at the pictures — a list of the things that are actually wrong on
 * a small screen: anything wider than the viewport, anything a thumb cannot
 * reach, anything that cannot be scrolled to, and any control smaller than a
 * finger. Each of those is measured rather than judged, because "looks fine on
 * my laptop at half width" is how a site ends up like this.
 *
 *   node tools/mobile.mjs [device]
 *
 * Devices: phone (390x844, the common iPhone), small (360x740, the common
 * Android), tall (430x932, the large iPhone).
 */
import { pathToFileURL } from 'node:url';

/*
 * Heights are the visible viewport rather than the device.
 *
 * A phone is 844 tall and a browser on that phone is about 730, because the
 * URL bar and the toolbar are real and take their share. Testing against the
 * device height is how a panel of buttons ends up under the chrome.
 */
const DEVICES = {
  phone: { width: 390, height: 730 },
  short: { width: 390, height: 640 },
  small: { width: 360, height: 620 },
  tall: { width: 430, height: 800 },
};
const device = DEVICES[process.argv[2] ?? 'phone'] ?? DEVICES.phone;
const label = process.argv[2] ?? 'phone';

const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;
const out = 'C:/ubtc/qufi-network/.captures';

const browser = await chromium.launch({
  headless: false,
  args: [
    '--hide-scrollbars',
    '--window-position=0,0',
    '--disable-features=CalculateNativeWinOcclusion',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
  ],
});

const context = await browser.newContext({
  viewport: { width: device.width, height: device.height },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
await page.bringToFront();

const problems = [];
const note = (where, what) => {
  console.log(`  !! ${where}: ${what}`);
  problems.push(`${where}: ${what}`);
};
page.on('pageerror', (e) => note('page', `error ${e.message.slice(0, 90)}`));

/**
 * What is wrong with the page as it stands.
 *
 * Overflow is measured against the viewport rather than the document, because a
 * document that is wider than the screen is the bug. Reach is measured against
 * the visible box: a control whose middle is off screen cannot be pressed,
 * however present it is in the DOM.
 */
const audit = () =>
  page.evaluate(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const seen = [];

    /*
     * Anything sticking out past the right edge that a visitor could see.
     *
     * Two things get excluded and both matter. The accessible document is in
     * the markup on every page, clipped to a single pixel — its children still
     * have boxes, and reporting them buries the real findings. And anything
     * inside a clipping ancestor is by definition not sticking out of
     * anything: the mark cropped into the corner of a card is meant to.
     */
    const clipped = (node) => {
      for (let at = node.parentElement; at; at = at.parentElement) {
        const style = getComputedStyle(at);
        if (style.overflow !== 'visible' || style.clipPath !== 'none') return true;
      }
      return false;
    };

    const wide = [];
    for (const node of document.querySelectorAll('body *')) {
      const box = node.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (box.right <= w + 1.5 && box.left >= -1.5) continue;
      if (clipped(node)) continue;
      wide.push({
        tag: `${node.tagName.toLowerCase()}.${(node.className || '').toString().split(' ')[0]}`,
        left: Math.round(box.left),
        right: Math.round(box.right),
      });
    }

    /*
     * Every control, and whether a thumb could actually reach it.
     *
     * On a page that scrolls, being below the fold is not a fault — it is a
     * page. What is a fault is a control that cannot be reached by scrolling,
     * which on this site means one on a screen that does not scroll at all.
     */
    const scrolls = document.documentElement.scrollHeight > h + 4;
    const controls = [];
    for (const node of document.querySelectorAll('a, button, [role="button"]')) {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const opacity = Number(style.opacity);
      const midX = box.left + box.width / 2;
      const midY = box.top + box.height / 2;
      const acrossOk = midX > 0 && midX < w;
      const downOk = scrolls ? midY > -window.scrollY : midY > 0 && midY < h;
      controls.push({
        text: (node.textContent || '').trim().slice(0, 28) || node.getAttribute('aria-label') || '(no text)',
        w: Math.round(box.width),
        h: Math.round(box.height),
        onScreen: acrossOk && downOk,
        inView: acrossOk && midY > 0 && midY < h,
        hidden: opacity < 0.05,
        small: box.width > 0 && (box.width < 40 || box.height < 30),
      });
    }

    /*
     * Whether the page can actually be dragged sideways.
     *
     * `scrollWidth` reports how wide the content is even when the root clips
     * it, so it says "too wide" for a page that is perfectly well behaved. The
     * question a visitor cares about is whether the thing moves, so that is
     * the question asked.
     */
    const wasAt = window.scrollX;
    window.scrollTo(60, window.scrollY);
    const slides = window.scrollX > 4;
    window.scrollTo(wasAt, window.scrollY);

    return {
      docWidth: document.documentElement.scrollWidth,
      slides,
      viewport: w,
      scrollable: document.documentElement.scrollHeight > h + 4,
      scrollHeight: document.documentElement.scrollHeight,
      bodyOverflow: getComputedStyle(document.body).overflow,
      wide: wide.slice(0, 8),
      controls,
      seen,
    };
  });

const report = async (where, { expectControls = true } = {}) => {
  const a = await audit();
  const bits = [`doc ${a.docWidth}/${a.viewport}`];
  if (a.slides) note(where, 'the page slides sideways under a thumb');
  for (const item of a.wide) note(where, `${item.tag} runs ${item.right - a.viewport}px past the right edge`);

  const reachable = a.controls.filter((c) => c.onScreen && !c.hidden);
  const offscreen = a.controls.filter((c) => !c.onScreen && !c.hidden);
  const tiny = reachable.filter((c) => c.small);
  const inView = a.controls.filter((c) => c.inView && !c.hidden);

  bits.push(`${reachable.length} reachable`);
  if (offscreen.length) {
    bits.push(`${offscreen.length} off screen`);
    for (const c of offscreen.slice(0, 4)) note(where, `"${c.text}" is off screen and not scrollable to`);
  }
  for (const c of tiny.slice(0, 4)) note(where, `"${c.text}" is ${c.w}x${c.h} — under a finger`);
  if (expectControls && inView.length === 0) note(where, 'nothing on this screen can be pressed');

  console.log(`${where.padEnd(34)} ${bits.join('  ')}`);
  return a;
};

const shot = (name) => page.screenshot({ path: `${out}/m-${label}-${name}.png` });

/* ---- the network ---------------------------------------------------------- */

console.log(`\n${label}  ${device.width}x${device.height}\n`);

await page.goto('http://localhost:4600/?stats', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5200);
await report('network / opening');
await shot('network-00');

/* ---- the product index ----------------------------------------------------- */

await page.goto('http://localhost:4600/product', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2600);
const doors = await report('product / doors');
await shot('doors');
if (doors.scrollable) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(700);
  await shot('doors-bottom');
} else {
  note('product / doors', 'the page does not scroll, so anything below the fold is unreachable');
}

/* ---- each walk, and the end of it ------------------------------------------ */

for (const id of ['ubtc', 'settle', 'vault', 'nodes']) {
  await page.goto(`http://localhost:4600/product/${id}?stats`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4200);
  const total = await page.evaluate(() => window.__ubtc?.journey?.stages?.length ?? 0);
  await report(`${id} / first stage`);
  await shot(`${id}-first`);

  if (total) {
    // Straight to the end, the way the keyboard does it, then look at what is
    // being offered and whether a thumb can get to it.
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' })));
    await page.waitForTimeout(2600);
    await report(`${id} / the ending`);
    await shot(`${id}-ending`);
  }
}

/* ---- and the writing behind them ------------------------------------------- */

for (const id of ['ubtc', 'vault']) {
  await page.goto(`http://localhost:4600/product/${id}?stats`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' })));
  await page.waitForTimeout(2400);
  const go = await page.$('.ending-go');
  if (!go) {
    note(`${id} / writing`, 'no way through to the written product from the walk');
    continue;
  }
  await go.click();
  await page.waitForTimeout(1600);
  const written = await report(`${id} / the writing`);
  await shot(`${id}-writing`);
  if (!written.scrollable) note(`${id} / writing`, 'the written page does not scroll');
  else {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(700);
    await report(`${id} / writing, bottom`);
    await shot(`${id}-writing-bottom`);
  }
}

/* ---- the data room --------------------------------------------------------- */

await page.goto('http://localhost:4600/data-room', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2200);
await report('data room');
await shot('data-room');

await browser.close();
console.log(
  problems.length
    ? `\n${problems.length} PROBLEMS on ${label}:\n  ${problems.join('\n  ')}`
    : `\n${label} is clean`,
);
process.exit(problems.length ? 1 : 0);
