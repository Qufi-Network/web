'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Vector3 } from 'three';
import { stage } from '../stage';

/**
 * The camera is a narrator, not a control.
 *
 * Nothing else in the experience is allowed to move it. The timeline writes
 * where it should be; this applies that with damping, adds the visitor's
 * parallax on top, and drives the lens. Damping matters more than it sounds:
 * without it, every timeline ease is applied to the camera raw, and the joins
 * between moves are visible as a change of velocity.
 */
export function CameraDirector() {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const desired = useRef(new Vector3());
  const target = useRef(new Vector3(0, 0, 0));
  const targetDesired = useRef(new Vector3());
  const chase = useRef(new Vector3());

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    const c = stage.camera;

    // Parallax is a lean, not a look: the camera shifts a little with the
    // pointer while the timeline keeps deciding where it is going.
    const lean = stage.parallax;
    desired.current.set(
      c.px + stage.pointerX * 3.4 * lean,
      c.py + stage.pointerY * 2.2 * lean,
      c.pz,
    );
    targetDesired.current.set(c.tx, c.ty, c.tz);

    // While the guided instruction is running, the camera stops being told
    // where to stand by the chapter and starts trailing the signal instead. It
    // is a blend rather than a switch, so handing control over and taking it
    // back are both continuous.
    if (stage.tour > 0.001) {
      const point = stage.tourPoint;
      // Sit back and slightly above the signal, looking at it.
      chase.current.set(point.x * 0.74 + 7, point.y + 6, point.z * 0.74 + 21);
      desired.current.lerp(chase.current, stage.tour);
      targetDesired.current.lerp(point, stage.tour);
    }

    const follow = 1 - Math.exp(-delta * 4.5);
    camera.position.lerp(desired.current, follow);
    target.current.lerp(targetDesired.current, follow);
    camera.lookAt(target.current);

    // Everything that fades with distance reads this, so a wide shot stays
    // legible without every system needing its own per-chapter tuning.
    stage.cameraDistance = camera.position.length();
    stage.fogFar = Math.max(150, stage.cameraDistance * 2.5);

    if (Math.abs(camera.fov - c.fov) > 0.01) {
      camera.fov += (c.fov - camera.fov) * follow;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
