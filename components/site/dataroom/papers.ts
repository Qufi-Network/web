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
   * Photographs, as fractions of the page.
   *
   * The light view flips the lightness of the whole page and rotates the hue
   * back, which turns a dark deck into a white one and leaves diagrams roughly
   * the colours they were drawn in. It does not survive a photograph:
   * inverting a face produces a negative, and no hue rotation puts a person
   * back.
   *
   * So these boxes are cut out of the render and laid over the top untouched.
   * The near-black card the portraits sit on is knocked out to white as they
   * are laid down, because keeping the region also kept its ground and put a
   * black rectangle in the middle of a white page.
   *
   * `page` is one-based. Keep the boxes tight: everything inside one stops
   * being converted, so a box that catches a caption leaves that caption white
   * on white.
   */
  photos?: Array<{ page: number; x: number; y: number; w: number; h: number }>;

  /**
   * Where the deck's own lockup sits, as fractions of the page.
   *
   * Covered and replaced with the site's mark on the light view. Keeping the
   * original un-inverted was tried and is wrong for the same reason as the
   * photographs: it preserves the dark plate it was drawn on. Letting it invert
   * is close, but the deck's wordmark is a slightly different lockup from the
   * site's, and this is the one place the two sit inches apart.
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
    logo: { x: 0, y: 0.005, w: 0.2, h: 0.115 },
    photos: [
      { page: 6, x: 0.288, y: 0.132, w: 0.076, h: 0.162 },
      { page: 6, x: 0.438, y: 0.132, w: 0.076, h: 0.162 },
      { page: 6, x: 0.588, y: 0.132, w: 0.076, h: 0.162 },
    ],
  },
  {
    doc: 'investment-thesis',
    file: 'investor-thesis.pdf',
    pages: 12,
    size: '3.1 MB',
    shape: 'portrait',
    logo: { x: 0.03, y: 0.022, w: 0.2, h: 0.062 },
    photos: [
      { page: 10, x: 0.328, y: 0.092, w: 0.122, h: 0.064 },
      { page: 10, x: 0.562, y: 0.092, w: 0.112, h: 0.064 },
      { page: 10, x: 0.788, y: 0.092, w: 0.118, h: 0.064 },
    ],
  },
  {
    doc: 'corporate-overview',
    file: 'corporate-overview.pdf',
    pages: 2,
    size: '0.3 MB',
    shape: 'portrait',
    logo: { x: 0.028, y: 0.005, w: 0.2, h: 0.055 },
  },
];

export const paperFor = (doc: string): Paper | undefined =>
  PAPERS.find((paper) => paper.doc === doc);
