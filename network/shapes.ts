/**
 * The vocabulary the walkthroughs are drawn in.
 *
 * Each of these puts points into a figure's own local space; where the figure
 * stands, what colour it wears and how it behaves are decided by the journey
 * that uses it. That separation is the whole point: four products need four
 * scenes that do not look like each other, and the cheapest way to get four
 * that do not look like each other is one vocabulary and four sentences rather
 * than four vocabularies.
 *
 * Nothing here is the front page's crystal. That is a network of faceted
 * relationships; these are the things a ledger, an instrument, a custody
 * arrangement and a quorum are actually made of — boxes, sheets, gates,
 * blocks, grids, shards and lattices.
 */

import { fibonacciSphere, type Rng } from './rng';

export type Vec3 = [number, number, number];

export interface Placed {
  /** Where the point rests, in the figure's own space. */
  p: Vec3;
  /** Where it comes from, if the shape wants a say. Otherwise derived. */
  from?: Vec3;
  /**
   * Which sub-part of the figure this belongs to.
   *
   * Read by the shader for the things a figure does to one of its parts and
   * not the others: the gate that is currently checking, the registry entry
   * that gets struck out, the glyph inside a mark.
   */
  sub?: number;
  /** Order within the figure, 0..1. Staggers assembly so it arrives as a wave. */
  u?: number;
  /** An override for this point only, where a shape is two-coloured. */
  tone?: Vec3;
}

export type Shape = (count: number, rng: Rng) => Placed[];

const TAU = Math.PI * 2;

/** A point somewhere inside a ball of this radius. */
export function inBall(rng: Rng, radius: number): Vec3 {
  const dir: Vec3 = [rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1];
  const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const r = Math.cbrt(rng()) * radius;
  return [(dir[0] / l) * r, (dir[1] / l) * r, (dir[2] / l) * r];
}

/* ------------------------------------------------------------- enclosures -- */

/**
 * A box, drawn as its twelve edges with a little dust inside.
 *
 * The readable shape for a set of conditions on an output: a closed volume you
 * can see the inside of. Nothing on the front of the site is a box.
 */
export function boxEdges(half: number, fill = 0.24): Shape {
  return (count, rng) => {
    const out: Placed[] = [];
    const edges: Array<[Vec3, Vec3]> = [];
    for (const axis of [0, 1, 2]) {
      for (const a of [-1, 1]) {
        for (const b of [-1, 1]) {
          const from: Vec3 = [0, 0, 0];
          const to: Vec3 = [0, 0, 0];
          const others = [0, 1, 2].filter((x) => x !== axis);
          from[axis] = -half;
          to[axis] = half;
          from[others[0]] = a * half;
          to[others[0]] = a * half;
          from[others[1]] = b * half;
          to[others[1]] = b * half;
          edges.push([from, to]);
        }
      }
    }

    const perEdge = Math.max(5, Math.floor((count * (1 - fill)) / edges.length));
    edges.forEach(([from, to], index) => {
      for (let i = 0; i < perEdge; i++) {
        const t = (i + 0.5) / perEdge;
        const jitter = (rng() - 0.5) * 0.5;
        out.push({
          p: [
            from[0] + (to[0] - from[0]) * t + jitter,
            from[1] + (to[1] - from[1]) * t + jitter,
            from[2] + (to[2] - from[2]) * t + jitter,
          ],
          sub: index / edges.length,
          u: t * 0.5 + (index / edges.length) * 0.5,
        });
      }
    });

    const inside = Math.max(0, count - out.length);
    for (let i = 0; i < inside; i++) {
      out.push({ p: inBall(rng, half * 0.82), sub: 1, u: rng() });
    }
    return out;
  };
}

/** A shell of points. Whoever holds the thing, or whoever it is going to. */
export function ball(radius: number): Shape {
  return (count, rng) => {
    const out: Placed[] = [];
    for (let i = 0; i < count; i++) {
      const dir = fibonacciSphere(i, count);
      const r = radius * (0.86 + rng() * 0.2);
      out.push({ p: [dir[0] * r, dir[1] * r, dir[2] * r], u: i / count });
    }
    return out;
  };
}

