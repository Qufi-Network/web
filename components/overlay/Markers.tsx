'use client';

import { useEffect, useRef } from 'react';
import { SPACES } from '../../experience/Spaces';
import { enterSpace, nav, spaceRuntime } from '../../experience/navigation';
import { stage } from '../../experience/stage';
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

      /*
       * A phone shows the four nearest and lets the map carry the rest.
       *
       * Eight names across a narrow frame is eight names written over the
       * structures they are not about — the rule below keeps them off each
       * other but cannot keep them off the network. The four largest are the
       * ones a visitor is looking at, the row of dots along the bottom reaches
       * all eight, and a legible frame is worth more than a complete one.
       */
      const room = stage.portrait > 0 ? 4 : order.length;
      let shown = 0;

      for (const i of order) {
        const slot = slots[i];
        if (slot.opacity < 0.01) continue;
        if (shown >= room) {
          slot.opacity = 0;
          continue;
        }
        const width_ = nodes[i].offsetWidth || 150;
        const clash = placed.some(
          (other) => Math.abs(other.y - slot.y) < 26 && Math.abs(other.x - slot.x) < (other.w + width_) / 2,
        );

        /*
         * And a name is not written across something it is not about.
         *
         * The rule above keeps labels off each other; this keeps them off the
         * network. A label runs to the right of its own dot, so what matters
         * is whether that run crosses another structure — which the runtime
         * already knows, because it projects every one of them for picking.
         */
        const across = spaceRuntime.some((other, j) => {
          if (j === i || other.presence < 0.2) return false;
          /*
           * Converted to pixels first.
           *
           * The runtime projects to normalised device coordinates — minus one
           * to one across the frame — and the label positions above are in
           * pixels. Comparing the two directly is a test that can never fire,
           * which is exactly what it did.
           */
          const cx = (other.screenX * 0.5 + 0.5) * width;
          const cy = (-other.screenY * 0.5 + 0.5) * height;
          const cr = (other.screenR * height) / 2;
          if (Math.abs(cy - slot.y) > Math.max(20, cr * 0.7)) return false;
          return cx > slot.x - cr * 0.6 && cx < slot.x + width_ + cr * 0.6;
        });

        if (clash || across) slot.opacity = 0;
        else {
          placed.push({ x: slot.x, y: slot.y, w: width_ });
          shown++;
        }
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
