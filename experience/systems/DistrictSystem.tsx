'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three';
import { DISTRICT_FRAGMENT, DISTRICT_VERTEX } from '../../shaders/economy';
import { District, DISTRICT_ANCHOR } from '../../network/economy';
import { createRng } from '../../network/rng';
import { useNetwork } from '../NetworkContext';
import { stage } from '../stage';

/**
 * Where the network divides.
 *
 * Three regions, placed far enough out from consensus to be approached one at a
 * time, each arranged by the rule that describes what it does: assets stack into
 * strata, money circulates on a ring, settlement is two arcs meeting at a point.
 * The arrangement is the explanation — none of the three needs a different
 * colour, a different material or a caption to be told apart.
 *
 * Trunk lines run from each region back into the network, because that is the
 * claim being made: these are not three products sitting next to a network, they
 * are three parts of it.
 */

const PER_DISTRICT = { low: 90, medium: 150, high: 220, ultra: 300 } as const;

/**
 * Position within a region, in local space. `t` runs 0..1 through the region so
 * the shader can circulate brightness along whatever shape it turns out to be.
 */
function place(district: District, t: number, jitter: () => number): [number, number, number] {
  const spread = (amount: number) => (jitter() - 0.5) * amount;

  if (district === District.Assets) {
    // Five strata: a thing in the world, resolved into layers of defined rights.
    const layer = Math.floor(t * 5);
    const within = t * 5 - layer;
    const angle = within * Math.PI * 2;
    const radius = 7 + layer * 1.1;
    return [
      Math.cos(angle) * radius + spread(2.2),
      (layer - 2) * 3.4 + spread(0.7),
      Math.sin(angle) * radius * 0.55 + spread(2.2),
    ];
  }

  if (district === District.Money) {
    // A closed circuit. Money that stops circulating stops being money.
    const angle = t * Math.PI * 2;
    const wobble = Math.sin(angle * 3) * 1.6;
    const radius = 11 + wobble + spread(1.6);
    return [
      Math.cos(angle) * radius,
      Math.sin(angle * 2) * 2.4 + spread(1.2),
      Math.sin(angle) * radius * 0.7,
    ];
  }

  // Settlement: two arcs approaching the same point from opposite sides.
  const side = t < 0.5 ? -1 : 1;
  const along = (t < 0.5 ? t : t - 0.5) * 2;
  const angle = (along - 0.5) * 1.7;
  return [
    side * (13 - along * 9) + spread(1.4),
    Math.sin(angle) * 5.5 + spread(1.0),
    Math.cos(angle) * 7 - 4 + spread(1.4),
  ];
}

