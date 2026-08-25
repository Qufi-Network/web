'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useNetwork } from '../NetworkContext';
import { experience } from '../ExperienceState';
import { stage } from '../stage';

/**
 * Runs the simulation and pushes its two dynamic buffers to the GPU.
 *
 * Mounted first in the scene so it lands at the front of the frame callback
 * list: everything drawn this frame reads state produced this frame, never last
 * frame's. It is the only component that writes to the engine.
 */
export function NetworkDriver() {
  const { engine, nodeStateTexture, edgeStateTexture } = useNetwork();

  const fps = useRef({ accumulator: 0, frames: 0 });

  useFrame((_, rawDelta) => {
    // A tab returning from the background hands back a delta of several
    // seconds. Letting that through would teleport every signal in flight.
    const delta = Math.min(rawDelta, 1 / 20);

    engine.revealLevel = stage.reveal;
    engine.intensity = stage.intensity;
    engine.tick(delta);

    nodeStateTexture.needsUpdate = true;
    edgeStateTexture.needsUpdate = true;

    stage.time += delta;
    // Bursts are struck, not held: whatever set one to full, it falls away on
    // its own from here.
    stage.featureBurst = Math.max(0, stage.featureBurst - delta * 0.85);
    stage.focusNode = engine.focusNode;

    fps.current.accumulator += delta;
    fps.current.frames++;
    if (fps.current.accumulator >= 0.5) {
      stage.fps = Math.round(fps.current.frames / fps.current.accumulator);
      fps.current.accumulator = 0;
      fps.current.frames = 0;
      experience.set({ fps: stage.fps, focusNode: engine.focusNode });
    }
  });

  return null;
}
