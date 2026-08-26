/**
 * The same network, in a much smaller frame.
 *
 * A phone gets a lighter scene and a different arrangement of the interface,
 * and both of those are places for the layout to come apart: copy that runs off
 * the bottom, a map that pushes the document sideways, a reading column with
 * nowhere to go. This walks several spaces at phone size and reports the three
 * failures that are invisible in a screenshot taken at desk width.
 *
 *   node tools/mobile.mjs [--width 390] [--height 844]
 */
import { pathToFileURL } from 'node:url';

const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? Number(args[index + 1]) : fallback;
};
const width = flag('width', 390);
const height = flag('height', 844);
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
  viewport: { width, height },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

await page.bringToFront();
await page.goto('http://localhost:4600/?stats', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__qufi), null, { timeout: 40000 });
await page.waitForFunction(() => document.querySelector('canvas')?.width > 300, null, {
  timeout: 30000,
});
console.log('tier', await page.evaluate(() => window.__qufi.experience.get().tier));

/**
 * The three ways a small frame breaks: the document gets wider than the
 * viewport, something readable ends up outside it, or two readable things end
 * up on top of each other.
 */
const audit = async (label) => {
  const found = await page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth - window.innerWidth;

    const readable = [...document.querySelectorAll('.hud, .centre, .boot, .opening')]
      .flatMap((root) => [...root.querySelectorAll('p, h2, span, button')])
      .filter((node) => {
        const text = (node.textContent ?? '').trim();
        if (!text) return false;
        const style = getComputedStyle(node);
        if (style.visibility === 'hidden' || style.display === 'none') return false;
        // Opacity is inherited through the layers that fade in and out, so the
        // chain has to be walked rather than the node asked.
        let el = node;
        while (el && el !== document.body) {
          if (Number(getComputedStyle(el).opacity) < 0.06) return false;
          el = el.parentElement;
        }
        return true;
      })
      .map((node) => {
        const box = node.getBoundingClientRect();
        return { text: (node.textContent ?? '').trim().slice(0, 28), box };
      })
      .filter((entry) => entry.box.width > 0 && entry.box.height > 0);

    const offscreen = readable
      .filter(
        (entry) =>
          entry.box.right > window.innerWidth + 1 ||
          entry.box.left < -1 ||
          entry.box.bottom > window.innerHeight + 1 ||
          entry.box.top < -1,
      )
      .map((entry) => entry.text);

    // Only leaves, or every paragraph collides with the section holding it.
    const leaves = readable.filter(
      (a) =>
        !readable.some(
          (b) =>
            b !== a &&
            b.box.left >= a.box.left - 1 &&
            b.box.right <= a.box.right + 1 &&
            b.box.top >= a.box.top - 1 &&
            b.box.bottom <= a.box.bottom + 1,
        ),
    );

    const overlaps = [];
    for (let i = 0; i < leaves.length; i++) {
      for (let j = i + 1; j < leaves.length; j++) {
        const a = leaves[i].box;
        const b = leaves[j].box;
        const gap =
          Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2;
        if (gap) overlaps.push(`${leaves[i].text} / ${leaves[j].text}`);
      }
    }

    return { overflow, offscreen, overlaps };
  });

  if (found.overflow > 0) problems.push(`${label}: document ${found.overflow}px too wide`);
  for (const text of found.offscreen) problems.push(`${label}: off screen "${text}"`);
  for (const pair of found.overlaps) problems.push(`${label}: overlapping ${pair}`);

  await page.screenshot({ path: `${out}/mob-${label}.png` });
  console.log(
    `${label}  overflow ${found.overflow}  offscreen ${found.offscreen.length}  overlaps ${found.overlaps.length}`,
  );
};

await page.evaluate(() => window.__qufi.seek(14.5));
await page.waitForTimeout(1500);
await audit('opening');

await page.evaluate(() => window.__qufi.online());
await page.waitForTimeout(2200);
await audit('network');

// A swipe should travel, and it is the only gesture most visitors will try.
await page.touchscreen.tap(width / 2, height / 2);
const before = await page.evaluate(() => window.__qufi.nav.get().travel);
await page.mouse.move(width / 2, height * 0.7);
await page.mouse.down();
for (let y = 0.7; y > 0.25; y -= 0.05) {
  await page.mouse.move(width / 2, height * y);
  await page.waitForTimeout(40);
}
await page.mouse.up();
await page.waitForTimeout(1800);
const after = await page.evaluate(() => window.__qufi.nav.get().travel);
console.log(`swipe travel ${before.toFixed(2)} -> ${after.toFixed(2)}`);
if (Math.abs(after - before) < 0.05) problems.push('a swipe did not travel');
await audit('travelled');

for (const index of [0, 2, 6, 7]) {
  await page.evaluate((i) => window.__qufi.enterSpace(i), index);
  await page.waitForTimeout(3200);
  await audit(`space-${index}`);
  await page.evaluate(() => window.__qufi.stageTo(0.9));
  await page.waitForTimeout(1800);
  await audit(`space-${index}-deep`);
  await page.evaluate(() => window.__qufi.returnToNetwork());
  await page.waitForTimeout(2400);
}

console.log(`fps ${await page.evaluate(() => window.__qufi.stage.fps)}`);
await browser.close();
console.log(problems.length ? `\nPROBLEMS:\n${problems.join('\n')}` : '\nno layout problems');
process.exit(problems.length ? 1 : 0);
