'use client';

import { useSyncExternalStore } from 'react';

/**
 * Where the visitor is in the lifecycle, and what it is doing.
 *
 * Split from the stage data next door because that has to be readable by a
 * server component and this cannot be. Two halves, the same way the rest of the
 * project splits them: the store changes a few times a minute and React
 * subscribes to it; the bus underneath changes sixty times a second and only
 * the frame loop and the shader ever read it.
 */

export interface LifeSnapshot {
  /** 0..STAGE_COUNT along the route. */
  at: number;
  /** Which stage that falls inside. */
  stage: number;
  /** Which beat of that stage. */
  beat: number;
  /** 0..1 within the stage. */
  local: number;
  ready: boolean;
}

const initial: LifeSnapshot = { at: 0, stage: 0, beat: 0, local: 0, ready: false };
let snapshot: LifeSnapshot = initial;
const listeners = new Set<() => void>();

export const life = {
  get: () => snapshot,
  set(patch: Partial<LifeSnapshot>) {
    let changed = false;
    for (const key of Object.keys(patch) as Array<keyof LifeSnapshot>) {
      if (snapshot[key] !== patch[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    snapshot = { ...snapshot, ...patch };
    for (const listener of listeners) listener();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  reset() {
    snapshot = initial;
    for (const listener of listeners) listener();
  },
};

export function useLife<T>(select: (snapshot: LifeSnapshot) => T): T {
  return useSyncExternalStore(
    life.subscribe,
    () => select(snapshot),
    () => select(initial),
  );
}
