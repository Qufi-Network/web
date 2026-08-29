'use client';

import { Vector3 } from 'three';

/**
 * The global traverse.
 *
 * Not an orbit at a fixed radius — a spiral. Scrolling brings the camera down
 * and inward while the network turns past it, so travelling through the whole
 * network is one continuous move with real parallax rather than a zoom.
 *
 * It lives in its own module because two things need it and they must agree:
 * the director, which drives it while the visitor is exploring, and the opening,
 * whose last move has to land exactly where the director will pick the camera
 * up. A frame of disagreement between those two is a visible jump.
 */

export const ORBIT_FAR = 182;
export const ORBIT_NEAR = 46;

/**
 * Where the opening leaves the visitor: far enough out to see that the network
 * has places in it, close enough that they are structures and not specks.
 */
export const TRAVEL_START = 0.18;

export interface OrbitInput {
  /** 0..1 through the traverse. */
  travel: number;
  /** The slow, unattended drift. */
  drift: number;
  dragAz: number;
  dragEl: number;
  pointerX: number;
  pointerY: number;
  /**
   * Extra height to view it from, in radians.
   *
   * The network is a wide flat plan, and a tall narrow frame sees a wide flat
   * plan as a band across the middle with the screen empty above and below.
   * Looking down on it turns the depth of the thing into height on the screen,
   * which is the only way a phone gets to use the space it has.
   */
  lift?: number;
}

export function orbitCamera(input: OrbitInput, position: Vector3, look: Vector3) {
  const t = Math.max(0, Math.min(1, input.travel));
  const eased = t * t * (3 - 2 * t);
  const radius = ORBIT_FAR + (ORBIT_NEAR - ORBIT_FAR) * eased;
  // A full turn of the network across the traverse was too fast to read: at a
  // hundred and sixty units out, a tenth of the traverse swings the camera
  // twenty-five units sideways, which is a whip rather than a move. One radian
  // across the whole thing lets the parallax do the work instead.
  const az = input.drift + t * 1.0 + input.dragAz + input.pointerX * 0.09;
  const el =
    0.3 -
    eased * 0.26 +
    (input.lift ?? 0) +
    Math.sin(input.drift * 1.7) * 0.03 +
    input.dragEl * 0.6 +
    input.pointerY * 0.05;

  const cosEl = Math.cos(el);
  position.set(Math.sin(az) * cosEl * radius, Math.sin(el) * radius, Math.cos(az) * cosEl * radius);
  // Looking a little ahead of the middle rather than at it: a camera locked to
  // the origin reads as a turntable no matter how it is moving.
  look.set(Math.sin(az) * 5 * t, -1.5 * t, Math.cos(az) * 5 * t);
}

export function orbitFov(travel: number): number {
  return 40 + Math.max(0, Math.min(1, travel)) * 12;
}
