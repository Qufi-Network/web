'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  ShaderMaterial,
} from 'three';
import { createRng } from '../../network/rng';
import { useNetwork } from '../NetworkContext';
import { stage } from '../stage';

/**
 * The network detonating where a reading comes from.
 *
 * Every time the visitor reaches a new reading, the participant it belongs to
 * throws off a shell of material — the same gesture the mark makes at the
 * opening, at the scale of a single node. It is what makes a card read as
 * something the network produced at a place, rather than a panel that faded in
 * near some lights.
 *
 * The shell lives in world space at the node, so it moves with the camera like
 * everything else and is occluded by depth the same way. A DOM effect could
 * never do that: it would sit flat on the glass in front of the scene.
 */

const COUNT = { low: 260, medium: 420, high: 620, ultra: 900 } as const;

const VERTEX = /* glsl */ `
  attribute vec3 aDirection;
  attribute float aSeed;

  uniform float uBurst;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uDim;
  uniform vec3 uTint;
  uniform float uTintAmount;

  varying float vAlpha;
  varying float vHeat;

  void main() {
    // Fast out, slow down: an impulse rather than an expansion. Each piece
    // carries its own speed so the shell is ragged, not a perfect sphere.
    float t = 1.0 - uBurst;
    float travel = (1.0 - pow(1.0 - t, 2.4)) * (5.0 + aSeed * 12.0);

    vec3 world = position + aDirection * travel;

    vec4 mvPosition = modelViewMatrix * vec4(world, 1.0);
    float viewDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;

    float size = uSize * (0.6 + aSeed * 0.8) * (0.5 + uBurst);
    gl_PointSize = clamp(size * (240.0 / max(viewDepth, 1.0)) * uPixelRatio, 1.0, 14.0);

    // Hottest at the instant of the strike, cooling as it travels out.
    vHeat = uBurst * uBurst;

    float depth = smoothstep(uFogFar, uFogNear, viewDepth);
    vAlpha = uBurst * (1.0 - t * 0.75) * depth * uDim * smoothstep(1.0, 6.0, viewDepth);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  uniform vec3 uTint;
  uniform float uTintAmount;

  varying float vAlpha;
  varying float vHeat;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float r2 = dot(p, p);
    float mask = exp(-r2 * 28.0) + exp(-r2 * 7.0) * 0.3;
    if (mask * vAlpha < 0.004) discard;

    vec3 colour = mix(vec3(0.16, 0.55, 1.0), vec3(0.92, 0.98, 1.0), vHeat);
    if (uTintAmount > 0.001) {
      float lum = dot(colour, vec3(0.2126, 0.7152, 0.0722));
      colour = mix(colour, uTint * lum * 1.3, uTintAmount);
    }

    gl_FragColor = vec4(colour, mask * vAlpha);
  }
`;

export function NodeBurst() {
  const { capability } = useNetwork();
  const viewport = useThree((state) => state.viewport);
  const material = useRef<ShaderMaterial>(null);
  const group = useRef<Group>(null);

  const geometry = useMemo(() => {
    const rng = createRng(0xb0057);
    const count = COUNT[capability.tier];
    const positions = new Float32Array(count * 3);
    const directions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Even coverage of the sphere, so the shell has no seam.
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      const jitter = 0.82 + rng() * 0.36;
      directions[i * 3] = Math.sin(phi) * Math.cos(theta) * jitter;
      directions[i * 3 + 1] = Math.cos(phi) * jitter * 0.7;
      directions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * jitter;
      seeds[i] = rng();
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('aDirection', new BufferAttribute(directions, 3));
    geo.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    return geo;
  }, [capability.tier]);

  const uniforms = useMemo(
    () => ({
      uBurst: { value: 0 },
      uPixelRatio: { value: 1 },
      uSize: { value: 1.7 },
      uFogNear: { value: 8 },
      uFogFar: { value: 150 },
      uDim: { value: 0 },
      uTint: { value: stage.tint },
      uTintAmount: { value: 0 },
    }),
    [],
  );

  useFrame(() => {
    const burst = stage.featureBurst;
    const visible = burst > 0.004;
    if (group.current) {
      group.current.visible = visible;
      // Struck at the node, and it stays there while it disperses.
      if (visible) group.current.position.copy(stage.featureAnchorWorld);
    }
    if (!visible) return;

    const u = material.current?.uniforms;
    if (!u) return;
    u.uBurst.value = burst;
    u.uDim.value = stage.dim;
    u.uFogFar.value = stage.fogFar;
    u.uTint.value = stage.tint;
    u.uTintAmount.value = stage.tintAmount;
    u.uPixelRatio.value = viewport.dpr;
  });

  return (
    <group ref={group}>
      <points geometry={geometry} frustumCulled={false} renderOrder={7}>
        <shaderMaterial
          ref={material}
          vertexShader={VERTEX}
          fragmentShader={FRAGMENT}
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
