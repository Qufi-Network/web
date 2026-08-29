'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Vector3 } from 'three';
import { SPACES, SPACE_COUNT, StructureKind } from '../Spaces';
import { orbitCamera, orbitFov, TRAVEL_START } from '../orbit';
import {
  ARRIVAL_SHARE,
  CYCLE_RATE,
  nav,
  probe,
  request,
  ROUTE_LENGTH,
  spaceRuntime,
  type ViewMode,
} from '../navigation';
import { experience } from '../ExperienceState';
import { stage } from '../stage';

/**
 * The camera as a way of moving through a place.
 *
 * There is one axis in this site and the wheel is on it. Scrolling does not
 * advance a page and does not zoom: it carries the visitor along a single
 * continuous route that starts in the open network, goes into the Core, moves
 * through what the Core does, flies out to post-quantum signing, moves through
 * that, and so on through all eight spaces before pulling back out to the whole
 * network again. There is no point on that route where the visitor has to stop
 * and choose something for it to continue.
 *
 * The route is one number.
 *
 *   [0, 1)          the open network, closing in
 *   [1+i, 2+i)      space i — the first quarter is the flight in, the rest is
 *                   that space's own sequence under the visitor's hand
 *   [9, 10]         pulling back out to the whole network
 *
 * Everything else is derived from it: which space is present, how far into its
 * sequence the visitor is, where the camera stands, and what the words say.
 * Selecting a structure or a point on the map is a shortcut onto the same
 * route rather than a different mode — it flies there and hands the wheel back.
 */

/** Seconds a shortcut flight takes. Long enough to read as travel. */
const FLIGHT_IN = 2.2;
const FLIGHT_OUT = 1.9;

/**
 * Share of a space's segment spent arriving in it.
 *
 * Declared with the store rather than here, because anything that wants to land
 * at a particular point inside a space has to agree with the director about
 * where that space's own sequence starts.
 */
const ARRIVAL = ARRIVAL_SHARE;

/** Where the open network sits at each end of the route. */
const OPEN_FROM = TRAVEL_START;
const OPEN_TO = 0.5;
const CLOSING = 0.1;

/** The last position on the route. */
const ROUTE_END = ROUTE_LENGTH;

/** Where the camera stands when it is looking at the Core from outside. */
const CORE_AXIS = new Vector3(0.26, 0.2, 1).normalize();

interface Shot {
  pos: Vector3;
  look: Vector3;
  fov: number;
}

const makeShot = (): Shot => ({ pos: new Vector3(), look: new Vector3(), fov: 42 });

interface Flight {
  active: boolean;
  t: number;
  duration: number;
  /** Where on the route the flight lands. */
  to: number;
  fromP: Vector3;
  fromT: Vector3;
  fromFov: number;
}

/** Cinematic in and out. Nothing in this project starts or stops abruptly. */
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function damp(current: number, target: number, rate: number, delta: number): number {
  return current + (target - current) * (1 - Math.exp(-delta * rate));
}

/** The point on the route where a space's own sequence begins. */
export function routeFor(index: number): number {
  return 1 + index + ARRIVAL;
}

