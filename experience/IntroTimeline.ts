'use client';

import gsap from 'gsap';
import { experience, type IntroBeat } from './ExperienceState';
import { stage } from './stage';

/**
 * The first thirty seconds, written as one timeline.
 *
 * Beats are placed on absolute seconds so the sequence can be read against the
 * storyboard, scrubbed while art-directing, and skipped to any point. Nothing
 * here starts a timeout of its own.
 */

/**
 * Emergence is measured in ranks, not fractions, so these are counts of
 * participants. Expressing them as fractions made the opening beat depend on the
 * device tier — one node out of five hundred and one out of two thousand are not
 * the same fraction, and the single opening point never lit at all on the larger
 * network. Counts mean the same thing everywhere.
 */
const REVEAL = {
  /** One node. Fade span is six ranks, so this has to clear it to light fully. */
  origin: 7,
  /** The nucleus quorum and its immediate relationships. */
  quorum: 26,
};

export interface TimelineHandles {
  timeline: gsap.core.Timeline;
  /** Jump to the invitation. Used by the skip control and by reduced motion. */
  skip: () => void;
  /** The visitor accepting the invitation. */
  enter: () => void;
  dispose: () => void;
}

/**
 * Crossing into the network.
 *
 * The invitation has to resolve into something, or it is a button that lies.
 * Accepting it opens the network up: the composition recentres, everything that
 * was held back comes up to full, and traffic goes to full rate. This is the
 * state the later phases will be entered from.
 */
export function playEntry() {
  const cam = stage.camera;
  gsap.to(stage, { intensity: 1, duration: 3.2, ease: 'power2.out', overwrite: 'auto' });
  gsap.to(stage, {
    networkDim: 1,
    fieldDim: 0.85,
    duration: 2.2,
    ease: 'power2.out',
    overwrite: 'auto',
  });
  gsap.to(stage, { pointerAmp: 2.3, bow: 3.4, duration: 2.0, ease: 'power2.out', overwrite: 'auto' });
  gsap.to(cam, {
    tx: 0,
    ty: 0,
    tz: 0,
    px: 0,
    py: 2,
    pz: 26,
    fov: 52,
    duration: 2.6,
    ease: 'power3.inOut',
    overwrite: 'auto',
  });
}

function beat(name: IntroBeat) {
  return () => experience.set({ beat: name });
}

