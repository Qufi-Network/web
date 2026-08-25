'use client';

import { useEffect, useRef } from 'react';
import { stage } from '../../experience/stage';

/**
 * The card arriving out of the network, and going back into it.
 *
 * A panel that fades in is a panel. A panel whose material comes in from the
 * scene around it, gathers into its outline, and then breaks apart back into
 * the same scene, reads as something the network produced — which is what every
 * reading on this site is supposed to be.
 *
 * Particles are drawn on one canvas sitting behind the card and clipped to a
 * band around its edge, so the effect happens at the boundary between the card
 * and the network rather than over the words. Deliberately restrained: this
 * runs at every reading on the site, and a firework each time would be
 * exhausting long before the visitor reached the end.
 */

interface Mote {
  /** Where on the card outline this mote belongs, 0..1 around the perimeter. */
  t: number;
  /** How far out it starts, and the direction it takes. */
  distance: number;
  angle: number;
  seed: number;
}

const COUNT = 90;

export function CardManifest({
  target,
  presence: readPresence,
}: {
  target: React.RefObject<HTMLElement | null>;
  /** How present the surface is. Defaults to the current reading. */
  presence?: () => number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const motes = useRef<Mote[]>([]);
  const frame = useRef(0);
  const held = useRef({ presence: 0, item: -1, burst: 0 });

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const ctx = element.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const list = motes.current;
    for (let i = 0; i < COUNT; i++) {
      list.push({
        t: i / COUNT,
        distance: 0.4 + Math.random() * 1.1,
        angle: Math.random() * Math.PI * 2,
        seed: Math.random(),
      });
    }

    let time = 0;
    const render = () => {
      time += 1 / 60;
      const card = target.current;
      const presence = readPresence ? readPresence() : stage.featurePresence;

      // A change of reading is what triggers the break-up: the outgoing card
      // scatters as the incoming one gathers.
      if (held.current.item !== stage.featureIndex) {
        held.current.item = stage.featureIndex;
        held.current.burst = 1;
      }
      held.current.burst = Math.max(0, held.current.burst - 0.02);

      /*
       * The surface being hidden is the authority, not presence alone.
       *
       * Presence decays over a few frames after a chapter stops having readings
       * in it, and the card itself is switched off the instant it has nothing
       * to say. Keying only on presence left the particle edge drawn around a
       * card that was no longer there.
       */
      const dismissed = card?.dataset.show === 'false';
      if (!card || dismissed || presence <= 0.01) {
        /*
         * Cleared and taken out of the compositor both.
         *
         * Clearing alone was not enough: this canvas had no positioning rule of
         * its own, so an inline left/top did nothing and it laid out in flow at
         * the top-left of the frame. Any frame that survived the clear - and one
         * always does, because the clear happens on the tick after presence
         * reaches zero - sat there as a rectangle of points in the corner of a
         * chapter that has no readings at all. Hiding it as well means a stale
         * frame can never be the thing the visitor sees.
         */
        if (element.width) ctx.clearRect(0, 0, element.width, element.height);
        element.style.visibility = 'hidden';
        frame.current = requestAnimationFrame(render);
        return;
      }
      element.style.visibility = 'visible';

      const rect = card.getBoundingClientRect();
      const pad = 70;
      const w = Math.ceil((rect.width + pad * 2) * dpr);
      const h = Math.ceil((rect.height + pad * 2) * dpr);
      if (element.width !== w || element.height !== h) {
        element.width = w;
        element.height = h;
      }
      element.style.left = `${Math.round(rect.left - pad)}px`;
      element.style.top = `${Math.round(rect.top - pad)}px`;
      element.style.width = `${rect.width + pad * 2}px`;
      element.style.height = `${rect.height + pad * 2}px`;

      ctx.clearRect(0, 0, element.width, element.height);
      ctx.globalCompositeOperation = 'lighter';

      const left = pad * dpr;
      const top = pad * dpr;
      const cw = rect.width * dpr;
      const ch = rect.height * dpr;
      const perimeter = 2 * (cw + ch);

      // Gathered when the reading is fully present, scattered otherwise — and
      // thrown outward again for a moment whenever the reading changes.
      const gather = Math.min(1, presence * 1.35);
      const scatter = Math.max(1 - gather, held.current.burst * 0.9);

      for (const mote of list) {
        // Walk the perimeter to find where this mote belongs on the outline.
        let d = mote.t * perimeter;
        let x: number;
        let y: number;
        if (d < cw) {
          x = left + d;
          y = top;
        } else if ((d -= cw) < ch) {
          x = left + cw;
          y = top + d;
        } else if ((d -= ch) < cw) {
          x = left + cw - d;
          y = top + ch;
        } else {
          x = left;
          y = top + ch - (d - cw);
        }

        const travel = scatter * mote.distance * 62 * dpr;
        x += Math.cos(mote.angle) * travel;
        y += Math.sin(mote.angle) * travel;
        // A little drift, so a settled edge is never perfectly static.
        x += Math.sin(time * 1.2 + mote.seed * 33) * 1.4 * dpr;
        y += Math.cos(time * 1.0 + mote.seed * 21) * 1.4 * dpr;

        const alpha = (0.14 + gather * 0.5) * (1 - scatter * 0.35) * presence;
        if (alpha <= 0.01) continue;

        ctx.beginPath();
        ctx.arc(x, y, (0.6 + gather * 0.9) * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(150, 215, 255, ${alpha})`;
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      frame.current = requestAnimationFrame(render);
    };

    frame.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame.current);
  }, [target, readPresence]);

  return <canvas ref={canvas} className="card-manifest" aria-hidden="true" />;
}
