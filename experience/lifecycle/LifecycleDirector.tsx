'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { experience } from '../ExperienceState';
import { stage } from '../stage';
import { HOLDER, STAGES, VAULT } from './stages';
import { flow, life, STAGE_COUNT } from './life';
import { MARKS } from './marks';

/**
 * One instruction, from one end to the other.
 *
 * Same idea as the route on the front of the site — one number, and everything
 * derived from it — but the number follows an instruction rather than a map.
 * Each stage occupies a unit, the first third of which is the camera arriving
 * and the rest of which is the thing happening.
 *
 * The lifecycle values are computed from that position rather than tweened, so
 * scrolling back up unwinds a mint exactly the way scrolling down performed it.
 * There is no state to get out of step with the wheel, because there is no
 * state.
 */

const ARRIVAL = 0.3;

/** Plain objects for the label maths, so nothing allocates in the frame loop. */
const VAULT_AT = VAULT;
const HOLDER_AT = { x: HOLDER[0], y: HOLDER[1], z: HOLDER[2] };
const ROUTE_END = STAGE_COUNT;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function damp(current: number, target: number, rate: number, delta: number): number {
  return current + (target - current) * (1 - Math.exp(-delta * rate));
}

/** How far past a point on the route we are, 0..1 over `span`. */
const since = (at: number, from: number, span: number) => smoothstep(from, from + span, at);

