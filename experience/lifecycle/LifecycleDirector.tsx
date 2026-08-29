'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CatmullRomCurve3, Vector3 } from 'three';
import { experience } from '../ExperienceState';
import { stage } from '../stage';
import { pathAt, type Journey, type Vec3 } from './journey';
import { life } from './life';
import { bus, mountJourney } from './bus';

/**
 * One journey, from one end to the other, watched from inside it.
 *
 * Same idea as the route on the front of the site — one number, and everything
 * derived from it — but the number follows an instruction rather than a map,
 * and the camera flies a curve through the scene rather than cutting between
 * views of it. Each stage occupies a unit of the route, the first third of
 * which is the flight in and the rest of which is the thing happening.
 *
 * The flight is one continuous spline through every shot the journey asks for,
 * so there is no join to see: the camera arrives, drifts while something
 * happens, and leaves for the next place without ever stopping. Where the
 * subject is something crossing the scene, the shot rides beside it instead of
 * standing still and watching it go.
 *
 * Nothing is tweened. Every value is a function of the route position, which
 * is what makes scrolling back up unwind a mint rather than replay it.
 */

/** How much of a stage is spent arriving at it. */
const ARRIVAL = 0.3;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function damp(current: number, target: number, rate: number, delta: number): number {
  return current + (target - current) * (1 - Math.exp(-delta * rate));
}

/** How present a figure is, or 1 if the bus cannot say yet. */
function presenceOf(figure: number): number {
  const value = bus.state[figure * 4];
  return Number.isFinite(value) ? Math.min(1, value) : 1;
}

/** Linear read of a per-waypoint scalar at a continuous waypoint position. */
function sample(values: number[], p: number): number {
  const last = values.length - 1;
  const at = Math.max(0, Math.min(last, p));
  const i = Math.min(last - 1, Math.floor(at));
  const k = at - i;
  return values[i] + (values[i + 1] - values[i]) * k;
}

