'use client';

/**
 * Marks built out of the Q.
 *
 * These were generic line icons — a padlock, a document, a stack of bars —
 * which is to say icons that could sit on any site in this industry. Every one
 * of them now starts from the mark itself: an open ring with the tail crossing
 * its lower right, exactly as the logo draws it. What changes between them is
 * what is happening inside the ring.
 *
 * That gives a set nobody else can use. A padlock belongs to everyone; a Q with
 * a threshold quorum inside it belongs to QUFI.
 *
 * pathLength is normalised so every stroke traces at the same rate when a mark
 * draws itself on, whatever its real geometry.
 */

export type GlyphName =
  | 'verification'
  | 'custody'
  | 'settlement'
  | 'instruments'
  | 'reserves'
  | 'tokenisation'
  | 'assets'
  | 'money';

/**
 * The ring and its tail: the letterform every mark is built on. Left open at
 * the lower right so the tail reads as crossing it rather than touching it.
 */
const Q_RING = 'M22.6 22.6a9.5 9.5 0 1 0-1.1 1.1';
const Q_TAIL = 'M19.6 19.6L27 27';

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.3,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  pathLength: 1,
};

/** What is happening inside the ring, per subject. */
const INTERIOR: Record<GlyphName, string> = {
  // A threshold quorum: three signers, each tied to the others.
  verification: 'M16 10.6l4.7 8.1h-9.4z M16 10.6v8.1 M11.3 18.7l9.4-8.1 M20.7 18.7l-9.4-8.1',
  // A vault line across the ring, with the way through it gated.
  custody: 'M9.4 16h13.2 M16 12.4v7.2',
  // Two paths arriving at the same point from opposite sides.
  settlement: 'M9.6 11.4c3.4 0 3.4 4.6 6.4 4.6s3-4.6 6.4-4.6 M9.6 20.6c3.4 0 3.4-4.6 6.4-4.6',
  // Terms, stacked and bound.
  instruments: 'M11.4 12.8h9.2 M11.4 16h9.2 M11.4 19.2h5.6',
  // Something held, inside something that checks it.
  reserves: 'M16 10.8a5.2 5.2 0 1 1 0 10.4 5.2 5.2 0 0 1 0-10.4 M13.9 16.2l1.5 1.5 2.8-3.1',
  // Defined rights, expressed as one faceted object.
  tokenisation: 'M16 10.4l5.4 3.2v6.2L16 23l-5.4-3.2v-6.2z M10.6 13.6L16 16.8l5.4-3.2 M16 16.8V23',
  // A thing in the world, resolved into layers.
  assets: 'M16 10.6l6.2 3-6.2 3-6.2-3z M9.8 16.6l6.2 3 6.2-3 M9.8 19.6l6.2 3 6.2-3',
  // A closed circuit, always moving.
  money:
    'M16 10.4v11.2 M11.6 13.4c0-1.6 2-2.6 4.4-2.6s4.4 1 4.4 2.6-2 2.6-4.4 2.6-4.4 1-4.4 2.6 2 2.6 4.4 2.6 4.4-1 4.4-2.6',
};

/**
 * The marks as raw SVG strings.
 *
 * The particle mark measures these with the browser's own path geometry to work
 * out where its points should land, so the swarm and the line drawing can never
 * disagree about what a mark is.
 */
export const MARKUP: Record<string, string> = Object.fromEntries(
  (Object.keys(INTERIOR) as GlyphName[]).map((name) => [
    name,
    `<path d="${Q_RING}"/><path d="${Q_TAIL}"/><path d="${INTERIOR[name]}"/>`,
  ]),
);

export function Glyph({ name, className }: { name: GlyphName; className?: string }) {
  const interior = INTERIOR[name] ?? INTERIOR.verification;
  return (
    <svg
      className={`glyph-draw ${className ?? ''}`.trim()}
      viewBox="0 0 32 32"
      width="34"
      height="34"
      aria-hidden="true"
      focusable="false"
    >
      <path d={Q_RING} {...STROKE} />
      <path d={Q_TAIL} {...STROKE} />
      <path d={interior} {...STROKE} opacity={0.85} />
    </svg>
  );
}
