'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ShaderMaterial,
  Vector3,
} from 'three';
import { FLOW_FRAGMENT, FLOW_VERTEX } from '../../shaders/economy';
import {
  advance,
  createTransaction,
  District,
  DISTRICT_ANCHOR,
  TransactionState,
} from '../../network/economy';
import { createRng } from '../../network/rng';
import { experience } from '../ExperienceState';
import { useNetwork } from '../NetworkContext';
import { stage } from '../stage';

/**
 * Value in motion, and the moment two legs of a transaction meet.
 *
 * One draw call covers three jobs, because they are the same job: particles
 * moving along cubic curves. Money circulates a closed loop — issued, held,
 * transferred, redeemed, and round again. Settlement runs two legs from opposite
 * districts toward the same point, each advancing only as far as its own leg has
 * been prepared. A particle that reaches the settlement point stops there.
 *
 * That stopping is the argument. Delivery-versus-payment is not a faster
 * transfer, it is the property that neither leg completes alone, and the only
 * honest way to show it is to let one leg arrive and visibly wait.
 */

const COUNTS = {
  low: { money: 130, leg: 70, ring: 60 },
  medium: { money: 210, leg: 110, ring: 90 },
  high: { money: 300, leg: 160, ring: 120 },
  ultra: { money: 420, leg: 220, ring: 160 },
} as const;

/** Cubic control points, four per path, flattened for the uniform array. */
function buildControls(): Float32Array {
  const assets = DISTRICT_ANCHOR[District.Assets];
  const money = DISTRICT_ANCHOR[District.Money];
  const settle = DISTRICT_ANCHOR[District.Settlement];
  const controls: number[] = [];

  const push = (points: Array<[number, number, number]>) => {
    for (const point of points) controls.push(point[0], point[1], point[2]);
  };

  // Paths 0-3: the monetary circuit, a closed loop through the money district.
  const r = 13;
  const centre = money;
  const corner = (angle: number, radius: number): [number, number, number] => [
    centre[0] + Math.cos(angle) * radius,
    centre[1] + Math.sin(angle * 2) * 2.2,
    centre[2] + Math.sin(angle) * radius * 0.72,
  ];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const d = ((i + 1) / 4) * Math.PI * 2;
    push([corner(a, r), corner(a + 0.26, r * 1.24), corner(d - 0.26, r * 1.24), corner(d, r)]);
  }

  // Path 4: the asset leg. Path 5: the money leg. Both bow outward so they
  // approach the settlement point from opposite sides rather than head-on.
  push([
    [assets[0], assets[1], assets[2]],
    [assets[0] * 0.6, assets[1] + 14, assets[2] - 18],
    [settle[0] - 26, settle[1] + 10, settle[2] + 16],
    [settle[0] - 3, settle[1], settle[2]],
  ]);
  push([
    [money[0], money[1], money[2]],
    [money[0] * 0.6, money[1] + 14, money[2] - 18],
    [settle[0] + 26, settle[1] + 10, settle[2] + 16],
    [settle[0] + 3, settle[1], settle[2]],
  ]);

  return new Float32Array(controls);
}

export function ValueFlow() {
  const { capability } = useNetwork();
  const viewport = useThree((state) => state.viewport);
  const material = useRef<ShaderMaterial>(null);
  const group = useRef<import('three').Group>(null);
  const transaction = useRef(createTransaction(1));
  const lastState = useRef<TransactionState>(TransactionState.Created);

  const { geometry, controls } = useMemo(() => {
    const rng = createRng(0xf10a);
    const counts = COUNTS[capability.tier];
    const total = counts.money + counts.leg * 2 + counts.ring;

    const positions = new Float32Array(total * 3);
    const paths = new Float32Array(total);
    const offsets = new Float32Array(total);
    const roles = new Float32Array(total);
    const seeds = new Float32Array(total);

    let i = 0;
    for (let n = 0; n < counts.money; n++, i++) {
      paths[i] = n % 4;
      offsets[i] = rng();
      roles[i] = 0;
      seeds[i] = rng();
    }
    for (let n = 0; n < counts.leg; n++, i++) {
      paths[i] = 4;
      offsets[i] = rng();
      roles[i] = 1;
      seeds[i] = rng();
    }
    for (let n = 0; n < counts.leg; n++, i++) {
      paths[i] = 5;
      offsets[i] = rng();
      roles[i] = 2;
      seeds[i] = rng();
    }
    for (let n = 0; n < counts.ring; n++, i++) {
      paths[i] = 4;
      offsets[i] = n / counts.ring;
      roles[i] = 3;
      seeds[i] = rng();
    }

    const geo = new BufferGeometry();
    // Positions are computed in the vertex shader from the curves; the buffer
    // exists because geometry needs a vertex count.
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('aPath', new BufferAttribute(paths, 1));
    geo.setAttribute('aOffset', new BufferAttribute(offsets, 1));
    geo.setAttribute('aRole', new BufferAttribute(roles, 1));
    geo.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    return { geometry: geo, controls: buildControls() };
  }, [capability.tier]);

  const uniforms = useMemo(() => {
    const list: Vector3[] = [];
    for (let i = 0; i < controls.length; i += 3) {
      list.push(new Vector3(controls[i], controls[i + 1], controls[i + 2]));
    }
    // The array has to be full length even where paths are unused, or the
    // uniform is truncated and the last curve reads garbage.
    while (list.length < 24) list.push(new Vector3());
    return {
      uControls: { value: list },
      uTime: { value: 0 },
      uMoney: { value: 0 },
      uAssetLeg: { value: 0 },
      uMoneyLeg: { value: 0 },
      uConfirm: { value: 0 },
      uPixelRatio: { value: 1 },
      uSize: { value: 2.1 },
      uFogNear: { value: 10 },
      uFogFar: { value: 220 },
      uDim: { value: 0 },
      uMaxPointSize: { value: capability.maxPointSize },
    };
  }, [controls, capability.maxPointSize]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    const visible =
      stage.moneyFlow > 0.002 || stage.settleAsset > 0.002 || stage.settleMoney > 0.002;
    if (group.current) group.current.visible = visible;
    if (!visible) return;

    // The transaction is a model, not a timeline: it reads the two leg values
    // and decides for itself what state it is in.
    const next = advance(transaction.current, stage.settleAsset, stage.settleMoney, delta);
    stage.settleConfirm = next.confirmation;
    if (next.state !== lastState.current) {
      lastState.current = next.state;
      experience.set({ transaction: next.state });
    }

    const u = material.current?.uniforms;
    if (!u) return;
    u.uTime.value = stage.time;
    u.uMoney.value = stage.moneyFlow;
    u.uAssetLeg.value = stage.settleAsset;
    u.uMoneyLeg.value = stage.settleMoney;
    u.uConfirm.value = next.confirmation;
    u.uDim.value = stage.dim;
    u.uFogFar.value = stage.fogFar * 1.2;
    u.uPixelRatio.value = viewport.dpr;
  });

  return (
    <group ref={group}>
      <points geometry={geometry} frustumCulled={false} renderOrder={6}>
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
    </group>
  );
}
