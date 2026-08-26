/**
 * The shapes of the network.
 *
 * Seven of the eight spaces are built here, into one interleaved buffer that
 * becomes a single draw call. The Core is not: it has to assemble out of the
 * node field itself and owns its own system.
 *
 * The rule that keeps this honest is that a structure's *shape* is generated on
 * the CPU once and never touched again, while its *motion* is entirely a
 * function of a handful of numbers the shader reads per space. Nothing here
 * animates; nothing in the shader knows what a collateral orbit is. Between
 * them they draw a living network in three draw calls.
 *
 * Local space: every structure is generated inside a unit sphere, so the space
 * definition can scale it by one radius and place it by one anchor.
 */

import { createRng, fibonacciSphere } from './rng';
import { SPACES, StructureKind, type Space } from '../experience/Spaces';

/**
 * Roles inside a structure. The shader switches on kind first and role second,
 * so the same buffer can carry a gateway ring and the particle approaching it.
 */
export const Role = {
  /** Kind-specific primary body. */
  Body: 0,
  /** Kind-specific secondary body: orbiters, field cloud, approach particles. */
  Second: 1,
  /** Kind-specific tertiary: verification shells, proof kernels, beams. */
  Third: 2,
  /** Kind-specific quaternary: arriving assets, plane lattices. */
  Fourth: 3,
  /** Kind-specific quinary: descending links. */
  Fifth: 4,
} as const;

export interface StructureBuffers {
  /** Target position in local space. */
  position: Float32Array;
  /** Where the point sits when the structure is disassembled. */
  scatter: Float32Array;
  /** seed, role, u, sub. `u` is delay, path position or orbit phase by kind. */
  param: Float32Array;
  /** spaceIndex, kind. */
  index: Float32Array;
  count: number;
}

/* ------------------------------------------------------------------ maths -- */

/** Twelve icosahedral directions. Used wherever something must look faceted. */
const ICOSA: Array<[number, number, number]> = (() => {
  const phi = (1 + Math.sqrt(5)) / 2;
  const raw: Array<[number, number, number]> = [];
  for (const s1 of [-1, 1]) {
    for (const s2 of [-1, 1]) {
      raw.push([0, s1, s2 * phi]);
      raw.push([s1, s2 * phi, 0]);
      raw.push([s2 * phi, 0, s1]);
    }
  }
  return raw.map(([x, y, z]) => {
    const l = Math.hypot(x, y, z);
    return [x / l, y / l, z / l] as [number, number, number];
  });
})();

/** How aligned a direction is with the nearest crystal axis, 0..1. */
function facet(x: number, y: number, z: number): number {
  let best = -1;
  for (const v of ICOSA) {
    const d = x * v[0] + y * v[1] + z * v[2];
    if (d > best) best = d;
  }
  return Math.max(0, best);
}

type Rng = () => number;

/** A point somewhere inside a ball of the given radius. */
function inBall(rng: Rng, radius: number): [number, number, number] {
  const dir = [rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1];
  const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const r = Math.cbrt(rng()) * radius;
  return [(dir[0] / l) * r, (dir[1] / l) * r, (dir[2] / l) * r];
}

/** Quadratic bezier, because every pathway in here is one. */
function bezier(
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
  t: number,
): [number, number, number] {
  const m = 1 - t;
  return [
    m * m * a[0] + 2 * m * t * b[0] + t * t * c[0],
    m * m * a[1] + 2 * m * t * b[1] + t * t * c[1],
    m * m * a[2] + 2 * m * t * b[2] + t * t * c[2],
  ];
}

/* ----------------------------------------------------------- the emitter -- */

/**
 * Collects points for one structure.
 *
 * Every generator below reads as "put a point here, of this role", which keeps
 * the shapes legible as shapes. It is a callable rather than an object with a
 * method for the same reason: `emit(p, role, u, sub)` disappears into the
 * geometry, and `emitter.emit(p, role, u, sub)` does not.
 *
 * @param p    target position, local space, inside a unit sphere
 * @param role which part of the structure this belongs to
 * @param u    delay, path position or orbit phase, by kind
 * @param sub  sub-body index: which ring, which stream, which environment
 * @param s    scatter position; a wide random ball when not given
 */
