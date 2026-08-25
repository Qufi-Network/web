'use client';

import { useCallback } from 'react';
import { useExperience } from '../../experience/ExperienceState';
import { QufiMark } from './QufiMark';

/**
 * The mark that stays.
 *
 * Everything else on this site comes and goes with the descent; this is the one
 * fixed thing, so a visitor twelve chapters down still knows whose network they
 * are inside. It arrives once the opening has handed over to the network and
 * never leaves after that.
 *
 * It is also the way back. On a site with no navigation the logo is the only
 * affordance a visitor will reliably try when they want to start again, so it
 * has to be the one that works.
 */
export function CornerMark() {
  const phase = useExperience((s) => s.phase);
  const beat = useExperience((s) => s.beat);

  // Not during the opening: the hero mark owns the frame until the visitor has
  // passed through it, and two of them at once is one too many.
  const shown =
    phase !== 'BOOT' &&
    (phase === 'DISCOVER' ||
      phase === 'NETWORK' ||
      beat === 'TRAVERSE' ||
      beat === 'CORE' ||
      beat === 'IDENTITY' ||
      beat === 'INVITATION');

  const toStart = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <button
      type="button"
      className="mark-home"
      data-show={String(shown)}
      onClick={toStart}
      aria-label="Back to the start of the network"
    >
      <QufiMark variant="corner" shown={shown} />
    </button>
  );
}
