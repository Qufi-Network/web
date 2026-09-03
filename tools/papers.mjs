/**
 * The manifest against the files.
 *
 * `papers.ts` writes down how many pages each document has and roughly how
 * large it is, because the cards and the detail pages want to say "12 pages"
 * before anything has been fetched. Numbers written down are numbers that go
 * stale, so this opens each file and checks.
 *
 * It also reports a paper the manifest names but the host does not have, which
 * is the ordinary state of a fresh checkout: the PDFs are deliberately not in
 * the repository. See papers/README.md.
 *
 *   node tools/papers.mjs
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const { PAPERS } = await import('../components/site/dataroom/papers.ts').catch(async () => {
  // The manifest is TypeScript and this is plain node, so it is read rather
  // than imported. One regex against one literal array is enough here.
  const src = readFileSync('components/site/dataroom/papers.ts', 'utf8');
  const body = src.slice(src.indexOf('export const PAPERS'), src.indexOf('export const paperFor'));
  const papers = [...body.matchAll(/\{\s*doc:\s*'([^']+)',\s*file:\s*'([^']+)',\s*pages:\s*(\d+),\s*size:\s*'([^']+)'/g)];
  return { PAPERS: papers.map((m) => ({ doc: m[1], file: m[2], pages: Number(m[3]), size: m[4] })) };
});

const DIR = process.env.QUFI_PAPERS_DIR ?? 'papers';
const problems = [];

for (const paper of PAPERS) {
  const path = join(DIR, paper.file);
  let bytes;
  try {
    bytes = readFileSync(path);
  } catch {
    console.log(`${paper.doc.padEnd(24)} NOT ON THIS MACHINE (${path})`);
    continue;
  }

  const doc = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  const mb = `${(statSync(path).size / 1e6).toFixed(1)} MB`;

  const wrong = [];
  if (doc.numPages !== paper.pages) wrong.push(`pages: says ${paper.pages}, is ${doc.numPages}`);
  if (mb !== paper.size) wrong.push(`size: says ${paper.size}, is ${mb}`);

  console.log(`${paper.doc.padEnd(24)} ${doc.numPages} pages, ${mb}${wrong.length ? '  <<' : ''}`);
  for (const w of wrong) {
    console.log(`  !! ${w}`);
    problems.push(`${paper.doc}: ${w}`);
  }
}

console.log(problems.length ? `\n${problems.length} out of date` : '\nthe manifest matches the files');
process.exit(problems.length ? 1 : 0);