interface Emitter {
  (
    p: [number, number, number],
    role: number,
    u: number,
    sub: number,
    s?: [number, number, number],
  ): void;
  /**
   * Points emitted for the structure currently being built.
   *
   * Scoped to the structure, not to the buffer. Every generator finishes by
   * spending whatever is left of its budget on its last part, which means it
   * has to be able to ask how much it has already used — and one emitter builds
   * all seven, so a running total across the buffer would be the wrong number
   * for six of them. It was: the answer went negative after the first
   * structure, and every proof kernel, gateway beam, recovery packet and
   * settlement link silently became zero points.
   */
  readonly made: number;
  /** Starts a new structure. Resets `made`, keeps the buffers. */
  begin(): void;
  readonly position: number[];
  readonly scatter: number[];
  readonly param: number[];
}

function createEmitter(rng: Rng): Emitter {
  const position: number[] = [];
  const scatter: number[] = [];
  const param: number[] = [];
  let origin = 0;

  const emit = ((p, role, u, sub, s) => {
    // A disassembled structure has to stay inside the frame it was framed in.
    // At two and a half radii the scattered state of a crystal fills the whole
    // viewport and reads as fog rather than as the same object coming apart.
    const from = s ?? inBall(rng, 1.5);
    position.push(p[0], p[1], p[2]);
    scatter.push(from[0], from[1], from[2]);
    param.push(rng(), role, u, sub);
  }) as Emitter;

  Object.defineProperties(emit, {
    made: { get: () => param.length / 4 - origin },
    begin: {
      value: () => {
        origin = param.length / 4;
      },
    },
    position: { value: position },
    scatter: { value: scatter },
    param: { value: param },
  });

  return emit;
}

/* -------------------------------------------------------- 02 post-quantum -- */

/** The twenty triangular faces of the icosahedron, as vertex triples. */
const ICOSA_FACES: Array<[number, number, number]> = (() => {
  const faces: Array<[number, number, number]> = [];
  const adjacent = (a: number, b: number) => {
    const d = ICOSA[a][0] * ICOSA[b][0] + ICOSA[a][1] * ICOSA[b][1] + ICOSA[a][2] * ICOSA[b][2];
    return d > 0.4;
  };
  for (let a = 0; a < ICOSA.length; a++) {
    for (let b = a + 1; b < ICOSA.length; b++) {
      if (!adjacent(a, b)) continue;
      for (let c = b + 1; c < ICOSA.length; c++) {
        if (adjacent(a, c) && adjacent(b, c)) faces.push([a, b, c]);
      }
    }
  }
  return faces;
})();

/** The thirty edges of the icosahedron. */
const ICOSA_EDGES: Array<[number, number]> = (() => {
  const edges: Array<[number, number]> = [];
  for (let a = 0; a < ICOSA.length; a++) {
    for (let b = a + 1; b < ICOSA.length; b++) {
      const d = ICOSA[a][0] * ICOSA[b][0] + ICOSA[a][1] * ICOSA[b][1] + ICOSA[a][2] * ICOSA[b][2];
      if (d > 0.4) edges.push([a, b]);
    }
  }
  return edges;
})();

/**
 * A signature made of thousands of points.
 *
 * Three nested crystals with their edges drawn through them. Points sit *on*
 * the twenty faces rather than on a sphere pushed toward twelve axes — that
 * earlier version resolved to a ball with spikes on it from every angle,
 * because most directions on a sphere are nowhere near an axis and end up at
 * the same radius. Sampling the faces gives flats, and flats meeting at edges
 * are what makes a shape read as cut rather than grown.
 *
 * The shader assembles and disassembles the whole thing continuously; the delay
 * each point carries is what turns that into a wave rather than a fade.
 */
