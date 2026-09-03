/**
 * The standard site, looked at.
 *
 * The environment next door is judged on frame rate and composition. This one
 * is judged the way a website is: does it fit the screen, does it scroll, are
 * the controls reachable, and is the text dark enough on white to actually be
 * read. The last of those is measured rather than eyeballed — a grey that
 * looks refined at full size is a grey nobody can read on a train.
 *
 *   node tools/classic.mjs [width]
 */
import { pathToFileURL } from 'node:url';

const width = Number(process.argv[2] ?? 1440);
/* Below this the site is being judged as a phone, not a narrow window. */
const phone = width <= 500;
const height = phone ? 730 : 900;
const pw = await import(pathToFileURL('C:/ubtc/frontend/node_modules/playwright/index.js').href);
const { chromium } = pw.default ?? pw;
const out = 'C:/ubtc/qufi-network/.captures';

const problems = [];
const note = (where, what) => {
  console.log(`  !! ${where}: ${what}`);
  problems.push(`${where}: ${what}`);
};

const browser = await chromium.launch({ headless: false, args: ['--hide-scrollbars'] });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: phone ? 2 : 1,
  isMobile: phone,
  hasTouch: phone,
});
page.on('pageerror', (e) => note('page', e.message.slice(0, 110)));
page.on('console', (m) => {
  if (m.type() === 'error') note('console', m.text().slice(0, 110));
});

/* Relative luminance, so contrast can be a number rather than an opinion. */
const audit = (w) =>
  page.evaluate((vw) => {
    /*
     * Any colour string, resolved to actual pixels.
     *
     * A regex over `getComputedStyle` was enough while every colour was an
     * `rgb()`. It is not enough now: Chrome computes `color-mix()` down to
     * `oklab(...)` or `color(srgb ...)`, and pulling the first three numbers
     * out of those produced a contrast of 1.00:1 against a background that was
     * plainly not white. The canvas knows how to paint all of them, so it is
     * asked to paint one pixel and the pixel is read back.
     */
    const paint = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    paint.canvas.width = paint.canvas.height = 1;
    const rgbOf = (colour) => {
      paint.clearRect(0, 0, 1, 1);
      paint.fillStyle = '#fff';
      paint.fillRect(0, 0, 1, 1);
      paint.fillStyle = colour;
      paint.fillRect(0, 0, 1, 1);
      const [r, g, b] = paint.getImageData(0, 0, 1, 1).data;
      return [r, g, b];
    };

    const lum = (colour) => {
      const [r, g, b] = rgbOf(colour).map((n) => {
        const c = n / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };

    // Whatever is actually painted behind a node, walking up until something
    // opaque is found. `transparent` on a card tells you nothing.
    const behind = (node) => {
      for (let at = node; at; at = at.parentElement) {
        const style = getComputedStyle(at);

        /*
         * The opaque colour wins, and it is checked first.
         *
         * An element painted `radial-gradient(white 16%, transparent), var(--tone)`
         * has the tone in `backgroundColor` and the highlight in
         * `backgroundImage`. Reading the image first found a sixteen-percent
         * white veil, called it the ground, and reported white-on-white for
         * text sitting on a solid blue panel.
         */
        const bg = style.backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          const alpha = bg.startsWith('rgba(') ? Number(bg.split(',')[3]) : 1;
          if (alpha >= 0.9) return bg;
        }

        /*
         * Otherwise a gradient, if it has any stop solid enough to be a ground.
         *
         * Every solid stop is returned rather than the first: a gradient is a
         * range of backgrounds and text over it has to clear the line against
         * all of them, so the caller takes the worst. Stops that are mostly
         * transparent are veils over whatever is further up and are skipped.
         */
        const image = style.backgroundImage;
        if (image && image !== 'none' && image.includes('gradient')) {
          const stops = (image.match(/(rgba?\([^)]*\)|#[0-9a-f]{3,8})/gi) ?? []).filter((c) => {
            if (!c.startsWith('rgba(')) return true;
            return Number(c.split(',')[3]) >= 0.9;
          });
          if (stops.length) return stops;
        }
      }
      return 'rgb(255,255,255)';
    };

    const thin = [];
    for (const node of document.querySelectorAll('.classic p, .classic li, .classic dd, .classic h1, .classic h2, .classic h3, .classic a, .classic span')) {
      if (!node.textContent?.trim()) continue;
      const box = node.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      const style = getComputedStyle(node);
      const size = parseFloat(style.fontSize);
      // `behind` gives one colour, or every stop of a gradient. Text has to
      // clear the line against the worst of them.
      const ground = behind(node);
      const r = Array.isArray(ground)
        ? Math.min(...ground.map((c) => ratio(style.color, c)))
        : ratio(style.color, ground);
      // 4.5 for body text, 3 for large. The AA line.
      const need = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700) ? 3 : 4.5;
      if (r < need) {
        thin.push(`${node.tagName.toLowerCase()}.${(node.className || '').toString().split(' ')[0]} ${r.toFixed(2)}:1 at ${size}px`);
      }
    }

    const wide = [];
    const clipped = (node) => {
      for (let at = node.parentElement; at; at = at.parentElement) {
        const s = getComputedStyle(at);
        if (s.overflow !== 'visible' || s.clipPath !== 'none') return true;
      }
      return false;
    };
    for (const node of document.querySelectorAll('.classic *')) {
      const b = node.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      if (b.right <= vw + 1.5 && b.left >= -1.5) continue;
      if (clipped(node)) continue;
      wide.push(`${node.tagName.toLowerCase()}.${(node.className || '').toString().split(' ')[0]}`);
    }

    const small = [];
    for (const node of document.querySelectorAll('.classic a, .classic button')) {
      const b = node.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      if (getComputedStyle(node).display === 'inline') continue;
      if (b.height < (vw <= 500 ? 40 : 32)) {
        small.push(`${(node.textContent || '').trim().slice(0, 24)} ${Math.round(b.height)}px`);
      }
    }

    const wasAt = window.scrollX;
    window.scrollTo(60, window.scrollY);
    const slides = window.scrollX > 4;
    window.scrollTo(wasAt, window.scrollY);

    return {
      slides,
      height: document.documentElement.scrollHeight,
      scrolls: document.documentElement.scrollHeight > innerHeight + 4,
      thin: [...new Set(thin)].slice(0, 6),
      wide: [...new Set(wide)].slice(0, 6),
      small: [...new Set(small)].slice(0, 6),
      links: document.querySelectorAll('.classic a').length,
    };
  }, w);

