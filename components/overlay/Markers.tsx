'use client';

import { useEffect, useRef } from 'react';
import { SPACES } from '../../experience/Spaces';
import { enterSpace, nav, spaceRuntime } from '../../experience/navigation';
import { toneOf } from './tone';

/**
 * Each structure carries its own name, in the frame, at its own position.
 *
 * This is the closest thing the site has to navigation, and it is deliberately
 * not a list: a label is somewhere because the thing it names is somewhere.
 * Reading the global view tells you both what is here and where it is, and the
 * label is the target as much as the structure is — which is what makes the
 * whole thing work on a phone, where there is no hover to discover anything by.
 *
 * Positioned from a frame loop rather than from React. The numbers change sixty
 * times a second, and re-rendering eight components to move a label is work
 * nobody asked for.
 */
export function Markers() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    const nodes = Array.from(host.querySelectorAll<HTMLButtonElement>('.marker'));
    let frame = 0;

    // Reused between frames. Eight labels is not worth allocating for.
    const placed: Array<{ x: number; y: number; w: number }> = [];
    const slots = nodes.map(() => ({ x: 0, y: 0, opacity: 0, order: 0 }));

    const tick = () => {
      frame = requestAnimationFrame(tick);
      const snap = nav.get();
      const width = window.innerWidth;
      const height = window.innerHeight;

      for (let i = 0; i < nodes.length; i++) {
        const runtime = spaceRuntime[i];
        const slot = slots[i];

        // Off screen, behind the camera, or standing in a different space.
        const relevant = snap.active < 0 || snap.active === i;
        let opacity = runtime.onScreen * runtime.presence * (relevant ? 1 : 0);
        // A structure too small to be a place is not worth naming, and one that
        // fills the frame does not need naming.
        opacity *= Math.min(1, Math.max(0, (runtime.screenR - 0.014) * 26));
        opacity *= 1 - Math.min(1, Math.max(0, (runtime.screenR - 0.62) * 2.2));
        // Only in the open. Inside a space the coordinate already names where
        // the visitor is, and a second label floating over the structure they
        // are standing in is furniture, not information.
        if (snap.mode !== 'ORBIT') opacity = 0;

        // The label sits off the shoulder of the structure rather than on it, so
        // it never competes with the thing it is naming — and on whichever
        // shoulder keeps it inside the frame, because a name half off the right
        // edge is worse than no name at all.
        const radius = (runtime.screenR * height) / 2;
        const centre = (runtime.screenX * 0.5 + 0.5) * width;
        const reach = Math.min(radius * 0.72, 120) + 10;
        const span = nodes[i].offsetWidth || 150;
        const flip = centre + reach + span > width - 12;
        slot.x = flip ? Math.max(12, centre - reach - span) : centre + reach;
        slot.y = (-runtime.screenY * 0.5 + 0.5) * height - Math.min(radius * 0.5, 90);
        slot.opacity = opacity;
        slot.order = i;
      }

      /*
       * Two labels in the same place are worse than one label missing.
       *
       * The nearest structure keeps its name and anything overlapping it gives
       * its up — the visitor can still reach it from the map, and a legible
       * frame is worth more than a complete one. Sorted by projected size, so
       * "nearest" means what it looks like rather than what the maths says.
       */
      placed.length = 0;
      const order = slots.map((s) => s.order).sort((a, b) => spaceRuntime[b].screenR - spaceRuntime[a].screenR);

      for (const i of order) {
        const slot = slots[i];
        if (slot.opacity < 0.01) continue;
        const width_ = nodes[i].offsetWidth || 150;
        const clash = placed.some(
          (other) => Math.abs(other.y - slot.y) < 26 && Math.abs(other.x - slot.x) < (other.w + width_) / 2,
        );
        if (clash) slot.opacity = 0;
        else placed.push({ x: slot.x, y: slot.y, w: width_ });
      }

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const slot = slots[i];
        if (slot.opacity < 0.01) {
          if (node.style.opacity !== '0') {
            node.style.opacity = '0';
            node.style.pointerEvents = 'none';
          }
          continue;
        }
        node.style.transform = `translate3d(${Math.round(slot.x)}px, ${Math.round(slot.y)}px, 0)`;
        node.style.opacity = slot.opacity.toFixed(3);
        node.style.pointerEvents = slot.opacity > 0.4 ? 'auto' : 'none';
        node.dataset.hover = String(snap.hover === i);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="markers" ref={container}>
      {SPACES.map((space, index) => (
        <button
          key={space.id}
          type="button"
          className="marker"
          style={{ '--tone': toneOf(space) } as React.CSSProperties}
          onClick={() => enterSpace(index)}
        >
          <i className="marker-dot" aria-hidden="true" />
          <span className="marker-index">{space.index}</span>
          <span>{space.nav}</span>
        </button>
      ))}
    </div>
  );
}
