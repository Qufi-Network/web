/**
 * The mark arriving on a card, and the door into a paper.
 *
 * Both are hover states, so both are invisible to a static capture and both
 * are the kind of thing that quietly stops working. This parks the pointer on
 * a card, waits for the transition, and measures whether the mark actually
 * moved and became visible — rather than photographing it and calling it done.
 */
import { pathToFileURL } from 'node:url';

const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;
const out = 'C:/ubtc/qufi-network/.captures';

const problems = [];
const note = (what) => {
  console.log(`  !! ${what}`);
  problems.push(what);
};

const browser = await chromium.launch({ headless: false, args: ['--hide-scrollbars'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => note(`page error: ${e.message.slice(0, 100)}`));

await page.goto('http://localhost:4600/data-room/section/company', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);

// Park the pointer well away first: a trail left over the grid lights the
// wrong card and has produced false readings here before.
await page.mouse.move(1430, 880);
await page.waitForTimeout(1500);

const before = await page.evaluate(() => {
  const s = getComputedStyle(document.querySelector('.doc-card .doc-sigil'));
  return { opacity: Number(s.opacity), transform: s.transform };
});
if (before.opacity > 0.02) note(`the mark is showing at rest (opacity ${before.opacity})`);

await page.locator('.doc-card').first().hover();
await page.waitForTimeout(1100);

const after = await page.evaluate(() => {
  const card = document.querySelector('.doc-card');
  const s = getComputedStyle(card.querySelector('.doc-sigil'));
  return {
    opacity: Number(s.opacity),
    transform: s.transform,
    tone: getComputedStyle(card).getPropertyValue('--tone').trim(),
    mark: getComputedStyle(card).getPropertyValue('--mark').slice(0, 24),
    fill: getComputedStyle(card.querySelector('.doc-sigil-fill')).backgroundColor,
  };
});

if (after.opacity < 0.9) note(`the mark did not appear on hover (opacity ${after.opacity})`);
if (after.transform === before.transform) note('the mark did not move on hover');
if (!after.mark.includes('url(')) note('the mark artwork did not reach the card');
console.log(`sigil: opacity ${before.opacity} -> ${after.opacity}, tone ${after.tone}, fill ${after.fill}`);

await page.screenshot({ path: `${out}/room-sigil-hover.png` });

/* And the button on a document that has a file behind it. */
await page.goto('http://localhost:4600/data-room/document/investor-memorandum', {
  waitUntil: 'domcontentloaded',
});
await page.waitForTimeout(1200);
const button = await page.$('.viewbtn');
if (!button) note('no View control on a document that has a paper');
else {
  const box = await button.boundingBox();
  if (box.height < 44) note(`the View control is ${Math.round(box.height)}px tall`);
  console.log(`view button: ${Math.round(box.width)}x${Math.round(box.height)}`);
  await button.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await button.hover();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/room-viewbtn.png` });
}

/* And that a document without one does not offer it. */
await page.goto('http://localhost:4600/data-room/document/protocol', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(900);
if (await page.$('.viewbtn')) note('a document with no paper is offering a View control');

await browser.close();
console.log(problems.length ? `\n${problems.length} PROBLEMS:\n  ${problems.join('\n  ')}` : '\nclean');
process.exit(problems.length ? 1 : 0);