const look = async (where, url) => {
  await page.goto(`http://localhost:4600${url}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);
  const a = await audit(width);
  if (a.slides) note(where, 'the page slides sideways under a thumb');
  for (const t of a.thin) note(where, `contrast ${t}`);
  for (const t of a.wide) note(where, `${t} runs past the right edge`);
  for (const t of a.small) note(where, `"${t}" is short for a target`);
  if (!a.scrolls && a.height > 1000) note(where, 'the page does not scroll');
  console.log(`${where.padEnd(26)} ${a.height}px, ${a.links} links`);
  await page.screenshot({ path: `${out}/cx-${where.replace(/[^a-z0-9]+/gi, '-')}.png`, fullPage: true });
  return a;
};

console.log(`\nstandard site  ${width}px\n`);

await look('gate', '/');
await look('home', '/classic');
await look('products', '/classic/product');
await look('product-ubtc', '/classic/product/ubtc');
await look('product-vault', '/classic/product/vault');
await look('room', '/classic/data-room');
await look('room-section', '/classic/data-room/section/company');
await look('room-document', '/classic/data-room/document/technical-whitepaper');
await look('room-search', '/classic/data-room/search?q=quantum');
await look('room-start', '/classic/data-room/start');

await browser.close();
console.log(problems.length ? `\n${problems.length} PROBLEMS:\n  ${problems.join('\n  ')}` : '\nthe site is clean');
process.exit(problems.length ? 1 : 0);
