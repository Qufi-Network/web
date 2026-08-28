'use client';

import { useSyncExternalStore } from 'react';
import { STAGES } from './stages';

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

/** How many stages the journey has. Read from the data so the two agree. */
export const STAGE_COUNT = STAGES.length;

/**
 * What the flow shader is handed each frame.
 *
 * One object rather than one per part, because every value here is read by the
 * same draw call and they all change together. Every one of them is computed
 * from the position on the route rather than tweened, which is what makes
 * scrolling back up unwind a mint rather than replay it.
 */
export const flow = {
  /** 0..1 — how assembled the vault is. */
  vault: 0,
  /** 0..1 — the deposit arriving. */
  deposit: 0,
  /** 0..1 — how confirmed it is. */
  confirmed: 0,
  /** 0..1 — the unit existing. */
  unit: 0,
  /**
   * Where the unit is, as a position along vault -> core -> holder -> core.
   * 0 at the vault, 1 at the core, 2 at the holder, 3 back at the core.
   */
  carried: 0,
  /** 0..1 for each of the three anchors falling to the chain. */
  anchors: [0, 0, 0],
  /** 0..1 — the nullifier marked spent. */
  spent: 0,
  /** 0..1 — bitcoin leaving the vault again. */
  released: 0,
  /** 0..1 — how lit the chain itself is. */
  chain: 0,
  /** 0..1 — the registry. */
  registry: 0,
  /** 0..1 — how present the gates that do the checking are. */
  verifier: 0,
  /** 0..1 — a verification pass running through them. */
  verifying: 0,
};

export function resetFlow() {
  flow.vault = 0;
  flow.deposit = 0;
  flow.confirmed = 0;
  flow.unit = 0;
  flow.carried = 0;
  flow.anchors[0] = 0;
  flow.anchors[1] = 0;
  flow.anchors[2] = 0;
  flow.spent = 0;
  flow.released = 0;
  flow.chain = 0;
  flow.registry = 0;
  flow.verifier = 0;
  flow.verifying = 0;
}
