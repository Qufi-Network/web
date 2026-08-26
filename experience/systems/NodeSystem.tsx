'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three';
import { NODE_FRAGMENT, NODE_VERTEX } from '../../shaders/node';
import { useNetwork } from '../NetworkContext';
import { stage } from '../stage';

/**
 * Every participant in the network, in one draw call.
 *
 * The class of a node is drawn procedurally in the fragment shader rather than
 * with a texture atlas or separate meshes, so eight distinguishable glyphs cost
 * exactly the same as one. Detail only resolves as a node gets close, which
 * doubles as level of detail: a four-pixel node never pays for a glyph nobody
 * can see.
 */
export function NodeSystem() {
  const { engine, nodeStateTexture, capability } = useNetwork();
  const viewport = useThree((state) => state.viewport);
  const material = useRef<ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const nodes = engine.snapshot.nodes;
    const count = nodes.length;
    const positions = new Float32Array(count * 3);
    const ids = new Float32Array(count);
    const seeds = new Float32Array(count);
    const ranks = new Float32Array(count);
    const types = new Float32Array(count);
    const importance = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const node = nodes[i];
      positions[i * 3] = node.position[0];
      positions[i * 3 + 1] = node.position[1];
      positions[i * 3 + 2] = node.position[2];
      ids[i] = node.id;
      seeds[i] = node.seed;
      ranks[i] = node.rank;
      types[i] = node.type;
      importance[i] = node.importance;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('aId', new BufferAttribute(ids, 1));
    geo.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    geo.setAttribute('aRank', new BufferAttribute(ranks, 1));
    geo.setAttribute('aType', new BufferAttribute(types, 1));
    geo.setAttribute('aImportance', new BufferAttribute(importance, 1));
    return geo;
  }, [engine]);

  const uniforms = useMemo(
    () => ({
      uNodeState: { value: nodeStateTexture },
      uNodeTexSize: { value: engine.nodeTexSize },
      uTime: { value: 0 },
      uReveal: { value: 0 },
      // Six ranks of overlap: enough that arrivals feel staggered rather than
      // switched on, few enough that the single opening node is fully lit.
      uRevealFade: { value: 6 },
      uPointer: { value: stage.pointer },
      uPointerAmp: { value: 0 },
      uPointerRadius: { value: 9 },
      uSize: { value: 2.35 },
      uPixelRatio: { value: 1 },
      uFogNear: { value: 8 },
      uNearCut: { value: 7 },
      uFogFar: { value: 150 },
      uDim: { value: 0 },
      uTint: { value: stage.tint },
      uTintAmount: { value: 0 },
      uInstability: { value: 0 },
      uMaxPointSize: { value: capability.maxPointSize },
      uGlyphs: { value: capability.glyphs ? 1 : 0 },
    }),
    [engine, nodeStateTexture, capability.glyphs, capability.maxPointSize],
  );

  useFrame(() => {
    const u = material.current?.uniforms;
    if (!u) return;
    u.uTime.value = stage.time;
    u.uReveal.value = stage.reveal;
    u.uPointerAmp.value = stage.pointerAmp;
    u.uPointerRadius.value = stage.pointerRadius;
    u.uDim.value = stage.dim * stage.networkDim;
    // Standing inside a structure, the network around it has to stop being in
    // the way. Dimming alone does not do it — a participant four units from
    // the lens is a thirty-pixel sprite whatever its alpha — so the near cut
    // moves out and the sprite ceiling comes down together.
    u.uNearCut.value = 7 + stage.inside * 26;
    u.uMaxPointSize.value = capability.maxPointSize * (1 - stage.inside * 0.42);
    u.uFogFar.value = stage.fogFar;
    u.uTint.value = stage.tint;
    u.uTintAmount.value = stage.tintAmount;
    u.uInstability.value = stage.instability;
    u.uPixelRatio.value = viewport.dpr;
  });

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={2}>
      <shaderMaterial
        ref={material}
        vertexShader={NODE_VERTEX}
        fragmentShader={NODE_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
