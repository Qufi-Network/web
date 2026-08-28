/**
 * The parts of a uBTC lifecycle, as geometry.
 *
 * Built once and never touched, like the structures on the front of the site,
 * and drawn in one call. What changes is a handful of numbers the shader reads:
 * how assembled the vault is, where the unit is being carried, which anchors
 * have fallen to the chain, whether the nullifier is spent.
 *
 * Everything is generated in world space rather than in a local unit sphere,
 * because this scene is one continuous place rather than seven separate
 * structures — the vault is at the vault, the chain runs underneath all of it,
 * and the distances between them are the composition.
 *
 * The shapes are deliberately not the front page's shapes. That is a network of
 * faceted crystals; this is a ledger, and it is built out of boxes, blocks,
 * rings and grids. Same hand, different subject — a visitor arriving here from
 * the network should know immediately that they have gone somewhere else.
 */

import { createRng, fibonacciSphere } from './rng';
import { CHAIN_Y, HOLDER, REGISTRY, VAULT } from '../experience/lifecycle/stages';

/** Which part of the lifecycle a point belongs to. */
export const Part = {
  /** The Taproot vault: an enclosure that assembles out of key material. */
  Vault: 0,
  /** Bitcoin arriving at it. */
  Deposit: 1,
  /** The unit itself, once it exists. */
  Unit: 2,
  /** The chain the anchors are written to. */
  Chain: 3,
  /** The three anchors, falling. */
  Anchor: 4,
  /** The spent-nullifier registry. */
  Registry: 5,
  /** Whoever receives the transfer. */
  Holder: 6,
  /** Bitcoin leaving the vault again at redemption. */
  Release: 7,
  /** What checks the instruction: square gates rather than a crystal. */
  Verifier: 8,
} as const;

export interface FlowBuffers {
  position: Float32Array;
  /** Where the point comes from, for the parts that assemble or travel. */
  origin: Float32Array;
  /** seed, part, u, sub. `u` is a delay or a position along a path. */
  param: Float32Array;
  count: number;
}

type Rng = () => number;

function inBall(rng: Rng, radius: number): [number, number, number] {
  const dir = [rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1];
  const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const r = Math.cbrt(rng()) * radius;
  return [(dir[0] / l) * r, (dir[1] / l) * r, (dir[2] / l) * r];
}

/**
 * Builds the whole lifecycle.
 *
 * `budget` is the total number of points the device can afford. The shares are
 * fixed proportions rather than counts, so a phone draws the same scene with
 * fewer points rather than a different scene.
 */
