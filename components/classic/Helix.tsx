'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * The helix behind the hero.
 *
 * Twenty-eight rings of points, projected through a pinhole camera and rotated
 * against each other, so what reads as a solid double helix is really a stack
 * of circles disagreeing about phase. Points travel the rings; the pointer
 * pulls at whatever is near it and lets go slowly.
 *
 * ## What was changed from the reference
 *
 * The version this came from was written for a shadcn project: Tailwind
 * classes, `cn` from `@/lib/utils`, `lucide-react` for its icons, and a header
 * of controls for switching topology and freezing the animation. None of that
 * exists here and none of it belongs on a hero, so what is kept is the part
 * that matters, which is the geometry:
 *
 *   - one topology rather than three, because a hero is not a demo
 *   - no chrome, no buttons, no crosshair cursor
 *   - QuFi blue on white rather than white on near-black, with depth carried
 *     by how far each ring is from the camera
 *   - `clearRect` rather than filling the background, so the hero's own wash
 *     shows through instead of the canvas painting over it
 *   - it stops when it is off screen, and never starts if the visitor has
 *     asked for less motion
 */

interface FiberPoint {
  vy: number;
  excitation: number;
}

interface FiberRing {
  points: FiberPoint[];
  radius: number;
  yOffset: number;
  rotationSpeed: number;
  angle: number;
  harmonicOffset: number;
}

interface Particle {
  ring: number;
  at: number;
  speed: number;
  size: number;
}

const RINGS = 28;
const PER_RING = 96;
const PARTICLES = 45;

/**
 * How the lines are coloured.
 *
 * `paper` is the hero: brand blue on white, depth carried by getting paler
 * with distance. `onColour` is a card that is already blue, where the same
 * depth has to be carried by white instead, because a blue line on a blue card
 * is not a line.
 */
export type Scheme = 'paper' | 'onColour';

/** The pinhole. Bigger camera distance flattens it; smaller exaggerates it. */
const FOV = 600;
const CAMERA = 550;

