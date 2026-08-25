'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three';
import { ASSET_FRAGMENT, ASSET_VERTEX } from '../../shaders/economy';
import { District, DISTRICT_ANCHOR } from '../../network/economy';
import { createRng } from '../../network/rng';
import { useNetwork } from '../NetworkContext';
import { stage } from '../stage';

/**
 * A thing in the world becoming a thing in the network.
 *
 * The same points occupy four arrangements: an object, the defined layers of
 * rights and conditions that object can be described by, the compact digital
 * representation those layers collapse into, and the place that representation
 * takes up once issued. Scrolling moves between them continuously, so the
 * transformation can be watched forwards and backwards.
 *
 * The demonstration asset is a gold bar because it is the least ambiguous
 * physical object available and needs no explanation. It is labelled as a
 * demonstration throughout, and nothing here asserts that any particular asset
 * class is supported today.
 */

/**
 * Enough points that the surface of the bar reads as a surface. Sparse sampling
 * turned a solid object into a handful of large blobs, which is exactly the
 * wrong impression for the one thing on screen that is supposed to be physical.
 */
const COUNT = { low: 700, medium: 1200, high: 1800, ultra: 2600 } as const;

/** Where the asset sits while it is still outside the network. */
const ORIGIN: [number, number, number] = [
  DISTRICT_ANCHOR[District.Assets][0] - 4,
  DISTRICT_ANCHOR[District.Assets][1] + 2,
  DISTRICT_ANCHOR[District.Assets][2] + 16,
];

export function AssetJourney() {
  const { engine, capability } = useNetwork();
  const viewport = useThree((state) => state.viewport);
  const material = useRef<ShaderMaterial>(null);
  const group = useRef<import('three').Group>(null);

  const geometry = useMemo(() => {
    const rng = createRng(0xa55e7);
    const count = COUNT[capability.tier];

    const physical = new Float32Array(count * 3);
    const structured = new Float32Array(count * 3);
    const token = new Float32Array(count * 3);
    const issued = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const layers = new Float32Array(count);

    // Somewhere inside the assets district for the issued representation to
    // land, close to the strata that describe what it is.
    const home = DISTRICT_ANCHOR[District.Assets];

    for (let i = 0; i < count; i++) {
      // ---- the object -----------------------------------------------------
      // A tapered bar. Sampled on the surface rather than through the volume,
      // so it reads as a solid rather than as a cloud.
      const u = rng();
      const v = rng();
      const w = rng();
      const face = rng();
      const halfX = 4.6;
      const halfY = 1.5;
      const halfZ = 2.4;
      // The taper is what makes it read as cast metal rather than as a box.
      const taper = 1 - 0.16 * (v * 2 - 1) * (v * 2 - 1);
      let x = (u * 2 - 1) * halfX * taper;
      let y = (v * 2 - 1) * halfY;
      let z = (w * 2 - 1) * halfZ * taper;
      if (face < 0.34) y = Math.sign(y || 1) * halfY;
      else if (face < 0.67) z = Math.sign(z || 1) * halfZ * taper;
      else x = Math.sign(x || 1) * halfX * taper;

      physical[i * 3] = ORIGIN[0] + x;
      physical[i * 3 + 1] = ORIGIN[1] + y;
      physical[i * 3 + 2] = ORIGIN[2] + z;

      // Height through the object, used to run a verification pass up it.
      layers[i] = (y / halfY) * 0.5 + 0.5;

      // ---- the layers of rights ------------------------------------------
      // The same points, pulled apart into five plates: what it is, who holds
      // it, what documents it, what conditions attach, and who may receive it.
      const plate = Math.min(4, Math.floor(((y / halfY) * 0.5 + 0.5) * 5));
      structured[i * 3] = ORIGIN[0] + x * 1.12;
      structured[i * 3 + 1] = ORIGIN[1] + (plate - 2) * 2.6;
      structured[i * 3 + 2] = ORIGIN[2] + z * 1.12;

      // ---- the representation ---------------------------------------------
      // A compact faceted shell: everything above, expressed as one object the
      // network can hold.
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      const facet = 1 + 0.22 * Math.cos(4 * theta) * Math.sin(3 * phi);
      const radius = 2.5 * facet;
      token[i * 3] = ORIGIN[0] + Math.sin(phi) * Math.cos(theta) * radius;
      token[i * 3 + 1] = ORIGIN[1] + Math.cos(phi) * radius;
      token[i * 3 + 2] = ORIGIN[2] + Math.sin(phi) * Math.sin(theta) * radius;

      // ---- issued into the network ----------------------------------------
      // Tighter still, and now sitting inside the district rather than outside
      // it: the representation has become a participant.
      issued[i * 3] = home[0] + (token[i * 3] - ORIGIN[0]) * 0.42 + (rng() - 0.5) * 1.4;
      issued[i * 3 + 1] = home[1] + (token[i * 3 + 1] - ORIGIN[1]) * 0.42 + (rng() - 0.5) * 1.4;
      issued[i * 3 + 2] = home[2] + (token[i * 3 + 2] - ORIGIN[2]) * 0.42 + (rng() - 0.5) * 1.4;

      seeds[i] = rng();
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(physical, 3));
    geo.setAttribute('aStructured', new BufferAttribute(structured, 3));
    geo.setAttribute('aToken', new BufferAttribute(token, 3));
    geo.setAttribute('aIssued', new BufferAttribute(issued, 3));
    geo.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    geo.setAttribute('aLayer', new BufferAttribute(layers, 1));
    return geo;
  }, [capability.tier, engine]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uStage: { value: 0 },
      uPresence: { value: 0 },
      uPixelRatio: { value: 1 },
      uSize: { value: 1.25 },
      uFogNear: { value: 8 },
      uFogFar: { value: 180 },
      uDim: { value: 0 },
      uMaxPointSize: { value: capability.maxPointSize },
    }),
    [capability.maxPointSize],
  );

  useFrame(() => {
    const visible = stage.assetPresence > 0.002;
    if (group.current) group.current.visible = visible;
    if (!visible) return;
    const u = material.current?.uniforms;
    if (!u) return;
    u.uTime.value = stage.time;
    u.uStage.value = stage.assetStage;
    u.uPresence.value = stage.assetPresence;
    u.uDim.value = stage.dim;
    u.uFogFar.value = stage.fogFar;
    u.uPixelRatio.value = viewport.dpr;
  });

  return (
    <group ref={group}>
      <points geometry={geometry} frustumCulled={false} renderOrder={5}>
        <shaderMaterial
          ref={material}
          vertexShader={ASSET_VERTEX}
          fragmentShader={ASSET_FRAGMENT}
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
