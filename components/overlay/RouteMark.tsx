'use client';

import { useEffect, useRef } from 'react';

/**
 * The mark on a card.
 *
 * Not an icon of a thing — no ingots, no coins, no handshakes, no vaults. Each
 * subject is a different kind of movement, so each mark is that movement drawn
 * as a live figure, and the figure only exists while it is moving.
 *
 * Animated on a canvas rather than as CSS on an SVG, because these are motions
 * rather than shapes with motion applied to them.
 */

export type RouteShape =
  | 'assets'
  | 'money'
  | 'settlement'
  | 'verification'
  | 'custody'
  | 'instruments'
  | 'reserves'
  | 'tokenisation';

const COLOUR: Record<RouteShape, string> = {
  assets: '255, 179, 82',
  money: '79, 230, 168',
  settlement: '185, 140, 255',
  verification: '124, 205, 255',
  custody: '127, 180, 255',
  instruments: '127, 180, 255',
  reserves: '79, 230, 168',
  tokenisation: '255, 179, 82',
};

/**
 * One figure per subject.
 *
 * Same vocabulary throughout — a thin stroke, round caps, one colour, and a
 * motion that never settles — so the eight read as one family. What differs is
 * what the motion is *of*: each subject is drawn as the thing it does, which is
 * the only way eight marks can be told apart without becoming eight styles.
 */
type Draw = (
  ctx: CanvasRenderingContext2D,
  time: number,
  mid: number,
  r: number,
  dpr: number,
  rgb: string,
) => void;

function line(ctx: CanvasRenderingContext2D, rgb: string, alpha: number) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = `rgb(${rgb})`;
}

