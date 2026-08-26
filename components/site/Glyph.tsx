'use client';

/**
 * The three glyphs that are not structures.
 *
 * Everything else on this site is drawn by the GPU out of points; these are the
 * only marks drawn as lines. So they are taken from the one-pager's own icon
 * set rather than from a generic library — the node sphere, the cube and the
 * stack, in the colours that set gives them — because a pictogram of a document
 * beside a network of crystalline solids reads as something bolted on.
 *
 * Stroked in `currentColor` at a single weight, no fills except the lit points,
 * no rounded joins. Each one carries the colour its subject wears everywhere
 * else in this material, and shows it on approach.
 */

interface Props {
  className?: string;
}

/**
 * NETWORK — participants on a sphere, and what joins them.
 *
 * The one-pager's recovery mark: a body made of relationships rather than of
 * surface. Cyan, which is the colour verification is drawn in throughout.
 */
export function NetworkGlyph({ className = '' }: Props) {
  return (
    <svg
      className={`glyph ${className}`.trim()}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3.6 5.2 9.4 7.8 17.6h8.4l2.6-8.2Z" />
      <path d="M12 3.6 12 12 7.8 17.6M12 12l4.2 5.6M12 12 5.2 9.4M12 12l6.8-2.6" />
      <circle cx="12" cy="3.6" r="1.5" className="glyph-lit" />
      <circle cx="5.2" cy="9.4" r="1.3" className="glyph-lit" />
      <circle cx="18.8" cy="9.4" r="1.3" className="glyph-lit" />
      <circle cx="7.8" cy="17.6" r="1.3" className="glyph-lit" />
      <circle cx="16.2" cy="17.6" r="1.3" className="glyph-lit" />
    </svg>
  );
}

/**
 * PRODUCT — the cube.
 *
 * The one-pager draws post-quantum signing as a cube of points, and the cube is
 * the shape this whole architecture keeps returning to: a lattice, closed up.
 * Green, as it is there.
 */
export function ProductGlyph({ className = '' }: Props) {
  return (
    <svg
      className={`glyph ${className}`.trim()}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 7.4 13 3l7 3.4v9.2L11 20l-7-3.4Z" />
      <path d="M4 7.4 11 10.8 20 6.6M11 10.8V20" />
      <circle cx="11" cy="10.8" r="1.4" className="glyph-lit" />
    </svg>
  );
}

/**
 * DATA ROOM — the stack.
 *
 * The one-pager's layers mark, which it uses for held material: things kept in
 * order, one on top of another. Gold, the colour it gives to assets under
 * custody.
 */
export function DataRoomGlyph({ className = '' }: Props) {
  return (
    <svg
      className={`glyph ${className}`.trim()}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2.8 21.5 7.4 12 12 2.5 7.4Z" />
      <path d="M2.5 12 12 16.6 21.5 12" />
      <path d="M2.5 16.6 12 21.2 21.5 16.6" />
    </svg>
  );
}
