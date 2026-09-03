/**
 * The pdf.js worker, put where the browser can fetch it.
 *
 * pdf.js parses in a worker, and the worker has to be a URL the page can load.
 * Bundling it through the app is possible and fragile — it is a two-megabyte
 * module that wants to be a `Worker`, not an import — so it is copied into
 * `public/` instead and referenced by path.
 *
 * Run after upgrading pdfjs-dist:
 *
 *   node tools/build/mkworker.mjs
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const from = join(dirname(require.resolve('pdfjs-dist/package.json')), 'build/pdf.worker.min.mjs');
const to = 'public/pdf/pdf.worker.min.mjs';

mkdirSync('public/pdf', { recursive: true });
copyFileSync(from, to);
console.log(`${from}\n  -> ${to}`);
