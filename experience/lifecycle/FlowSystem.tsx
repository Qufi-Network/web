'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ShaderMaterial,
  Vector3,
} from 'three';
import { FLOW_FRAGMENT, FLOW_VERTEX } from '../../shaders/flow';
import { buildFlow } from '../../network/flow';
import { useNetwork } from '../NetworkContext';
import { stage } from '../stage';
import { HOLDER, VAULT } from './stages';
import { flow } from './life';

/**
 * The whole lifecycle, in one draw call.
 *
 * Geometry built once; a dozen uniforms written per frame. Same arrangement as
 * the structure field on the front of the site, and for the same reason — this
 * runs on the same integrated graphics, where the number of draw calls matters
 * far less than the number of lit pixels.
 */
export function FlowSystem() {
  const { capability } = useNetwork();
  const viewport = useThree((state) => state.viewport);
  const material = useRef<ShaderMaterial>(null);

  const geometry = useMemo(() => {
    // A little more than a single structure gets on the front page: this scene
    // has one subject and can afford to spend its budget on it.
    const buffers = buildFlow(Math.round(capability.structureCount * 0.62));
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(buffers.position, 3));
    geo.setAttribute('aOrigin', new BufferAttribute(buffers.origin, 3));
    geo.setAttribute('aParam', new BufferAttribute(buffers.param, 4));
    return geo;
  }, [capability.structureCount]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uSize: { value: 1.7 },
      uFogNear: { value: 6 },
      uFogFar: { value: 260 },
      uDim: { value: 0 },
      uMaxPointSize: { value: capability.maxPointSize },

      uVault: { value: 0 },
      uDeposit: { value: 0 },
      uConfirmed: { value: 0 },
      uUnit: { value: 0 },
      uCarried: { value: 0 },
      uAnchors: { value: new Vector3() },
      uSpent: { value: 0 },
      uReleased: { value: 0 },
      uChain: { value: 0 },
      uRegistry: { value: 0 },
      uVerifier: { value: 0 },
      uVerifying: { value: 0 },

      uVaultAt: { value: new Vector3(...VAULT) },
      uHolderAt: { value: new Vector3(...HOLDER) },
    }),
    [capability.maxPointSize],
  );

  useFrame(() => {
    const u = material.current?.uniforms;
    if (!u) return;
    u.uTime.value = stage.time;
    u.uDim.value = stage.dim;
    u.uFogFar.value = Math.max(stage.fogFar, 260);
    u.uPixelRatio.value = viewport.dpr;

    u.uVault.value = flow.vault;
    u.uDeposit.value = flow.deposit;
    u.uConfirmed.value = flow.confirmed;
    u.uUnit.value = flow.unit;
    u.uCarried.value = flow.carried;
    (u.uAnchors.value as Vector3).set(flow.anchors[0], flow.anchors[1], flow.anchors[2]);
    u.uSpent.value = flow.spent;
    u.uReleased.value = flow.released;
    u.uChain.value = flow.chain;
    u.uRegistry.value = flow.registry;
    u.uVerifier.value = flow.verifier;
    u.uVerifying.value = flow.verifying;
  });

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={3}>
      <shaderMaterial
        ref={material}
        vertexShader={FLOW_VERTEX}
        fragmentShader={FLOW_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
