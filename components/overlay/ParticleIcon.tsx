'use client';

import { useEffect, useRef } from 'react';
import { MARKUP, type GlyphName } from './Glyph';

/**
 * Icons that assemble out of particles onto a real shape.
 *
 * The first version of this scattered points over a deformed shell, which was
 * atmospheric and completely illegible — a blob that never resolved into
 * anything you could name. The fix is not fewer particles, it is giving them
 * somewhere definite to go: the points are sampled along the actual outline of
 * the drawn mark, so the swarm always lands on a shape a person can read.
 *
 * The path sampling uses the browser's own geometry rather than a hand-built
 * table of coordinates, so the particle form and the line drawing can never
 * disagree about what the icon is.
 */

export type IconShape = GlyphName;

/** Accent per subject, matching the colour its journey wears. */
const COLOUR: Record<string, [number, number, number]> = {
  verification: [124, 205, 255],
  custody: [127, 180, 255],
  settlement: [185, 140, 255],
  instruments: [127, 180, 255],
  reserves: [79, 230, 168],
  tokenisation: [255, 179, 82],
  assets: [255, 179, 82],
  money: [79, 230, 168],
};

interface Target {
  x: number;
  y: number;
}

/**
 * Points along the outline of a mark, in -1..1.
 *
 * Rendered into a detached SVG purely to be measured; nothing is ever shown.
 */
function sampleOutline(shape: GlyphName, count: number): Target[] {
  if (typeof document === 'undefined') return [];

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 32 32');
  svg.style.position = 'absolute';
  svg.style.width = '0';
  svg.style.height = '0';
  svg.style.overflow = 'hidden';
  svg.innerHTML = MARKUP[shape] ?? '';
  document.body.appendChild(svg);

  const shapes = Array.from(
    svg.querySelectorAll<SVGGeometryElement>('path, circle, rect, ellipse'),
  );
  const lengths = shapes.map((element) => {
    try {
      return element.getTotalLength();
    } catch {
      return 0;
    }
  });
  const total = lengths.reduce((sum, length) => sum + length, 0);

  const targets: Target[] = [];
  if (total > 0) {
    for (let i = 0; i < shapes.length; i++) {
      // Points are shared out by length, so a long arc gets more of them than a
      // short tick and the outline comes out evenly dense.
      const share = Math.max(2, Math.round((lengths[i] / total) * count));
      for (let k = 0; k < share; k++) {
        try {
          const point = shapes[i].getPointAtLength((lengths[i] * k) / share);
          targets.push({ x: point.x / 16 - 1, y: point.y / 16 - 1 });
        } catch {
          /* element has no measurable geometry; skip it */
        }
      }
    }
  }

  svg.remove();
  return targets;
}

interface Particle {
  x: number;
  y: number;
  tx: number;
  ty: number;
  seed: number;
  delay: number;
}

export function ParticleIcon({
  shape,
  size = 42,
  className = '',
}: {
  shape: IconShape;
  size?: number;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const frame = useRef(0);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const ctx = element.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    element.width = size * dpr;
    element.height = size * dpr;

    const targets = sampleOutline(shape, 150);
    if (targets.length === 0) return;

    // Particles persist between subjects, so changing shape sends the same
    // swarm somewhere new rather than replacing it.
    const list = particles.current;
    while (list.length < targets.length) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.6 + Math.random() * 1.4;
      list.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        tx: 0,
        ty: 0,
        seed: Math.random(),
        delay: Math.random() * 0.45,
      });
    }
    list.length = targets.length;
    for (let i = 0; i < list.length; i++) {
      list[i].tx = targets[i].x;
      list[i].ty = targets[i].y;
      list[i].delay = (i / list.length) * 0.4 + Math.random() * 0.16;
    }

    const [r, g, b] = COLOUR[shape] ?? COLOUR.verification;
    let time = 0;

    const render = () => {
      time += 1 / 60;
      ctx.clearRect(0, 0, element.width, element.height);
      // Source-over, not additive: overlapping points on a dense outline blow
      // out to a white mass under additive blending, which is exactly the blob
      // this is meant to avoid.
      ctx.globalCompositeOperation = 'source-over';

      const half = (size * dpr) / 2;
      const scale = half * 0.78;

      for (const p of list) {
        const started = Math.max(0, time - p.delay);
        const pull = Math.min(0.16, started * 0.22);
        p.x += (p.tx - p.x) * pull;
        p.y += (p.ty - p.y) * pull;

        // Settled points hold station with a breath; unsettled ones are still
        // travelling and stay dim, so the shape emerges rather than fading up.
        const distance = Math.hypot(p.tx - p.x, p.ty - p.y);
        const settled = Math.max(0, 1 - distance * 2.4);
        const breath = settled * 0.02;
        const x = half + (p.x + Math.sin(time * 1.3 + p.seed * 29) * breath) * scale;
        const y = half + (p.y + Math.cos(time * 1.1 + p.seed * 17) * breath) * scale;

        ctx.beginPath();
        ctx.arc(x, y, (0.5 + settled * 0.7) * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.2 + settled * 0.75})`;
        ctx.fill();
      }

      frame.current = requestAnimationFrame(render);
    };

    frame.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame.current);
  }, [shape, size]);

  return (
    <canvas
      ref={canvas}
      className={`particle-icon ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
