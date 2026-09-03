/**
 * The documents that actually exist as files.
 *
 * Most of the room is specifications for documents still being written. These
 * three are written, and this is what connects a catalogue entry to the PDF
 * behind it.
 *
 * ## Why the files are not in `public/`
 *
 * Anything under `public/` is served by Next as a static asset: the URL is the
 * path, the response carries whatever headers the host feels like, and a
 * browser offered `application/pdf` at a plain URL will happily save it. These
 * are read through a route instead, which is the only way to have a say in any
 * of that.
 *
 * ## Page counts are here rather than measured
 *
 * The viewer knows how many pages a document has the moment it has parsed it,
 * which is too late to be useful: the card and the detail page want to say
 * "12 pages" before anything has been fetched. They are written down, checked
 * against the file by `tools/papers.mjs`.
 */

export interface Paper {
  /** The catalogue id this belongs to. */
  doc: string;
  /** The file, inside the papers directory. */
  file: string;
  pages: number;
  /** Roughly, for the reader. */
  size: string;
  /** How the pages are shaped, so the viewer can size itself before it parses. */
  shape: 'portrait' | 'landscape';
  /**
   * Where the deck's own logo sits, as fractions of the page.
   *
   * The three papers carry a QuFi lockup baked into the top-left of every
   * page, drawn white for a dark deck. Shown light it inverts along with
   * everything else and comes out as a grey smudge. The viewer covers this box
   * and draws the real mark over it instead, which is also the only way to get
   * a logo that stays sharp at any zoom: it is a mask over a fill rather than
   * pixels from a render.
   */
  logo?: { x: number; y: number; w: number; h: number };
}

export const PAPERS: Paper[] = [
  {
    doc: 'investor-memorandum',
    file: 'investor-memorandum.pdf',
    pages: 6,
    size: '1.4 MB',
    shape: 'landscape',
    logo: { x: 0, y: 0, w: 0.135, h: 0.115 },
  },
  {
    doc: 'investment-thesis',
    file: 'investor-thesis.pdf',
    pages: 12,
    size: '3.1 MB',
    shape: 'portrait',
    logo: { x: 0.015, y: 0.008, w: 0.225, h: 0.062 },
  },
  {
    doc: 'corporate-overview',
    file: 'corporate-overview.pdf',
    pages: 2,
    size: '0.3 MB',
    shape: 'portrait',
    logo: { x: 0.028, y: 0.012, w: 0.24, h: 0.05 },
  },
];

export const paperFor = (doc: string): Paper | undefined =>
  PAPERS.find((paper) => paper.doc === doc);
