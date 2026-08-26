'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three';
import { FIELD_FRAGMENT, FIELD_VERTEX } from '../../shaders/field';
import { createRng } from '../../network/rng';
import { useNetwork } from '../NetworkContext';
import { stage } from '../stage';

/**
 * The field the network occupies.
 *
 * This is the one system that draws nothing structural, so it has to earn its
 * place: without something occupying the space between the camera and the
 * network, the traverse at sixteen seconds is indistinguishable from a zoom.
 * The points are hollowed out of the middle of the volume so they read as
 * surrounding medium rather than as noise mixed into the topology.
 */
export function ParticleField() {
  const { capability } = useNetwork();
  const viewport = useThree((state) => state.viewport);
  const material = useRef<ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const rng = createRng(0x5eed);
    const count = capability.fieldCount;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Rejection-free shell sampling: a cube rescaled onto a radius that never
      // falls inside the network itself.
      let x = rng() * 2 - 1;
      let y = rng() * 2 - 1;
      let z = rng() * 2 - 1;
      const length = Math.hypot(x, y, z) || 1;
      const radius = 34 + Math.pow(rng(), 0.6) * 88;
      x = (x / length) * radius;
      y = (y / length) * radius * 0.5;
      z = (z / length) * radius;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      seeds[i] = rng();
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    return geo;
  }, [capability.fieldCount]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uSize: { value: 1.5 },
      uPointer: { value: stage.pointer },
      uPointerAmp: { value: 0 },
      uPointerRadius: { value: 9 },
      uFogNear: { value: 10 },
      uNearCut: { value: 12 },
      uFogFar: { value: 190 },
      uDim: { value: 0 },
      uTint: { value: stage.tint },
      uTintAmount: { value: 0 },
    }),
    [],
  );

  useFrame(() => {
    const u = material.current?.uniforms;
    if (!u) return;
    u.uTime.value = stage.time;
    u.uPointerAmp.value = stage.pointerAmp;
    u.uPointerRadius.value = stage.pointerRadius;
    u.uDim.value = stage.dim * stage.fieldDim * 0.55;
    u.uNearCut.value = 12 + stage.inside * 40;
    u.uFogFar.value = stage.fogFar * 1.3;
    u.uTint.value = stage.tint;
    u.uTintAmount.value = stage.tintAmount;
    u.uPixelRatio.value = viewport.dpr;
  });

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={0}>
      <shaderMaterial
        ref={material}
        vertexShader={FIELD_VERTEX}
        fragmentShader={FIELD_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