/** A ring, seen edge on: the oldest shape there is for a unit of account. */
export function ring(radius: number, band = 0.5): Shape {
  return (count, rng) => {
    const out: Placed[] = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU;
      const off = (rng() - 0.5) * band;
      out.push({
        p: [Math.cos(a) * (radius + off), (rng() - 0.5) * band, Math.sin(a) * (radius + off)],
        u: i / count,
      });
    }
    return out;
  };
}

/**
 * A seal: a filled disc with a heavier rim, standing upright.
 *
 * `ring` lies flat, which is right for a coin edge on and wrong for a
 * signature — a seal is pressed onto a page, so it faces the way the page
 * faces. The rim carries the weight and the middle is scattered, the way wax
 * is thick at the edge and thin where it spread.
 */
export function disc(radius: number, rim = 0.62): Shape {
  return (count, rng) => {
    const out: Placed[] = [];
    const edge = Math.floor(count * rim);
    for (let i = 0; i < edge; i++) {
      const a = (i / edge) * TAU;
      const r = radius * (0.94 + rng() * 0.12);
      out.push({ p: [Math.cos(a) * r, Math.sin(a) * r, (rng() - 0.5) * 0.5], sub: 1, u: i / edge });
    }
    for (let i = edge; i < count; i++) {
      const a = rng() * TAU;
      const r = radius * 0.8 * Math.sqrt(rng());
      out.push({ p: [Math.cos(a) * r, Math.sin(a) * r, (rng() - 0.5) * 0.5], sub: 0, u: rng() });
    }
    return out;
  };
}

/* ----------------------------------------------------------- instruments -- */

/**
 * A sheet: a rectangle of ruled lines with a heavier border.
 *
 * An instrument — a letter of credit, a signed document — is a page before it
 * is anything else, and a page seen at an angle is unmistakable in a scene
 * that is otherwise made of volumes.
 */
export function sheet(width: number, height: number, lines = 7): Shape {
  return (count, rng) => {
    const out: Placed[] = [];
    const w = width / 2;
    const h = height / 2;
    const border = Math.floor(count * 0.45);
    for (let i = 0; i < border; i++) {
      const t = (i / border) * 4;
      const side = Math.floor(t);
      const k = t - side;
      const p: Vec3 =
        side === 0
          ? [-w + k * width, -h, 0]
          : side === 1
            ? [w, -h + k * height, 0]
            : side === 2
              ? [w - k * width, h, 0]
              : [-w, h - k * height, 0];
      out.push({ p, sub: 0, u: i / border });
    }

    const ruled = Math.max(0, count - border);
    for (let i = 0; i < ruled; i++) {
      const line = Math.floor((i / ruled) * lines);
      const y = -h + ((line + 1) / (lines + 1)) * height;
      // Ruled lines stop short of the right edge, the way written ones do.
      const x = -w * 0.82 + rng() * width * (line % 3 === 2 ? 0.5 : 0.82);
      out.push({ p: [x, y, (rng() - 0.5) * 0.2], sub: 0.5, u: rng() });
    }
    return out;
  };
}

/**
 * Nested square gates, standing one behind another.
 *
 * What checks an instruction. Square rather than crystalline on purpose: a
 * visitor should never have to work out whether they are looking at the front
 * page's Core a second time.
 */
export function gates(rings: number, size: number, gap: number): Shape {
  return (count, rng) => {
    const out: Placed[] = [];
    const per = Math.max(10, Math.floor(count / rings));
    for (let g = 0; g < rings; g++) {
      const s = size + g * gap;
      const z = (g - (rings - 1) / 2) * gap * 0.9;
      for (let i = 0; i < per; i++) {
        const t = (i / per) * 4;
        const side = Math.floor(t);
        const k = t - side;
        const p: Vec3 =
          side === 0
            ? [-s + k * s * 2, -s, z]
            : side === 1
              ? [s, -s + k * s * 2, z]
              : side === 2
                ? [s - k * s * 2, s, z]
                : [-s, s - k * s * 2, z];
        p[0] += (rng() - 0.5) * 0.5;
        p[1] += (rng() - 0.5) * 0.5;
        out.push({ p, sub: g, u: i / per });
      }
    }
    return out;
  };
}

