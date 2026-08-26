'use client';

import { CENTRE } from '../../experience/Spaces';
import { returnToNetwork, useNav } from '../../experience/navigation';

/**
 * The middle of the network.
 *
 * Reached by travelling into the Core rather than by scrolling to the bottom of
 * anything, which is the whole reason it is worth reaching. Four short lines,
 * and then the only way on from it is back into the network — this is a place
 * in the site, not the end of it.
 */
export function Centre() {
  const revealed = useNav((s) => s.revealed);
  const active = useNav((s) => s.active);
  const mode = useNav((s) => s.mode);
  const shown = revealed && active === 0 && mode === 'INSIDE';

  return (
    <div className="centre" data-show={String(shown)} aria-hidden={!shown}>
      <div className="centre-inner">
        <p className="centre-mark">{CENTRE.mark}</p>
        <p className="centre-title">{CENTRE.title}</p>
        <p className="centre-statement">{CENTRE.statement}</p>
        <p className="centre-body">{CENTRE.body}</p>
        <button
          type="button"
          className="centre-enter"
          onClick={returnToNetwork}
          tabIndex={shown ? 0 : -1}
        >
          Enter the QuFi network
        </button>
      </div>
    </div>
  );
}
