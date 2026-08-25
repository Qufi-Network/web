'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three';
import { SUBSTRATE_FRAGMENT, SUBSTRATE_VERTEX } from '../../shaders/substrate';
import { createRng } from '../../network/rng';
import { useNetwork } from '../NetworkContext';
import { stage } from '../stage';

/**
 * The layer beneath the network.
 *
 * A triangular lattice, jittered just enough to avoid the dead regularity of a
 * graph-paper grid, lying well below the node field. It exists for one moment
 * in the story — the point where the destabilised network reorganises and
 * something underneath it turns out to be holding everything up — and it stays
 * dim and present from then on.
 *
 * Drawn as a wave rather than a fade, because a rule either applies or it does
 * not; there is no half-established verification layer.
 */

const PLANE_Y = -13;
const EXTENT = 78;

export function SubstrateLayer() {
  const { capability } = useNetwork();
  const viewport = useThree((state) => state.viewport);
  const points = useRef<ShaderMaterial>(null);
  const lines = useRef<ShaderMaterial>(null);

  const { cells, links } = useMemo(() => {
    const rng = createRng(0x5ab1);
    // Spacing scales with the tier: the lattice should read the same, just with
    // fewer cells doing the reading.
    const spacing = capability.tier === 'low' ? 9 : capability.tier === 'medium' ? 7.5 : 6;
    const steps = Math.ceil(EXTENT / spacing);

    const positions: number[] = [];
    const seeds: number[] = [];
    const radii: number[] = [];
    const index = new Map<string, number>();

    for (let row = -steps; row <= steps; row++) {
      for (let col = -steps; col <= steps; col++) {
        // Offsetting alternate rows by half a cell gives a triangular lattice,
        // which reads as engineered rather than as a spreadsheet.
        const x = (col + (row % 2 ? 0.5 : 0)) * spacing + (rng() - 0.5) * spacing * 0.12;
        const z = row * spacing * 0.866 + (rng() - 0.5) * spacing * 0.12;
        const radius = Math.hypot(x, z);
        if (radius > EXTENT) continue;
        index.set(`${row}:${col}`, positions.length / 3);
        positions.push(x, PLANE_Y, z);
        seeds.push(rng());
        radii.push(radius);
      }
    }

    const cellGeometry = new BufferGeometry();
    cellGeometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    cellGeometry.setAttribute('aSeed', new BufferAttribute(new Float32Array(seeds), 1));
    cellGeometry.setAttribute('aRadius', new BufferAttribute(new Float32Array(radii), 1));
    cellGeometry.setAttribute('aT', new BufferAttribute(new Float32Array(seeds.length), 1));

    // Join each cell east and south-east, which is enough to draw the whole
    // lattice without drawing any edge twice.
    const linePositions: number[] = [];
    const lineSeeds: number[] = [];
    const lineRadii: number[] = [];
    const lineTs: number[] = [];
    const push = (a: number, b: number) => {
      for (const [i, t] of [
        [a, 0],
        [b, 1],
      ] as const) {
        linePositions.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
        lineSeeds.push(seeds[a]);
        // Both ends share the outer radius, so a link arrives with its cells.
        lineRadii.push(Math.max(radii[a], radii[b]));
        lineTs.push(t);
      }
    };

    for (let row = -steps; row <= steps; row++) {
      for (let col = -steps; col <= steps; col++) {
        const here = index.get(`${row}:${col}`);
        if (here === undefined) continue;
        const east = index.get(`${row}:${col + 1}`);
        const down = index.get(`${row + 1}:${col}`);
        if (east !== undefined) push(here, east);
        if (down !== undefined) push(here, down);
      }
    }

    const linkGeometry = new BufferGeometry();
    linkGeometry.setAttribute('position', new BufferAttribute(new Float32Array(linePositions), 3));
    linkGeometry.setAttribute('aSeed', new BufferAttribute(new Float32Array(lineSeeds), 1));
    linkGeometry.setAttribute('aRadius', new BufferAttribute(new Float32Array(lineRadii), 1));
    linkGeometry.setAttribute('aT', new BufferAttribute(new Float32Array(lineTs), 1));

    return { cells: cellGeometry, links: linkGeometry };
  }, [capability.tier]);

  const makeUniforms = (isLine: number) => ({
    uTime: { value: 0 },
    uSubstrate: { value: 0 },
    uPixelRatio: { value: 1 },
    uSize: { value: 3.4 },
    uExtent: { value: EXTENT },
    uFogNear: { value: 12 },
    uFogFar: { value: 190 },
    uDim: { value: 0 },
    uTint: { value: stage.tint },
    uTintAmount: { value: 0 },
    uMaxPointSize: { value: capability.maxPointSize },
    uIsLine: { value: isLine },
  });

  const cellUniforms = useMemo(() => makeUniforms(0), [capability.maxPointSize]);
  const linkUniforms = useMemo(() => makeUniforms(1), [capability.maxPointSize]);

  const group = useRef<import('three').Group>(null);

  useFrame(() => {
    const visible = stage.substrate > 0.002;
    if (group.current) group.current.visible = visible;
    if (!visible) return;
    for (const material of [points.current, lines.current]) {
      const u = material?.uniforms;
      if (!u) continue;
      u.uTime.value = stage.time;
      u.uSubstrate.value = stage.substrate;
      u.uDim.value = stage.dim;
      u.uFogFar.value = stage.fogFar * 1.3;
      u.uTint.value = stage.tint;
      u.uTintAmount.value = stage.tintAmount;
      u.uPixelRatio.value = viewport.dpr;
    }
  });

  return (
    <group ref={group}>
      <lineSegments geometry={links} frustumCulled={false} renderOrder={0}>
        <shaderMaterial
          ref={lines}
          vertexShader={SUBSTRATE_VERTEX}
          fragmentShader={SUBSTRATE_FRAGMENT}
          uniforms={linkUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={AdditiveBlending}
        />
      </lineSegments>
      <points geometry={cells} frustumCulled={false} renderOrder={1}>
        <shaderMaterial
          ref={points}
          vertexShader={SUBSTRATE_VERTEX}
          fragmentShader={SUBSTRATE_FRAGMENT}
          uniforms={cellUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={AdditiveBlending}
        />
      </points>
    </group>
  );
}
