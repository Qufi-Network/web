'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three';
import { CONNECTION_FRAGMENT, CONNECTION_VERTEX } from '../../shaders/connection';
import { EdgeKind } from '../../network/types';
import { useNetwork } from '../NetworkContext';
import { stage } from '../stage';

/**
 * Relationships, in one draw call.
 *
 * Each connection is subdivided so it can bend. A two-point line can only ever
 * be straight, and a network whose links stay ruler-straight while its nodes are
 * pushed around reads as a diagram rather than as something under tension. The
 * segment count comes from the device tier, since bending is the only thing the
 * subdivision buys.
 */

/**
 * How much each kind of relationship asserts itself. The consensus backbone is
 * structural and should be legible from across the scene; a builder's link to
 * the application they work on should not compete with it.
 */
const KIND_WEIGHT: Record<EdgeKind, number> = {
  [EdgeKind.Quorum]: 1.0,
  [EdgeKind.Trunk]: 1.35,
  [EdgeKind.Replay]: 0.8,
  [EdgeKind.Collateral]: 0.85,
  [EdgeKind.Instruction]: 0.58,
  [EdgeKind.Membership]: 0.34,
};

export function ConnectionSystem() {
  const { engine, nodeStaticTexture, edgeStateTexture, capability } = useNetwork();
  const material = useRef<ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const { nodes, edges } = engine.snapshot;
    const segments = capability.edgeSegments;
    const vertsPerEdge = segments * 2;
    const total = edges.length * vertsPerEdge;

    const positions = new Float32Array(total * 3);
    const src = new Float32Array(total);
    const dst = new Float32Array(total);
    const ts = new Float32Array(total);
    const edgeIds = new Float32Array(total);
    const weights = new Float32Array(total);
    const ranks = new Float32Array(total);
    const kinds = new Float32Array(total);

    let v = 0;
    for (const edge of edges) {
      const a = nodes[edge.source].position;
      const b = nodes[edge.target].position;
      const weight = edge.strength * KIND_WEIGHT[edge.kind];
      for (let s = 0; s < segments; s++) {
        for (let end = 0; end < 2; end++) {
          const t = (s + end) / segments;
          positions[v * 3] = a[0] + (b[0] - a[0]) * t;
          positions[v * 3 + 1] = a[1] + (b[1] - a[1]) * t;
          positions[v * 3 + 2] = a[2] + (b[2] - a[2]) * t;
          src[v] = edge.source;
          dst[v] = edge.target;
          ts[v] = t;
          edgeIds[v] = edge.id;
          weights[v] = weight;
          ranks[v] = edge.rank;
          kinds[v] = edge.kind;
          v++;
        }
      }
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('aSrc', new BufferAttribute(src, 1));
    geo.setAttribute('aDst', new BufferAttribute(dst, 1));
    geo.setAttribute('aT', new BufferAttribute(ts, 1));
    geo.setAttribute('aEdgeId', new BufferAttribute(edgeIds, 1));
    geo.setAttribute('aWeight', new BufferAttribute(weights, 1));
    geo.setAttribute('aRank', new BufferAttribute(ranks, 1));
    geo.setAttribute('aKind', new BufferAttribute(kinds, 1));
    return geo;
  }, [engine, capability.edgeSegments]);

  const uniforms = useMemo(
    () => ({
      uNodeStatic: { value: nodeStaticTexture },
      uEdgeState: { value: edgeStateTexture },
      uNodeTexSize: { value: engine.nodeTexSize },
      uEdgeTexSize: { value: engine.edgeTexSize },
      uTime: { value: 0 },
      uReveal: { value: 0 },
      // Ranks, not seconds: a connection takes about a dozen arrivals' worth
      // of emergence to finish drawing itself.
      uGrowSpan: { value: 12 },
      uPointer: { value: stage.pointer },
      uPointerAmp: { value: 0 },
      uPointerRadius: { value: 9 },
      uBow: { value: 0 },
      uBaseAlpha: { value: 0.115 },
      uFogNear: { value: 8 },
      uFogFar: { value: 150 },
      uDim: { value: 0 },
      uTint: { value: stage.tint },
      uTintAmount: { value: 0 },
      uInstability: { value: 0 },
    }),
    [engine, nodeStaticTexture, edgeStateTexture],
  );

  useFrame(() => {
    const u = material.current?.uniforms;
    if (!u) return;
    u.uTime.value = stage.time;
    u.uReveal.value = stage.reveal;
    u.uPointerAmp.value = stage.pointerAmp;
    u.uPointerRadius.value = stage.pointerRadius;
    u.uBow.value = stage.bow;
    u.uDim.value = stage.dim * stage.networkDim;
    u.uFogFar.value = stage.fogFar;
    u.uTint.value = stage.tint;
    u.uTintAmount.value = stage.tintAmount;
    u.uInstability.value = stage.instability;
  });

  return (
    <lineSegments geometry={geometry} frustumCulled={false} renderOrder={1}>
      <shaderMaterial
        ref={material}
        vertexShader={CONNECTION_VERTEX}
        fragmentShader={CONNECTION_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={AdditiveBlending}
      />
    </lineSegments>
  );
}