export function LifecycleDirector() {
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const camera = useThree((state) => state.camera);

  const route = useRef(0);
  const target = useRef(0);
  const momentum = useRef(0);
  const request = useRef({ by: 0, to: null as number | null });

  const scratch = useMemo(
    () => ({
      pos: new Vector3(),
      look: new Vector3(),
      out: new Vector3(),
      side: new Vector3(),
      up: new Vector3(0, 1, 0),
      project: new Vector3(),
    }),
    [],
  );

  /* ------------------------------------------------------------- the input -- */

  useEffect(() => {
    const element = gl.domElement;
    const onAControl = (node: EventTarget | null) =>
      node instanceof Element && Boolean(node.closest('.link, .hud-mark, .life-skip'));

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
      if (event.key === 'End') request.current.to = ROUTE_END;
      const digit = Number.parseInt(event.key, 10);
      if (!Number.isNaN(digit) && digit >= 1 && digit <= STAGE_COUNT) {
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
  }, [gl]);

  /* ------------------------------------------------------------- the frame -- */

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
    target.current = Math.max(0, Math.min(ROUTE_END, target.current + request.current.by));
    if (target.current === before) momentum.current = 0;
    request.current.by = 0;
    route.current = damp(route.current, target.current, 3.0, delta);

    const at = route.current;
    const index = Math.min(STAGE_COUNT - 1, Math.max(0, Math.floor(at)));
    const local = Math.max(0, Math.min(1, at - index));
    const told = Math.max(0, Math.min(1, (local - ARRIVAL) / (1 - ARRIVAL)));
    const beats = STAGES[index].beats.length;
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

    /* ---- the camera --------------------------------------------------------
     * Each stage has a point to look at and a direction to look from; between
     * stages the two shots are blended, so a hundred notches of wheel is one
     * continuous move rather than six cuts.
     */
    frameStage(index, told, scratch);
    if (local < ARRIVAL && index > 0) {
      const fromShot = { pos: new Vector3(), look: new Vector3(), fov: 44 };
      frameStage(index - 1, 1, fromShot as never);
      const t = smoothstep(0, ARRIVAL, local);
      scratch.pos.lerpVectors(fromShot.pos, scratch.pos, t);
      scratch.look.lerpVectors(fromShot.look, scratch.look, t);
    }

    const cam = stage.camera;
    cam.px = scratch.pos.x;
    cam.py = scratch.pos.y;
    cam.pz = scratch.pos.z;
    cam.tx = scratch.look.x;
    cam.ty = scratch.look.y;
    cam.tz = scratch.look.z;
    cam.fov = STAGES[index].fov;

    /* ---- what the lifecycle is doing ---------------------------------------
     * Every one of these is a function of the position on the route, which is
     * what makes scrolling back up unwind a mint rather than replay it.
     */
    flow.vault = since(at, 0.25, 0.6);
    flow.deposit = since(at, 1.2, 0.7);
    flow.confirmed = since(at, 1.7, 0.3);

    // The unit exists from the moment it is issued, and is carried from there.
    flow.unit = since(at, 2.62, 0.22);
    // 0 vault, 1 core, 2 holder, 3 back at the core.
    const toCore = since(at, 2.4, 0.3);
    const toHolder = since(at, 3.5, 0.45);
    const backToCore = since(at, 4.35, 0.4);
    flow.carried = toCore * 1 + toHolder * 1 + backToCore * 1;

    flow.anchors[0] = since(at, 2.82, 0.3);
    flow.anchors[1] = since(at, 3.95, 0.3);
    flow.anchors[2] = since(at, 4.92, 0.3);

    flow.spent = since(at, 4.55, 0.25);
    flow.released = since(at, 4.72, 0.5);
    flow.chain = since(at, 2.3, 0.8);
    flow.verifier = since(at, 1.85, 0.55);
    flow.registry = since(at, 4.2, 0.6);
    flow.verifying = Math.max(
      since(at, 2.4, 0.2) - since(at, 2.9, 0.3),
      Math.max(since(at, 3.4, 0.2) - since(at, 3.9, 0.3), since(at, 4.3, 0.2) - since(at, 4.8, 0.3)),
    );

    // The unit stops being carried once it has been redeemed.
    flow.unit *= 1 - since(at, 4.6, 0.3);

    /* ---- and the labels on the things themselves ---------------------------
     * Projected here rather than in the overlay, because this is the only place
     * that has the camera and it already runs once a frame.
     */
    for (const mark of MARKS) {
      const wanted = mark.during.includes(index) ? 1 : 0;
      mark.on = damp(mark.on, wanted, 3.2, delta);
      if (mark.on < 0.01) continue;
      // The unit is the one label that has to follow its subject.
      if (mark.id === 'unit') {
        const t = flow.carried;
        const core = { x: 0, y: 0, z: 0 };
        const from = t < 1 ? { x: VAULT_AT[0], y: VAULT_AT[1], z: VAULT_AT[2] } : t < 2 ? core : HOLDER_AT;
        const to = t < 1 ? core : t < 2 ? HOLDER_AT : core;
        const k = Math.max(0, Math.min(1, t < 1 ? t : t < 2 ? t - 1 : t - 2));
        const eased = k * k * (3 - 2 * k);
        scratch.project.set(
          from.x + (to.x - from.x) * eased,
          from.y + (to.y - from.y) * eased + 5,
          from.z + (to.z - from.z) * eased,
        );
        mark.on *= flow.unit;
      } else {
        scratch.project.set(mark.at[0], mark.at[1], mark.at[2]);
      }
      scratch.project.project(camera);
      if (scratch.project.z > 1) {
        mark.on = 0;
        continue;
      }
      mark.x = scratch.project.x;
      mark.y = scratch.project.y;
    }

    /* ---- and what the network around it is doing --------------------------- */
    stage.intensity = damp(stage.intensity, 0.4 + flow.verifying * 0.5, 1.6, delta);
    stage.coherence = damp(stage.coherence, 1, 1.2, delta);
    stage.networkDim = damp(stage.networkDim, 0.34, 2.0, delta);
    stage.fieldDim = damp(stage.fieldDim, 0.4, 2.0, delta);
    stage.substrate = damp(stage.substrate, 0.5, 1.6, delta);
    stage.pointerAmp = damp(stage.pointerAmp, reduced ? 0 : 1.1, 2.0, delta);
    stage.pointerRadius = 13;
    stage.bow = damp(stage.bow, 1.6, 2.0, delta);
    stage.parallax = damp(stage.parallax, reduced ? 0 : 1, 2.0, delta);
    stage.inside = damp(stage.inside, 0.7, 2.0, delta);
    // The core lights while it is verifying, which is the only time it is doing
    // anything in this scene.
    stage.tint.set(
      damp(stage.tint.x, 0.5, 2.0, delta),
      damp(stage.tint.y, 1.1, 2.0, delta),
      damp(stage.tint.z, 1.2, 2.0, delta),
    );
    stage.tintAmount = damp(stage.tintAmount, 0.22, 2.0, delta);

  });

  /** Where the camera stands for a stage, `told` through its own sequence. */
  function frameStage(index: number, told: number, out: { pos: Vector3; look: Vector3 }) {
    const shot = STAGES[index];
    scratch.out.set(shot.out[0], shot.out[1], shot.out[2]).normalize();
    scratch.side.copy(scratch.up).cross(scratch.out).normalize();

    // Drifts a little across the stage, so a stage that lasts ten notches is
    // not ten notches of a still frame.
    const swing = told * 0.24;
    const cos = Math.cos(swing);
    const sin = Math.sin(swing);
    const ox = scratch.out.x * cos + scratch.side.x * sin;
    const oz = scratch.out.z * cos + scratch.side.z * sin;
    const sx = scratch.side.x * cos - scratch.out.x * sin;
    const sz = scratch.side.z * cos - scratch.out.z * sin;
    const distance = shot.distance * (1 - told * 0.16);

    /*
     * A wide frame puts the words on the left and the subject on the right, so
     * the camera stands to the left of what it is looking at. A tall frame puts
     * the words underneath, so the subject wants the middle of the width and
     * the top of the height — the camera aims below it instead.
     */
    const tall = stage.portrait;
    const lateral = shot.side * (1 - tall);
    const drop = shot.distance * 0.3 * tall;

    out.pos.set(
      shot.look[0] + ox * distance + sx * lateral + stage.pointerX * 2.6,
      shot.look[1] + scratch.out.y * distance + told * 2 + stage.pointerY * 1.8,
      shot.look[2] + oz * distance + sz * lateral,
    );
    out.look.set(shot.look[0], shot.look[1] - drop, shot.look[2]);
  }

  return null;
}
