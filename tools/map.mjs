/**
 * The navigation map, close up.
 *
 * The one part of the interface that is pure DOM, so it is also the one part
 * that can be checked without waiting for a frame: hover each point in turn and
 * photograph what it says.
 *
 *   node tools/map.mjs
 */
import { pathToFileURL } from 'node:url';

const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;
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

const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
await page.bringToFront();
await page.goto('http://localhost:4600/?stats', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__qufi), null, { timeout: 40000 });
await page.evaluate(() => window.__qufi.online());
await page.waitForTimeout(2000);

console.log('title:', await page.textContent('.constellation-title'));

const nodes = await page.$$('.constellation-node');
for (let i = 0; i < nodes.length; i++) {
  await nodes[i].hover();
  await page.waitForTimeout(420);
  const shown = await page.evaluate((index) => {
    const node = document.querySelectorAll('.constellation-node')[index];
    const label = node.querySelector('.constellation-label');
    const box = label.getBoundingClientRect();
    const map = document.querySelector('.constellation-map').getBoundingClientRect();
    return {
      text: label.textContent.trim(),
      opacity: getComputedStyle(label).opacity,
      // A label that runs off the left of the viewport is worse than none.
      offLeft: box.left < 0,
      pastMap: box.right > map.right || box.left < map.left,
    };
  }, i);
  console.log(`${i}  ${JSON.stringify(shown)}`);
}

// One frame with a point held, for the record. Full frame rather than a crop
// of the map: the question is whether the label reads against the scene behind
// it, and a crop cannot answer that.
await nodes[3].hover();
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/map-hover.png` });
console.log('captured map-hover');

await browser.close();
