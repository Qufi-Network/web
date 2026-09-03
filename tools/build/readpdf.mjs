/**
 * What is actually inside a PDF.
 *
 * Used once, to write the catalogue entries for the three papers from the
 * papers themselves rather than from their filenames. A data room that
 * describes a document it has not read is describing something else.
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFileSync } from 'node:fs';

const file = process.argv[2];
const upto = Number(process.argv[3] ?? 99);

const doc = await getDocument({
  data: new Uint8Array(readFileSync(file)),
  useSystemFonts: true,
}).promise;

console.log(`## ${file}`);
console.log(`pages: ${doc.numPages}`);
const meta = await doc.getMetadata().catch(() => null);
if (meta?.info?.Title) console.log(`title: ${meta.info.Title}`);

for (let n = 1; n <= Math.min(doc.numPages, upto); n++) {
  const page = await doc.getPage(n);
  const text = await page.getTextContent();
  const lines = [];
  let last = null;
  for (const item of text.items) {
    if (!item.str) continue;
    const y = Math.round(item.transform[5]);
    if (last !== null && Math.abs(y - last) > 2) lines.push('\n');
    lines.push(item.str);
    last = y;
  }
  console.log(`\n--- page ${n} ---`);
  console.log(lines.join('').replace(/\n{3,}/g, '\n\n').trim());
}
