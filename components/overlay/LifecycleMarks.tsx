'use client';

import { useEffect, useRef } from 'react';
import type { Mark } from '../../experience/lifecycle/journey';

/**
 * What you are looking at, said next to it.
 *
 * A walkthrough that shows six shapes and describes them in a column asks the
 * visitor to work out which is which. These name each one, pinned to the thing
 * itself, present while it is the subject and gone afterwards.
 *
 * Positioned from a frame loop rather than from React: the numbers change sixty
 * times a second, and re-rendering eight components to move a label is work
 * nobody asked for.
 */
export function LifecycleMarks({ marks }: { marks: Mark[] }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = host.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLParagraphElement>('.life-mark-label'));
    let frame = 0;

    const tick = () => {
      frame = requestAnimationFrame(tick);
      const width = window.innerWidth;
      const height = window.innerHeight;

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const mark = marks[i];
        if (mark.on < 0.01) {
          if (node.style.opacity !== '0') {
            node.style.opacity = '0';
          }
          continue;
        }
        const x = (mark.x * 0.5 + 0.5) * width;
        const y = (-mark.y * 0.5 + 0.5) * height;
        node.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
        node.style.opacity = mark.on.toFixed(3);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [marks]);

  return (
    <div className="life-marks" ref={host} aria-hidden="true">
      {marks.map((mark) => (
        <p
          key={mark.id}
          className="life-mark-label"
          data-id={mark.id}
          style={mark.tone ? { color: mark.tone } : undefined}
        >
          <i />
          {mark.text}
        </p>
      ))}
    </div>
  );
}
