'use client';

/**
 * What the scene shader is handed each frame.
 *
 * One row of numbers per figure, written by the director and uploaded by the
 * system that draws them. A mutable module-level object rather than React
 * state, for the usual reason: this changes sixty times a second and only the
 * frame loop and the shader ever read it.
 *
 * Sized when a journey is mounted, because a journey with eleven figures and a
 * journey with fifteen do not need the same amount of room and a fixed
 * allowance would be wrong for both.
 */

import type { Journey } from './journey';

export const bus = {
  /** How many figures the current journey has. */
  figures: 0,
  /**
   * Two rows of RGBA per figure, as one array.
   *
   * The first row is presence, activity, travel and a spare; the second is
   * where the figure stands, which the shader needs so a figure that turns can
   * turn about its own middle.
   */
  state: new Float32Array(8),
  /** The waypoints anything travelling rides, flattened, and how each bows. */
  path: new Float32Array(15),
  bend: new Float32Array(12),
  legs: 1,
  markScale: 5,
  /** Where the travelling thing is right now, in legs. Read by the camera. */
  travel: 0,
  /** Bumped when the shape of the above changes, so the system re-uploads. */
  version: 0,
};

/** Sizes the bus for a journey and writes the parts of it that never change. */
export function mountJourney(journey: Journey) {
  const count = journey.figures.length;
  bus.figures = count;
  bus.state = new Float32Array(count * 8);
  bus.legs = Math.max(1, journey.path.length - 1);
  bus.markScale = journey.markScale;
  bus.travel = 0;

  bus.path = new Float32Array(15);
  journey.path.forEach((point, i) => {
    if (i > 4) return;
    bus.path[i * 3] = point[0];
    bus.path[i * 3 + 1] = point[1];
    bus.path[i * 3 + 2] = point[2];
  });

  bus.bend = new Float32Array(12);
  journey.bend.forEach((point, i) => {
    if (i > 3) return;
    bus.bend[i * 3] = point[0];
    bus.bend[i * 3 + 1] = point[1];
    bus.bend[i * 3 + 2] = point[2];
  });

  // Where each figure stands, in the second row. Written once: figures do not
  // move, only the things riding the path do.
  journey.figures.forEach((figure, i) => {
    const at = (count + i) * 4;
    bus.state[at] = figure.at[0];
    bus.state[at + 1] = figure.at[1];
    bus.state[at + 2] = figure.at[2];
    bus.state[at + 3] = 0;
  });

  bus.version += 1;
}