export function SpaceDirector() {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);

  const flight = useRef<Flight>({
    active: false,
    t: 0,
    duration: FLIGHT_IN,
    to: 0,
    fromP: new Vector3(),
    fromT: new Vector3(),
    fromFov: 42,
  });

  const drag = useRef({
    down: false,
    moved: 0,
    lastX: 0,
    lastY: 0,
    az: 0,
    el: 0,
    azVel: 0,
    elVel: 0,
  });

  /** Position on the route, and where it is heading. */
  const route = useRef(0.0);
  const routeTarget = useRef(0.0);
  const azimuth = useRef(0);

  /** What a flick left behind, in route units a second, and what is building it. */
  const momentum = useRef(0);
  const flick = useRef(0);

  const shots = useMemo(
    () => ({
      out: makeShot(),
      from: makeShot(),
      to: makeShot(),
      project: new Vector3(),
      axis: new Vector3(),
      side: new Vector3(),
      up: new Vector3(0, 1, 0),
    }),
    [],
  );

  /* ------------------------------------------------------------- the input -- */

  useEffect(() => {
    const element = gl.domElement;
    const reduced = experience.get().reducedMotion;

    /**
     * Whether a gesture belongs to something else.
     *
     * The wheel and the finger are listened for on the window rather than on
     * the canvas, because on a phone the words take the bottom half of the
     * screen and a swipe that starts on them has to move the network like any
     * other swipe. A reading column that silently swallows the gesture is the
     * single most confusing thing this layout could do. The only exceptions are
     * the handful of things that are actually controls.
     */
    const onAControl = (target: EventTarget | null) =>
      target instanceof Element &&
      Boolean(
        target.closest('.link, .constellation, .back, .hud-mark, .centre-enter, .skip-opening'),
      );

    /**
     * One wheel, one axis.
     *
     * Trackpads report small continuous deltas and mice report large discrete
     * ones; normalising by line height and clamping makes both usable without
     * one of them being unusable. A notch moves a tenth of a space, so a space
     * takes ten of them — three to arrive and seven to move through what it
     * does — and the whole network about a hundred. A long scroll, but it is a
     * long journey, and it never stops to ask anything.
     */
    const onWheel = (event: WheelEvent) => {
      const snap = nav.get();
      if (snap.mode === 'BOOT' || snap.mode === 'INTRO' || snap.mode === 'TRAVEL') return;
      if (onAControl(event.target)) return;
      event.preventDefault();
      const raw = Math.max(
        -90,
        Math.min(90, event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY),
      );
      request.routeBy += raw / 900;
    };

    const onDown = (event: PointerEvent) => {
      drag.current.down = true;
      drag.current.moved = 0;
      drag.current.lastX = event.clientX;
      drag.current.lastY = event.clientY;
      element.setPointerCapture?.(event.pointerId);
    };

    const onMove = (event: PointerEvent) => {
      if (!drag.current.down) return;
      const dx = event.clientX - drag.current.lastX;
      const dy = event.clientY - drag.current.lastY;
      drag.current.lastX = event.clientX;
      drag.current.lastY = event.clientY;
      drag.current.moved += Math.abs(dx) + Math.abs(dy);
      if (reduced) return;
      // Dragging inspects. It is a lean on the camera, not a control of it: the
      // route is still deciding where the camera goes.
      drag.current.azVel -= (dx / Math.max(1, size.width)) * 2.6;
      drag.current.elVel += (dy / Math.max(1, size.height)) * 1.1;
    };

    const onUp = (event: PointerEvent) => {
      const wasDown = drag.current.down;
      drag.current.down = false;
      element.releasePointerCapture?.(event.pointerId);
      if (!wasDown) return;
      // A drag is an inspection; a tap is a decision. Twelve pixels of movement
      // is the line between them, which is forgiving enough for a thumb.
      if (drag.current.moved > 12) return;

      const snap = nav.get();
      if (snap.mode === 'TRAVEL' || snap.mode === 'BOOT' || snap.mode === 'INTRO') return;
      if (snap.hover >= 0) request.target = snap.hover;
    };

    const onKey = (event: KeyboardEvent) => {
      const snap = nav.get();
      if (snap.mode === 'BOOT' || snap.mode === 'INTRO') return;

      if (event.key === 'Escape') {
        request.target = -1;
        return;
      }
      // The spaces are numbered on screen, so the numbers work.
      const digit = Number.parseInt(event.key, 10);
      if (!Number.isNaN(digit) && digit >= 1 && digit <= SPACE_COUNT) {
        request.target = digit - 1;
        return;
      }
      /*
       * An arrow moves about a beat and a page moves about a space.
       *
       * A fifth of a space per press sounded reasonable and was not: three
       * presses carried straight past the space the visitor had just chosen
       * with a number key, which is the one thing a keyboard user cannot see
       * coming.
       */
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') request.routeBy += 0.12;
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') request.routeBy -= 0.12;
      if (event.key === 'PageDown') request.routeBy += 1;
      if (event.key === 'PageUp') request.routeBy -= 1;
      if (event.key === 'Home') request.routeTo = 0;
      if (event.key === 'End') request.routeTo = ROUTE_END;
    };

    /*
     * Touch.
     *
     * A swipe travels and a pinch travels, because both are the gesture people
     * already use for "further in" — and neither may be the only way to do it,
     * which is why the map is a row of real buttons.
     */
    let touchLast = 0;
    let touchAt = 0;
    let pinchLast = 0;
    let ignoring = false;

    const spread = (touches: TouchList) =>
      Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
      );

    const onTouchStart = (event: TouchEvent) => {
      ignoring = onAControl(event.target);
      // A new touch stops whatever the last flick was still doing, the way
      // putting a finger on a moving page stops it.
      momentum.current = 0;
      if (event.touches.length === 1) {
        touchLast = event.touches[0].clientY;
        touchAt = event.timeStamp;
      } else if (event.touches.length === 2) {
        pinchLast = spread(event.touches);
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      const snap = nav.get();
      if (ignoring) return;
      if (snap.mode === 'BOOT' || snap.mode === 'INTRO' || snap.mode === 'TRAVEL') return;

      if (event.touches.length === 2) {
        const now = spread(event.touches);
        request.routeBy += (now - pinchLast) / 320;
        pinchLast = now;
        return;
      }
      if (event.touches.length !== 1) return;

      const y = event.touches[0].clientY;
      const moved = (touchLast - y) / 300;
      const elapsed = Math.max(1, event.timeStamp - touchAt) / 1000;
      request.routeBy += moved;
      // Velocity in route units a second, smoothed, so one jittery sample at
      // the end of a swipe cannot become the whole flick.
      flick.current = flick.current * 0.6 + (moved / elapsed) * 0.4;
      touchLast = y;
      touchAt = event.timeStamp;
    };

    /**
     * The flick.
     *
     * Lifting a finger off a moving page does not stop it, and a network that
     * stops dead on release feels broken in a way no still frame shows. The
     * velocity the swipe ended at is handed to the director, which spends it
     * over the next second or so.
     */
    const onTouchEnd = () => {
      if (ignoring) {
        ignoring = false;
        return;
      }
      momentum.current = Math.max(-6, Math.min(6, flick.current));
      flick.current = 0;
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    element.addEventListener('pointerdown', onDown);
    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerup', onUp);
    element.addEventListener('pointercancel', onUp);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('wheel', onWheel);
      element.removeEventListener('pointerdown', onDown);
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerup', onUp);
      element.removeEventListener('pointercancel', onUp);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('keydown', onKey);
    };
  }, [gl, size.width, size.height]);

  /*
   * Somewhere to ask about the route without travelling it. Registered on
   * mount and cleared on unmount; nothing in the product reads it.
   */
  useEffect(() => {
    const spare = makeShot();
    probe.cameraAt = (at: number) => {
      shotAt(Math.max(0, Math.min(ROUTE_END, at)), spare);
      return { px: spare.pos.x, py: spare.pos.y, pz: spare.pos.z, fov: spare.fov };
    };
    return () => {
      probe.cameraAt = null;
    };
  });

  /* ------------------------------------------------------------- the frame -- */

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    const snap = nav.get();
    const reduced = experience.get().reducedMotion;

    // ---- each structure runs its own life, whether or not anyone is there --
    for (let i = 0; i < SPACE_COUNT; i++) {
      const runtime = spaceRuntime[i];
      runtime.phase = (runtime.phase + delta * CYCLE_RATE[i] * (reduced ? 0.45 : 1)) % 1;
    }

    if (snap.mode === 'BOOT' || snap.mode === 'INTRO') {
      // The opening owns the camera. All the structures do here is exist, very
      // faintly, so the network the visitor arrives in was always there.
      const arrival = Math.min(1, stage.reveal / 40);
      for (let i = 0; i < SPACE_COUNT; i++) {
        const runtime = spaceRuntime[i];
        runtime.presence = damp(runtime.presence, arrival * 0.5, 1.1, delta);
        runtime.focus = 0;
        runtime.activity = 0.5;
      }
      projectSpaces(camera, shots.project);
      return;
    }

    // A tall frame composes differently, and the camera is where that decision
    // has to be made rather than in the stylesheet.
    stage.portrait = size.height / Math.max(1, size.width) > 1.15 ? 1 : 0;

    if (!reduced) azimuth.current += delta * 0.016;

    // ---- shortcuts onto the route -------------------------------------------
    if (request.target !== null) {
      const target = request.target;
      request.target = null;
      momentum.current = 0;
      beginFlight(target < 0 ? 0.5 : routeFor(target));
    }

    // ---- moving along it ------------------------------------------------------
    if (flight.current.active) {
      const f = flight.current;
      f.t = Math.min(1, f.t + delta / f.duration);
      const eased = easeInOut(f.t);

      shotAt(f.to, shots.out);
      const cam = stage.camera;
      cam.px = f.fromP.x + (shots.out.pos.x - f.fromP.x) * eased;
      cam.py = f.fromP.y + (shots.out.pos.y - f.fromP.y) * eased;
      cam.pz = f.fromP.z + (shots.out.pos.z - f.fromP.z) * eased;
      cam.tx = f.fromT.x + (shots.out.look.x - f.fromT.x) * eased;
      cam.ty = f.fromT.y + (shots.out.look.y - f.fromT.y) * eased;
      cam.tz = f.fromT.z + (shots.out.look.z - f.fromT.z) * eased;
      cam.fov = f.fromFov + (shots.out.fov - f.fromFov) * eased;

      if (f.t >= 1) {
        f.active = false;
        route.current = f.to;
        routeTarget.current = f.to;
      }
    } else {
      if (request.routeTo !== null) {
        routeTarget.current = request.routeTo;
        request.routeTo = null;
      }
      // What the last flick is still worth, spent down over about a second.
      if (Math.abs(momentum.current) > 0.001) {
        request.routeBy += momentum.current * delta;
        // Spent down over about three quarters of a second. Longer than that
        // and a full-height swipe plus its flick carries past a whole space,
        // which means the visitor never sees the one they were aiming at.
        momentum.current *= Math.exp(-delta * 3.4);
        if (Math.abs(momentum.current) < 0.02) momentum.current = 0;
      }
      const before = routeTarget.current;
      routeTarget.current = Math.max(0, Math.min(ROUTE_END, routeTarget.current + request.routeBy));
      // Nothing left to give at either end. Carrying momentum into a wall means
      // the network sits still for a second after the finger has gone.
      if (routeTarget.current === before) momentum.current = 0;
      request.routeBy = 0;
      // Damped rather than set, so the wheel feels like moving something with
      // mass rather than scrubbing a timeline.
      route.current = damp(route.current, routeTarget.current, 3.0, delta);

      shotAt(route.current, shots.out);
      const cam = stage.camera;
      cam.px = shots.out.pos.x;
      cam.py = shots.out.pos.y;
      cam.pz = shots.out.pos.z;
      cam.tx = shots.out.look.x;
      cam.ty = shots.out.look.y;
      cam.tz = shots.out.look.z;
      cam.fov = shots.out.fov;
    }

    // ---- where that puts the visitor ------------------------------------------
    const at = flight.current.active ? flight.current.to : route.current;
    const active = spaceAt(at);
    const local = active >= 0 ? at - 1 - active : 0;
    const stageValue = active >= 0 ? Math.max(0, Math.min(1, (local - ARRIVAL) / (1 - ARRIVAL))) : 0;

    const mode: ViewMode = flight.current.active ? 'TRAVEL' : active >= 0 ? 'INSIDE' : 'ORBIT';
    const beats = active >= 0 ? (SPACES[active].sequence?.length ?? 1) : 1;
    const beat = Math.min(beats - 1, Math.floor(stageValue * beats * 0.999));

    if (
      snap.mode !== mode ||
      snap.active !== active ||
      snap.beat !== beat ||
      Math.abs(snap.stage - stageValue) > 0.01 ||
      Math.abs(snap.travel - at / ROUTE_END) > 0.003
    ) {
      nav.set({ mode, active, beat, stage: stageValue, travel: at / ROUTE_END });
    }
    // Reaching the middle of the Core is the one moment the site builds to.
    if (active === 0 && stageValue > 0.84) {
      if (!snap.revealed) nav.set({ revealed: true });
    } else if (snap.revealed) {
      nav.set({ revealed: false });
    }

    // Drag is a nudge that decays, not a position that persists — let go and
    // the network resumes its own drift rather than staying where it was left.
    const d = drag.current;
    d.az += d.azVel * delta * 6;
    d.el += d.elVel * delta * 6;
    d.azVel = damp(d.azVel, 0, 3.2, delta);
    d.elVel = damp(d.elVel, 0, 3.2, delta);
    d.az = damp(d.az, 0, 0.55, delta);
    d.el = Math.max(-0.45, Math.min(0.45, damp(d.el, 0, 0.55, delta)));

    // ---- presence, focus, and what the network does about it ----------------
    for (let i = 0; i < SPACE_COUNT; i++) {
      const runtime = spaceRuntime[i];
      const isActive = i === active;
      // Everything else steps back rather than disappearing: the visitor is
      // inside one part of a network, and they should be able to see that.
      const presenceTarget = active < 0 ? 1 : isActive ? 1 : 0.16;
      runtime.focus = damp(runtime.focus, isActive ? 1 : 0, 2.6, delta);
      runtime.presence = damp(runtime.presence, presenceTarget, 2.6, delta);
      runtime.activity = damp(runtime.activity, active < 0 ? 1 : isActive ? 1 : 0.5, 2.0, delta);
      runtime.stage = isActive ? stageValue : damp(runtime.stage, 0, 1.6, delta);
    }

    // The surrounding network quietens while the visitor is inside something.
    const inside = active >= 0 ? 1 : 0;
    stage.inside = damp(stage.inside, inside, 2.2, delta);
    stage.networkDim = damp(stage.networkDim, inside ? 0.22 : 0.92, 2.0, delta);
    stage.fieldDim = damp(stage.fieldDim, inside ? 0.35 : 0.8, 2.0, delta);
    stage.intensity = damp(stage.intensity, inside ? 0.28 : 0.72, 1.4, delta);
    stage.substrate = damp(stage.substrate, active === 6 ? 0.9 : 0.34, 1.6, delta);
    stage.pointerAmp = damp(stage.pointerAmp, reduced ? 0 : inside ? 0.9 : 2.1, 2.0, delta);
    stage.bow = damp(stage.bow, inside ? 1.2 : 3.0, 2.0, delta);
    stage.pointerRadius = 13;
    stage.parallax = damp(stage.parallax, reduced ? 0 : 1, 2.0, delta);
    stage.coherence = damp(stage.coherence, 1, 1.2, delta);

    // The Core is the one structure that is also a space: its focus drives its
    // own system rather than the structure field.
    stage.featurePresence = spaceRuntime[0].focus;
    stage.featureIndex = active < 0 ? 0 : active;

    // The whole scene takes on the colour of wherever the visitor is standing.
    const colour = active >= 0 ? SPACES[active].colour : null;
    const tintTarget = active >= 0 && active !== 0 ? 0.5 : 0;
    if (colour) {
      stage.tint.set(
        damp(stage.tint.x, colour[0] * 1.4, 2.0, delta),
        damp(stage.tint.y, colour[1] * 1.4, 2.0, delta),
        damp(stage.tint.z, colour[2] * 1.4, 2.0, delta),
      );
    } else {
      stage.tint.set(
        damp(stage.tint.x, 1, 2.0, delta),
        damp(stage.tint.y, 1, 2.0, delta),
        damp(stage.tint.z, 1, 2.0, delta),
      );
    }
    stage.tintAmount = damp(stage.tintAmount, tintTarget, 2.0, delta);

    // ---- what the pointer is over -------------------------------------------
    projectSpaces(camera, shots.project);
    if (mode === 'ORBIT') {
      const hover = pickSpace(stage.pointerX, stage.pointerY, size.width / size.height);
      if (hover !== nav.get().hover) nav.set({ hover });
    } else if (nav.get().hover !== -1) {
      nav.set({ hover: -1 });
    }
  });

  /* ---------------------------------------------------------------- helpers -- */

  /** Which space a position on the route falls inside, or -1 for open network. */
  function spaceAt(at: number): number {
    if (at < 1 || at >= 1 + SPACE_COUNT) return -1;
    return Math.min(SPACE_COUNT - 1, Math.floor(at - 1));
  }

  function beginFlight(to: number) {
    const f = flight.current;
    const cam = stage.camera;
    f.fromP.set(cam.px, cam.py, cam.pz);
    f.fromT.set(cam.tx, cam.ty, cam.tz);
    f.fromFov = cam.fov;
    f.to = to;
    f.t = 0;
    const reduced = experience.get().reducedMotion;
    const outward = spaceAt(to) < 0;
    f.duration = (outward ? FLIGHT_OUT : FLIGHT_IN) * (reduced ? 0.4 : 1);
    f.active = true;
    nav.set({ mode: 'TRAVEL', hover: -1 });
  }

  /**
   * The whole route, as one function of one number.
   *
   * Every segment hands over to the next by blending shots rather than by
   * switching between them, which is what makes a hundred notches of wheel one
   * continuous move instead of ten separate ones with joins in between.
   */
  function shotAt(at: number, out: Shot) {
    const index = spaceAt(at);

    if (index < 0) {
      if (at < 1) {
        // The open network, closing in as the visitor starts to move.
        openShot(OPEN_FROM + (OPEN_TO - OPEN_FROM) * Math.max(0, Math.min(1, at)), out);
        return;
      }
      // And the way back out of it at the end: the last structure gives up the
      // frame and the whole network comes back.
      const t = smoothstep(0, 1, at - 1 - SPACE_COUNT);
      spaceShot(SPACE_COUNT - 1, 1, shots.from);
      openShot(CLOSING, shots.to);
      blend(shots.from, shots.to, t, out);
      return;
    }

    const local = at - 1 - index;
    const push = Math.max(0, Math.min(1, (local - ARRIVAL) / (1 - ARRIVAL)));
    spaceShot(index, push, out);

    if (local < ARRIVAL) {
      // Arriving. The shot the visitor is leaving is wherever the route was
      // immediately before this space began.
      if (index === 0) openShot(OPEN_TO, shots.from);
      else spaceShot(index - 1, 1, shots.from);
      shots.to.pos.copy(out.pos);
      shots.to.look.copy(out.look);
      shots.to.fov = out.fov;
      blend(shots.from, shots.to, easeInOut(local / ARRIVAL), out);
    }
  }

  function blend(a: Shot, b: Shot, t: number, out: Shot) {
    out.pos.lerpVectors(a.pos, b.pos, t);
    out.look.lerpVectors(a.look, b.look, t);
    out.fov = a.fov + (b.fov - a.fov) * t;
  }

  /** The open network, seen from a spiral that closes in as travel rises. */
  function openShot(travel: number, out: Shot) {
    orbitCamera(
      {
        travel,
        drift: azimuth.current,
        dragAz: drag.current.az,
        dragEl: drag.current.el,
        pointerX: stage.pointerX,
        pointerY: stage.pointerY,
        // Seen from higher up on a tall frame, so the depth of the network
        // becomes height on the screen instead of nothing at all.
        lift: stage.portrait * 0.34,
      },
      out.pos,
      out.look,
    );
    out.fov = orbitFov(travel);
    // The whole network gets the same treatment on a tall frame: further back
    // so it fits across, and aimed low so it sits above the reading.
    if (stage.portrait > 0) {
      /*
       * A tall frame stands back, but only as far as it has to.
       *
       * The whole network is about a hundred and ten units across and the
       * field of view is vertical, so a narrow frame sees less across and has
       * to retreat to hold all of it. It had been retreating half as far again
       * as that needed, which left the network a band across the top third of
       * a phone with the bottom half of the screen empty — technically the
       * whole thing, and far too small to be worth looking at.
       *
       * This is the distance that puts it edge to edge, and it is aimed barely
       * below centre rather than thirty units low: there is no reading column
       * on this shot to make room for, only the scroll line and the map, so
       * the network can have the middle of the screen.
       */
      out.pos.multiplyScalar(1.55);
      out.look.y -= 6;
    }
  }

  /**
   * Where the camera stands to look at a space.
   *
   * `push` is how far the visitor has travelled into it, 0..1: the camera comes
   * in, drops its lift, and swings a little around the structure, so being deep
   * inside a space genuinely looks different from having just arrived.
   */
  function spaceShot(index: number, push: number, out: Shot) {
    const space = SPACES[index];
    const anchor = space.anchor;
    const radius = space.radius;
    const view = space.view;

    if (space.kind === StructureKind.Core) {
      shots.axis.copy(CORE_AXIS);
    } else {
      shots.axis.set(anchor[0], anchor[1], anchor[2]).normalize();
    }
    shots.side.copy(shots.up).cross(shots.axis).normalize();

    const swing = push * 0.7 + drag.current.az * 0.5;
    const cos = Math.cos(swing);
    const sin = Math.sin(swing);
    const ox = shots.axis.x * cos + shots.side.x * sin;
    const oy = shots.axis.y;
    const oz = shots.axis.z * cos + shots.side.z * sin;
    const sx = shots.side.x * cos - shots.axis.x * sin;
    const sz = shots.side.z * cos - shots.axis.z * sin;

    /*
     * Travelling into a structure, not at it.
     *
     * A proportion rather than a subtraction. Taking a fixed number of radii
     * off the arrival distance puts the camera among the geometry of whichever
     * structure happens to be widest — the proof lattice is thirteen units
     * across and the visitor ended up standing inside one of its faces, where a
     * cube reads as scattered dots. Coming in by a quarter works for all seven.
     */
    /*
     * On a phone the composition turns through ninety degrees.
     *
     * There is no room beside a structure for the words about it, so the
     * structure takes the top of the frame and the words take the bottom. Three
     * things follow. The lateral offset goes, because the object belongs in the
     * middle of the width rather than to one side of it. The camera stands
     * further back, because the vertical field of view is fixed and a narrow
     * frame therefore shows less across. And the camera aims below the anchor,
     * which is the only way to put an object above the middle of a frame.
     */
    const tall = stage.portrait;
    const distance = radius * view.out * (1 - push * 0.26) * (1 + tall * 0.06);
    const lift = radius * view.up * (1 - push * 0.5) + drag.current.el * radius * 1.4;
    const lateral = radius * view.side * (1 - tall);

    out.pos.set(
      anchor[0] + ox * distance + sx * lateral,
      anchor[1] + oy * distance + lift,
      anchor[2] + oz * distance + sz * lateral,
    );
    out.look.set(anchor[0], anchor[1] - radius * 0.6 * tall, anchor[2]);
    out.fov = view.fov - push * 3;
  }

  /** Screen position and size of every structure, for picking and for labels. */
  function projectSpaces(cam: PerspectiveCamera, v: Vector3) {
    for (let i = 0; i < SPACE_COUNT; i++) {
      const space = SPACES[i];
      v.set(space.anchor[0], space.anchor[1], space.anchor[2]);
      const distance = v.distanceTo(cam.position);
      v.project(cam);
      const runtime = spaceRuntime[i];
      runtime.onScreen = v.z > 1 ? 0 : 1;
      runtime.screenX = v.x;
      runtime.screenY = v.y;
      // Projected radius in NDC. The height of the frustum at this distance is
      // what a world radius has to be measured against.
      const frustumHeight = 2 * Math.tan(((cam.fov * Math.PI) / 180) / 2) * Math.max(distance, 1);
      runtime.screenR = (space.radius * 2) / frustumHeight;
    }
  }

  /** Which structure the pointer is over, in NDC, or -1. */
  function pickSpace(px: number, py: number, aspect: number): number {
    let best = -1;
    let bestDistance = Infinity;
    for (let i = 0; i < SPACE_COUNT; i++) {
      const runtime = spaceRuntime[i];
      if (!runtime.onScreen || runtime.presence < 0.2) continue;
      const dx = (px - runtime.screenX) * aspect;
      const dy = py - runtime.screenY;
      const distance = Math.hypot(dx, dy);
      // A generous target: these are objects in a volume, not buttons, and a
      // structure that fills the frame should be clickable anywhere on it.
      const reach = Math.max(0.06, Math.min(0.5, runtime.screenR * 0.9));
      if (distance < reach && distance < bestDistance) {
        best = i;
        bestDistance = distance;
      }
    }
    return best;
  }

  return null;
}
