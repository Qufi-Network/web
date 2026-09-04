import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { paperFor } from '../../../../components/site/dataroom/papers';

/**
 * The bytes of a paper, on the way to the viewer and nowhere else.
 *
 * ## What this can and cannot do
 *
 * A document that can be read in a browser has been sent to that browser. No
 * arrangement of headers changes that, and anything claiming otherwise is
 * selling something. What this route does is remove every easy way to end up
 * with the file:
 *
 *   - the PDF is not under `public/`, so it has no static URL to guess
 *   - `Content-Disposition: inline` asks the browser to render rather than save
 *   - `X-Robots-Tag` keeps it out of indexes, including Google's PDF crawler
 *   - `no-store` keeps it out of shared caches and off disk where it can
 *   - a same-origin check means pasting the URL into a fresh tab gets nothing,
 *     so the address in the network panel is not a link somebody can send on
 *
 * What is left is a determined reader with developer tools, who was always
 * going to win. The honest description of this is "not downloadable by any
 * ordinary means", and that is what the interface says.
 */

const DIR = process.env.QUFI_PAPERS_DIR ?? resolve(process.cwd(), 'papers');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const paper = paperFor(id);
  if (!paper) return new Response('Not found', { status: 404 });

  /*
   * Which version. Some papers exist twice: once drawn for a dark deck and
   * once for a white page, and the standard site asks for the second.
   */
  const wants = new URL(request.url).searchParams.get('v');
  const file = wants === 'light' && paper.light ? paper.light.file : paper.file;

  /*
   * Only from our own pages.
   *
   * `Sec-Fetch-Site` is set by the browser and cannot be forged from script,
   * so this is a real boundary rather than a suggestion. A URL typed into the
   * address bar arrives as `none`; a link from another site as `cross-site`.
   * Both get nothing.
   */
  const from = request.headers.get('sec-fetch-site');
  if (from && from !== 'same-origin') {
    return new Response('Not available', { status: 403 });
  }

  // A file that is missing is not an error the reader should see a stack for:
  // the room simply does not offer the document. See papers/README.md.
  const path = join(DIR, file);
  let bytes: Buffer;
  try {
    await stat(path);
    bytes = await readFile(path);
  } catch {
    return new Response('Not available', { status: 404 });
  }

  const etag = `"${createHash('sha1').update(bytes).digest('hex').slice(0, 16)}"`;
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: { etag } });
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      'content-type': 'application/pdf',
      'content-length': String(bytes.byteLength),
      'content-disposition': `inline; filename="${file}"`,
      'cache-control': 'private, no-store, max-age=0',
      'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet',
      'x-content-type-options': 'nosniff',
      etag,
    },
  });
}
