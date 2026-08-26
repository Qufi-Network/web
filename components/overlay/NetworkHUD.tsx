'use client';

import { coordinate, returnToNetwork, useNav } from '../../experience/navigation';
import { SPACES } from '../../experience/Spaces';
import { Constellation } from './Constellation';
import { Markers } from './Markers';
import { SpaceLayer } from './SpaceLayer';
import { QufiMark } from './QufiMark';
import { SiteLinks } from './SiteLinks';
import { QUFI_WORD, QUFI_WORD_SIZE } from '../../assets/word';

/**
 * The whole interface.
 *
 * A mark, a coordinate, the names of the places, a map, and a progress rail.
 * There is no navigation bar because there is nowhere to navigate to: the
 * network is the site, the wheel moves along one continuous route through all
 * of it, and this layer only ever says where on that route the visitor is and
 * what else is on it.
 *
 * Everything in here is a button or a readout. Nothing is a hover state, and
 * nothing is only reachable with a pointer.
 */
export function NetworkHUD() {
  const snap = useNav((s) => s);
  const shown = snap.mode !== 'BOOT' && snap.mode !== 'INTRO';
  const inside = snap.active >= 0;
  const space = snap.active >= 0 ? SPACES[snap.active] : null;

  return (
    <div className="hud" data-show={String(shown)} data-inside={String(inside)} aria-hidden={!shown}>
      <button
        type="button"
        className="hud-mark"
        onClick={returnToNetwork}
        aria-label="Return to the network"
        tabIndex={shown ? 0 : -1}
      >
        <QufiMark variant="corner" shown />
        {/*
          The wordmark as artwork rather than as set type. The letterforms in the
          logo are not the letterforms of the interface typeface, and a lockup
          that is nearly the logo is worse than one that plainly is not.
        */}
        <img
          className="hud-mark-word"
          src={QUFI_WORD}
          alt=""
          width={QUFI_WORD_SIZE.width}
          height={QUFI_WORD_SIZE.height}
        />
      </button>

      <SiteLinks tabbable={shown} />

      <p className="coordinate" aria-live="polite">
        {space ? <span className="coordinate-index">{space.index}</span> : null}
        <span className="coordinate-path">{coordinate(snap)}</span>
      </p>

      <Markers />
      <Constellation />
      <SpaceLayer />

      {/*
        Where the visitor is on the route, and the one control that is not the
        wheel. The rail is always there because the route always is: scrolling
        does not stop at the edge of a space, it carries on into the next one,
        and the rail is the only thing on screen that says how much of the
        network is still ahead.
      */}
      <div className="travel">
        {inside ? (
          <button type="button" className="back" onClick={returnToNetwork}>
            <i className="back-arrow" aria-hidden="true" />
            The whole network
          </button>
        ) : (
          <p className="travel-hint">Scroll through the network</p>
        )}
        <div className="travel-rail" aria-hidden="true">
          <i style={{ left: `${Math.max(0, Math.min(1, snap.travel)) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