function signature(emit: Emitter, n: number) {
  const shells = [0.42, 0.72, 1.0];
  const faceShare = Math.floor(n * 0.62);
  const perShell = Math.floor(faceShare / shells.length);
  const perFace = Math.max(4, Math.floor(perShell / ICOSA_FACES.length));

  shells.forEach((shellRadius, shellIndex) => {
    ICOSA_FACES.forEach(([a, b, c], faceIndex) => {
      for (let i = 0; i < perFace; i++) {
        // A low-discrepancy pair folded into the triangle, so a face is evenly
        // covered rather than clumped along one edge.
        let u = (i * 0.6180339887) % 1;
        let v = (i * 0.7548776662) % 1;
        if (u + v > 1) {
          u = 1 - u;
          v = 1 - v;
        }
        const w = 1 - u - v;
        const x = (ICOSA[a][0] * w + ICOSA[b][0] * u + ICOSA[c][0] * v) * shellRadius;
        const y = (ICOSA[a][1] * w + ICOSA[b][1] * u + ICOSA[c][1] * v) * shellRadius;
        const z = (ICOSA[a][2] * w + ICOSA[b][2] * u + ICOSA[c][2] * v) * shellRadius;
        emit(
          [x, y * 0.96, z],
          Role.Body,
          // Inside out, so assembly has a direction to read.
          shellIndex * 0.2 + (faceIndex / ICOSA_FACES.length) * 0.24,
          shellIndex,
        );
      }
    });
  });

  // The edges, drawn through every shell. This is the part that makes it a
  // structure rather than three shells of confetti.
  const wireBudget = n - emit.made;
  const perEdge = Math.max(4, Math.floor(wireBudget / (ICOSA_EDGES.length * shells.length)));
  shells.forEach((shellRadius, shellIndex) => {
    for (const [a, b] of ICOSA_EDGES) {
      for (let i = 0; i < perEdge; i++) {
        const t = (i + 0.5) / perEdge;
        const x = (ICOSA[a][0] + (ICOSA[b][0] - ICOSA[a][0]) * t) * shellRadius;
        const y = (ICOSA[a][1] + (ICOSA[b][1] - ICOSA[a][1]) * t) * shellRadius;
        const z = (ICOSA[a][2] + (ICOSA[b][2] - ICOSA[a][2]) * t) * shellRadius;
        emit([x, y * 0.96, z], Role.Second, shellIndex * 0.2 + 0.1 + t * 0.14, shellIndex);
      }
    }
  });
}

/* ---------------------------------------------------------------- 03 proof -- */

/**
 * A lattice that builds itself out of a field, and a proof that leaves it.
 *
 * The composition is the argument: the field is enormous and diffuse, the
 * lattice is precise, and the object that departs is very small. Heavy work
 * inside the network, compact result to settlement.
 */
