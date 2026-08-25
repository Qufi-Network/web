'use client';

import { useEffect, useState } from 'react';
import { useExperience } from '../../experience/ExperienceState';
import type { IntroBeat } from '../../experience/ExperienceState';
import { useNetwork } from '../../experience/NetworkContext';

/**
 * Everything the visitor reads.
 *
 * Kept in the DOM rather than drawn into the scene: text stays selectable,
 * screen-readable and crisp at any resolution, and the scene stays a scene. For
 * the first twenty-four seconds this renders nothing at all except a way out —
 * the network has to be allowed to be the only thing on screen.
 */

const BEATS: IntroBeat[] = [
  'VOID',
  'FIRST_POINT',
  'RELATIONSHIPS',
  'EMERGENCE',
  'RESPONSE',
  'TRAVERSE',
  'CORE',
  'IDENTITY',
  'INVITATION',
];

interface Props {
  onEnter: () => void;
  onSkip: () => void;
}

export function IntroOverlay({ onEnter, onSkip }: Props) {
  const { capability } = useNetwork();
  const beat = useExperience((s) => s.beat);
  const phase = useExperience((s) => s.phase);
  const [stats, setStats] = useState(false);

  useEffect(() => {
    setStats(new URLSearchParams(window.location.search).has('stats'));
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip]);

  const at = BEATS.indexOf(beat);
  // Anything past the opening counts as inside. Testing for one phase meant the
  // wordmark reappeared the moment scrolling promoted the phase to NETWORK, and
  // the opening title sat on top of every chapter that followed.
  const inside = phase !== 'INTRO' && phase !== 'BOOT';
  const showIdentity = at >= BEATS.indexOf('IDENTITY') && !inside;
  const showEnter = at >= BEATS.indexOf('INVITATION') && !inside;
  const showSkip = at >= 1 && at < BEATS.indexOf('IDENTITY');
  // Arrives with the lockup rather than before it: it is a fact about the
  // network, and there is no network on screen to say it about until then.
  const showStatus = showIdentity;
  return (
    <div className="overlay">
      {/*
        One line, and it is the only claim on the opening screen that is about
        the world rather than about the page. It replaced a panel of counts
        taken from the simulation, which read as telemetry and was not.
      */}
      <p className="status" data-show={showStatus}>
        <span className="status-pulse" aria-hidden="true" />
        Testnet live
      </p>

      <div className="identity" data-show={showIdentity}>
        <p className="wordmark" aria-hidden="true">
          <span className="wordmark-a">QUFI</span>
          <span className="wordmark-b">NETWORK</span>
        </p>
        <p className="descriptor">
          A network designed for
          <br />
          the quantum era.
        </p>
        <div className="invitation" data-show={showEnter}>
          <button type="button" className="enter edge-light" data-always="true" onClick={onEnter}>
            <span className="enter-label">Enter the network</span>
            <span className="enter-rule" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* The pointer hint. Kept short and put in the corner, because the
          scroll prompt now owns the centre and is the more important of the
          two — one is a nicety, the other is how the site is navigated. */}
      <p className="instruction" data-show={phase === 'DISCOVER'}>
        Move to disturb the network
      </p>

      <button type="button" className="skip" onClick={onSkip} data-show={showSkip}>
        Skip introduction
      </button>

      {stats ? <Stats tier={capability.tier} /> : null}

      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
    </div>
  );
}

/** Opt-in with ?stats — this is instrumentation for building, not a feature. */
function Stats({ tier }: { tier: string }) {
  const fps = useExperience((s) => s.fps);
  const elapsed = useExperience((s) => s.elapsed);
  const focus = useExperience((s) => s.focusNode);
  return (
    <div className="stats">
      <span>{fps} fps</span>
      <span>{tier}</span>
      <span>t+{elapsed.toFixed(1)}s</span>
      <span>focus {focus < 0 ? '—' : focus}</span>
    </div>
  );
}