export function Helix({
  className,
  scheme = 'paper',
  density = 1,
}: {
  className?: string;
  scheme?: Scheme;
  /**
   * How much of the full construction to draw, 0 to 1.
   *
   * Three helices on one screen is three times the arithmetic, and a card two
   * hundred pixels tall does not need twenty-eight rings to read as a helix.
   * Halving this halves both the rings and the points on each.
   */
  density?: number;
}) {
  const hold = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLCanvasElement>(null);

  const pointer = useRef({ x: -2000, y: -2000, toX: -2000, toY: -2000, reach: 220 });
  const rings = useRef<FiberRing[]>([]);
  const dust = useRef<Particle[]>([]);
  const box = useRef({ width: 0, height: 0 });
  const awake = useRef(true);

  const build = useCallback(
    (width: number, height: number) => {
    const count = Math.max(8, Math.round(RINGS * density));
    const per = Math.max(36, Math.round(PER_RING * density));
    const made: FiberRing[] = [];

    for (let r = 0; r < count; r++) {
      const along = r / count;
      const points: FiberPoint[] = [];
      for (let p = 0; p < per; p++) points.push({ vy: 0, excitation: 0 });

      made.push({
        points,
        // Rings grow outward as they descend, so the stack reads as a form
        // rather than a cylinder.
        radius: Math.min(width, height) * 0.46 * (0.4 + along * 0.6),
        yOffset: (along - 0.5) * (height * 0.45),
        // Alternating direction is what makes the crossings look woven.
        rotationSpeed: (r % 2 === 0 ? 1 : -1) * (0.002 + along * 0.0025),
        angle: (r * Math.PI) / count,
        harmonicOffset: r * 0.2,
      });
    }
    rings.current = made;

    const grains: Particle[] = [];
    for (let i = 0; i < Math.round(PARTICLES * density); i++) {
      grains.push({
        ring: Math.floor(Math.random() * count),
        at: Math.random(),
        speed: (Math.random() * 0.003 + 0.001) * (Math.random() > 0.5 ? 1 : -1),
        size: Math.random() * 1.5 + 1.5,
      });
    }
    dust.current = grains;
    },
    [density],
  );

  useEffect(() => {
    const hull = hold.current;
    const canvas = ref.current;
    if (!hull || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const onColour = scheme === 'onColour';

    const size = () => {
      const rect = hull.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      box.current = { width: rect.width, height: rect.height };
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build(rect.width, rect.height);
    };

    const watch = new ResizeObserver(size);
    watch.observe(hull);

    /* Nothing runs while it is off screen. */
    const seen = new IntersectionObserver(
      ([entry]) => {
        awake.current = entry.isIntersecting;
      },
      { threshold: 0 },
    );
    seen.observe(hull);

    let frame = 0;
    let time = 0;

    const render = () => {
      frame = requestAnimationFrame(render);
      if (!awake.current) return;

      const { width, height } = box.current;
      if (!width || !height) return;

      if (!still) time += 0.012;
      const eye = pointer.current;
      eye.x += (eye.toX - eye.x) * 0.1;
      eye.y += (eye.toY - eye.y) * 0.1;

      ctx.clearRect(0, 0, width, height);
      const midX = width / 2;
      const midY = height / 2;

      for (let r = 0; r < rings.current.length; r++) {
        const ring = rings.current[r];
        if (!still) ring.angle += ring.rotationSpeed;

        const points = ring.points;
        const many = points.length;

        ctx.beginPath();
        let firstX = 0;
        let firstY = 0;
        let excited = 0;

        for (let p = 0; p < many; p++) {
          const point = points[p];
          const theta = (p / many) * Math.PI * 2 + ring.angle;

          const x3 = Math.cos(theta) * ring.radius;
          const z3 = Math.sin(theta) * ring.radius;
          // The wave that turns a stack of circles into a helix.
          const y3 = ring.yOffset + Math.sin(theta * 2 + time * 2 + ring.harmonicOffset) * 45;

          const scale = FOV / (CAMERA + z3);
          const px = midX + x3 * scale;
          const py = midY + (y3 + point.vy) * scale;

          const dx = px - eye.x;
          const dy = py - eye.y;
          const away = Math.hypot(dx, dy);

          if (away < eye.reach && away > 0) {
            const near = 1 - away / eye.reach;
            const want = Math.sin(theta + time) * near * 15;
            point.vy += (want - point.vy) * 0.1;
            point.excitation = Math.max(point.excitation, near);
          } else {
            point.vy *= 0.92;
          }

          point.excitation *= 0.92;
          excited += point.excitation;

          if (p === 0) {
            firstX = px;
            firstY = py;
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }

        ctx.lineTo(firstX, firstY);
        excited /= many;

        /*
         * Depth as colour rather than as blur.
         *
         * Near rings take the deep brand blue and far ones the pale signal
         * blue, which reads as distance on white the way a value shift reads
         * as distance on black.
         */
        const depth = r / rings.current.length;

        if (onColour) {
          const alpha = (0.14 + depth * 0.3) * (still ? 0.6 : 1);
          if (excited > 0.05) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.95, 0.45 + excited * 0.55).toFixed(3)})`;
            ctx.lineWidth = 1.4 + excited * 1.6;
          } else {
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.9;
          }
        } else {
          const alpha = (0.26 + depth * 0.5) * (still ? 0.6 : 1);
          if (excited > 0.05) {
            ctx.strokeStyle = `rgba(11, 72, 196, ${Math.min(0.95, 0.4 + excited * 0.6).toFixed(3)})`;
            ctx.lineWidth = 1.4 + excited * 1.6;
          } else {
            const mix = Math.round(23 + depth * 53);
            const g = Math.round(105 + depth * 96);
            ctx.strokeStyle = `rgba(${mix}, ${g}, 255, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.9;
          }
        }
        ctx.stroke();
      }

      /* The points travelling the rings. */
      for (const grain of dust.current) {
        if (!still) grain.at = (grain.at + grain.speed + 1) % 1;
        const ring = rings.current[grain.ring];
        if (!ring) continue;

        const many = ring.points.length;
        const exact = grain.at * many;
        const a = Math.floor(exact) % many;
        const blend = exact - Math.floor(exact);

        const t1 = (a / many) * Math.PI * 2 + ring.angle;
        const t2 = (((a + 1) % many) / many) * Math.PI * 2 + ring.angle;

        const x3 = Math.cos(t1) * ring.radius + (Math.cos(t2) - Math.cos(t1)) * ring.radius * blend;
        const z3 = Math.sin(t1) * ring.radius + (Math.sin(t2) - Math.sin(t1)) * ring.radius * blend;
        const y3 = ring.yOffset + Math.sin(t1 * 2 + time * 2 + ring.harmonicOffset) * 45;

        const scale = FOV / (CAMERA + z3);
        const px = midX + x3 * scale;
        const py = midY + y3 * scale;

        const close = Math.hypot(px - eye.x, py - eye.y) < eye.reach;

        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.8, grain.size * scale), 0, Math.PI * 2);
        // White with a blue rim normally, solid brand blue under the pointer:
        // the inversion is what makes the field feel touched rather than
        // merely watched.
        ctx.fillStyle = onColour ? '#ffffff' : close ? '#1769ff' : '#ffffff';
        ctx.globalAlpha = onColour ? (close ? 1 : 0.72) : 1;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 0.7;
        ctx.strokeStyle = onColour
          ? 'rgba(255,255,255,0.5)'
          : close
            ? 'rgba(11,72,196,0.75)'
            : 'rgba(23,105,255,0.55)';
        ctx.stroke();
      }
    };

    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      watch.disconnect();
      seen.disconnect();
    };
  }, [build, scheme]);

  const move = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = hold.current?.getBoundingClientRect();
    if (!rect) return;
    pointer.current.toX = event.clientX - rect.left;
    pointer.current.toY = event.clientY - rect.top;
  };

  const leave = () => {
    pointer.current.toX = -2000;
    pointer.current.toY = -2000;
  };

  return (
    <div
      className={className ? `cx-helix ${className}` : 'cx-helix'}
      ref={hold}
      onMouseMove={move}
      onMouseLeave={leave}
      aria-hidden="true"
    >
      <canvas ref={ref} />
    </div>
  );
}