export function LifecycleDirector({ journey }: { journey: Journey }) {
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const camera = useThree((state) => state.camera);

  const route = useRef(0);
  const target = useRef(0);
  const momentum = useRef(0);
  const request = useRef({ by: 0, to: null as number | null });

  const stages = journey.stages;
  const count = stages.length;
  // Which row of the state array belongs to the thing that travels.
  const traveller = useMemo(
    () => journey.figures.findIndex((figure) => figure.id === journey.traveller),
    [journey],
  );
  // And which row belongs to whatever each label is naming.
  const named = useMemo(
    () => journey.marks.map((mark) => journey.figures.findIndex((figure) => figure.id === mark.names)),
    [journey],
  );

  /* --------------------------------------------------------------- the flight -- */

  /**
   * The whole camera move, built once.
   *
   * Two waypoints a stage — where the camera arrives and where it has drifted
   * to by the end — with one before the first and one after the last so the
   * curve has a tangent to start and finish on. A spline through those is a
   * single continuous flight rather than a series of moves with joins in it.
   */
  const flight = useMemo(() => {
    const eyes: Vector3[] = [];
    const looks: Vector3[] = [];
    const fovs: number[] = [];
    const rolls: number[] = [];
    const frames: number[] = [];
    const chases: number[] = [];

    const shotAt = (index: number, out: boolean) => {
      const shot = stages[index];
      const dir = new Vector3(...shot.from).normalize();
      // The drift across a stage is an arc, not a dolly: the camera swings
      // around what it is looking at while closing on it, which is the
      // difference between a held shot and a still frame.
      if (out) dir.applyAxisAngle(new Vector3(0, 1, 0), shot.swing);
      const distance = out ? shot.near : shot.far;
      const focus = new Vector3(...shot.focus);
      return {
        eye: focus.clone().addScaledVector(dir, distance),
        look: focus,
      };
    };

    // Before the first: further out along the same approach, so the journey
    // opens by coming in rather than by being there already.
    const first = shotAt(0, false);
    const opening = new Vector3(...stages[0].focus);
    eyes.push(opening.clone().addScaledVector(first.eye.clone().sub(opening).normalize(), stages[0].far * 1.5));
    looks.push(new Vector3(...stages[0].focus));
    fovs.push(stages[0].fov + 4);
    rolls.push(stages[0].roll);
    frames.push(stages[0].frame);
    chases.push(0);

    stages.forEach((shot, index) => {
      for (const out of [false, true]) {
        const { eye, look } = shotAt(index, out);
        eyes.push(eye);
        looks.push(look);
        fovs.push(shot.fov);
        rolls.push(shot.roll);
        frames.push(shot.frame);
        chases.push(shot.chase);
      }
    });

    // And after the last: a little further along the same drift, so the end of
    // the route eases rather than stopping dead.
    const lastEye = eyes[eyes.length - 1];
    const lastLook = looks[looks.length - 1];
    eyes.push(lastEye.clone().addScaledVector(lastEye.clone().sub(lastLook).normalize(), 12));
    looks.push(lastLook.clone());
    fovs.push(fovs[fovs.length - 1]);
    rolls.push(rolls[rolls.length - 1]);
    frames.push(frames[frames.length - 1]);
    chases.push(chases[chases.length - 1]);

    return {
      eye: new CatmullRomCurve3(eyes, false, 'centripetal', 0.5),
      look: new CatmullRomCurve3(looks, false, 'centripetal', 0.5),
      fovs,
      rolls,
      frames,
      chases,
      last: eyes.length - 1,
    };
  }, [stages]);

  /*
   * Sized during the render that mounts the journey rather than in an effect
   * afterwards.
   *
   * An effect runs after the first frame has already been drawn, and a frame
   * that reads a figure the bus has no room for yet gets `undefined` — which
   * multiplies into every label as NaN and stays NaN for the rest of the
   * session, because damping a NaN gives a NaN. One frame of wrong numbers,
   * permanently.
   */
  useMemo(() => mountJourney(journey), [journey]);

  const scratch = useMemo(
    () => ({
      eye: new Vector3(),
      look: new Vector3(),
      dir: new Vector3(),
      right: new Vector3(),
      up: new Vector3(0, 1, 0),
      unit: new Vector3(),
      ahead: new Vector3(),
      behind: new Vector3(),
      chaseEye: new Vector3(),
      chaseLook: new Vector3(),
      project: new Vector3(),
      point: [0, 0, 0] as Vec3,
      point2: [0, 0, 0] as Vec3,
    }),
    [],
  );

  /* ---------------------------------------------------------------- the input -- */

  useEffect(() => {
    const onAControl = (node: EventTarget | null) =>
      node instanceof Element && Boolean(node.closest('.link, .hud-mark, .life-skip, .applink, .ending'));

    const onWheel = (event: WheelEvent) => {
      if (onAControl(event.target)) return;
      event.preventDefault();
      const raw = Math.max(-90, Math.min(90, event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY));
      request.current.by += raw / 620;
    };

    let touchLast = 0;
    let touchAt = 0;
    let flick = 0;
    let ignoring = false;

    const onTouchStart = (event: TouchEvent) => {
      ignoring = onAControl(event.target);
      momentum.current = 0;
      if (event.touches.length === 1) {
        touchLast = event.touches[0].clientY;
        touchAt = event.timeStamp;
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (ignoring || event.touches.length !== 1) return;
      const y = event.touches[0].clientY;
      const moved = (touchLast - y) / 220;
      const elapsed = Math.max(1, event.timeStamp - touchAt) / 1000;
      request.current.by += moved;
      flick = flick * 0.6 + (moved / elapsed) * 0.4;
      touchLast = y;
      touchAt = event.timeStamp;
    };

    const onTouchEnd = () => {
      if (ignoring) {
        ignoring = false;
        return;
      }
      momentum.current = Math.max(-5, Math.min(5, flick));
      flick = 0;
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') request.current.by += 0.14;
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') request.current.by -= 0.14;
      if (event.key === 'PageDown') request.current.by += 1;
      if (event.key === 'PageUp') request.current.by -= 1;
      if (event.key === 'Home') request.current.to = 0;
      if (event.key === 'End') request.current.to = count;
      const digit = Number.parseInt(event.key, 10);
      if (!Number.isNaN(digit) && digit >= 1 && digit <= count) {
        request.current.to = digit - 1 + ARRIVAL;
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('keydown', onKey);
    };
  }, [gl, count]);

  /* ---------------------------------------------------------------- the frame -- */

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    const reduced = experience.get().reducedMotion;
    stage.portrait = size.height / Math.max(1, size.width) > 1.15 ? 1 : 0;

    if (request.current.to !== null) {
      target.current = request.current.to;
      route.current = request.current.to;
      request.current.to = null;
      momentum.current = 0;
    }
    if (Math.abs(momentum.current) > 0.001) {
      request.current.by += momentum.current * delta;
      momentum.current *= Math.exp(-delta * 3.2);
      if (Math.abs(momentum.current) < 0.02) momentum.current = 0;
    }
    const before = target.current;
    target.current = Math.max(0, Math.min(count, target.current + request.current.by));
    if (target.current === before) momentum.current = 0;
    request.current.by = 0;
    route.current = damp(route.current, target.current, 3.0, delta);

    const at = route.current;
    const index = Math.min(count - 1, Math.max(0, Math.floor(at)));
    const local = Math.max(0, Math.min(1, at - index));
    const told = Math.max(0, Math.min(1, (local - ARRIVAL) / (1 - ARRIVAL)));
    const beats = stages[index].beats.length;
    const beat = Math.min(beats - 1, Math.floor(told * beats * 0.999));

    const snap = life.get();
    if (
      snap.stage !== index ||
      snap.beat !== beat ||
      Math.abs(snap.at - at) > 0.004 ||
      Math.abs(snap.local - told) > 0.01
    ) {
      life.set({ at, stage: index, beat, local: told });
    }

    /* ---- what the journey is doing ---------------------------------------- */

    journey.score(at, bus.state);
    const travel = journey.travelAt(at);
    bus.travel = travel;

    /* ---- and where it is being watched from -------------------------------
     * One position on one spline. The waypoint index is continuous, so the
     * camera is always somewhere on the flight rather than somewhere between
     * two versions of it.
     */
    const waypoint = index * 2 + (local < ARRIVAL
      ? smoothstep(0, 1, local / ARRIVAL)
      : 1 + smoothstep(0, 1, (local - ARRIVAL) / (1 - ARRIVAL)));

    const u = Math.max(0, Math.min(1, waypoint / flight.last));
    flight.eye.getPoint(u, scratch.eye);
    flight.look.getPoint(u, scratch.look);

    /* ---- riding alongside, where there is something to ride alongside ------
     * A shot that follows the travelling thing sits behind and above it and
     * looks a little ahead of it, which is the difference between watching a
     * unit cross the network and watching a unit recede.
     */
    const chase = sample(flight.chases, waypoint);
    if (chase > 0.001) {
      pathAt(journey.path, journey.bend, travel, scratch.point);
      scratch.unit.set(scratch.point[0], scratch.point[1], scratch.point[2]);
      pathAt(journey.path, journey.bend, travel + 0.06, scratch.point2);
      scratch.ahead.set(scratch.point2[0], scratch.point2[1], scratch.point2[2]);
      pathAt(journey.path, journey.bend, travel - 0.06, scratch.point2);
      scratch.behind.set(scratch.point2[0], scratch.point2[1], scratch.point2[2]);

      scratch.dir.subVectors(scratch.ahead, scratch.behind).normalize();
      scratch.right.crossVectors(scratch.dir, scratch.up).normalize();

      scratch.chaseEye
        .copy(scratch.unit)
        .addScaledVector(scratch.dir, -24)
        .addScaledVector(scratch.right, 11)
        .addScaledVector(scratch.up, 9);
      scratch.chaseLook.copy(scratch.unit).addScaledVector(scratch.dir, 8);

      scratch.eye.lerp(scratch.chaseEye, chase);
      scratch.look.lerp(scratch.chaseLook, chase);
    }

    /* ---- and composed so the words never sit on top of the subject --------- */

    const tall = stage.portrait;
    scratch.dir.subVectors(scratch.look, scratch.eye);
    const distance = scratch.dir.length() || 1;
    scratch.dir.multiplyScalar(1 / distance);
    scratch.right.crossVectors(scratch.dir, scratch.up).normalize();

    /*
     * Aimed to one side of the subject rather than stood to one side of it.
     *
     * Moving the camera sideways and then looking at the same point changes the
     * angle and nothing else — the subject stays exactly where it was in the
     * frame. What puts it in the right-hand half is aiming to the left of it,
     * which is the same trick the tall frame uses to lift it into the top half.
     */
    const lateral = sample(flight.frames, waypoint) * distance * (1 - tall);
    scratch.look.addScaledVector(scratch.right, -lateral);
    // A tall frame has no room beside the subject, so the words go underneath
    // and the camera aims below what it is looking at to lift it into the top
    // half of the screen.
    scratch.look.y -= distance * 0.3 * tall;

    const cam = stage.camera;
    cam.px = scratch.eye.x;
    cam.py = scratch.eye.y;
    cam.pz = scratch.eye.z;
    cam.tx = scratch.look.x;
    cam.ty = scratch.look.y;
    cam.tz = scratch.look.z;
    cam.fov = sample(flight.fovs, waypoint);
    // Banking, in radians and deliberately small. Enough that a turn is felt;
    // not enough that anybody notices the horizon moving.
    cam.roll = reduced ? 0 : (sample(flight.rolls, waypoint) * Math.PI) / 180;

    /* ---- the labels on the things themselves ------------------------------
     * Projected here rather than in the overlay, because this is the only
     * place that has the camera and it already runs once a frame.
     */
    for (let m = 0; m < journey.marks.length; m++) {
      const mark = journey.marks[m];
      const wanted = mark.during.includes(index) ? 1 : 0;
      mark.on = damp(mark.on, wanted, 3.2, delta);
      // Held back until the thing it names has arrived. Guarded as well as
      // sized: a label that goes NaN never comes back, so it is worth two
      // lines to make that impossible rather than unlikely.
      const subject = named[m];
      if (subject >= 0) mark.on *= presenceOf(subject);
      if (mark.on < 0.01) continue;

      if (mark.at === 'travel') {
        pathAt(journey.path, journey.bend, travel, scratch.point);
        scratch.project.set(
          scratch.point[0],
          scratch.point[1] + (mark.lift ?? 0),
          scratch.point[2],
        );
        // The moving label is only worth showing while the thing it names is.
        if (traveller >= 0) mark.on *= presenceOf(traveller);
      } else {
        scratch.project.set(mark.at[0], mark.at[1] + (mark.lift ?? 0), mark.at[2]);
      }

      scratch.project.project(camera);
      /*
       * Behind the camera, or outside the frame.
       *
       * A label pinned to something that has moved off screen is pointing at
       * nothing, and it was also laying out past the right edge of the page —
       * which on a phone is a document wider than the screen and a layout that
       * slides under the thumb. Cheaper to not draw it.
       */
      if (scratch.project.z > 1 || Math.abs(scratch.project.x) > 1 || Math.abs(scratch.project.y) > 1) {
        mark.on = 0;
        continue;
      }
      mark.x = scratch.project.x;
      mark.y = scratch.project.y;
    }

    /* ---- and what the space around it is doing ----------------------------- */

    stage.intensity = damp(stage.intensity, 0.4, 1.6, delta);
    stage.coherence = damp(stage.coherence, 1, 1.2, delta);
    stage.networkDim = damp(stage.networkDim, 0.34, 2.0, delta);
    stage.fieldDim = damp(stage.fieldDim, 0.46, 2.0, delta);
    stage.substrate = damp(stage.substrate, 0.5, 1.6, delta);
    stage.pointerAmp = damp(stage.pointerAmp, reduced ? 0 : 1.1, 2.0, delta);
    stage.pointerRadius = 13;
    stage.bow = damp(stage.bow, 1.6, 2.0, delta);
    stage.parallax = damp(stage.parallax, reduced ? 0 : 1, 2.0, delta);
    stage.inside = damp(stage.inside, 0.7, 2.0, delta);
    stage.tint.set(
      damp(stage.tint.x, 0.5, 2.0, delta),
      damp(stage.tint.y, 1.1, 2.0, delta),
      damp(stage.tint.z, 1.2, 2.0, delta),
    );
    stage.tintAmount = damp(stage.tintAmount, 0.22, 2.0, delta);
  });

  return null;
}
