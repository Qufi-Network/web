'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  FloatType,
  NearestFilter,
  RGBAFormat,
  ShaderMaterial,
} from 'three';
import { SCENE_FRAGMENT, SCENE_VERTEX } from '../../shaders/scene';
import { buildScene } from '../../network/scene';
import { useNetwork } from '../NetworkContext';
import { stage } from '../stage';
import type { Journey } from './journey';
import { bus } from './bus';

/**
 * A whole walkthrough, in one draw call.
 *
 * Geometry built once from the journey's figures; a small texture written per
 * frame. Same arrangement as the structure field on the front of the site and
 * for the same reason — on the graphics these have to run on, the number of
 * draw calls matters far less than the number of lit pixels.
 *
 * The state goes through a texture rather than a uniform array because a
 * uniform array indexed by a value the shader computes is a limit that gets
 * hit, quietly, on exactly the hardware that can least afford a fallback.
 */
export function SceneSystem({ journey }: { journey: Journey }) {
  const { capability } = useNetwork();
  const viewport = useThree((state) => state.viewport);
  const material = useRef<ShaderMaterial>(null);

  const geometry = useMemo(() => {
    // A little more than a single structure gets on the front page: this scene
    // has one subject and can afford to spend its budget on it.
    const built = buildScene(
      journey.figures,
      Math.round(capability.structureCount * journey.budget),
    );
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(built.position, 3));
    geo.setAttribute('aOrigin', new BufferAttribute(built.origin, 3));
    geo.setAttribute('aColour', new BufferAttribute(built.colour, 3));
    geo.setAttribute('aParam', new BufferAttribute(built.param, 4));
    geo.setAttribute('aTrait', new BufferAttribute(built.trait, 4));
    return geo;
  }, [capability.structureCount, journey]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // One texel per figure per row: what it is doing, and where it stands.
  const state = useMemo(() => {
    const texture = new DataTexture(
      new Float32Array(journey.figures.length * 8),
      journey.figures.length,
      2,
      RGBAFormat,
      FloatType,
    );
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;
    texture.needsUpdate = true;
    return texture;
  }, [journey]);

  useEffect(() => () => state.dispose(), [state]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uSize: { value: 1.7 },
      uFogNear: { value: 6 },
      uFogFar: { value: 320 },
      uDim: { value: 0 },
      uMaxPointSize: { value: capability.maxPointSize },
      uState: { value: state },
      uFigures: { value: journey.figures.length },
      uPath: { value: new Float32Array(15) },
      uBend: { value: new Float32Array(12) },
      uLegs: { value: 1 },
      uMarkScale: { value: journey.markScale },
    }),
    [capability.maxPointSize, journey, state],
  );

  useFrame(() => {
    const u = material.current?.uniforms;
    if (!u) return;
    u.uTime.value = stage.time;
    u.uDim.value = stage.dim;
    u.uFogFar.value = Math.max(stage.fogFar, 320);
    u.uPixelRatio.value = viewport.dpr;
    u.uLegs.value = bus.legs;
    u.uMarkScale.value = bus.markScale;
    u.uPath.value = bus.path;
    u.uBend.value = bus.bend;

    /*
     * The whole per-frame cost of this system: one small texture upload.
     *
     * Guarded on the size rather than assumed, because moving from one product
     * to another rebuilds this texture during the render that mounts the new
     * journey and refills the bus in the effect afterwards — one frame in
     * which the two are the wrong shape for each other.
     */
    const data = state.image.data as Float32Array;
    if (data.length === bus.state.length) {
      data.set(bus.state);
      state.needsUpdate = true;
    }
  });

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={3}>
      <shaderMaterial
        ref={material}
        vertexShader={SCENE_VERTEX}
        fragmentShader={SCENE_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
