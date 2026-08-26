'use client';

import { BOOT_LINES } from '../../experience/Opening';
import { useNav } from '../../experience/navigation';

/**
 * Entering QUFI.
 *
 * Two layers that share a life: the construction readout in the corner, and the
 * two lines the network says once it is up. Neither is a loading screen — the
 * network is already being built behind both of them, and the readout is a
 * description of that rather than a substitute for it.
 */
export function Boot({ onSkip }: { onSkip: () => void }) {
  const boot = useNav((s) => s.boot);
  const title = useNav((s) => s.title);
  const mode = useNav((s) => s.mode);
  const opening = mode === 'BOOT' || mode === 'INTRO';

  return (
    <>
      {opening ? (
        <div className="boot" aria-live="polite">
          {BOOT_LINES.map((line, index) => (
            <p
              key={line}
              className="boot-line"
              data-state={index < boot ? 'done' : index === boot ? 'active' : 'waiting'}
            >
              <i className="boot-tick" aria-hidden="true" />
              {line}
            </p>
          ))}
        </div>
      ) : null}

      <div className="opening" data-title={title} aria-hidden={title < 0}>
        <div className="opening-inner">
          <p className="opening-mark">QUFI</p>
          <p className="opening-line">The verification layer for the post-quantum economy</p>
        </div>
      </div>

      {opening ? (
        <button type="button" className="skip-opening" onClick={onSkip}>
          Skip
        </button>
      ) : null}
    </>
  );
}
