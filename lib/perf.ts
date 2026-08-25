/**
 * Adaptive resolution.
 *
 * Node and connection counts are fixed when the scene mounts — rebuilding
 * geometry mid-sequence would be visible, and the opening is art-directed
 * against a specific density. Resolution is the one lever that can be pulled
 * during the sequence without anyone noticing, so it is the only one that moves.
 */
export class FrameMonitor {
  private samples: number[] = [];
  private lastAdjust = 0;
  private raised = false;

  readonly floor: number;
  readonly ceiling: number;
  current: number;

  /** Rolling mean frame time in milliseconds, for reporting. */
  meanFrameTime = 16.7;

  constructor(ceiling: number, floor = 0.75) {
    this.ceiling = ceiling;
    this.floor = floor;
    this.current = ceiling;
  }

  /**
   * Feeds one frame. Returns a new pixel ratio when it should change, or null.
   * `now` is a monotonic clock in seconds.
   */
  sample(delta: number, now: number): number | null {
    this.samples.push(delta * 1000);
    if (this.samples.length < 50) return null;

    let total = 0;
    for (const value of this.samples) total += value;
    this.meanFrameTime = total / this.samples.length;
    this.samples.length = 0;

    // Two seconds between changes, so a single stutter never starts a cascade.
    if (now - this.lastAdjust < 2) return null;

    // 22ms is roughly 45fps: comfortably past the point where the motion in
    // this sequence starts to judder.
    if (this.meanFrameTime > 22 && this.current > this.floor) {
      this.current = Math.max(this.floor, this.current - 0.25);
      this.lastAdjust = now;
      return this.current;
    }

    // One promotion only. Oscillating between two resolutions looks worse than
    // sitting at the lower one.
    if (!this.raised && this.meanFrameTime < 12 && this.current < this.ceiling) {
      this.raised = true;
      this.current = Math.min(this.ceiling, this.current + 0.25);
      this.lastAdjust = now;
      return this.current;
    }

    return null;
  }
}