/**
 * A chain of blocks along the x axis.
 *
 * Drawn as blocks rather than as a line because what it is is a sequence of
 * things, and the gaps between them are as much the shape as the blocks are.
 */
export function blocks(length: number, howMany: number, thickness = 1.6): Shape {
  return (count, rng) => {
    const out: Placed[] = [];
    const per = Math.max(4, Math.floor(count / howMany));
    for (let b = 0; b < howMany; b++) {
      const x = (b / (howMany - 1) - 0.5) * length;
      for (let i = 0; i < per; i++) {
        out.push({
          p: [
            x + (rng() - 0.5) * (length / howMany) * 0.55,
            (rng() - 0.5) * thickness * 2,
            (rng() - 0.5) * thickness * 2,
          ],
          sub: b / howMany,
          u: b / howMany,
        });
      }
    }
    return out;
  };
}

/** A flat grid of cells. A registry: entries, and one of them struck out. */
export function grid(cols: number, rows: number, spacing: number, spent = 0.5): Shape {
  return (count, rng) => {
    const out: Placed[] = [];
    const per = Math.max(1, Math.floor(count / (cols * rows)));
    // Which entry is the one that gets spent. Fixed, so a camera can be aimed
    // at it and find it there.
    const chosen = Math.floor(rows * spent) * cols + Math.floor(cols * spent);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const index = r * cols + c;
        for (let i = 0; i < per; i++) {
          out.push({
            p: [
              (c - (cols - 1) / 2) * spacing + (rng() - 0.5) * spacing * 0.34,
              (r - (rows - 1) / 2) * spacing + (rng() - 0.5) * spacing * 0.34,
              (rng() - 0.5) * 0.6,
            ],
            sub: index === chosen ? 1 : 0,
            u: index / (cols * rows),
          });
        }
      }
    }
    return out;
  };
}

/**
 * A spending tree: a trunk, and the conditions that hang off it.
 *
 * A Taproot output can be spent by its key or by one of the scripts committed
 * into it, and the difference between those two is the whole of what a vault
 * is. So it is drawn as what it is — one path straight up the middle and a fan
 * of others around it.
 *
 * `sub` is 1 on the key path and 0 everywhere else, which is what the shader
 * strikes out: a journey that gives up the key path can draw it and then put
 * it out, and that is a good deal clearer than never drawing it.
 */
export function tree(height: number, branches: number, spread = 12): Shape {
  return (count, rng) => {
    const out: Placed[] = [];
    const trunk = Math.floor(count * 0.22);
    for (let i = 0; i < trunk; i++) {
      const t = (i + 0.5) / trunk;
      out.push({
        p: [(rng() - 0.5) * 0.7, -height * 0.5 + t * height * 0.5, (rng() - 0.5) * 0.7],
        sub: 0,
        u: t * 0.4,
      });
    }

    const per = Math.max(6, Math.floor((count - trunk) / branches));
    for (let b = 0; b < branches; b++) {
      // The key path goes straight on; the script paths fan out around it.
      const angle = b === 0 ? 0 : ((b - 1) / (branches - 1)) * TAU;
      const lean = b === 0 ? 0 : spread;
      for (let i = 0; i < per; i++) {
        const t = (i + 0.5) / per;
        const reach = height * (b === 0 ? 0.5 : 0.42);
        out.push({
          p: [
            Math.cos(angle) * lean * t + (rng() - 0.5) * 0.6,
            t * reach + (rng() - 0.5) * 0.6,
            Math.sin(angle) * lean * t + (rng() - 0.5) * 0.6,
          ],
          sub: b === 0 ? 1 : 0,
          u: 0.4 + t * 0.6,
        });
      }
    }
    return out;
  };
}

/**
 * A woven cage: great circles at different tilts, closing around what they
 * enclose.
 *
 * The readable shape for something being wrapped rather than merely contained.
 * A box says the thing is inside; this says something has been put around it.
 */
