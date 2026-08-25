/**
 * Uniform-grid spatial index over static node positions.
 *
 * Used for one thing only: turning a pointer ray into "which node is the
 * visitor closest to". That question gets asked every frame, and a linear scan
 * over a couple of thousand nodes at 60fps is wasteful when the positions never
 * move on the CPU.
 */
export class SpatialHash {
  private readonly cell: number;
  private readonly buckets = new Map<number, number[]>();
  private readonly positions: Float32Array;

  constructor(positions: Float32Array, cell: number) {
    this.positions = positions;
    this.cell = cell;
    const count = positions.length / 3;
    for (let i = 0; i < count; i++) {
      const key = this.key(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      const bucket = this.buckets.get(key);
      if (bucket) bucket.push(i);
      else this.buckets.set(key, [i]);
    }
  }

  private key(x: number, y: number, z: number): number {
    const ix = Math.floor(x / this.cell) + 512;
    const iy = Math.floor(y / this.cell) + 512;
    const iz = Math.floor(z / this.cell) + 512;
    return (ix * 1024 + iy) * 1024 + iz;
  }

  /**
   * Nearest node to a point, or -1 if nothing lies within `radius`. Searches
   * the 27 cells around the point, widening once if they all come up empty.
   */
  nearest(x: number, y: number, z: number, radius: number, allow?: (id: number) => boolean): number {
    let best = -1;
    let bestDist = radius * radius;
    const rings = Math.max(1, Math.ceil(radius / this.cell));
    const cx = Math.floor(x / this.cell) + 512;
    const cy = Math.floor(y / this.cell) + 512;
    const cz = Math.floor(z / this.cell) + 512;
    for (let ox = -rings; ox <= rings; ox++) {
      for (let oy = -rings; oy <= rings; oy++) {
        for (let oz = -rings; oz <= rings; oz++) {
          const bucket = this.buckets.get(((cx + ox) * 1024 + (cy + oy)) * 1024 + (cz + oz));
          if (!bucket) continue;
          for (const id of bucket) {
            if (allow && !allow(id)) continue;
            const dx = this.positions[id * 3] - x;
            const dy = this.positions[id * 3 + 1] - y;
            const dz = this.positions[id * 3 + 2] - z;
            const d = dx * dx + dy * dy + dz * dz;
            if (d < bestDist) {
              bestDist = d;
              best = id;
            }
          }
        }
      }
    }
    return best;
  }
}