export function DistrictSystem() {
  const { capability } = useNetwork();
  const viewport = useThree((state) => state.viewport);
  const nodes = useRef<ShaderMaterial>(null);
  const links = useRef<ShaderMaterial>(null);
  const group = useRef<import('three').Group>(null);

  const { cloud, trunks } = useMemo(() => {
    const rng = createRng(0xd15);
    const count = PER_DISTRICT[capability.tier];
    const districts = [District.Assets, District.Money, District.Settlement];

    const positions: number[] = [];
    const ids: number[] = [];
    const seeds: number[] = [];
    const locals: number[] = [];

    for (const district of districts) {
      const anchor = DISTRICT_ANCHOR[district];
      for (let i = 0; i < count; i++) {
        const t = i / count;
        const local = place(district, t, rng);
        positions.push(anchor[0] + local[0], anchor[1] + local[1], anchor[2] + local[2]);
        ids.push(district);
        seeds.push(rng());
        locals.push(t);
      }
    }

    const cloudGeometry = new BufferGeometry();
    cloudGeometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    cloudGeometry.setAttribute('aDistrict', new BufferAttribute(new Float32Array(ids), 1));
    cloudGeometry.setAttribute('aSeed', new BufferAttribute(new Float32Array(seeds), 1));
    cloudGeometry.setAttribute('aLocal', new BufferAttribute(new Float32Array(locals), 1));

    // Trunks: each region back to consensus, and each region to the other two,
    // because an asset with no monetary leg and no way to settle is not part of
    // an economic network.
    const trunkPositions: number[] = [];
    const trunkIds: number[] = [];
    const trunkSeeds: number[] = [];
    const trunkLocals: number[] = [];
    const SEGMENTS = 12;

    const run = (from: [number, number, number], to: [number, number, number], id: number) => {
      for (let s = 0; s < SEGMENTS; s++) {
        for (let end = 0; end < 2; end++) {
          const t = (s + end) / SEGMENTS;
          const lift = Math.sin(t * Math.PI) * 9;
          trunkPositions.push(
            from[0] + (to[0] - from[0]) * t,
            from[1] + (to[1] - from[1]) * t + lift,
            from[2] + (to[2] - from[2]) * t,
          );
          trunkIds.push(id);
          trunkSeeds.push(rng());
          trunkLocals.push(t);
        }
      }
    };

    const origin: [number, number, number] = [0, 0, 0];
    for (const district of districts) run(DISTRICT_ANCHOR[district], origin, district);
    run(DISTRICT_ANCHOR[District.Assets], DISTRICT_ANCHOR[District.Settlement], District.Assets);
    run(DISTRICT_ANCHOR[District.Money], DISTRICT_ANCHOR[District.Settlement], District.Money);
    run(DISTRICT_ANCHOR[District.Assets], DISTRICT_ANCHOR[District.Money], District.Settlement);

    const trunkGeometry = new BufferGeometry();
    trunkGeometry.setAttribute('position', new BufferAttribute(new Float32Array(trunkPositions), 3));
    trunkGeometry.setAttribute('aDistrict', new BufferAttribute(new Float32Array(trunkIds), 1));
    trunkGeometry.setAttribute('aSeed', new BufferAttribute(new Float32Array(trunkSeeds), 1));
    trunkGeometry.setAttribute('aLocal', new BufferAttribute(new Float32Array(trunkLocals), 1));

    return { cloud: cloudGeometry, trunks: trunkGeometry };
  }, [capability.tier]);

  const makeUniforms = (isLine: number) => ({
    uTime: { value: 0 },
    uReveal: { value: 0 },
    uFocus: { value: -1 },
    uPixelRatio: { value: 1 },
    uSize: { value: isLine ? 1 : 3.3 },
    uFogNear: { value: 10 },
    uFogFar: { value: 220 },
    uDim: { value: 0 },
    uTint: { value: stage.tint },
    uTintAmount: { value: 0 },
    uMaxPointSize: { value: capability.maxPointSize },
    uIsLine: { value: isLine },
    uActivity: { value: 0 },
  });

  const nodeUniforms = useMemo(() => makeUniforms(0), [capability.maxPointSize]);
  const linkUniforms = useMemo(() => makeUniforms(1), [capability.maxPointSize]);

  useFrame(() => {
    const visible = stage.economy > 0.002;
    if (group.current) group.current.visible = visible;
    if (!visible) return;

    for (const material of [nodes.current, links.current]) {
      const u = material?.uniforms;
      if (!u) continue;
      u.uTime.value = stage.time;
      u.uReveal.value = stage.economy;
      u.uFocus.value = stage.district;
      u.uActivity.value = stage.districtActivity;
      u.uDim.value = stage.dim;
      u.uFogFar.value = stage.fogFar * 1.2;
      u.uTint.value = stage.tint;
      u.uTintAmount.value = stage.tintAmount;
      u.uPixelRatio.value = viewport.dpr;
    }
  });

  return (
    <group ref={group}>
      <lineSegments geometry={trunks} frustumCulled={false} renderOrder={1}>
        <shaderMaterial
          ref={links}
          vertexShader={DISTRICT_VERTEX}
          fragmentShader={DISTRICT_FRAGMENT}
          uniforms={linkUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={AdditiveBlending}
        />
      </lineSegments>
      <points geometry={cloud} frustumCulled={false} renderOrder={2}>
        <shaderMaterial
          ref={nodes}
          vertexShader={DISTRICT_VERTEX}
          fragmentShader={DISTRICT_FRAGMENT}
          uniforms={nodeUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={AdditiveBlending}
        />
      </points>
    </group>
  );
}