function lattice(emit: Emitter, n: number) {
  const half = 0.68;
  const divisions = 3;
  const step = (half * 2) / divisions;

  // Lattice: every axis-aligned segment of a 4x4x4 grid.
  const segments: Array<[[number, number, number], [number, number, number]]> = [];
  for (let i = 0; i <= divisions; i++) {
    for (let j = 0; j <= divisions; j++) {
      const a = -half + i * step;
      const b = -half + j * step;
      segments.push([
        [a, b, -half],
        [a, b, half],
      ]);
      segments.push([
        [a, -half, b],
        [a, half, b],
      ]);
      segments.push([
        [-half, a, b],
        [half, a, b],
      ]);
    }
  }

  const latticeBudget = Math.floor(n * 0.58);
  const perSegment = Math.max(2, Math.floor(latticeBudget / segments.length));
  segments.forEach(([a, b], index) => {
    for (let i = 0; i < perSegment; i++) {
      const t = (i + 0.5) / perSegment;
      emit(
        [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
        Role.Body,
        // Segments arrive in a sweep across the cube rather than all at once.
        (index / segments.length) * 0.7 + t * 0.12,
        0,
      );
    }
  });

  // The computational field: a wide hollow volume the lattice is drawing from.
  const fieldCount = Math.floor(n * 0.32);
  for (let i = 0; i < fieldCount; i++) {
    const dir = fibonacciSphere(i, fieldCount);
    const wobble = 0.82;
    const r = 1.02 + Math.pow((i * 0.6180339887) % 1, 0.7) * 0.62;
    emit(
      [dir[0] * r, dir[1] * r * 0.7 * wobble, dir[2] * r],
      Role.Second,
      (i % 97) / 97,
      0,
    );
  }

  // The proof itself. Deliberately tiny.
  const kernel = n - emit.made;
  for (let i = 0; i < kernel; i++) {
    const dir = fibonacciSphere(i, Math.max(1, kernel));
    const f = facet(dir[0], dir[1], dir[2]);
    const r = 0.1 * (0.6 + 0.7 * Math.pow(f, 4));
    emit([dir[0] * r, dir[1] * r, dir[2] * r], Role.Third, i / Math.max(1, kernel), 0);
  }
}

/* ----------------------------------------------------------- 04 collateral -- */

/**
 * Assets held in a verification field before they are allowed to move.
 *
 * The orbiters are the assets already confirmed and circulating; the arrivals
 * are the ones being checked. The field between them is the whole point: an
 * asset does not pass through it until it has been confirmed.
 */
function orbit(emit: Emitter, n: number) {
  // Centre: an octahedral core, so the middle of the structure is a shape and
  // not a blob.
  const coreCount = Math.floor(n * 0.26);
  for (let i = 0; i < coreCount; i++) {
    const dir = fibonacciSphere(i, coreCount);
    const l = Math.abs(dir[0]) + Math.abs(dir[1]) + Math.abs(dir[2]);
    const r = 0.44 / Math.max(l, 0.001);
    emit([dir[0] * r, dir[1] * r, dir[2] * r], Role.Body, i / coreCount, 0);
  }

  // Orbiters: five confirmed assets on inclined ellipses.
  const orbiters = 5;
  const orbiterCount = Math.floor(n * 0.24);
  const perOrbiter = Math.floor(orbiterCount / orbiters);
  for (let o = 0; o < orbiters; o++) {
    for (let i = 0; i < perOrbiter; i++) {
      const dir = fibonacciSphere(i, perOrbiter);
      const f = facet(dir[0], dir[1], dir[2]);
      const r = 0.115 * (0.7 + 0.6 * Math.pow(f, 4));
      emit([dir[0] * r, dir[1] * r, dir[2] * r], Role.Second, o / orbiters, o);
    }
  }

  /*
   * The verification field: a cage the assets have to clear.
   *
   * A shell of evenly scattered points was the obvious thing and it was
   * invisible — a few hundred points spread over a sphere ten units across is
   * not a boundary, it is dust. Drawing the field along the edges of a
   * polyhedron puts the same points where they describe a shape, and a shape
   * around something reads as holding it.
   */
  const fieldBudget = Math.floor(n * 0.32);
  const perCage = Math.max(3, Math.floor((fieldBudget * 0.78) / ICOSA_EDGES.length));
  for (const [a, b] of ICOSA_EDGES) {
    for (let i = 0; i < perCage; i++) {
      const t = (i + 0.5) / perCage;
      const x = ICOSA[a][0] + (ICOSA[b][0] - ICOSA[a][0]) * t;
      const y = ICOSA[a][1] + (ICOSA[b][1] - ICOSA[a][1]) * t;
      const z = ICOSA[a][2] + (ICOSA[b][2] - ICOSA[a][2]) * t;
      emit([x * 1.04, y * 0.82, z * 1.04], Role.Third, t, 0);
    }
  }
  const haze = Math.max(0, fieldBudget - perCage * ICOSA_EDGES.length);
  for (let i = 0; i < haze; i++) {
    const dir = fibonacciSphere(i, Math.max(1, haze));
    emit([dir[0], dir[1] * 0.78, dir[2]], Role.Third, (i % 61) / 61, 1);
  }

  // Arrivals: three assets approaching from outside, one after another.
  const arrivals = 3;
  const arrivalCount = n - emit.made;
  const perArrival = Math.max(1, Math.floor(arrivalCount / arrivals));
  for (let a = 0; a < arrivals; a++) {
    for (let i = 0; i < perArrival; i++) {
      const dir = fibonacciSphere(i, perArrival);
      const f = facet(dir[0], dir[1], dir[2]);
      const r = 0.075 * (0.7 + 0.6 * Math.pow(f, 4));
      emit([dir[0] * r, dir[1] * r, dir[2] * r], Role.Fourth, a / arrivals, a);
    }
  }
}

/* ------------------------------------------------------------- 05 movement -- */

/**
 * A gateway of rings that only opens on a valid proof.
 *
 * Four rings, each with its own axis. Alignment is one number in the shader,
 * and everything the visitor understands about proof-gated movement comes from
 * watching that number reach one.
 */
function gate(emit: Emitter, n: number) {
  const rings = 4;
  const ringCount = Math.floor(n * 0.56);
  const perRing = Math.floor(ringCount / rings);
  for (let r = 0; r < rings; r++) {
    const radius = 0.42 + r * 0.17;
    for (let i = 0; i < perRing; i++) {
      const a = (i / perRing) * Math.PI * 2;
      // A little thickness, so a ring reads as a band of a structure and not a
      // drawn circle.
      const thickness = ((i * 0.6180339887) % 1) - 0.5;
      emit(
        [
          Math.cos(a) * radius,
          Math.sin(a) * radius,
          thickness * 0.045 + (r - (rings - 1) / 2) * 0.1,
        ],
        Role.Body,
        i / perRing,
        r,
      );
    }
  }

  // What is trying to get through. Roughly a third of it will not.
  const approach = Math.floor(n * 0.34);
  for (let i = 0; i < approach; i++) {
    const a = ((i * 0.6180339887) % 1) * Math.PI * 2;
    const rad = Math.sqrt(((i * 0.7548776662) % 1)) * 0.34;
    emit(
      [Math.cos(a) * rad, Math.sin(a) * rad, 0],
      Role.Second,
      (i % 53) / 53,
      // sub 1 marks a particle carrying valid proof.
      ((i * 0.3819660113) % 1) > 0.34 ? 1 : 0,
    );
  }

  // The pathway itself, lit only while the rings hold their alignment.
  const beam = n - emit.made;
  for (let i = 0; i < beam; i++) {
    const t = (i + 0.5) / Math.max(1, beam);
    const a = ((i * 0.6180339887) % 1) * Math.PI * 2;
    const rad = ((i * 0.7548776662) % 1) * 0.09;
    emit([Math.cos(a) * rad, Math.sin(a) * rad, (t - 0.5) * 1.5], Role.Third, t, 0);
  }
}

/* ------------------------------------------------------------- 06 recovery -- */

/**
 * Three routes between two points, one of which is carrying the process.
 *
 * The break is not a visual effect applied to a route — the route genuinely
 * stops being drawn, the network reorganises around it, and a different one
 * lights. The message is that the network adapts, so the geometry has to.
 */
function branch(emit: Emitter, n: number) {
  const from: [number, number, number] = [-0.92, -0.16, 0];
  const to: [number, number, number] = [0.92, 0.16, 0];
  const controls: Array<[number, number, number]> = [
    [0, 0.62, 0.3],
    [0.05, -0.58, -0.34],
    [-0.1, 0.1, 0.72],
  ];

  const routeBudget = Math.floor(n * 0.62);
  const perRoute = Math.floor(routeBudget / controls.length);
  controls.forEach((control, r) => {
    for (let i = 0; i < perRoute; i++) {
      const t = (i + 0.5) / perRoute;
      const p = bezier(from, control, to, t);
      emit(p, Role.Body, t, r);
    }
  });

  // The two ends. Small crystals, so the route has somewhere to leave from.
  const hubBudget = Math.floor(n * 0.2);
  const perHub = Math.floor(hubBudget / 2);
  [from, to].forEach((hub, h) => {
    for (let i = 0; i < perHub; i++) {
      const dir = fibonacciSphere(i, perHub);
      const f = facet(dir[0], dir[1], dir[2]);
      const r = 0.13 * (0.65 + 0.6 * Math.pow(f, 4));
      emit([hub[0] + dir[0] * r, hub[1] + dir[1] * r, hub[2] + dir[2] * r], Role.Third, i / perHub, h);
    }
  });

  // The process in transit.
  const packet = n - emit.made;
  for (let i = 0; i < packet; i++) {
    const dir = fibonacciSphere(i, Math.max(1, packet));
    const r = 0.055;
    emit([dir[0] * r, dir[1] * r, dir[2] * r], Role.Second, i / Math.max(1, packet), 0);
  }
}

/* -------------------------------------------------------- 07 multi-network -- */

/** Where the four settlement environments stand, and how big each one is. */
const ENVIRONMENTS: Array<{ at: [number, number, number]; scale: number }> = [
  { at: [-0.72, 0.4, -0.14], scale: 0.32 },
  { at: [-0.24, 0.5, 0.17], scale: 0.29 },
  { at: [0.24, 0.47, -0.17], scale: 0.3 },
  { at: [0.72, 0.38, 0.12], scale: 0.31 },
];

/**
 * Four settlement environments, and the layer running underneath all of them.
 *
 * Each environment gets a genuinely different topology — a chunky lattice, an
 * orbital body, a flat ring system, a tetrahedral frame — because the claim is
 * that they are different, and drawing four identical clusters in four colours
 * would say the opposite.
 */
function constellation(emit: Emitter, n: number) {
  const envBudget = Math.floor(n * 0.44);
  const perEnv = Math.floor(envBudget / ENVIRONMENTS.length);

  ENVIRONMENTS.forEach((env, e) => {
    for (let i = 0; i < perEnv; i++) {
      const dir = fibonacciSphere(i, perEnv);
      let local: [number, number, number];

      if (e === 0) {
        // Blocky lattice. Quantised onto a coarse grid so it reads as built.
        const q = (v: number) => Math.round(v * 2.2) / 2.2;
        local = [q(dir[0]), q(dir[1]), q(dir[2])];
      } else if (e === 1) {
        // Orbital body: a shell with two fast rings through it.
        if (i % 5 === 0) {
          const a = (i / perEnv) * Math.PI * 2 * 7;
          const tilt = i % 10 === 0 ? 0.5 : -0.35;
          local = [Math.cos(a) * 1.32, Math.sin(a) * 1.32 * tilt, Math.sin(a) * 1.32 * 0.8];
        } else {
          local = [dir[0], dir[1], dir[2]];
        }
      } else if (e === 2) {
        // Flat ring system, seen almost edge on from the global view.
        const a = ((i * 0.6180339887) % 1) * Math.PI * 2;
        const band = 0.7 + (((i * 0.7548776662) % 1) * 0.62);
        local = [Math.cos(a) * band, (((i * 0.3819660113) % 1) - 0.5) * 0.14, Math.sin(a) * band];
      } else {
        // Tetrahedral frame.
        const verts: Array<[number, number, number]> = [
          [0, 1.15, 0],
          [-1, -0.5, 0.62],
          [1, -0.5, 0.62],
          [0, -0.5, -1.05],
        ];
        const pair = i % 6;
        const table: Array<[number, number]> = [
          [0, 1],
          [0, 2],
          [0, 3],
          [1, 2],
          [2, 3],
          [3, 1],
        ];
        const [a, b] = table[pair];
        const t = ((i * 0.6180339887) % 1);
        local = [
          verts[a][0] + (verts[b][0] - verts[a][0]) * t,
          verts[a][1] + (verts[b][1] - verts[a][1]) * t,
          verts[a][2] + (verts[b][2] - verts[a][2]) * t,
        ];
      }

      emit(
        [
          env.at[0] + local[0] * env.scale,
          env.at[1] + local[1] * env.scale,
          env.at[2] + local[2] * env.scale,
        ],
        Role.Body,
        i / perEnv,
        e,
      );
    }
  });

  // The verification layer. A wide, shallow lattice underneath everything —
  // the one structure in the site that is deliberately flat, because the claim
  // is that QUFI is a layer and not another environment.
  const planeBudget = Math.floor(n * 0.4);
  const cols = Math.max(6, Math.round(Math.sqrt(planeBudget * 2.2)));
  const rows = Math.max(4, Math.floor(planeBudget / cols));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1);
      const v = r / (rows - 1);
      emit(
        [(u - 0.5) * 1.86, -0.3 + Math.sin(u * 6.1) * 0.02, (v - 0.5) * 0.8],
        Role.Fourth,
        u,
        r % 2,
      );
    }
  }

  // What joins them: each environment reaching down into the layer.
  const linkBudget = n - emit.made;
  const perLink = Math.max(2, Math.floor(linkBudget / ENVIRONMENTS.length));
  ENVIRONMENTS.forEach((env, e) => {
    for (let i = 0; i < perLink; i++) {
      const t = (i + 0.5) / perLink;
      emit(
        [
          env.at[0] * (1 - t) + env.at[0] * 0.5 * t,
          env.at[1] + (-0.3 - env.at[1]) * t,
          env.at[2] * (1 - t),
        ],
        Role.Fifth,
        t,
        e,
      );
    }
  });
}

