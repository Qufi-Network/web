/**
 * Every walk, end to end.
 *
 * Not a look at the pictures — a check that each of the four products can
 * actually be walked: that the scene mounts, that the reading column says what
 * the journey says, that the route reaches the end, that what is offered there
 * is what that product has to offer, and that none of it drops below a frame
 * rate a visitor would notice.
 *
 *   node tools/walks.mjs
 */
import { pathToFileURL } from 'node:url';

const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;

const PRODUCTS = [
  { id: 'ubtc', nav: 'UBTC', proof: true, app: true },
  { id: 'settle', nav: 'QU-SETTLE', proof: false, app: false },
  { id: 'vault', nav: 'QU-VAULT', proof: false, app: false },
  { id: 'nodes', nav: 'QU-NODES', proof: false, app: false },
];

const NOTCH = 0.1255;
const FLOOR = 30;

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

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) problems.push(label);
};
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

await page.bringToFront();

for (const product of PRODUCTS) {
  console.log(`\n${product.id}`);
  await page.goto(`http://localhost:4600/product/${product.id}?stats`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(3400);

  const opened = await page.evaluate(() => {
    const debug = window.__ubtc;
    if (!debug) return null;
    return {
      stages: debug.journey.stages.length,
      nav: debug.journey.nav,
      figures: debug.journey.figures.length,
      coordinate: document.querySelector('.life-coordinate')?.textContent?.trim() ?? '',
      // The list items only: the rail also carries a span for the run of the
      // route, and counting that says there is one more stage than there is.
      rail: Array.from(document.querySelectorAll('.life-rail li span')).map((n) => n.textContent),
    };
  });

  check(`${product.id}: the walk mounts`, Boolean(opened), opened ? `${opened.figures} figures` : 'no scene');
  if (!opened) continue;

  check(
    `${product.id}: it says whose walk it is`,
    opened.coordinate.includes(product.nav),
    opened.coordinate,
  );
  check(
    `${product.id}: the rail carries every stage`,
    opened.rail.length === opened.stages,
    `${opened.rail.length} of ${opened.stages}: ${opened.rail.join(' ')}`,
  );

  // To the end, the way a visitor gets there, watching the frame rate on the way.
  await page.mouse.move(720, 450);
  let worst = 999;
  const notches = Math.round((opened.stages + 0.2) / NOTCH);
  for (let n = 0; n < notches; n++) {
    await page.mouse.wheel(0, 62);
    if (n % 12 === 0) {
      const fps = await page.evaluate(() => window.__ubtc.stage.fps);
      if (fps > 5) worst = Math.min(worst, fps);
    }
  }
  await page.waitForTimeout(1600);

  const arrived = await page.evaluate(() => {
    const ending = document.querySelector('.ending');
    return {
      at: window.__ubtc.life.get().at,
      stage: window.__ubtc.life.get().stage,
      shown: ending?.getAttribute('data-show') ?? 'missing',
      app: Boolean(ending?.querySelector('.applink')),
      proof: Boolean(ending?.querySelector('.ending-proof')),
      read: Boolean(ending?.querySelector('.ending-go')),
    };
  });

  check(
    `${product.id}: the route reaches the end`,
    arrived.stage === opened.stages - 1 && arrived.at > opened.stages - 0.34,
    `at ${arrived.at.toFixed(2)} of ${opened.stages}`,
  );
  check(`${product.id}: and offers the writing`, arrived.shown === 'true' && arrived.read);
  check(
    `${product.id}: with what this product actually has`,
    arrived.app === product.app && arrived.proof === product.proof,
    `app ${arrived.app}, proof ${arrived.proof}`,
  );
  check(`${product.id}: and never crawls`, worst >= FLOOR, `worst ${worst.toFixed(0)}fps`);

  // The writing is the far end of the walk, so it has to be reachable from it.
  await page.click('.ending-go');
  await page.waitForTimeout(1200);
  const written = await page.evaluate(() => ({
    panel: Boolean(document.querySelector('.panel-name')),
    name: document.querySelector('.panel-name')?.textContent ?? '',
  }));
  check(`${product.id}: and the writing is behind it`, written.panel, written.name);
}

await browser.close();
console.log(problems.length ? `\nPROBLEMS:\n  ${problems.join('\n  ')}` : '\nall four can be walked');
process.exit(problems.length ? 1 : 0);
