'use client';

import gsap from 'gsap';
import { Vector3 } from 'three';
import { nav } from './navigation';
import { orbitCamera, orbitFov, TRAVEL_START } from './orbit';
import { stage } from './stage';

/**
 * How the visitor arrives.
 *
 * Near-total darkness, one point, then another, then a field of them; a faint
 * network forming; the camera moving forward into it; a structure emerging at
 * the middle that nothing explains. Only then, two lines of type — and then the
 * type dissolves and the camera pulls back far enough to show that the thing it
 * travelled into has places in it.
 *
 * Three rules this had to obey. It is not a loading screen with a progress bar:
 * the network constructing itself *is* the load, and the three lines that
 * accompany it say what is actually happening. It ends by handing the camera to
 * the director at exactly the position the director will take over from, or the
 * join is a visible jump. And it must be skippable at any point, because a
 * visitor who has been here before should not have to watch it again.
 */

/**
 * Emergence is counted in participants, not fractions. A fraction means
 * something different on a network of five hundred and one of two thousand, and
 * the opening point never lights at all on the larger one.
 */
const REVEAL = {
  origin: 7,
  relationships: 34,
};

export interface OpeningHandles {
  timeline: gsap.core.Timeline;
  /** Straight to the network. Used by the skip control and by reduced motion. */
  skip: () => void;
  dispose: () => void;
}

/** Where the director will pick the camera up. The last move has to land here. */
export function openingRest(): { px: number; py: number; pz: number; fov: number } {
  const position = new Vector3();
  const look = new Vector3();
  orbitCamera(
    { travel: TRAVEL_START, drift: 0, dragAz: 0, dragEl: 0, pointerX: 0, pointerY: 0 },
    position,
    look,
  );
  return { px: position.x, py: position.y, pz: position.z, fov: orbitFov(TRAVEL_START) };
}