export function weave(radius: number, loops = 5): Shape {
  return (count, rng) => {
    const out: Placed[] = [];
    const per = Math.max(12, Math.floor(count / loops));
    for (let l = 0; l < loops; l++) {
      // Each loop is a circle tilted away from the last by an irrational-ish
      // fraction of a turn, so no two of them ever lie flat against each other.
      const tilt = (l / loops) * Math.PI * 0.618;
      const turn = (l / loops) * TAU * 0.618;
      for (let i = 0; i < per; i++) {
        const a = (i / per) * TAU;
        const r = radius * (0.97 + rng() * 0.06);
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        const yt = y * Math.cos(tilt);
        const zt = y * Math.sin(tilt);
        out.push({
          p: [x * Math.cos(turn) - zt * Math.sin(turn), yt, x * Math.sin(turn) + zt * Math.cos(turn)],
          sub: l,
          u: (l + i / per) / loops,
        });
      }
    }
    return out;
  };
}

/**
 * A hand, palm to the camera, with the veins under it.
 *
 * Ported from the anatomy the VEYNS work is built on — a cupped palm with a
 * mound under each knuckle and the thenar mound at the thumb, five fingers off
 * their knuckles, and the vascular arch across the middle of it. The veins are
 * the point rather than decoration: what a scanner reads is the pattern under
 * the skin, not the outline, so they are carried in `sub` and drawn brighter.
 *
 * Scaled by `size` against a hand about twenty units across, which is the
 * frame the anatomy was authored in.
 */
export function palm(size = 1, tones?: [Vec3, Vec3]): Shape {
  const fingers: Array<{ base: Vec3; dir: Vec3; length: number }> = [
    { base: [-11.5, -7, 1.5], dir: [-0.78, 0.55, 0.2], length: 12 },
    { base: [-8.6, 8, 2.2], dir: [-0.14, 0.99, 0.06], length: 15 },
    { base: [-2.8, 9.2, 2.6], dir: [-0.03, 1, 0.05], length: 17.5 },
    { base: [3.0, 8.6, 2.4], dir: [0.1, 0.99, 0.05], length: 16 },
    { base: [8.4, 7.2, 1.8], dir: [0.24, 0.96, 0.04], length: 11.5 },
  ];

  /** Cupped, with a mound under each knuckle and one at the root of the thumb. */
  const surface = (x: number, y: number) => {
    const cup = 2.4 - (x / 12) * (x / 12) * 3.4;
    const roll = Math.max(0, (y + 22) / 30) * 0.8;
    let mounds = 0;
    for (const kx of [-8.6, -2.8, 3.0, 8.4]) {
      const dx = x - kx;
      const dy = y - 7.6;
      mounds += 1.15 * Math.exp(-(dx * dx) / 3.4 - (dy * dy) / 6.5);
    }
    const tx = x + 8.6;
    const ty = y + 4.5;
    mounds += 1.5 * Math.exp(-(tx * tx + ty * ty) / 16);
    return cup + roll + mounds;
  };

  const inside = (x: number, y: number) => {
    if (y < -10 || y > 9) return false;
    const t = (y + 10) / 19;
    const half = 7.5 + t * 4.4;
    return Math.abs(x + (1 - t) * 0.4) < half;
  };

  return (count, rng) => {
    const out: Placed[] = [];
    const put = (x: number, y: number, z: number, sub: number, u: number) => {
      // Skin and vein are two colours where the journey gives two, because what
      // a reader looks at is the pattern and not the hand around it.
      out.push({ p: [x * size, y * size, z * size], sub, u, tone: tones?.[sub] });
    };

    // The skin: the palm surface itself, and the fingers off their knuckles.
    const skin = Math.floor(count * 0.46);
    let guard = 0;
    let made = 0;
    while (made < skin && guard++ < skin * 40) {
      const x = (rng() - 0.5) * 26;
      const y = -11 + rng() * 21;
      if (!inside(x, y)) continue;
      put(x, y, surface(x, y), 0, rng());
      made++;
    }

    const perFinger = Math.floor((count * 0.28) / fingers.length);
    fingers.forEach((finger, index) => {
      for (let i = 0; i < perFinger; i++) {
        const t = (i + 0.5) / perFinger;
        // Fingers taper, and the ones at the edges sit a little lower.
        const width = (1.9 - t * 0.7) * (index === 0 ? 1.15 : 1);
        const a = rng() * TAU;
        const r = Math.sqrt(rng()) * width;
        put(
          finger.base[0] + finger.dir[0] * finger.length * t + Math.cos(a) * r,
          finger.base[1] + finger.dir[1] * finger.length * t + Math.sin(a) * r * 0.5,
          finger.base[2] + finger.dir[2] * finger.length * t + Math.sin(a) * r * 0.5,
          0,
          0.3 + t * 0.7,
        );
      }
    });

    /*
     * And the veins: a trunk up through the wrist, an arch across the palm,
     * and one running out to each fingertip. This is the pattern a scanner
     * actually reads, so it is what the figure is really made of.
     */
    const vein = Math.max(0, count - out.length);
    const arch: Vec3[] = [
      [-9.5, -1, 0],
      [-5, 2.5, 0],
      [0, 3.6, 0],
      [5, 2.6, 0],
      [9.5, 0.4, 0],
    ];
    const perVein = Math.max(6, Math.floor(vein / (fingers.length + 3)));

    for (let i = 0; i < perVein * 2; i++) {
      const t = (i + 0.5) / (perVein * 2);
      const x = -0.6 + Math.sin(t * 2.2) * 0.9;
      const y = -11 + t * 10;
      put(x, y, surface(x, y) - 0.5, 1, t * 0.5);
    }

    for (let i = 0; i < perVein * 2; i++) {
      const t = (i + 0.5) / (perVein * 2);
      const at = t * (arch.length - 1);
      const k = Math.min(arch.length - 2, Math.floor(at));
      const f = at - k;
      const x = arch[k][0] + (arch[k + 1][0] - arch[k][0]) * f;
      const y = arch[k][1] + (arch[k + 1][1] - arch[k][1]) * f;
      put(x, y, surface(x, y) - 0.5, 1, 0.3 + t * 0.4);
    }

    fingers.forEach((finger, index) => {
      const from = arch[Math.min(arch.length - 1, index)];
      for (let i = 0; i < perVein; i++) {
        const t = (i + 0.5) / perVein;
        const x = from[0] + (finger.base[0] + finger.dir[0] * finger.length * 0.75 - from[0]) * t;
        const y = from[1] + (finger.base[1] + finger.dir[1] * finger.length * 0.75 - from[1]) * t;
        put(x, y, surface(x, Math.min(9, y)) - 0.4, 1, 0.5 + t * 0.5);
      }
    });

    return out;
  };
}

