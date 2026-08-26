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
  private raised = 0;

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

    /*
     * Coming back up.
     *
     * The threshold has to be read against vsync, not against zero. A display
     * refreshing at 60Hz cannot report a mean frame time below about 16.7ms
     * however much headroom the GPU has, so a promotion condition of twelve
     * milliseconds can never be met — resolution only ever went down, and one
     * heavy moment in the opening left the whole site soft for the rest of the
     * visit. 17.4ms means "hitting vsync with room to spare", which is the
     * thing that was meant.
     *
     * Two promotions, then it stops. Oscillating between resolutions looks
     * worse than sitting at the lower one.
     */
    if (this.raised < 2 && this.meanFrameTime < 17.4 && this.current < this.ceiling) {
      this.raised++;
      this.current = Math.min(this.ceiling, this.current + 0.25);
      this.lastAdjust = now;
      return this.current;
    }

    return null;
  }
}
