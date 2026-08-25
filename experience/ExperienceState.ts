'use client';

import { useSyncExternalStore } from 'react';

/**
 * The experience state machine.
 *
 * Every cinematic move in the project hangs off this. Keeping it as one small
 * store — rather than letting each section own its own timeline — is what stops
 * the sequencing turning into a pile of nested timeouts once the later phases
 * land.
 */
export type Phase =
  | 'BOOT'
  | 'INTRO'
  | 'DISCOVER'
  | 'NETWORK'
  | 'NODE_SELECTED'
  | 'DEEP_DIVE'
  | 'QUANTUM_TRANSITION'
  | 'SIGNAL'
  | 'ECOSYSTEM'
  | 'EXIT';

/** Named beats inside the opening sequence, in order. */
export type IntroBeat =
  | 'VOID'
  | 'FIRST_POINT'
  | 'RELATIONSHIPS'
  | 'EMERGENCE'
  | 'RESPONSE'
  | 'TRAVERSE'
  | 'CORE'
  | 'IDENTITY'
  | 'INVITATION';

export interface ExperienceSnapshot {
  phase: Phase;
  beat: IntroBeat;
  /** Seconds into the opening sequence. */
  elapsed: number;
  /** True once the visitor has moved a pointer or pressed a key. */
  engaged: boolean;
  /** Set when WebGL is unavailable or the context is lost. */
  degraded: boolean;
  reducedMotion: boolean;
  /** Node the pointer is nearest, or -1. */
  focusNode: number;
  fps: number;
  tier: string;
  /** Index of the chapter holding the frame, or -1 during the opening. */
  chapter: number;
  /**
   * Which line of the opening statement is on screen, or -1 for none. Set from
   * the timeline rather than derived from elapsed time, so it changes three
   * times rather than sixty times a second.
   */
  creed: number;
  /**
   * State of the demonstration transaction, from the economy model. Changes
   * rarely, so it is worth putting in the store rather than on the stage.
   */
  transaction: number;
}

const initial: ExperienceSnapshot = {
  phase: 'BOOT',
  beat: 'VOID',
  elapsed: 0,
  engaged: false,
  degraded: false,
  reducedMotion: false,
  focusNode: -1,
  fps: 60,
  tier: 'high',
  chapter: -1,
  creed: -1,
  transaction: 0,
};

let state: ExperienceSnapshot = initial;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export const experience = {
  get(): ExperienceSnapshot {
    return state;
  },
  set(patch: Partial<ExperienceSnapshot>) {
    let changed = false;
    for (const key of Object.keys(patch) as Array<keyof ExperienceSnapshot>) {
      if (state[key] !== patch[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    state = { ...state, ...patch };
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  reset() {
    state = initial;
    emit();
  },
};

/**
 * High-frequency values — elapsed time, fps, the focused node — deliberately do
 * not live here. React re-rendering at 60fps to move a number is wasted work,
 * so per-frame data is written to `stage` and read by whoever needs it.
 */
export function useExperience<T>(select: (snapshot: ExperienceSnapshot) => T): T {
  return useSyncExternalStore(
    experience.subscribe,
    () => select(experience.get()),
    () => select(initial),
  );
}

export function usePhase(): Phase {
  return useExperience((s) => s.phase);
}

export function useBeat(): IntroBeat {
  return useExperience((s) => s.beat);
}
