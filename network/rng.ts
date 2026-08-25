/**
 * Deterministic pseudo-random source.
 *
 * The topology is regenerated on every load, so it has to come out identical
 * every time or the composition — which is art-directed against fixed camera
 * moves — changes under us. Seeded mulberry32: small, fast, good enough spread.
 */
export function createRng(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = ReturnType<typeof createRng>;

/** Uniform in [min, max). */
export function range(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Approximately normal, mean 0, sd 1. Sum of three uniforms is close enough. */
export function gaussian(rng: Rng): number {
  return (rng() + rng() + rng() - 1.5) * 1.1547;
}

/**
 * Evenly distributed directions on the unit sphere. Used for quorum seeds so
 * they never clump the way independent random directions do.
 */
export function fibonacciSphere(index: number, count: number): [number, number, number] {
  const phi = Math.acos(1 - (2 * (index + 0.5)) / count);
  const theta = Math.PI * (1 + Math.sqrt(5)) * (index + 0.5);
  return [
    Math.sin(phi) * Math.cos(theta),
    Math.sin(phi) * Math.sin(theta),
    Math.cos(phi),
  ];
}