export function buildFlow(budget: number): FlowBuffers {
  const rng = createRng(0x0b7c);
  const position: number[] = [];
  const origin: number[] = [];
  const param: number[] = [];

  const put = (
    p: [number, number, number],
    from: [number, number, number],
    part: number,
    u: number,
    sub: number,
  ) => {
    position.push(p[0], p[1], p[2]);
    origin.push(from[0], from[1], from[2]);
    param.push(rng(), part, u, sub);
  };

  /* ---- the vault ---------------------------------------------------------- */

  /*
   * A box, drawn as its edges.
   *
   * A vault is a set of conditions on an output, and the readable shape for
   * that is a container: twelve edges and a closed volume, assembled out of
   * scattered key material. Nothing on the front page is a box, which is the
   * other half of the reason.
   */
  const vaultCount = Math.floor(budget * 0.2);
  const half = 9.5;
  const edges: Array<[[number, number, number], [number, number, number]]> = [];
  for (const axis of [0, 1, 2]) {
    for (const a of [-1, 1]) {
      for (const b of [-1, 1]) {
        const from: [number, number, number] = [0, 0, 0];
        const to: [number, number, number] = [0, 0, 0];
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
  const perEdge = Math.max(6, Math.floor((vaultCount * 0.72) / edges.length));
  edges.forEach(([from, to], index) => {
    for (let i = 0; i < perEdge; i++) {
      const t = (i + 0.5) / perEdge;
      const local: [number, number, number] = [
        from[0] + (to[0] - from[0]) * t,
        (from[1] + (to[1] - from[1]) * t) * 0.9,
        from[2] + (to[2] - from[2]) * t,
      ];
      const scatter = inBall(rng, 30);
      put(
        [VAULT[0] + local[0], VAULT[1] + local[1], VAULT[2] + local[2]],
        [VAULT[0] + scatter[0], VAULT[1] + scatter[1], VAULT[2] + scatter[2]],
        Part.Vault,
        // Assembles edge by edge, so the box is built rather than faded in.
        index / edges.length,
        0,
      );
    }
  });
  // And the conditions themselves: a sparse interior lattice.
  const inside = Math.max(0, vaultCount - perEdge * edges.length);
  for (let i = 0; i < inside; i++) {
    const g = (v: number) => (Math.round(v * 2) / 2) * half;
    const dir = fibonacciSphere(i, Math.max(1, inside));
    const scatter = inBall(rng, 30);
    put(
      [VAULT[0] + g(dir[0]), VAULT[1] + g(dir[1]) * 0.9, VAULT[2] + g(dir[2])],
      [VAULT[0] + scatter[0], VAULT[1] + scatter[1], VAULT[2] + scatter[2]],
      Part.Vault,
      0.55 + (i % 7) / 14,
      1,
    );
  }

  /* ---- the deposit -------------------------------------------------------- */

  // Bitcoin coming in from outside the frame, along a broad approach.
  const depositCount = Math.floor(budget * 0.16);
  for (let i = 0; i < depositCount; i++) {
    const t = (i + 0.5) / depositCount;
    const spread = inBall(rng, 7);
    put(
      [VAULT[0] + spread[0] * 0.4, VAULT[1] + spread[1] * 0.4, VAULT[2] + spread[2] * 0.4],
      [VAULT[0] - 78 + spread[0] * 2.6, VAULT[1] - 22 + spread[1] * 3, VAULT[2] + spread[2] * 3],
      Part.Deposit,
      t,
      0,
    );
  }

  /* ---- the unit ----------------------------------------------------------- */

  // Small and bright. It has to read as one object at every distance the camera
  // takes, so it is dense rather than large.
  const unitCount = Math.floor(budget * 0.07);
  for (let i = 0; i < unitCount; i++) {
    // A ring rather than a ball: this is a unit of account, and a coin edge on
    // is the oldest shape there is for one.
    const a = (i / unitCount) * Math.PI * 2;
    const band = ((i * 0.6180339887) % 1) - 0.5;
    const r = 2.1 + band * 0.5;
    put(
      [Math.cos(a) * r, band * 0.7, Math.sin(a) * r],
      [Math.cos(a) * r * 3, band * 2.4, Math.sin(a) * r * 3],
      Part.Unit,
      i / unitCount,
      0,
    );
  }

  /* ---- the verifier ------------------------------------------------------- */

  /*
   * What checks the instruction, drawn as a set of square gates rather than as
   * the front page's crystalline Core. Same job, different shape, because a
   * visitor should not have to work out whether they are looking at the same
   * object twice.
   */
  const verifierCount = Math.floor(budget * 0.1);
  const gates = 3;
  const perGate = Math.max(12, Math.floor(verifierCount / gates));
  for (let g = 0; g < gates; g++) {
    const size = 7 + g * 3.4;
    for (let i = 0; i < perGate; i++) {
      const t = (i + 0.5) / perGate;
      // Around the perimeter of a square, in the plane the instruction crosses.
      const side = Math.floor(t * 4);
      const along = (t * 4 - side) * 2 - 1;
      const corners: Array<[number, number]> = [
        [along, -1],
        [1, along],
        [-along, 1],
        [-1, -along],
      ];
      const [ex, ey] = corners[side];
      put(
        [ex * size, ey * size, (g - 1) * 5],
        [ex * size * 2.2, ey * size * 2.2, (g - 1) * 22],
        Part.Verifier,
        t,
        g,
      );
    }
  }

  /* ---- the chain ---------------------------------------------------------- */

  // Bitcoin, underneath everything: a long lattice the anchors are written to.
  const chainCount = Math.floor(budget * 0.16);
  for (let i = 0; i < chainCount; i++) {
    const t = (i + 0.5) / chainCount;
    const x = -96 + t * 192;
    // Blocks rather than an even line, so it reads as a chain of things.
    const block = Math.floor(t * 26);
    const within = ((i * 0.6180339887) % 1) - 0.5;
    put(
      [x, CHAIN_Y + Math.sin(block * 1.7) * 0.6 + within * 1.4, -4 + within * 5],
      [x, CHAIN_Y - 26, -4 + within * 5],
      Part.Chain,
      t,
      block % 2,
    );
  }

  /* ---- the anchors -------------------------------------------------------- */

  /*
   * Three writes, at the three places on the chain they land.
   *
   * Each one falls from where the instruction happened down to the chain, which
   * is the whole point of the shot: the record does not live in the network, it
   * leaves it.
   */
  const anchorCount = Math.floor(budget * 0.11);
  const perAnchor = Math.max(24, Math.floor(anchorCount / 3));
  const from: Array<[number, number, number]> = [
    [VAULT[0] + 6, VAULT[1] - 2, 0],
    [12, -4, 0],
    [-4, 2, 0],
  ];
  const lands: Array<[number, number, number]> = [
    [-52, CHAIN_Y, 0],
    [6, CHAIN_Y, 0],
    [58, CHAIN_Y, 0],
  ];
  for (let a = 0; a < 3; a++) {
    for (let i = 0; i < perAnchor; i++) {
      const dir = fibonacciSphere(i, perAnchor);
      const r = 2.2;
      put(
        [lands[a][0] + dir[0] * r, lands[a][1] + dir[1] * r * 0.5, lands[a][2] + dir[2] * r],
        [from[a][0] + dir[0] * r, from[a][1] + dir[1] * r, from[a][2] + dir[2] * r],
        Part.Anchor,
        i / perAnchor,
        a,
      );
    }
  }

  /* ---- the registry ------------------------------------------------------- */

  // A flat lattice of instructions, one of which will be marked spent.
  const registryCount = Math.floor(budget * 0.1);
  const cols = Math.max(8, Math.round(Math.sqrt(registryCount * 2)));
  const rows = Math.max(4, Math.floor(registryCount / cols));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = c / Math.max(1, cols - 1);
      const v = r / Math.max(1, rows - 1);
      // One cell is the one that gets spent. Marked here so the shader does not
      // have to decide which.
      const isTheOne = r === Math.floor(rows * 0.4) && c === Math.floor(cols * 0.62);
      put(
        [REGISTRY[0] + (u - 0.5) * 34, REGISTRY[1] + (v - 0.5) * 13, REGISTRY[2]],
        [REGISTRY[0] + (u - 0.5) * 44, REGISTRY[1] + (v - 0.5) * 20, REGISTRY[2] - 14],
        Part.Registry,
        u,
        isTheOne ? 1 : 0,
      );
    }
  }

  /* ---- the holder --------------------------------------------------------- */

  const holderCount = Math.floor(budget * 0.07);
  for (let i = 0; i < holderCount; i++) {
    const dir = fibonacciSphere(i, holderCount);
    const r = 6.5;
    const scatter = inBall(rng, 16);
    put(
      [HOLDER[0] + dir[0] * r, HOLDER[1] + dir[1] * r * 0.8, HOLDER[2] + dir[2] * r],
      [HOLDER[0] + scatter[0], HOLDER[1] + scatter[1], HOLDER[2] + scatter[2]],
      Part.Holder,
      i / holderCount,
      0,
    );
  }

  /* ---- the release -------------------------------------------------------- */

  // The deposit leaving again, the way it came.
  const releaseCount = Math.max(0, budget - param.length / 4);
  for (let i = 0; i < releaseCount; i++) {
    const t = (i + 0.5) / Math.max(1, releaseCount);
    const spread = inBall(rng, 7);
    put(
      [VAULT[0] - 74 + spread[0] * 2.6, VAULT[1] - 20 + spread[1] * 3, VAULT[2] + spread[2] * 3],
      [VAULT[0] + spread[0] * 0.4, VAULT[1] + spread[1] * 0.4, VAULT[2] + spread[2] * 0.4],
      Part.Release,
      t,
      0,
    );
  }

  return {
    position: new Float32Array(position),
    origin: new Float32Array(origin),
    param: new Float32Array(param),
    count: param.length / 4,
  };
}
