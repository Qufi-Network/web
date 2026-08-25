'use client';

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CHAPTERS, positionAt, type ChapterCamera, type ChapterState } from '../Chapters';
import { experience } from '../ExperienceState';
import { useNetwork } from '../NetworkContext';
import { stage } from '../stage';

/**
 * Scrolling is descent.
 *
 * There are no scroll-triggered animations here and nothing fires once. The
 * scrollbar is a position in the network, and every value the scene reads is
 * interpolated from where that position falls between two chapters. That is
 * what makes scrolling back up work properly: there is no state to unwind,
 * because there is no state — only a position.
 *
 * The interpolation is smoothed rather than applied raw, so a trackpad flick
 * does not snap the camera across the network. The smoothing is on the value,
 * not on the scroll position, so the scrollbar always tells the truth.
 */

/** Blend of two chapter states. */
function blend(a: ChapterState, b: ChapterState, t: number): ChapterState {
  const mix = (x: number, y: number) => x + (y - x) * t;
  return {
    intensity: mix(a.intensity, b.intensity),
    networkDim: mix(a.networkDim, b.networkDim),
    fieldDim: mix(a.fieldDim, b.fieldDim),
    coherence: mix(a.coherence, b.coherence),
    instability: mix(a.instability, b.instability),
    substrate: mix(a.substrate, b.substrate),
    pointerAmp: mix(a.pointerAmp, b.pointerAmp),
    bow: mix(a.bow, b.bow),
    economy: mix(a.economy, b.economy),
    // Which district holds the frame is a choice, not a quantity: blending
    // between two of them would light a region nobody is looking at.
    district: t < 0.5 ? a.district : b.district,
    districtActivity: mix(a.districtActivity, b.districtActivity),
    moneyFlow: mix(a.moneyFlow, b.moneyFlow),
    tint: [mix(a.tint[0], b.tint[0]), mix(a.tint[1], b.tint[1]), mix(a.tint[2], b.tint[2])],
    tintAmount: mix(a.tintAmount, b.tintAmount),
  };
}

const CHAPTER_OF = Object.fromEntries(CHAPTERS.map((chapter, index) => [chapter.id, index]));

