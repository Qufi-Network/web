'use client';

import { useSyncExternalStore } from 'react';
import { SPACES, SPACE_COUNT } from './Spaces';

/**
 * Where the visitor is.
 *
 * There is no router in this project and no page position. There is one route
 * through the whole network and the visitor is somewhere on it, so "where you
 * are" is a position, the space that position falls inside, and how far into
 * that space's own sequence it has got — and this is the only place any of that
 * is written down.
 *
 * Two halves, for the same reason the rest of the project splits them: the
 * store below changes a handful of times a minute and React subscribes to it;
 * the arrays underneath change sixty times a second and only the frame loop and
 * the shaders ever read them.
 */

export type ViewMode =
  /** Nothing has been drawn yet. */
  | 'BOOT'
  /** The opening: darkness, first points, the network forming, the title. */
  | 'INTRO'
  /** The open network, at either end of the route. */
  | 'ORBIT'
  /** A scripted flight: a shortcut onto some other point of the route. */
  | 'TRAVEL'
  /** Inside a space, moving through what it does. */
  | 'INSIDE';

export interface NavSnapshot {
  mode: ViewMode;
  /** The space being entered, occupied, or left. -1 in the global view. */
  active: number;
  /** The space the pointer is currently over, or -1. */
  hover: number;
  /** 0..1 through the active space's internal sequence. */
  stage: number;
  /** Which beat of that sequence the stage lands on. */
  beat: number;
  /** 0..1 along the whole route, from the open network to the open network. */
  travel: number;
  /** 0..2 through the loading sequence. */
  boot: number;
  /**
   * Which part of the opening statement is on screen: -1 none, 0 the mark,
   * 1 the mark and the line under it, 2 dissolving back into the network.
   */
  title: number;
  /** True once the network has finished constructing itself. */
  online: boolean;
  /** True once the visitor has gone through the opening. */
  entered: boolean;
  /** True once the visitor has reached the middle of the Core. */
  revealed: boolean;
}

const initial: NavSnapshot = {
  mode: 'BOOT',
  active: -1,
  hover: -1,
  stage: 0,
  beat: 0,
  travel: 0,
  boot: 0,
  title: -1,
  online: false,
  entered: false,
  revealed: false,
};

let snapshot: NavSnapshot = initial;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export const nav = {
  get: () => snapshot,
  set(patch: Partial<NavSnapshot>) {
    let changed = false;
    for (const key of Object.keys(patch) as Array<keyof NavSnapshot>) {
      if (snapshot[key] !== patch[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    snapshot = { ...snapshot, ...patch };
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useNav<T>(select: (snapshot: NavSnapshot) => T): T {
  return useSyncExternalStore(
    nav.subscribe,
    () => select(snapshot),
    () => select(initial),
  );
}

/* --------------------------------------------------------- per-frame state -- */

/**
 * What the structure shader is handed each frame, one entry per space.
 *
 * `presence` is visibility in the composition, `focus` is how much the visitor
 * is standing inside this space, `phase` is the structure's own endless cycle,
 * and `stage` is the visitor's hand on that cycle once they are inside.
 */
export interface SpaceRuntime {
  presence: number;
  focus: number;
  phase: number;
  stage: number;
  activity: number;
  /** Where the structure is on screen, and whether it is in front of the camera. */
  screenX: number;
  screenY: number;
  screenR: number;
  onScreen: number;
}

export const spaceRuntime: SpaceRuntime[] = SPACES.map(() => ({
  presence: 0,
  focus: 0,
  phase: 0,
  stage: 0,
  activity: 1,
  screenX: 0,
  screenY: 0,
  screenR: 0,
  onScreen: 0,
}));

/**
 * How fast each structure runs its own cycle when nobody is holding it.
 *
 * Deliberately unrelated numbers. Give eight structures the same period and the
 * whole network pulses in time, which reads as one animation rather than as
 * eight things going about their business.
 */
export const CYCLE_RATE = [0.041, 0.083, 0.062, 0.049, 0.071, 0.038, 0.055, 0.045];

/* --------------------------------------------------------------- commands -- */

/**
 * Requests queued for the director.
 *
 * The overlay and the keyboard both want to move the camera, and neither of
 * them runs inside the frame loop. Rather than let them write to the camera,
 * they leave a request here and the director picks it up on the next frame —
 * which is what stops two sources of movement fighting for one camera.
 */
export const request = {
  /** Space to jump to, or -1 to return to the open network. */
  target: null as number | null,
  /** Movement along the route, accumulated between frames. */
  routeBy: 0,
  /**
   * An absolute position on the route, for anything that knows where it wants
   * to be rather than how far to move: the capture harnesses, and a link.
   */
  routeTo: null as number | null,
};

export function enterSpace(index: number) {
  if (index < 0 || index >= SPACE_COUNT) return;
  request.target = index;
}

export function returnToNetwork() {
  request.target = -1;
}

/**
 * Move to an absolute position on the route, 0..1 across the whole journey.
 *
 * The route itself is measured in spaces — one unit per space, plus the open
 * network at each end — but nothing outside the director needs to know that, so
 * this takes the same normalised number the progress rail shows.
 */
export function travelTo(t: number) {
  request.routeTo = Math.max(0, Math.min(1, t)) * ROUTE_LENGTH;
}

/** Move to a point inside the space the visitor is already in, 0..1. */
export function stageTo(t: number) {
  const snap = nav.get();
  if (snap.active < 0) return;
  const clamped = Math.max(0, Math.min(1, t));
  request.routeTo = 1 + snap.active + ARRIVAL_SHARE + clamped * (1 - ARRIVAL_SHARE);
}

/**
 * The shape of the route, shared with the director.
 *
 * Kept here rather than imported from it because the director imports this
 * module, and a cycle between the two is how a store ends up initialised twice.
 */
export const ARRIVAL_SHARE = 0.4;
export const ROUTE_LENGTH = SPACE_COUNT + 2;

/**
 * A window into the route, for the harnesses.
 *
 * Whether the route is continuous is a question about the function, not about
 * the experience of scrolling it: sampling by wheel notch cannot separate a
 * fast flight from a seam, because both look like one large step. This lets a
 * harness ask where the camera would be at any position without moving the
 * visitor there, so continuity can be measured at whatever resolution the
 * question deserves.
 *
 * Set by the director on mount, read by nothing in the product.
 */
export const probe = {
  cameraAt: null as null | ((at: number) => { px: number; py: number; pz: number; fov: number }),
  /** Length of the route, in spaces. */
  length: ROUTE_LENGTH,
};

/** The label the coordinate readout shows: NETWORK, or NETWORK / PROOF. */
export function coordinate(snap: NavSnapshot): string {
  if (snap.active < 0) return 'NETWORK';
  return `NETWORK / ${SPACES[snap.active].nav}`;
}
