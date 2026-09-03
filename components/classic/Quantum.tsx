'use client';

import { useEffect, useRef } from 'react';

/**
 * The network, running behind the words.
 *
 * The environment next door draws this properly, on a GPU, as the whole point
 * of the page. Here it is atmosphere: a field of nodes that drift, links that
 * appear when two of them come close enough to matter, and a signal that
 * travels the links every few seconds. Blue on white, low contrast, never
 * competing with the type in front of it.
 *
 * ## Why canvas and not SVG
 *
 * Sixty nodes with links recomputed every frame is sixty DOM elements plus a
 * few hundred more appearing and disappearing. Canvas draws the same thing in
 * one element and one pass, and nothing here needs to be hit-tested, selected
 * or read by anything.
 *
 * ## Quantum, in the only sense a drawing can be
 *
 * Nothing about a particle animation is quantum mechanics. What it can carry
 * is the feeling the physics has: nothing sits still, connection is a matter
 * of proximity rather than wiring, and a signal takes every path at once until
 * one of them arrives. The travelling pulses fork at every node they reach and
 * fade as they spread, which is the closest an honest piece of decoration gets.
 */

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** How brightly this one is glowing right now, 0 to 1. */
  lit: number;
}

interface Signal {
  from: number;
  to: number;
  /** How far along the link it has travelled, 0 to 1. */
  at: number;
  speed: number;
  life: number;
}

const NODES = 58;
/** Links are drawn between nodes closer than this, as a share of the diagonal. */
const REACH = 0.15;

export function Quantum({ dense = false }: { dense?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let reach = 0;
    let dpr = 1;
    const nodes: Node[] = [];
    const signals: Signal[] = [];

    /*
     * Measure the parent, and set both sizes.
     *
     * This measured the canvas itself and set only the bitmap. Before the
     * parent had laid out that reading was a couple of pixels, and CSS then
     * stretched a two-pixel drawing across the whole section, which is why the
     * closing band arrived with a thick blue frame smeared around its edges.
     * Now the box comes from the element that has one, the CSS size is set
     * explicitly rather than inherited from a percentage, and a zero
     * measurement is ignored rather than drawn.
     */
    const size = () => {
      const parent = canvas.parentElement;
      const box = (parent ?? canvas).getBoundingClientRect();
      if (box.width < 2 || box.height < 2) return false;

      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = box.width;
      height = box.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      reach = Math.hypot(width, height) * REACH;
      return true;
    };

    const seed = () => {
      nodes.length = 0;
      const count = Math.round(NODES * (dense ? 1.35 : 1) * Math.min(1, width / 900 + 0.35));
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          // Slow. This is a background, and a background that moves at a speed
          // you can follow is a background you end up following.
          vx: (Math.random() - 0.5) * 0.16,
          vy: (Math.random() - 0.5) * 0.16,
          r: 1.1 + Math.random() * 1.9,
          lit: 0,
        });
      }
    };

    let ready = size();
    if (ready) seed();

    /*
     * A signal takes every path at once.
     *
     * When one arrives at a node it forks along up to two more links and loses
     * a third of its life doing it, so a single emission spreads outward and
     * dies rather than bouncing around forever.
     */
    const fork = (from: number, life: number) => {
      if (life < 0.25) return;
      const near: number[] = [];
      for (let i = 0; i < nodes.length; i++) {
        if (i === from) continue;
        const dx = nodes[i].x - nodes[from].x;
        const dy = nodes[i].y - nodes[from].y;
        if (dx * dx + dy * dy < reach * reach) near.push(i);
      }
      for (let n = 0; n < Math.min(2, near.length); n++) {
        const to = near[Math.floor(Math.random() * near.length)];
        signals.push({ from, to, at: 0, speed: 0.006 + Math.random() * 0.008, life });
      }
    };

    let last = performance.now();
    let sinceSignal = 0;
    let frame = 0;

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const step = Math.min(48, now - last);
      last = now;
      if (!ready) {
        ready = size();
        if (ready) seed();
        return;
      }
      ctx.clearRect(0, 0, width, height);

      if (!still) {
        for (const node of nodes) {
          node.x += node.vx * (step / 16);
          node.y += node.vy * (step / 16);
          // Wrap rather than bounce: a bounce reads as a wall, and there is no
          // wall in the thing this is a picture of.
          if (node.x < -20) node.x = width + 20;
          if (node.x > width + 20) node.x = -20;
          if (node.y < -20) node.y = height + 20;
          if (node.y > height + 20) node.y = -20;
          node.lit *= 0.94;
        }

        sinceSignal += step;
        if (sinceSignal > 900) {
          sinceSignal = 0;
          fork(Math.floor(Math.random() * nodes.length), 1);
        }
      }

      // Links, faded by how close the two ends are.
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const d = Math.hypot(dx, dy);
          if (d > reach) continue;
          const near = 1 - d / reach;
          ctx.strokeStyle = `rgba(23, 105, 255, ${(near * 0.16).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }

      // The signals, and the light they leave behind at each end.
      for (let i = signals.length - 1; i >= 0; i--) {
        const s = signals[i];
        s.at += s.speed * (step / 16);
        const a = nodes[s.from];
        const b = nodes[s.to];
        if (!a || !b) {
          signals.splice(i, 1);
          continue;
        }

        if (s.at >= 1) {
          nodes[s.to].lit = Math.min(1, nodes[s.to].lit + s.life);
          fork(s.to, s.life * 0.66);
          signals.splice(i, 1);
          continue;
        }

        const x = a.x + (b.x - a.x) * s.at;
        const y = a.y + (b.y - a.y) * s.at;

        // A short bright tail rather than a dot, so direction is legible.
        const tail = Math.max(0, s.at - 0.22);
        const tx = a.x + (b.x - a.x) * tail;
        const ty = a.y + (b.y - a.y) * tail;
        const grad = ctx.createLinearGradient(tx, ty, x, y);
        grad.addColorStop(0, 'rgba(23, 105, 255, 0)');
        grad.addColorStop(1, `rgba(23, 105, 255, ${(s.life * 0.55).toFixed(3)})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      // The nodes themselves, on top.
      for (const node of nodes) {
        const glow = node.lit;
        ctx.fillStyle = `rgba(23, 105, 255, ${(0.2 + glow * 0.65).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r + glow * 1.6, 0, Math.PI * 2);
        ctx.fill();

        if (glow > 0.05) {
          ctx.strokeStyle = `rgba(23, 105, 255, ${(glow * 0.3).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.r + 4 + (1 - glow) * 12, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

    };

    frame = requestAnimationFrame(draw);

    const watch = new ResizeObserver(() => {
      if (size()) {
        ready = true;
        seed();
      }
    });
    watch.observe(canvas.parentElement ?? canvas);

    return () => {
      cancelAnimationFrame(frame);
      watch.disconnect();
    };
  }, [dense]);

  return <canvas className="cx-quantum" ref={ref} aria-hidden="true" />;
}