/* ---------------------------------------------------------------- motion -- */

/**
 * A broad approach: value arriving from somewhere off the frame.
 *
 * The points rest at the destination and start at the source, so the same
 * shape reads as an arrival or a departure depending on which way the journey
 * runs it.
 */
export function stream(from: Vec3, spread = 3): Shape {
  return (count, rng) => {
    const out: Placed[] = [];
    for (let i = 0; i < count; i++) {
      const at = inBall(rng, spread);
      out.push({
        p: [at[0] * 0.5, at[1] * 0.5, at[2] * 0.5],
        from: [from[0] + at[0] * 2.4, from[1] + at[1] * 2.4, from[2] + at[2] * 2.4],
        u: (i + 0.5) / count,
      });
    }
    return out;
  };
}

/**
 * Key material, in as many pieces as there are schemes.
 *
 * Two lobes rather than one cloud, because every product on this core signs
 * under two independent schemes and a single haze of points says one. Which
 * lobe a point belongs to is in `sub`, so a journey can light them in turn.
 */
export function shards(radius: number, lobes = 2): Shape {
  return (count, rng) => {
    const out: Placed[] = [];
    const per = Math.max(1, Math.floor(count / lobes));
    for (let lobe = 0; lobe < lobes; lobe++) {
      const centre = (lobe - (lobes - 1) / 2) * radius * 1.5;
      for (let i = 0; i < per; i++) {
        const dir = fibonacciSphere(i, per);
        const r = radius * 0.5 * (0.45 + rng() * 0.75);
        out.push({
          p: [centre + dir[0] * r, dir[1] * r, dir[2] * r],
          sub: lobe,
          u: rng(),
        });
      }
    }
    return out;
  };
}

