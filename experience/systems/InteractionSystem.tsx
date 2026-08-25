'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { experience } from '../ExperienceState';
import { useNetwork } from '../NetworkContext';
import { stage } from '../stage';

/**
 * Turns pointer and touch into a position inside the network.
 *
 * The interaction point is projected onto the plane the camera is currently
 * looking at, so it stays at the depth the visitor is actually looking into
 * rather than sliding along the near plane. Everything downstream — node
 * displacement, connection bending, which node is nearest — reads that one
 * world-space position.
 */

/** Where the influence point rests when nobody is pointing at anything. */
const PARKED = new Vector3(0, 0, 620);

export function InteractionSystem() {
  const { engine } = useNetwork();
  const { camera, gl } = useThree();

  const ndc = useRef(new Vector2(0, 0));
  const raycaster = useRef(new Raycaster());
  const plane = useRef(new Plane());
  const forward = useRef(new Vector3());
  const hit = useRef(new Vector3());
  const focusPoint = useRef(new Vector3());
  const active = useRef(false);
  const engaged = useRef(false);

  useEffect(() => {
    const element = gl.domElement;

    const engage = () => {
      if (engaged.current) return;
      engaged.current = true;
      experience.set({ engaged: true });
    };

    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      ndc.current.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      stage.pointerX = ndc.current.x;
      stage.pointerY = ndc.current.y;
      active.current = true;
      engage();
    };

    const onLeave = () => {
      active.current = false;
    };

    const onDown = (event: PointerEvent) => {
      onMove(event);
      // A press sends an instruction from wherever the visitor touched. The
      // network answering with real traffic is what separates this from a
      // hover state.
      engine.disturb(engine.focusNode);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Tab' || event.key === 'Enter' || event.key === ' ') engage();
    };

    element.addEventListener('pointermove', onMove, { passive: true });
    element.addEventListener('pointerdown', onDown, { passive: true });
    element.addEventListener('pointerleave', onLeave, { passive: true });
    window.addEventListener('keydown', onKey, { passive: true });
    return () => {
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerdown', onDown);
      element.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('keydown', onKey);
    };
  }, [gl, engine]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);

    if (!engaged.current && stage.pointerAmp > 0.001) {
      // Nobody has touched anything yet. Rather than let the beat where the
      // network becomes responsive pass unseen, the network demonstrates it:
      // an influence point traces a slow arc through the structure until the
      // visitor takes over. On a phone, where there is no hover, this is the
      // only way the moment ever happens.
      const t = stage.time * 0.55;
      hit.current.set(Math.cos(t) * 16, Math.sin(t * 0.7) * 7, Math.sin(t * 1.3) * 13);
      stage.pointer.lerp(hit.current, 1 - Math.exp(-delta * 2.4));
      engine.setPointer(stage.pointer.x, stage.pointer.y, stage.pointer.z, 6.5);
      return;
    }

    if (active.current && stage.pointerAmp > 0.001) {
      camera.getWorldDirection(forward.current);
      focusPoint.current.set(stage.camera.tx, stage.camera.ty, stage.camera.tz);
      plane.current.setFromNormalAndCoplanarPoint(forward.current, focusPoint.current);
      raycaster.current.setFromCamera(ndc.current, camera);
      if (raycaster.current.ray.intersectPlane(plane.current, hit.current)) {
        stage.pointer.lerp(hit.current, 1 - Math.exp(-delta * 12));
      }
    } else if (!active.current) {
      // Retreat rather than snap, so the network relaxes instead of springing
      // back the instant the pointer leaves.
      stage.pointer.lerp(PARKED, 1 - Math.exp(-delta * 2.2));
    }

    if (stage.pointerAmp > 0.001) {
      engine.setPointer(stage.pointer.x, stage.pointer.y, stage.pointer.z, 6.5);
    } else {
      engine.clearPointer();
    }
  });

  return null;
}
