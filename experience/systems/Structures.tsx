'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ShaderMaterial,
} from 'three';
import { STRUCTURE_FRAGMENT, STRUCTURE_VERTEX } from '../../shaders/structure';
import { buildStructures } from '../../network/structures';
import { SPACE_COUNT } from '../Spaces';
import { spaceStateTexture, writeSpaceState } from '../spaceState';
import { useNetwork } from '../NetworkContext';
import { stage } from '../stage';

/**
 * Seven of the eight spaces, in one draw call.
 *
 * The geometry is built once and never touched. Everything that changes — where
 * a structure stands, how present it is, where it is in its own cycle, whether
 * the visitor is inside it — goes to the GPU as a four-row float texture, one
 * column per space, which the vertex shader samples.
 *
 * This system is mounted before the pathways, so it is the one that writes that
 * texture for the frame.
 */
export function Structures() {
  const { capability } = useNetwork();
  const viewport = useThree((state) => state.viewport);
  const material = useRef<ShaderMaterial>(null);
  const texture = useMemo(() => spaceStateTexture(), []);

  const geometry = useMemo(() => {
    const buffers = buildStructures(capability.structureCount);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(buffers.position, 3));
    geo.setAttribute('aScatter', new BufferAttribute(buffers.scatter, 3));
    geo.setAttribute('aParam', new BufferAttribute(buffers.param, 4));
    geo.setAttribute('aIndex', new BufferAttribute(buffers.index, 2));
    return geo;
  }, [capability.structureCount]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uSpaceState: { value: texture },
      uSpaceCount: { value: SPACE_COUNT },
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uSize: { value: 1.55 },
      uFogNear: { value: 6 },
      uFogFar: { value: 220 },
      uDim: { value: 0 },
      uMaxPointSize: { value: capability.maxPointSize },
      uPointer: { value: stage.pointer },
      uPointerAmp: { value: 0 },
    }),
    [texture, capability.maxPointSize],
  );

  useFrame(() => {
    writeSpaceState();

    const u = material.current?.uniforms;
    if (!u) return;
    u.uTime.value = stage.time;
    u.uDim.value = stage.dim;
    u.uFogFar.value = Math.max(stage.fogFar, 220);
    u.uPointerAmp.value = stage.pointerAmp;
    u.uPixelRatio.value = viewport.dpr;
  });

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={3}>
      <shaderMaterial
        ref={material}
        vertexShader={STRUCTURE_VERTEX}
        fragmentShader={STRUCTURE_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