/**
 * A ring of operators with the chords between them.
 *
 * A quorum is not a cloud and it is not a crystal: it is a set of independent
 * parties and the agreement between them, so the parties are dense knots and
 * the agreement is the thin lines running across the middle.
 */
export function lattice(radius: number, nodes: number, chordShare = 0.5): Shape {
  return (count, rng) => {
    const out: Placed[] = [];
    const places: Vec3[] = [];
    for (let i = 0; i < nodes; i++) {
      const dir = fibonacciSphere(i, nodes);
      places.push([dir[0] * radius, dir[1] * radius * 0.7, dir[2] * radius]);
    }

    const knot = Math.max(3, Math.floor((count * (1 - chordShare)) / nodes));
    places.forEach((place, index) => {
      for (let i = 0; i < knot; i++) {
        const at = inBall(rng, radius * 0.09);
        out.push({
          p: [place[0] + at[0], place[1] + at[1], place[2] + at[2]],
          sub: index / nodes,
          u: index / nodes,
        });
      }
    });

    const chords = Math.max(0, count - out.length);
    for (let i = 0; i < chords; i++) {
      const a = places[Math.floor(rng() * nodes)];
      const b = places[Math.floor(rng() * nodes)];
      const t = rng();
      out.push({
        p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
        sub: -1,
        u: rng(),
      });
    }
    return out;
  };
}

/**
 * Only the chords: the agreement without the parties.
 *
 * Split from `lattice` because the two want different treatment — the parties
 * are dense and lit, the agreement between them is a thin haze — and one figure
 * cannot be both. Same seats, because both compute them the same way.
 */
export function chords(radius: number, nodes: number): Shape {
  return (count, rng) => {
    const out: Placed[] = [];
    const places: Vec3[] = [];
    for (let i = 0; i < nodes; i++) {
      const dir = fibonacciSphere(i, nodes);
      places.push([dir[0] * radius, dir[1] * radius * 0.7, dir[2] * radius]);
    }
    for (let i = 0; i < count; i++) {
      const a = places[Math.floor(rng() * nodes)];
      const b = places[Math.floor(rng() * nodes)];
      const t = rng();
      out.push({
        p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
        sub: 0,
        u: rng(),
      });
    }
    return out;
  };
}

/** A curved link from the figure's own place to somewhere else. */
export function arc(to: Vec3, lift: number): Shape {
  return (count, rng) => {
    const out: Placed[] = [];
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const bend = Math.sin(t * Math.PI) * lift;
      out.push({
        p: [to[0] * t + (rng() - 0.5) * 0.4, to[1] * t + bend, to[2] * t + (rng() - 0.5) * 0.4],
        u: t,
      });
    }
    return out;
  };
}

/**
 * A swarm that rides a path: a body, and a tail strung out behind it.
 *
 * `u` is how far back along the path the point sits, which is what turns a
 * cloud into something with a direction of travel.
 */
export function escort(radius: number, tail: number): Shape {
  return (count, rng) => {
    const out: Placed[] = [];
    for (let i = 0; i < count; i++) {
      const back = Math.pow(rng(), 1.7);
      const dir = fibonacciSphere(i, count);
      const r = radius * (0.5 + rng() * 0.9) * (1 + back * 1.4);
      out.push({
        p: [dir[0] * r, dir[1] * r * 0.8, dir[2] * r],
        sub: rng(),
        u: back * tail,
      });
    }
    return out;
  };
}

/**
 * An image, already sampled to points.
 *
 * Only the marks use this — a logo is the one thing in these scenes that has
 * to be itself rather than a shape that means it.
 */
export function fromPoints(source: Float32Array, tones: [Vec3, Vec3], scale: number): Shape {
  return (count, rng) => {
    const total = source.length / 3;
    const out: Placed[] = [];
    const step = Math.max(1, Math.floor(total / Math.max(1, count)));
    for (let i = 0; i < total; i += step) {
      const glyph = source[i * 3 + 2] > 0.5;
      out.push({
        p: [source[i * 3] * scale, source[i * 3 + 1] * scale, 0],
        sub: glyph ? 1 : 0,
        u: rng(),
        tone: tones[glyph ? 1 : 0],
      });
    }
    return out;
  };
}
