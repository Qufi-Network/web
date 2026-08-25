'use client';

import { useEffect, useRef } from 'react';
import { stage } from '../../experience/stage';

/**
 * Draws the words that belong to nodes.
 *
 * The positions are computed in the render loop; this only moves elements to
 * match. Transform and opacity are the only properties touched, so the whole
 * layer stays on the compositor and never triggers layout.
 */
export function NodeLabels({ active }: { active: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  useEffect(() => {
    if (!active) return;
    const element = root.current;
    if (!element) return;

    const tick = () => {
      const slots = stage.labels;
      for (let i = 0; i < element.children.length; i++) {
        const child = element.children[i] as HTMLElement;
        const slot = slots[i];
        if (!slot || slot.opacity <= 0.002) {
          child.style.opacity = '0';
        } else {
          child.style.opacity = slot.opacity.toFixed(3);
          child.style.transform = `translate3d(${slot.x.toFixed(1)}px, ${slot.y.toFixed(1)}px, 0)`;
          if (child.textContent !== slot.text) child.textContent = slot.text;
        }
      }
      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [active]);

  if (!active) return null;

  return (
    <div className="node-labels" ref={root} aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className="node-label" />
      ))}
    </div>
  );
}