export function buildIntroTimeline(options: {
  reducedMotion: boolean;
  /** Narrow viewports stack the Core above the wordmark instead of beside it. */
  portrait: boolean;
  /** Population of the network being revealed, in ranks. */
  nodeCount: number;
}): TimelineHandles {
  const timeline = gsap.timeline({ paused: true });
  const cam = stage.camera;

  // At the identity beat the Core has to give up the middle of the frame. It is
  // moved by shifting what the camera looks at, not where it stands — moving the
  // camera would just re-centre the same shot.
  const identityTarget = options.portrait ? { tx: 0, ty: 3.4, tz: 0 } : { tx: -5.5, ty: 0.6, tz: 0 };

  timeline.eventCallback('onUpdate', () => {
    experience.set({ elapsed: timeline.time() });
  });

  // ---- 0.0-3.0  a point in the dark --------------------------------------
  timeline.call(beat('VOID'), undefined, 0);
  timeline.set(stage, { reveal: REVEAL.origin }, 0.55);
  timeline.call(beat('FIRST_POINT'), undefined, 0.55);
  timeline.to(stage, { dim: 1, duration: 1.6, ease: 'power2.out' }, 0.55);

  // ---- the mark comes apart ----------------------------------------------
  // The DOM logo holds the centre while the network is dark. At three seconds
  // the pieces take over from it and the camera keeps going: the letter breaks
  // outward and past the lens rather than fading, so the visitor travels
  // through the mark into the network behind it.
  // The pieces come up while the drawn mark is still there and still still, so
  // the two overlap on an identical shape. Nothing appears; the same object
  // simply stops being a drawing and starts being particles.
  timeline.to(stage, { markPresence: 1, duration: 0.35, ease: 'none' }, 2.35);
  timeline.to(stage, { markBurst: 1, duration: 2.6, ease: 'power2.in' }, 2.7);
  timeline.to(stage, { markPresence: 0, duration: 0.8, ease: 'none' }, 5.0);

  // The approach does not stop when the mark does. It carries straight on into
  // the emergence, which is what keeps the opening one continuous move.
  timeline.to(cam, { pz: 52, py: 5, duration: 5.4, ease: 'power1.in' }, 0.55);

  // ---- 3.0-7.0  relationships --------------------------------------------
  timeline.call(beat('RELATIONSHIPS'), undefined, 3.0);
  timeline.to(stage, { reveal: REVEAL.quorum, duration: 3.7, ease: 'power2.out' }, 3.0);

  /*
   * The statement, over the network arriving.
   *
   * The stakes, a question, and its three answers, one at a time, in the middle of the frame
   * while the structure fills in behind them. Placed on the timeline rather
   * than derived from elapsed time so the store changes five times instead of
   * every frame.
   *
   * The interval tightens as they go. The question is given room; the answers
   * come back at each other, which is what makes them read as a reply rather
   * than four separate captions.
   */
  timeline.call(() => experience.set({ creed: 0 }), undefined, 5.0);
  timeline.call(() => experience.set({ creed: 1 }), undefined, 8.0);
  timeline.call(() => experience.set({ creed: 2 }), undefined, 10.9);
  timeline.call(() => experience.set({ creed: 3 }), undefined, 13.6);
  timeline.call(() => experience.set({ creed: 4 }), undefined, 16.2);
  timeline.call(() => experience.set({ creed: -1 }), undefined, 18.9);

  // ---- 7.0-12.0  the network becomes visible ------------------------------
  timeline.call(beat('EMERGENCE'), undefined, 7.0);
  // Overshooting the population by the fade span lets the last arrivals finish
  // resolving instead of stopping half lit.
  timeline.to(
    stage,
    { reveal: options.nodeCount + 8, duration: 5.4, ease: 'power2.inOut' },
    7.0,
  );
  timeline.to(stage, { intensity: 0.16, duration: 4.0, ease: 'none' }, 8.6);
  timeline.to(cam, { px: 11, py: 8, pz: 55, duration: 5.0, ease: 'sine.inOut' }, 7.0);

  // ---- 12.0-16.0  it answers back -----------------------------------------
  timeline.call(beat('RESPONSE'), undefined, 12.0);
  timeline.to(stage, { pointerAmp: 1.7, bow: 2.6, duration: 1.4, ease: 'power2.out' }, 12.0);
  timeline.to(stage, { pointerRadius: 13, parallax: 1, duration: 2.0, ease: 'power2.out' }, 12.0);
  timeline.to(stage, { intensity: 0.38, duration: 3.0, ease: 'none' }, 12.0);
  timeline.to(cam, { px: -15, py: 7, pz: 49, duration: 4.0, ease: 'sine.inOut' }, 12.0);

  // ---- 16.0-20.0  through it, not toward it -------------------------------
  // Each axis carries a different ease, which bends the path into a curve
  // without the bookkeeping of a spline. The wider lens sells the speed.
  timeline.call(beat('TRAVERSE'), undefined, 16.0);
  timeline.to(cam, { px: 7, duration: 4.4, ease: 'power2.inOut' }, 16.0);
  timeline.to(cam, { py: -3.5, duration: 4.4, ease: 'sine.inOut' }, 16.0);
  timeline.to(cam, { pz: 15, duration: 4.4, ease: 'power1.inOut' }, 16.0);
  timeline.to(cam, { tx: 3, ty: -1, tz: 5, duration: 3.0, ease: 'sine.inOut' }, 16.0);
  timeline.to(cam, { fov: 58, duration: 2.6, ease: 'power2.out' }, 16.0);
  timeline.to(cam, { fov: 46, duration: 2.4, ease: 'power2.inOut' }, 18.6);
  timeline.to(stage, { intensity: 0.62, duration: 3.0, ease: 'none' }, 16.0);

  // ---- 20.0-24.0  the Core forms ------------------------------------------
  timeline.call(beat('CORE'), undefined, 20.0);
  timeline.to(stage, { coherence: 1, duration: 3.8, ease: 'power2.inOut' }, 20.0);
  // The surrounding network steps back so the Core can hold the frame.
  timeline.to(stage, { networkDim: 0.68, fieldDim: 0.5, duration: 3.0, ease: 'power2.out' }, 20.4);
  timeline.to(cam, { tx: 0, ty: 0, tz: 0, duration: 2.4, ease: 'power2.inOut' }, 20.0);
  timeline.to(cam, { px: 2, py: 3.5, pz: 33, duration: 4.0, ease: 'power2.out' }, 20.0);

  // ---- 24.0-27.0  identity -------------------------------------------------
  timeline.call(beat('IDENTITY'), undefined, 24.0);
  timeline.to(stage, { intensity: 0.5, duration: 2.0, ease: 'none' }, 24.0);
  timeline.to(cam, { ...identityTarget, duration: 2.6, ease: 'power2.inOut' }, 24.0);
  timeline.to(
    cam,
    { px: -1, py: options.portrait ? 4.5 : 3, pz: options.portrait ? 38 : 31, duration: 6.0, ease: 'sine.inOut' },
    24.0,
  );

  // ---- 27.0-30.0  invitation ----------------------------------------------
  timeline.call(beat('INVITATION'), undefined, 27.0);
  timeline.to(stage, { networkDim: 0.82, fieldDim: 0.62, duration: 2.4, ease: 'power2.out' }, 27.0);
  timeline.set({}, {}, 30.0);

  const skip = () => {
    gsap.to(timeline, {
      time: 27.0,
      duration: timeline.time() < 24 ? 0.9 : 0.35,
      ease: 'power2.inOut',
      onComplete: () => timeline.play(),
    });
  };

  if (options.reducedMotion) {
    // Reduced motion gets the composition, not the choreography: the same final
    // frame, arrived at without the camera move.
    timeline.progress(1, false);
    timeline.pause();
    experience.set({ beat: 'INVITATION', elapsed: 30 });
  }

  return {
    timeline,
    skip,
    enter: playEntry,
    dispose: () => {
      timeline.eventCallback('onUpdate', null);
      timeline.kill();
    },
  };
}

/**
 * Which beat a given second belongs to. Used when the sequence is scrubbed
 * rather than played, where firing every callback in between is both wrong and
 * expensive.
 */
export function beatAt(seconds: number): IntroBeat {
  if (seconds >= 27) return 'INVITATION';
  if (seconds >= 24) return 'IDENTITY';
  if (seconds >= 20) return 'CORE';
  if (seconds >= 16) return 'TRAVERSE';
  if (seconds >= 12) return 'RESPONSE';
  if (seconds >= 7) return 'EMERGENCE';
  if (seconds >= 3) return 'RELATIONSHIPS';
  if (seconds >= 0.55) return 'FIRST_POINT';
  return 'VOID';
}
