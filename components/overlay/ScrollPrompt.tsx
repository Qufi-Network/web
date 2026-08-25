'use client';

import { useEffect, useRef } from 'react';
import { useExperience } from '../../experience/ExperienceState';
import { stage } from '../../experience/stage';

/**
 * Telling the visitor the journey is downward.
 *
 * The whole site is one descent, and nothing about a full-bleed canvas suggests
 * that scrolling does anything at all — the page looks like a fixed scene, so a
 * visitor who has just accepted the invitation has no reason to try. Without
 * this prompt the twelve chapters below simply never get found.
 *
 * It leaves as soon as it has been obeyed, and it is driven from the stage
 * rather than React state so watching the scroll costs nothing.
 */
export function ScrollPrompt() {
  const phase = useExperience((s) => s.phase);
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const armed = phase === 'DISCOVER' || phase === 'NETWORK';

  useEffect(() => {
    if (!armed) return;
    const element = root.current;
    if (!element) return;

    const tick = () => {
      // Gone once the visitor is a fifth of the way into the first chapter,
      // which is far enough to be certain the gesture was deliberate.
      element.dataset.show = String(stage.depth < 0.2);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [armed]);

  if (!armed) return null;

  return (
    <div className="scroll-prompt" ref={root} data-show="true">
      <p>Scroll to begin the QUFI journey</p>
      <span className="scroll-rule" aria-hidden="true">
        <span className="scroll-run" />
      </span>
    </div>
  );
}
