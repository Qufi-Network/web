'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three';
import { SPINE_FRAGMENT, SPINE_VERTEX } from '../../shaders/spine';
import { SPACES, SPACE_COUNT, SPINES } from '../Spaces';
import { spaceStateTexture } from '../spaceState';
import { createRng } from '../../network/rng';
import { stage } from '../stage';

/**
 * The pathways between the spaces.
 *
 * Drawn as hairlines rather than as points, because these are long and have to
 * stay legible across the whole width of the network — a chain of sprites at
 * that distance reads as dust. Each pathway bows outward around the middle so
 * it arcs past the Core instead of cutting through it, which is also what stops
 * sixteen of them converging into one bright knot at the origin.
 *
 * Every segment carries the indices of the two spaces it joins, and reads their
 * presence out of the shared state texture. That is why entering a space dims
 * every pathway that does not touch it without anything having to say so.
 */

/** Segments per pathway. Enough for the arc to be a curve rather than a kink. */
const SEGMENTS = 22;

export function Spines() {
  const material = useRef<ShaderMaterial>(null);
  const texture = useMemo(() => spaceStateTexture(), []);

  const geometry = useMemo(() => {
    const rng = createRng(0x5b17);
    const vertices = SPINES.length * SEGMENTS * 2;
    const positions = new Float32Array(vertices * 3);
    const ts = new Float32Array(vertices);
    const seeds = new Float32Array(vertices);
    const ends = new Float32Array(vertices * 2);

    let v = 0;
    for (const [a, b] of SPINES) {
      const from = SPACES[a].anchor;
      const to = SPACES[b].anchor;
      const seed = rng();

      // The control point pushed out from the straight line, away from the
      // origin. A pathway between two outer structures should go round the
      // Core, not through it.
      const midX = (from[0] + to[0]) / 2;
      const midY = (from[1] + to[1]) / 2;
      const midZ = (from[2] + to[2]) / 2;
      const length = Math.hypot(midX, midY, midZ) || 1;
      const bow = 0.28 + rng() * 0.16;
      const controlX = midX * (1 + bow) + (rng() - 0.5) * 6;
      const controlY = midY * (1 + bow) + (rng() - 0.5) * 8 + 4;
      const controlZ = midZ * (1 + bow) + (rng() - 0.5) * 6;
      void length;

      for (let s = 0; s < SEGMENTS; s++) {
        for (let end = 0; end < 2; end++) {
          const t = (s + end) / SEGMENTS;
          const m = 1 - t;
          positions[v * 3] = m * m * from[0] + 2 * m * t * controlX + t * t * to[0];
          positions[v * 3 + 1] = m * m * from[1] + 2 * m * t * controlY + t * t * to[1];
          positions[v * 3 + 2] = m * m * from[2] + 2 * m * t * controlZ + t * t * to[2];
          ts[v] = t;
          seeds[v] = seed;
          ends[v * 2] = a;
          ends[v * 2 + 1] = b;
          v++;
        }
      }
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('aT', new BufferAttribute(ts, 1));
    geo.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    geo.setAttribute('aEnds', new BufferAttribute(ends, 2));
    return geo;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uSpaceState: { value: texture },
      uSpaceCount: { value: SPACE_COUNT },
      uTime: { value: 0 },
      uFogNear: { value: 8 },
      uFogFar: { value: 260 },
      uDim: { value: 0 },
    }),
    [texture],
  );

  useFrame(() => {
    const u = material.current?.uniforms;
    if (!u) return;
    u.uTime.value = stage.time;
    u.uDim.value = stage.dim;
    u.uFogFar.value = Math.max(stage.fogFar * 1.4, 260);
  });

  return (
    <lineSegments geometry={geometry} frustumCulled={false} renderOrder={1}>
      <shaderMaterial
        ref={material}
        vertexShader={SPINE_VERTEX}
        fragmentShader={SPINE_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={AdditiveBlending}
      />
    </lineSegments>
  );
}