/** Smooth in and out, for camera travel inside a chapter. */
function ease(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function lerpCamera(a: ChapterCamera, b: ChapterCamera, t: number): ChapterCamera {
  const mix = (x: number, y: number) => x + (y - x) * t;
  return {
    px: mix(a.px, b.px),
    py: mix(a.py, b.py),
    pz: mix(a.pz, b.pz),
    tx: mix(a.tx, b.tx),
    ty: mix(a.ty, b.ty),
    tz: mix(a.tz, b.tz),
    fov: mix(a.fov, b.fov),
  };
}

/**
 * Maps progress through a journey chapter onto the state its systems read.
 *
 * All of it is a pure function of scroll position, which is what lets the
 * visitor scrub an asset back out of being tokenised, or pull a settlement
 * apart after it has completed, simply by scrolling up.
 */
/**
 * Advances whichever series a chapter presents.
 *
 * Capabilities and route stops behave identically: each is held long enough to
 * be read, then hands over to the next. Presence rises at the start of a hold
 * and falls at the end, so consecutive cards cross-fade rather than cut.
 */
function driveSeries(count: number, local: number) {
  const run = Math.max(0, Math.min(1, (local - 0.12) / 0.76));
  const at = run * count;
  stage.featureIndex = Math.min(count - 1, Math.floor(at));
  // Readings alternate sides of the frame, so consecutive ones are not laid
  // over the same part of the scene twice running.
  stage.featureSide = stage.featureIndex % 2 === 0 ? 1 : -1;
  const withinStep = at - Math.floor(at);
  // The approach is given nearly twice the room of the departure. A reading
  // travelling in from the depth of the network is the thing worth watching;
  // going back into it can be brisk.
  stage.featurePresence =
    run <= 0 || run >= 1 ? 0 : Math.min(1, Math.min(withinStep / 0.34, (1 - withinStep) / 0.18));
}

function driveJourney(id: string, local: number) {
  const chapter = CHAPTERS.find((entry) => entry.id === id);
  const series = chapter?.features ?? chapter?.stops;
  if (series && series.length) {
    driveSeries(series.length, local);
  } else {
    // A chapter with no readings has to say so. Left at its last value, the
    // presence kept the particle edge drawing itself around a card that was no
    // longer on screen — a rectangle of stray dots in the corner of chapters
    // that have nothing to do with it.
    stage.featurePresence = 0;
    stage.featureAnchor.visible = 0;
  }
  stage.stopActive = 0;

  if (id === 'assets') {
    const run = Math.max(0, Math.min(1, (local - 0.06) / 0.72));
    stage.assetPresence = Math.min(1, local / 0.08) * Math.min(1, (1 - local) / 0.06);
    // A hold at the start, so the object is seen as an object before anything
    // begins happening to it. Without it the bar has already come apart by the
    // time the first stop is legible.
    stage.assetStage = Math.max(0, (run - 0.16) / 0.84) * 5;
    // The last stop hands the asset to settlement, so its leg starts moving.
    stage.settleAsset = Math.max(0, Math.min(1, (local - 0.8) / 0.14));
    return;
  }

  if (id === 'money') {
    const run = Math.max(0, Math.min(1, (local - 0.06) / 0.7));
    stage.assetPresence = Math.max(0, 1 - local * 3);
    stage.assetStage = 5;
    // Both legs are now prepared, waiting for somewhere to meet.
    stage.settleAsset = 1;
    stage.settleMoney = Math.max(0, Math.min(1, (local - 0.84) / 0.14)) * 0.35;
    return;
  }

  if (id === 'settlement') {
    // The asset leg arrives first and then waits. The gap between the two is
    // the entire point of the chapter, so it is generous and deliberate — and
    // both are complete well before the camera starts handing over, so the
    // moment it settles is watched from the settlement point itself.
    stage.settleAsset = Math.max(0, Math.min(1, (local - 0.18) / 0.24));
    stage.settleMoney = Math.max(0, Math.min(1, (local - 0.4) / 0.24));
    stage.assetPresence = 0;
    return;
  }


  if (id === 'reveal') {
    // Everything running at once, which is the point of the pull-back.
    stage.settleAsset = 1;
    stage.settleMoney = 1;
    stage.stopActive = 0;
    return;
  }

  stage.stopActive = 0;
}

/**
 * Smootherstep. Chapters hold their own look through the middle of their span
 * and hand over quickly at the boundary, rather than cross-fading the whole way
 * and never quite being anywhere.
 */
function handover(t: number): number {
  // The changeover has to happen late. Starting it at two thirds meant a
  // chapter whose climax sits at nine tenths — the settlement completing, for
  // instance — was already being watched from the next chapter's camera by the
  // time it happened.
  const x = Math.max(0, Math.min(1, (t - 0.82) / 0.18));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

const SIGNAL_CHAPTER = CHAPTERS.findIndex((chapter) => chapter.id === 'signal');

export function ScrollDirector({ active }: { active: boolean }) {
  const { engine } = useNetwork();
  const target = useRef(0);
  const smoothed = useRef(0);
  const tourPoint = useRef({ x: 0, y: 0, z: 0 });
  const portrait = useRef(false);

  useEffect(() => {
    if (!active) return;
    const read = () => {
      const range = document.documentElement.scrollHeight - window.innerHeight;
      target.current = range > 0 ? window.scrollY / range : 0;
      portrait.current = window.innerHeight > window.innerWidth;
    };
    read();
    window.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read, { passive: true });
    return () => {
      window.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
    };
  }, [active]);

  useFrame((_, rawDelta) => {
    if (!active) return;
    const delta = Math.min(rawDelta, 1 / 20);

    smoothed.current += (target.current - smoothed.current) * (1 - Math.exp(-delta * 5.5));
    const position = positionAt(smoothed.current);
    stage.depth = position.absolute;
    stage.chapterLocal = position.local;

    const current = CHAPTERS[position.index];
    const next = CHAPTERS[Math.min(CHAPTERS.length - 1, position.index + 1)];
    const t = handover(position.local);

    const state = blend(current.state, next.state, t);

    /*
     * The register gets the screen to itself.
     *
     * At the end of the descent the camera is far enough back that a dimmed
     * network stops reading as a network at all - only its outermost shell
     * survives the falloff, and a sparse rectangle of leftover points is worse
     * than nothing behind a form. So the scene is taken all the way out as the
     * form arrives, leaving the mark and the one thing there is to do.
     *
     * Computed from depth here rather than read from stage.genesis, because the
     * overlay that sets that runs after this and would leave the scene a frame
     * behind the words it is supposed to be moving with.
     */
    const closing = position.absolute - (CHAPTERS.length - 1);
    const genesis = Math.max(0, Math.min(1, (closing - 0.5) / 0.2));
    const clear = 1 - genesis;

    stage.intensity = state.intensity * clear;
    stage.networkDim = state.networkDim * clear;
    stage.fieldDim = state.fieldDim * clear;
    stage.coherence = state.coherence;
    stage.instability = state.instability;
    stage.substrate = state.substrate * clear;
    stage.pointerAmp = state.pointerAmp;
    stage.bow = state.bow;
    stage.economy = state.economy;
    stage.district = state.district;
    stage.districtActivity = state.districtActivity;
    stage.moneyFlow = state.moneyFlow;
    // Eased rather than assigned, so a fast scroll slides the palette across
    // instead of cutting between two of them.
    const tintFollow = 1 - Math.exp(-delta * 3.2);
    stage.tint.x += (state.tint[0] - stage.tint.x) * tintFollow;
    stage.tint.y += (state.tint[1] - stage.tint.y) * tintFollow;
    stage.tint.z += (state.tint[2] - stage.tint.z) * tintFollow;
    stage.tintAmount += (state.tintAmount - stage.tintAmount) * tintFollow;

    // Journeys decay their own scalars unless the chapter they belong to is
    // driving them, so leaving a journey unwinds it rather than freezing it.
    stage.assetPresence = Math.max(0, stage.assetPresence - delta * 1.6);
    if (current.id !== 'qufi') stage.featurePresence = Math.max(0, stage.featurePresence - delta * 3);
    stage.settleAsset = Math.max(0, stage.settleAsset - delta * 0.8);
    stage.settleMoney = Math.max(0, stage.settleMoney - delta * 0.8);
    driveJourney(current.id, position.local);

    const cam = stage.camera;
    // A chapter that travels interpolates toward its own exit first, and only
    // then hands over to the next chapter.
    const a = current.cameraExit
      ? lerpCamera(current.camera, current.cameraExit, ease(position.local))
      : current.camera;
    const b = next.camera;
    cam.px = a.px + (b.px - a.px) * t;
    cam.py = a.py + (b.py - a.py) * t;
    cam.pz = a.pz + (b.pz - a.pz) * t;
    cam.tx = a.tx + (b.tx - a.tx) * t;
    cam.ty = a.ty + (b.ty - a.ty) * t;
    cam.tz = a.tz + (b.tz - a.tz) * t;
    cam.fov = a.fov + (b.fov - a.fov) * t;

    // A tall frame puts the copy across the top, where the scene would sit
    // behind it. Raising what the camera looks at drops the subject into the
    // clear space below without changing any chapter's composition.
    if (portrait.current) {
      cam.ty += 5;
      cam.pz *= 1.1;
    }

    /*
     * The scene moves out from under the reading.
     *
     * A card in the middle of the frame covers the very thing it is describing.
     * Putting it to one side is only half the fix — the network has to move the
     * other way, or one half of the screen carries everything and the other
     * half is empty. Shifting what the camera looks at moves the subject the
     * opposite way, which is exactly what is wanted here.
     */
    // Driven from the side alone rather than from presence, so the scene starts
    // moving at the changeover — while the outgoing reading is already gone and
    // the incoming one has not arrived. The network gets out of the way first,
    // and the card comes forward into the space it left.
    const running = stage.featurePresence > 0.001 || Math.abs(stage.featureShift) > 0.01;
    const wantedShift = portrait.current || !running ? 0 : stage.featureSideUsed;
    stage.featureShift += (wantedShift - stage.featureShift) * (1 - Math.exp(-delta * 2.6));
    cam.tx += stage.featureShift * 13;

    // Discovery four hands the camera to the instruction. The scrollbar stops
    // being a position in the story and becomes a position along the route.
    if (position.index === CHAPTER_OF.signal) {
      const progress = Math.max(0, Math.min(1, (position.local - 0.08) / 0.82));
      const stop = engine.driveTour(progress, tourPoint.current);
      stage.tour = Math.min(1, position.local / 0.12) * Math.min(1, (1 - position.local) / 0.1);
      stage.tourStop = stop;
      stage.tourPoint.set(tourPoint.current.x, tourPoint.current.y, tourPoint.current.z);
    } else {
      stage.tour = Math.max(0, stage.tour - delta * 2.5);
    }

    if (stage.chapter !== position.index) {
      stage.chapter = position.index;
      experience.set({ chapter: position.index, phase: 'NETWORK' });
    }
  });

  return null;
}