function dot(
  ctx: CanvasRenderingContext2D,
  rgb: string,
  x: number,
  y: number,
  radius: number,
  alpha: number,
) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${rgb})`;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

const FIGURES: Record<RouteShape, Draw> = {
  /* Planes settling one onto another, over and over. */
  assets: (ctx, time, mid, r, dpr, rgb) => {
    for (let i = 0; i < 3; i++) {
      const phase = (time * 0.45 + i / 3) % 1;
      const drop = phase < 0.55 ? 1 - phase / 0.55 : 0;
      const y = mid + (i - 1) * r * 0.62 - drop * r * 1.5;
      const width = r * (0.92 - Math.abs(i - 1) * 0.16);
      line(ctx, rgb, 0.35 + (1 - drop) * 0.6);
      ctx.beginPath();
      ctx.moveTo(mid - width, y);
      ctx.lineTo(mid, y - r * 0.3);
      ctx.lineTo(mid + width, y);
      ctx.lineTo(mid, y + r * 0.3);
      ctx.closePath();
      ctx.stroke();
    }
  },

  /* A closed circuit, with value running round it and coming back. */
  money: (ctx, time, mid, r, dpr, rgb) => {
    line(ctx, rgb, 0.32);
    ctx.beginPath();
    ctx.ellipse(mid, mid, r, r * 0.62, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const a = time * 1.5 + (i / 3) * Math.PI * 2;
      dot(ctx, rgb, mid + Math.cos(a) * r, mid + Math.sin(a) * r * 0.62, 2.1 * dpr, 0.9);
    }
  },

  /* Two legs approaching one point, arriving, and holding there. */
  settlement: (ctx, time, mid, r, dpr, rgb) => {
    const cycle = (time * 0.5) % 1;
    const approach = Math.min(1, cycle / 0.62);
    for (const side of [-1, 1]) {
      const x = mid + side * r * (1 - approach * 0.86);
      line(ctx, rgb, 0.45 + approach * 0.45);
      ctx.beginPath();
      ctx.moveTo(mid + side * r, mid - r * 0.5 * (1 - approach));
      ctx.quadraticCurveTo(mid + side * r * 0.5, mid, x, mid);
      ctx.stroke();
      dot(ctx, rgb, x, mid, 2 * dpr, 0.9);
    }
    if (cycle > 0.62) {
      const pulse = (cycle - 0.62) / 0.38;
      line(ctx, rgb, (1 - pulse) * 0.85);
      ctx.beginPath();
      ctx.arc(mid, mid, r * 0.3 + pulse * r * 0.8, 0, Math.PI * 2);
      ctx.stroke();
    }
  },

  /*
   * Independent checks on one thing.
   *
   * Four marks around a centre light one after another rather than together —
   * together would be one authority signing four times, which is the opposite
   * of what the word means. The centre confirms only once the last is lit.
   */
  verification: (ctx, time, mid, r, dpr, rgb) => {
    const cycle = (time * 0.42) % 1;
    line(ctx, rgb, 0.22);
    ctx.beginPath();
    ctx.arc(mid, mid, r * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (i / 4) * Math.PI * 2;
      const x = mid + Math.cos(a) * r * 0.92;
      const y = mid + Math.sin(a) * r * 0.92;
      const lit = cycle > (i + 1) / 6 ? 1 : 0;
      line(ctx, rgb, 0.18 + lit * 0.55);
      ctx.beginPath();
      ctx.moveTo(mid + Math.cos(a) * r * 0.44, mid + Math.sin(a) * r * 0.44);
      ctx.lineTo(x, y);
      ctx.stroke();
      dot(ctx, rgb, x, y, (1.4 + lit * 0.9) * dpr, 0.3 + lit * 0.6);
    }
    if (cycle > 0.78) {
      const pulse = (cycle - 0.78) / 0.22;
      line(ctx, rgb, (1 - pulse) * 0.9);
      ctx.beginPath();
      ctx.arc(mid, mid, r * 0.34 * (1 + pulse * 0.8), 0, Math.PI * 2);
      ctx.stroke();
    }
  },

  /*
   * Something held.
   *
   * Two brackets close around a thing and then stay closed, and what is inside
   * is never altered while they are. Custody is the absence of an event, so the
   * figure has to come to rest rather than keep performing.
   */
  custody: (ctx, time, mid, r, dpr, rgb) => {
    const cycle = (time * 0.4) % 1;
    const close = cycle < 0.4 ? cycle / 0.4 : 1;
    const gap = r * (0.9 - close * 0.34);
    for (const side of [-1, 1]) {
      const x = mid + side * gap;
      line(ctx, rgb, 0.4 + close * 0.5);
      ctx.beginPath();
      ctx.moveTo(x - side * r * 0.26, mid - r * 0.74);
      ctx.lineTo(x, mid - r * 0.74);
      ctx.lineTo(x, mid + r * 0.74);
      ctx.lineTo(x - side * r * 0.26, mid + r * 0.74);
      ctx.stroke();
    }
    line(ctx, rgb, 0.3 + close * 0.45);
    ctx.beginPath();
    ctx.arc(mid, mid, r * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    dot(ctx, rgb, mid, mid, 1.6 * dpr, 0.3 + close * 0.5);
  },

  /*
   * A set of instruments of different terms, sounding one at a time.
   *
   * Strings rather than shapes: an instrument is defined by its term, and the
   * one being struck is the one that reads.
   */
  instruments: (ctx, time, mid, r, dpr, rgb) => {
    const n = 4;
    for (let i = 0; i < n; i++) {
      const x = mid + (i - (n - 1) / 2) * r * 0.5;
      const length = r * (0.46 + (i / (n - 1)) * 0.84);
      const phase = (time * 0.7 + i / n) % 1;
      const struck = phase < 0.28 ? 1 - phase / 0.28 : 0;
      const bend = struck * r * 0.2 * Math.sin(phase * 42);
      line(ctx, rgb, 0.28 + struck * 0.6);
      ctx.beginPath();
      ctx.moveTo(x, mid - length);
      ctx.quadraticCurveTo(x + bend, mid, x, mid + length);
      ctx.stroke();
      if (struck > 0.05) dot(ctx, rgb, x, mid, 1.7 * dpr, struck * 0.85);
    }
  },

  /*
   * A level that is reached and then held.
   *
   * The surface stills as the vessel fills: a reserve that keeps sloshing is
   * not a reserve.
   */
  reserves: (ctx, time, mid, r, dpr, rgb) => {
    const cycle = (time * 0.34) % 1;
    const fill = Math.min(1, cycle / 0.5);
    line(ctx, rgb, 0.34);
    ctx.beginPath();
    ctx.moveTo(mid - r * 0.7, mid - r * 0.86);
    ctx.lineTo(mid - r * 0.7, mid + r * 0.8);
    ctx.lineTo(mid + r * 0.7, mid + r * 0.8);
    ctx.lineTo(mid + r * 0.7, mid - r * 0.86);
    ctx.stroke();
    const level = mid + r * 0.8 - fill * r * 1.2;
    line(ctx, rgb, 0.45 + fill * 0.45);
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const x = mid - r * 0.7 + t * r * 1.4;
      const y = level + Math.sin(time * 2.2 + t * 6) * r * 0.06 * (1 - fill * 0.75);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  },

  /*
   * One whole becoming parts, and still being the whole.
   *
   * The segments separate far enough to be counted and come back together.
   * Nothing appears in the gap while they are apart — that is the claim the
   * figure is making.
   */
  tokenisation: (ctx, time, mid, r, dpr, rgb) => {
    const cycle = (time * 0.4) % 1;
    const split = Math.sin(Math.min(1, cycle / 0.62) * Math.PI);
    const n = 5;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const push = split * r * 0.48;
      const cx = mid + Math.cos(a) * push;
      const cy = mid + Math.sin(a) * push;
      line(ctx, rgb, 0.3 + split * 0.5);
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.36, a - Math.PI / n, a + Math.PI / n);
      ctx.stroke();
      if (split > 0.15) {
        dot(ctx, rgb, cx + Math.cos(a) * r * 0.36, cy + Math.sin(a) * r * 0.36, 1.5 * dpr, split * 0.7);
      }
    }
    line(ctx, rgb, (1 - split) * 0.55);
    ctx.beginPath();
    ctx.arc(mid, mid, r * 0.36, 0, Math.PI * 2);
    ctx.stroke();
  },
};

export function RouteMark({ shape, size = 40 }: { shape: RouteShape; size?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef(0);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const ctx = element.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    element.width = size * dpr;
    element.height = size * dpr;
    const rgb = COLOUR[shape];

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let time = 0;
    const render = () => {
      time += reduced ? 0 : 1 / 60;
      const s = size * dpr;
      ctx.clearRect(0, 0, s, s);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1.4 * dpr;

      const mid = s / 2;
      const r = s * 0.34;

      (FIGURES[shape] ?? FIGURES.settlement)(ctx, time, mid, r, dpr, rgb);

      ctx.globalAlpha = 1;
      frame.current = requestAnimationFrame(render);
    };

    frame.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame.current);
  }, [shape, size]);

  return (
    <canvas
      ref={canvas}
      className="route-mark"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