/* ---------------------------------------------------------------- 08 flows -- */

/**
 * Three ecosystems, not three cards.
 *
 * Each stream has a different geometry as well as a different colour, because
 * tokenised assets, money and trade finance do not move the same way: one is
 * dense and directional, one circulates, one is structured and stepped.
 */
function streams(emit: Emitter, n: number) {
  // A ninth held back for the tails that join the streams to the network.
  const perStream = Math.floor((n * 0.88) / 3);

  for (let s = 0; s < 3; s++) {
    for (let i = 0; i < perStream; i++) {
      const t = (i + 0.5) / perStream;
      const spin = ((i * 0.6180339887) % 1) * Math.PI * 2;
      let p: [number, number, number];

      if (s === 0) {
        // Dense braid, travelling straight through the volume.
        const rad = 0.1 + 0.05 * Math.sin(t * 11.0);
        p = [
          (t - 0.5) * 2.0,
          0.52 + Math.sin(t * 5.2) * 0.08 + Math.sin(spin) * rad,
          0.46 + Math.cos(spin) * rad + Math.sin(t * 3.1) * 0.1,
        ];
      } else if (s === 1) {
        // A circulating loop: money comes back.
        const a = t * Math.PI * 2;
        const rad = 0.62 + Math.sin(a * 3) * 0.06;
        const jitter = 0.055;
        p = [
          Math.cos(a) * rad + Math.cos(spin) * jitter,
          -0.04 + Math.sin(a * 2) * 0.14 + Math.sin(spin) * jitter,
          Math.sin(a) * rad * 0.5 + Math.sin(spin * 1.7) * jitter,
        ];
      } else {
        // Stepped and structured, quantised onto a ladder.
        const step = Math.floor(t * 9) / 9;
        p = [
          (t - 0.5) * 1.9,
          -0.62 + step * 0.3,
          -0.44 + (((i * 0.7548776662) % 1) - 0.5) * 0.22 + Math.sin(step * 8) * 0.1,
        ];
      }

      emit(p, Role.Body, t, s);
    }
  }

  // What is left over joins the streams to the middle of the network, so they
  // read as connected to QUFI rather than passing nearby.
  const tail = n - emit.made;
  for (let i = 0; i < tail; i++) {
    const s = i % 3;
    const t = (i + 0.5) / tail;
    emit([(t - 0.5) * 1.4, (s - 1) * 0.34 * (1 - t), (t - 0.5) * 0.5], Role.Second, t, s);
  }
}

