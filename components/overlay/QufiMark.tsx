'use client';

import { QUFI_MARK } from '../../assets/mark';

/**
 * The mark, alive.
 *
 * A logo on a site about a living network should not be the one still thing on
 * the page. So the letter is used as a mask rather than as a picture: the same
 * kind of drifting light that runs the scene is animated underneath it and
 * clipped to the shape of the Q, which puts a moving network inside the letter
 * instead of next to it.
 *
 * The artwork itself still sits on top at full fidelity — the animation lights
 * it from within rather than replacing it.
 */
export function QufiMark({
  variant = 'hero',
  className = '',
  shown,
}: {
  variant?: 'hero' | 'corner';
  className?: string;
  shown?: boolean;
}) {
  return (
    <span
      className={`mark mark-${variant} ${className}`.trim()}
      // The artwork doubles as the mask, so the animated layers underneath can
      // only ever show through the shape of the letter.
      style={{ '--mark-mask': `url(${QUFI_MARK})` } as React.CSSProperties}
      data-show={shown === undefined ? undefined : String(shown)}
      aria-hidden="true"
    >
      {/* The network inside the letter. Masked to the mark, so it only ever
          shows through the shape. */}
      <span className="mark-life" />
      <span className="mark-sweep" />
      <img className="mark-art" src={QUFI_MARK} alt="" width={190} height={186} />
    </span>
  );
}
