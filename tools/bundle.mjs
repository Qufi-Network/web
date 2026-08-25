/**
 * Builds the whole site into one self-contained HTML file.
 *
 * Everything — the React app, three.js, the shaders, both variable fonts — is
 * inlined, so the result runs from a single file with no network requests at
 * all. That matters for two reasons: the opening beat is a single point on a
 * black screen and cannot afford a blocking request to anyone else's origin,
 * and a page hosted under a strict content policy cannot fetch from external
 * hosts even if it wanted to.
 *
 *   node tools/bundle.mjs [--out path.html]
 */
import { build } from 'esbuild';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outFile = outIndex >= 0 ? args[outIndex + 1] : 'C:/ubtc/qufi-network/dist/qufi.html';
const endpoint = process.env.NEXT_PUBLIC_WAITLIST_ENDPOINT ?? '';

const result = await build({
  entryPoints: ['artifact/entry.tsx'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  jsx: 'automatic',
  write: false,
  metafile: true,
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.NEXT_PUBLIC_WAITLIST_ENDPOINT': JSON.stringify(endpoint),
  },
  loader: {
    // Fonts become data URIs so the page has nothing to fetch.
    '.woff2': 'dataurl',
    '.woff': 'dataurl',
    '.ttf': 'dataurl',
    '.svg': 'dataurl',
  },
  outdir: 'dist',
});

let script = '';
let styles = '';
for (const file of result.outputFiles) {
  if (file.path.endsWith('.css')) styles = file.text;
  else if (file.path.endsWith('.js')) script = file.text;
}

if (!script) throw new Error('bundle produced no script');

const escape = (value) => value.replace(/<\/script>/gi, '<\\/script>');

/*
 * No doctype, html, head or body: the host wraps the file in its own skeleton.
 * The root element carries the theme colour so the page never flashes white
 * before the renderer has a frame.
 */
const html = `<title>QUFI Network</title>
<meta name="description" content="QUFI is a post-quantum verification network for money. Independent nodes check every mint, transfer, approval and redemption using post-quantum cryptography, then settle the result.">
<style>
${styles}
</style>
<div id="qufi-root"></div>
<script>
${escape(script)}
</script>
`;

await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, html, 'utf8');

const size = (await stat(outFile)).size;
console.log(`${outFile}  ${(size / 1024 / 1024).toFixed(2)} MB`);
console.log(`waitlist endpoint: ${endpoint || '(none — form runs in preview mode)'}`);