/* ------------------------------------------------------------------ build -- */

const GENERATORS: Partial<Record<StructureKind, (emit: Emitter, n: number) => void>> = {
  [StructureKind.Signature]: signature,
  [StructureKind.Lattice]: lattice,
  [StructureKind.Orbit]: orbit,
  [StructureKind.Gate]: gate,
  [StructureKind.Branch]: branch,
  [StructureKind.Constellation]: constellation,
  [StructureKind.Streams]: streams,
};

/**
 * Builds every structure into one set of buffers.
 *
 * `budget` is the total number of points the device can afford for structures.
 * It is split by each space's declared weight rather than evenly, because a
 * constellation of four environments needs more points to read than a gateway
 * of four rings.
 */
export function buildStructures(budget: number): StructureBuffers {
  const rng = createRng(0x9c17);
  const emit = createEmitter(rng);
  const index: number[] = [];

  const active: Array<{ space: Space; at: number }> = [];
  SPACES.forEach((space, at) => {
    if (space.kind !== StructureKind.Core) active.push({ space, at });
  });

  const totalWeight = active.reduce((sum, entry) => sum + entry.space.weight, 0);

  for (const { space, at } of active) {
    const generator = GENERATORS[space.kind];
    if (!generator) continue;
    const share = Math.max(320, Math.floor((budget * space.weight) / totalWeight));
    emit.begin();
    generator(emit, share);
    for (let i = 0; i < emit.made; i++) index.push(at, space.kind);
  }

  return {
    position: new Float32Array(emit.position),
    scatter: new Float32Array(emit.scatter),
    param: new Float32Array(emit.param),
    index: new Float32Array(index),
    // The whole buffer, not the last structure in it: `made` is scoped to one.
    count: emit.param.length / 4,
  };
}
