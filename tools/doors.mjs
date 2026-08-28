/**
 * The four doors, and what is behind each of them.
 *
 * The claim this page makes is that clicking a product takes you into it. So
 * the check is to click all four: that each one goes to its own route, that the
 * two with a journey land in a scene and the two without land on the writing,
 * and that the walk offers the written version at the end and not before.
 *
 *   node tools/doors.mjs [--mobile]
 */
import { pathToFileURL } from 'node:url';

const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;

const mobile = process.argv.includes('--mobile');
const out = 'C:/ubtc/qufi-network/.captures';
const suffix = mobile ? '-m' : '';

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

const ctx = await browser.newContext(
  mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
);
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) problems.push(label);
};
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

await page.bringToFront();
await page.goto('http://localhost:4600/product', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

const doors = await page.evaluate(() =>
  [...document.querySelectorAll('.door')].map((n) => ({
    href: new URL(n.getAttribute('href'), location.href).pathname,
    name: n.querySelector('.door-name')?.textContent ?? '',
    go: n.querySelector('.door-go')?.textContent?.trim() ?? '',
    tone: getComputedStyle(n).getPropertyValue('--tone').trim(),
    figure: n.querySelectorAll('.figure path, .figure circle').length,
    // Two to a row: the first two share a top, the third starts a new one.
    // Rounded to the nearest few pixels: two items on one grid row can differ
    // by a fraction, and a fraction is not a row.
    top: Math.round(n.getBoundingClientRect().top / 8) * 8,
  })),
);

check('four doors', doors.length === 4, doors.map((d) => d.name).join(' / '));
check('each goes to its own product', new Set(doors.map((d) => d.href)).size === 4, doors.map((d) => d.href).join(' '));
check('each has a figure', doors.every((d) => d.figure >= 5));
check('each has its own colour', new Set(doors.map((d) => d.tone)).size === 4);
check('each says what clicking does', doors.every((d) => d.go.length > 3), doors.map((d) => d.go).join(' / '));
if (!mobile) {
  const rows = new Set(doors.map((d) => d.top)).size;
  check('two to a row', rows === 2, `${rows} rows`);
}
await page.screenshot({ path: `${out}/d-doors${suffix}.png` });

for (const door of doors) {
  await page.goto(`http://localhost:4600${door.href}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const landed = await page.evaluate(() => ({
    scene: Boolean(document.querySelector('canvas')),
    reading: Boolean(document.querySelector('.read .panel')),
    ending: document.querySelector('.ending')?.dataset.show ?? null,
  }));

  if (door.go.toLowerCase().startsWith('walk')) {
    check(`${door.name}: lands in the walk`, landed.scene && !landed.reading, JSON.stringify(landed));
    check(`${door.name}: the writing is not offered yet`, landed.ending === 'false', String(landed.ending));

    /*
     * To the end of the walk, by whatever the device actually has.
     *
     * A touch-enabled context does not deliver wheel events at all, so a
     * mouse-only harness concludes the phone cannot reach the end of its own
     * journey. It can; it just does it with a thumb.
     */
    const size = page.viewportSize();
    if (mobile) {
      for (let i = 0; i < 14; i++) {
        const x = size.width / 2;
        const y = size.height * 0.62;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let step = 1; step <= 8; step++) {
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y - (320 * step) / 8 }],
          });
          await page.waitForTimeout(12);
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(160);
      }
    } else {
      await page.mouse.move(700, 400);
      for (let i = 0; i < 60; i++) {
        await page.mouse.wheel(0, 120);
        await page.waitForTimeout(60);
      }
    }
    await page.waitForTimeout(1800);
    const arrived = await page.evaluate(() => ({
      ending: document.querySelector('.ending')?.dataset.show ?? null,
      proof: document.querySelector('.ending-proof')?.getAttribute('href') ?? null,
      go: Boolean(document.querySelector('.ending-go')),
    }));
    check(`${door.name}: the writing is offered at the end`, arrived.ending === 'true' && arrived.go, JSON.stringify(arrived.ending));
    if (door.href.endsWith('/ubtc')) {
      check(
        'and the testnet4 transaction is offered with it',
        Boolean(arrived.proof && arrived.proof.includes('mempool.space/testnet4')),
        String(arrived.proof),
      );
    }
    await page.screenshot({ path: `${out}/d-end-${door.href.split('/').pop()}${suffix}.png` });

    /*
     * Whether the button can actually be pressed, asked directly.
     *
     * A driver click would answer this too, but it answers it as a timeout
     * thirty seconds later and tells you which element was in the way rather
     * than whether that mattered. This asks what is on top of the button, says
     * so, and then presses it either way — so a covered button is a reported
     * finding rather than a dead run.
     */
    const reachable = await page.evaluate(() => {
      const go = document.querySelector('.ending-go');
      const box = go.getBoundingClientRect();
      const on = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return { covered: !go.contains(on) && on !== go, by: on?.className ?? on?.tagName ?? '?' };
    });
    check(`${door.name}: the button can be pressed`, !reachable.covered, `covered by ${reachable.by}`);

    await page.$eval('.ending-go', (el) => el.click());
    await page.waitForTimeout(900);
    const read = await page.evaluate(() => Boolean(document.querySelector('.read .panel-name')));
    check(`${door.name}: and opens it`, read);
  } else {
    check(`${door.name}: goes straight to the writing`, landed.reading, JSON.stringify(landed));
  }
  await page.screenshot({ path: `${out}/d-read-${door.href.split('/').pop()}${suffix}.png` });
}

await browser.close();
console.log(problems.length ? `\nPROBLEMS: ${problems.join(', ')}` : '\nthe doors work');
process.exit(problems.length ? 1 : 0);
