'use client';

import { useExperience } from '../../experience/ExperienceState';
import type { IntroBeat } from '../../experience/ExperienceState';
import { QufiMark } from './QufiMark';

/**
 * The way in.
 *
 * The mark holds the centre while the network is still dark, and then the
 * visitor goes through it: as the network comes up behind, the Q scales past
 * the edges of the frame and dissolves, so entering the site reads as passing
 * through the letter rather than watching it disappear.
 *
 * It also covers the seconds where nothing is on screen yet. A considered
 * opening that starts from black is indistinguishable from a page that failed
 * to load, and the visitors who assume the second one leave before the first
 * one starts.
 */

interface Beat {
  /** How present the card is. */
  presence: number;
  /** How far through the mark the camera has travelled. */
  scale: number;
}

const BEATS: Partial<Record<IntroBeat, Beat>> = {
  VOID: { presence: 1, scale: 1 },
  // Holds dead still through the hand-over. Any movement here and the pieces,
  // which start from a standstill, would visibly not be the same object.
  FIRST_POINT: { presence: 1, scale: 1 },
  // The pieces have taken over by now; the drawn mark steps aside for them
  // rather than competing with its own shattered copy.
  RELATIONSHIPS: { presence: 0, scale: 1 },
  EMERGENCE: { presence: 0, scale: 1 },
};

export function Loader() {
  const phase = useExperience((s) => s.phase);
  const beat = useExperience((s) => s.beat);

  const state = phase === 'BOOT' ? BEATS.VOID! : (BEATS[beat] ?? { presence: 0, scale: 9 });

  return (
    <div
      className="loader"
      style={
        {
          opacity: state.presence,
          '--mark-scale': state.scale,
        } as React.CSSProperties
      }
      data-show={state.presence > 0.01}
      // Once the approach starts the words get out of the way, so the mark
      // passes over empty frame rather than over type.
      data-passing={String(state.scale > 1.2)}
      aria-live="polite"
    >
      <QufiMark variant="hero" />

      <p className="loader-welcome">You are about to enter a new quantum financial system</p>

      <p className="loader-status">
        <span>Loading</span>
        <span className="loader-dots" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <i key={i} style={{ animationDelay: `${i * 130}ms` }} />
          ))}
        </span>
      </p>
    </div>
  );
}