export function buildOpening(options: {
  reducedMotion: boolean;
  /** Population of the network being revealed, in ranks. */
  nodeCount: number;
}): OpeningHandles {
  const timeline = gsap.timeline({ paused: true });
  const cam = stage.camera;
  const rest = openingRest();

  // The camera starts close to where the first points will appear, so the
  // opening is an approach rather than a reveal at distance.
  Object.assign(cam, { px: 0, py: 3, pz: 62, tx: 0, ty: 0, tz: 0, fov: 46 });
  stage.dim = 0;
  stage.reveal = 0;
  stage.intensity = 0;
  stage.coherence = 0;
  stage.networkDim = 1;
  stage.fieldDim = 1;

  const boot = (value: number) => () => nav.set({ boot: value });
  const title = (value: number) => () => nav.set({ title: value });

  /* ---- 0.0  darkness, and then one point ---------------------------------- */
  timeline.call(boot(0), undefined, 0);
  timeline.set(stage, { reveal: REVEAL.origin }, 0.45);
  timeline.to(stage, { dim: 1, duration: 1.8, ease: 'power2.out' }, 0.45);

  /* ---- 1.6  it acquires relationships ------------------------------------- */
  timeline.to(stage, { reveal: REVEAL.relationships, duration: 2.4, ease: 'power2.out' }, 1.6);
  timeline.call(boot(1), undefined, 2.4);

  /* ---- 3.4  the field, and the network behind it -------------------------- */
  // Overshooting the population by the fade span lets the last arrivals finish
  // resolving rather than stopping half lit.
  timeline.to(stage, { reveal: options.nodeCount + 8, duration: 4.6, ease: 'power2.inOut' }, 3.4);
  timeline.to(stage, { intensity: 0.34, duration: 3.4, ease: 'none' }, 3.8);
  timeline.to(stage, { fieldDim: 0.8, duration: 3.0, ease: 'power2.out' }, 3.8);

  // The approach. One continuous move from before the first point to past the
  // middle of the network — the whole opening is one shot.
  timeline.to(cam, { pz: 34, py: 6, duration: 6.4, ease: 'power1.inOut' }, 0.45);
  timeline.to(cam, { px: 9, duration: 5.2, ease: 'sine.inOut' }, 2.2);

  /* ---- 6.2  the network answers ------------------------------------------- */
  timeline.to(stage, { pointerAmp: 1.9, bow: 2.8, duration: 1.6, ease: 'power2.out' }, 6.2);
  timeline.to(stage, { pointerRadius: 13, parallax: 1, duration: 2.0, ease: 'power2.out' }, 6.2);
  timeline.call(boot(2), undefined, 6.6);
  timeline.call(() => nav.set({ online: true }), undefined, 6.6);

  /* ---- 7.0  through it, not toward it ------------------------------------- */
  // Each axis carries a different ease, which bends the path into a curve
  // without the bookkeeping of a spline. The wider lens sells the speed.
  timeline.to(cam, { px: -6, duration: 3.6, ease: 'power2.inOut' }, 7.0);
  timeline.to(cam, { py: -2.6, duration: 3.6, ease: 'sine.inOut' }, 7.0);
  timeline.to(cam, { pz: 19, duration: 3.6, ease: 'power1.inOut' }, 7.0);
  timeline.to(cam, { fov: 58, duration: 2.2, ease: 'power2.out' }, 7.0);
  timeline.to(stage, { intensity: 0.6, duration: 2.0, ease: 'none' }, 7.0);

  /* ---- 9.4  a structure at the middle, and no explanation of it ----------- */
  timeline.to(stage, { coherence: 1, duration: 3.4, ease: 'power2.inOut' }, 9.4);
  timeline.to(stage, { networkDim: 0.62, fieldDim: 0.46, duration: 2.6, ease: 'power2.out' }, 9.8);
  timeline.to(cam, { fov: 44, duration: 2.6, ease: 'power2.inOut' }, 9.4);
  timeline.to(cam, { px: 3, py: 3.4, pz: 30, duration: 3.6, ease: 'power2.out' }, 9.4);

  /* ---- 12.4  two lines, and only two ------------------------------------- */
  timeline.call(title(0), undefined, 12.4);
  timeline.call(title(1), undefined, 14.0);

  /* ---- 16.4  the type dissolves and the network opens out ----------------- */
  // The pull-back is the point of this beat: the visitor has been inside one
  // structure for four seconds and now finds out it was one of eight.
  timeline.call(title(2), undefined, 16.4);
  timeline.to(stage, { networkDim: 0.92, fieldDim: 0.8, duration: 3.0, ease: 'power2.out' }, 16.4);
  timeline.to(stage, { intensity: 0.72, duration: 3.0, ease: 'none' }, 16.4);
  timeline.to(
    cam,
    { px: rest.px, py: rest.py, pz: rest.pz, fov: rest.fov, duration: 4.4, ease: 'power2.inOut' },
    16.4,
  );
  timeline.to(cam, { tx: 0, ty: 0, tz: 0, duration: 3.0, ease: 'power2.inOut' }, 16.4);
  timeline.call(title(-1), undefined, 18.6);

  /* ---- 20.8  the visitor has the network --------------------------------- */
  timeline.call(
    () => nav.set({ mode: 'ORBIT', entered: true, travel: TRAVEL_START, title: -1 }),
    undefined,
    20.8,
  );
  timeline.set({}, {}, 21.0);

  const skip = () => {
    // Nothing here is a state machine that has to be stepped through, so a skip
    // is a fast scrub rather than a jump: the network still constructs itself,
    // it just does it in a second.
    gsap.to(timeline, {
      time: 20.9,
      duration: timeline.time() < 12 ? 1.1 : 0.5,
      ease: 'power2.inOut',
      onComplete: () => {
        timeline.pause();
        nav.set({ mode: 'ORBIT', entered: true, online: true, title: -1, travel: TRAVEL_START });
      },
    });
  };

  if (options.reducedMotion) {
    // Reduced motion gets the composition, not the choreography: the same
    // arrival, without the flight.
    timeline.progress(1, false);
    timeline.pause();
    nav.set({ mode: 'ORBIT', entered: true, online: true, boot: 2, title: -1 });
  }

  return {
    timeline,
    skip,
    dispose: () => {
      timeline.kill();
    },
  };
}

/** The three lines the construction sequence says while it is happening. */
export const BOOT_LINES = ['INITIALISING NETWORK', 'VERIFYING ENVIRONMENT', 'NETWORK ONLINE'];
