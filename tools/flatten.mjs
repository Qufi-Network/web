/**
 * The whole codebase as one readable document.
 *
 * Written because an archive is not a thing a language model can open. This
 * emits every source file in order, each under its own path heading and inside
 * a fenced block tagged with its language, preceded by a tree so the reader
 * knows the shape before it starts reading the parts.
 *
 * Excluded, and each for a reason:
 *   dist/qufi.html      the built output - minified, and a build product rather
 *                       than a source of it
 *   package-lock.json   resolution detail; package.json is what declares intent
 *   assets/mark.ts      one 58 KB base64 payload, truncated in place so the
 *                       shape of the module survives without the bytes
 *   tools/patch-*.py    one-off migrations already applied to the files here
 *   *.png               binary
 *
 *   node tools/flatten.mjs [--split N]
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', '.captures', 'dist']);
const SKIP_FILES = new Set([
  'package-lock.json',
  'tsconfig.tsbuildinfo',
  'next-env.d.ts',
  'qufi-network-source.zip',
]);
const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.ico', '.zip']);

const LANG = {
  '.ts': 'ts',
  '.tsx': 'tsx',
  '.js': 'js',
  '.mjs': 'js',
  '.css': 'css',
  '.json': 'json',
  '.md': 'md',
  '.svg': 'xml',
  '.py': 'python',
};

/** Depth-first, directories before files, alphabetical — a stable reading order. */
function walk(dir, out = []) {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
      continue;
    }
    if (SKIP_FILES.has(entry.name)) continue;
    if (SKIP_EXT.has(extname(entry.name).toLowerCase())) continue;
    if (/^patch-.*\.py$/.test(entry.name)) continue;
    // This script's own output, which is otherwise a source file in the root
    // and would fold a previous run into the next one.
    if (/^QUFI-SOURCE.*\.md$/.test(entry.name)) continue;
    out.push(full);
  }
  return out;
}

/**
 * The mark module is a single enormous base64 string. Keeping its head and tail
 * shows what it is; keeping the middle would spend a tenth of the budget on
 * bytes nobody can read anyway.
 */
function contents(path, text) {
  if (!path.endsWith('assets/mark.ts')) return text;
  return text.replace(/'(data:image\/[^']{400,})'/g, (_, uri) => {
    const head = uri.slice(0, 96);
    const kb = Math.round(uri.length / 1024);
    return `'${head}… [${kb} KB of base64 omitted — this is the QUFI logo artwork, ` +
      `also present as the binary assets/qufi-mark.png. Substitute your own mark here.]'`;
  });
}

const files = walk(ROOT).map((f) => relative(ROOT, f).split('\\').join('/'));

const header = `# QUFI Network — complete source

Every source file in one document. ${files.length} files.

An immersive scroll-as-depth site: Next.js, React Three Fiber, TypeScript, GSAP
and hand-written GLSL. Scrolling is not a page position — it is a position in a
simulated network, and every value the scene reads is interpolated from where
that position falls between two chapters. There are no scroll-triggered
animations and no routing.

## How to run it

\`\`\`
npm install
npm run dev        # http://localhost:4600
npm run build      # static output
npm run typecheck
\`\`\`

Fonts are npm packages (\`@fontsource-variable/sora\`, \`@fontsource-variable/jetbrains-mono\`),
so \`npm install\` is the only step that touches the network. There are no other
external assets: the logo is inlined as a data URI, the grain is an inline SVG
filter, the icons are drawn on canvas, and the network is shaders.

## Where things live

| Directory | What is in it |
| --- | --- |
| \`app/\` | route, metadata, and four stylesheets |
| \`components/experience/\` | the R3F canvas and scene composition |
| \`components/overlay/\` | the DOM layer — copy, cards, form, loader, marks |
| \`experience/\` | chapter definitions, the scroll director, the stage bus, and every scene system |
| \`network/\` | the data model — topology, simulation engine, economic layer |
| \`shaders/\` | GLSL, as tagged template strings |
| \`lib/\` | device capability tiers, adaptive resolution |
| \`tools/\` | Playwright harnesses that drive a real GPU to verify the result |

## File tree

\`\`\`
${files.join('\n')}
\`\`\`

---
`;

const blocks = files.map((rel) => {
  const raw = readFileSync(join(ROOT, rel), 'utf8');
  const body = contents(rel, raw);
  const lang = LANG[extname(rel).toLowerCase()] ?? '';
  // A fence longer than any run of backticks inside, so file contents that
  // themselves contain fenced blocks cannot terminate the block early.
  const longest = (body.match(/`+/g) ?? ['']).reduce((a, b) => (b.length > a.length ? b : a), '');
  const fence = '`'.repeat(Math.max(3, longest.length + 1));
  return `## \`${rel}\`\n\n${fence}${lang}\n${body.replace(/\s*$/, '')}\n${fence}\n`;
});

const split = Number(process.argv[process.argv.indexOf('--split') + 1]) || 0;
const kb = (s) => `${(Buffer.byteLength(s, 'utf8') / 1024).toFixed(0)} KB`;

if (!split) {
  const doc = header + '\n' + blocks.join('\n');
  writeFileSync(join(ROOT, 'QUFI-SOURCE.md'), doc, 'utf8');
  console.log(`QUFI-SOURCE.md  ${files.length} files  ${kb(doc)}  ~${Math.round(Buffer.byteLength(doc, 'utf8') / 3.6 / 1000)}k tokens`);
} else {
  const per = Math.ceil(blocks.length / split);
  for (let i = 0; i < split; i++) {
    const part = blocks.slice(i * per, (i + 1) * per);
    if (!part.length) continue;
    const name = `QUFI-SOURCE-${i + 1}-of-${split}.md`;
    const intro =
      i === 0
        ? header
        : `# QUFI Network — complete source (part ${i + 1} of ${split})\n\nContinues from part ${i}. See part 1 for the file tree and how to run it.\n\n---\n`;
    const doc = intro + '\n' + part.join('\n');
    writeFileSync(join(ROOT, name), doc, 'utf8');
    console.log(`${name}  ${part.length} files  ${kb(doc)}`);
  }
}
