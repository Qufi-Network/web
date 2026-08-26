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
import {
  CORE_CHORD_FRAGMENT,
  CORE_CHORD_VERTEX,
  CORE_FRAGMENT,
  CORE_VERTEX,
} from '../../shaders/core';
import { createRng } from '../../network/rng';
import { fibonacciSphere } from '../../network/rng';
import { useNetwork } from '../NetworkContext';
import { spaceRuntime } from '../navigation';
import { stage } from '../stage';

/**
 * The QUFI Core.
 *
 * Two rules govern everything here. First, the Core is made of the network:
 * every point starts at the position of an actual node and collapses inward, so
 * what forms at twenty seconds is the network's own state arriving at one place
 * rather than an object that was always there. Second, the silhouette must never
 * resolve to a sphere — the shell is lobed by a harmonic deformation and banded
 * by an interference term, so its outline reads as a structure with a shape.
 */

const CORE_RADIUS = 7.6;
const CHORD_SEGMENTS = 4;

/** Lobed shell. Three harmonics, chosen so no axis is a plane of symmetry. */
function shellRadius(polar: number, azimuth: number): number {
  return (
    CORE_RADIUS *
    (1 +
      0.2 * Math.cos(3 * azimuth) * Math.sin(2 * polar) +
      0.13 * Math.sin(5 * polar) -
      0.1 * Math.cos(2 * azimuth))
  );
}

export function QuFiCore() {
  const { engine, capability } = useNetwork();
  const viewport = useThree((state) => state.viewport);
  const group = useRef<Group>(null);
  const shellMaterial = useRef<ShaderMaterial>(null);
  const chordMaterial = useRef<ShaderMaterial>(null);

  const { shell, chords } = useMemo(() => {
    const rng = createRng(0xc07e);
    const count = capability.coreCount;
    const nodes = engine.snapshot.nodes;

    const targets = new Float32Array(count * 3);
    const scatters = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const delays = new Float32Array(count);
    const bands = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const dir = fibonacciSphere(i, count);
      const polar = Math.acos(Math.max(-1, Math.min(1, dir[1])));
      const azimuth = Math.atan2(dir[2], dir[0]);
      const radius = shellRadius(polar, azimuth) * (0.97 + rng() * 0.06);

      targets[i * 3] = dir[0] * radius;
      targets[i * 3 + 1] = dir[1] * radius * 0.86;
      targets[i * 3 + 2] = dir[2] * radius;

      // Each point of the Core begins life somewhere out in the network.
      const source = nodes[Math.floor(rng() * nodes.length)].position;
      scatters[i * 3] = source[0];
      scatters[i * 3 + 1] = source[1];
      scatters[i * 3 + 2] = source[2];

      seeds[i] = rng();
      // Assembles inside out, so the collapse has a direction to read.
      delays[i] = Math.min(0.82, (radius / (CORE_RADIUS * 1.35)) * 0.5 + rng() * 0.3);
      bands[i] = polar / Math.PI + 0.15 * Math.sin(3 * azimuth);
    }

    const shellGeometry = new BufferGeometry();
    shellGeometry.setAttribute('position', new BufferAttribute(targets, 3));
    shellGeometry.setAttribute('aScatter', new BufferAttribute(scatters, 3));
    shellGeometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    shellGeometry.setAttribute('aDelay', new BufferAttribute(delays, 1));
    shellGeometry.setAttribute('aBand', new BufferAttribute(bands, 1));

    // Interior chords. Roughly opposing points, deliberately imprecise, so the
    // interior shows a caustic rather than a wireframe.
    const chordCount = Math.floor(count / 4);
    const chordVerts = chordCount * CHORD_SEGMENTS * 2;
    const cTarget = new Float32Array(chordVerts * 3);
    const cScatter = new Float32Array(chordVerts * 3);
    const cSeed = new Float32Array(chordVerts);
    const cDelay = new Float32Array(chordVerts);
    const cT = new Float32Array(chordVerts);

    let v = 0;
    for (let c = 0; c < chordCount; c++) {
      const a = Math.floor(rng() * count);
      const opposite = (a + Math.floor(count / 2) + Math.floor((rng() - 0.5) * count * 0.22)) % count;
      const b = (opposite + count) % count;
      const delay = Math.max(delays[a], delays[b]) * 0.9 + 0.1;
      const seed = seeds[a];

      for (let s = 0; s < CHORD_SEGMENTS; s++) {
        for (let end = 0; end < 2; end++) {
          const t = (s + end) / CHORD_SEGMENTS;
          for (let axis = 0; axis < 3; axis++) {
            const ta = targets[a * 3 + axis];
            const tb = targets[b * 3 + axis];
            const sa = scatters[a * 3 + axis];
            const sb = scatters[b * 3 + axis];
            cTarget[v * 3 + axis] = ta + (tb - ta) * t;
            cScatter[v * 3 + axis] = sa + (sb - sa) * t;
          }
          cSeed[v] = seed;
          cDelay[v] = delay;
          cT[v] = t;
          v++;
        }
      }
    }

    const chordGeometry = new BufferGeometry();
    chordGeometry.setAttribute('position', new BufferAttribute(cTarget, 3));
    chordGeometry.setAttribute('aScatter', new BufferAttribute(cScatter, 3));
    chordGeometry.setAttribute('aSeed', new BufferAttribute(cSeed, 1));
    chordGeometry.setAttribute('aDelay', new BufferAttribute(cDelay, 1));
    chordGeometry.setAttribute('aT', new BufferAttribute(cT, 1));

    return { shell: shellGeometry, chords: chordGeometry };
  }, [engine, capability.coreCount]);

  const shellUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCoherence: { value: 0 },
      uPixelRatio: { value: 1 },
      uSize: { value: 2.1 },
      uFogNear: { value: 6 },
      uFogFar: { value: 120 },
      uDim: { value: 0 },
      uMaxPointSize: { value: capability.maxPointSize },
      uTint: { value: stage.tint },
      uTintAmount: { value: 0 },
      uFocus: { value: 0 },
      uStage: { value: 0 },
    }),
    [capability.maxPointSize],
  );

  const chordUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCoherence: { value: 0 },
      uFogNear: { value: 6 },
      uFogFar: { value: 120 },
      uDim: { value: 0 },
      uTint: { value: stage.tint },
      uTintAmount: { value: 0 },
    }),
    [],
  );

  useFrame(() => {
    if (group.current) {
      // For the first twenty seconds the Core does not exist yet. Leaving it in
      // the draw list means rasterising a couple of thousand sprites a frame
      // only to blend them at zero alpha — the most expensive way possible to
      // draw nothing.
      group.current.visible = stage.coherence > 0.001;
      if (!group.current.visible) return;
      // Two axes at unrelated rates. A single-axis spin on a symmetrical body is
      // what makes a rotating object read as a globe; neither condition holds.
      group.current.rotation.y = stage.time * 0.045;
      group.current.rotation.x = Math.sin(stage.time * 0.11) * 0.14;
    }
    const core = spaceRuntime[0];

    /*
     * Surviving being flown past.
     *
     * Additive sprites do not get dimmer as the camera approaches, they get
     * larger — and at the middle distance the whole shell projects into a small
     * enough area that two thousand of them saturate to a white hole with no
     * structure in it. So the Core steps back while the visitor is travelling
     * through the network, and comes back to full the moment they are actually
     * coming to see it.
     */
    const proximity = 1 - Math.min(1, Math.max(0, (stage.cameraDistance - 46) / 54));
    const flyby = 1 - 0.62 * proximity * (1 - core.focus);
    // And it is one of the eight, so it steps back when the visitor is standing
    // in one of the other seven. Without this the Core is the brightest thing
    // in every frame of the site, including the ones about something else.
    const elsewhere = 1 - stage.inside * (1 - core.focus) * 0.84;

    const shellUniform = shellMaterial.current?.uniforms;
    if (shellUniform) {
      shellUniform.uTime.value = stage.time;
      shellUniform.uCoherence.value = stage.coherence;
      shellUniform.uDim.value = stage.dim * flyby * elsewhere;
      shellUniform.uFocus.value = core.focus;
      shellUniform.uStage.value = core.stage;
      shellUniform.uFogFar.value = stage.fogFar;
      shellUniform.uTint.value = stage.tint;
      shellUniform.uTintAmount.value = stage.tintAmount;
      shellUniform.uPixelRatio.value = viewport.dpr;
    }
    const chordUniform = chordMaterial.current?.uniforms;
    if (chordUniform) {
      chordUniform.uTime.value = stage.time;
      chordUniform.uCoherence.value = stage.coherence;
      chordUniform.uFogFar.value = stage.fogFar;
      chordUniform.uTint.value = stage.tint;
      chordUniform.uTintAmount.value = stage.tintAmount;
      chordUniform.uDim.value = stage.dim * flyby * elsewhere * (1 + core.focus * 1.6);
    }
  });

  return (
    <group ref={group}>
      <lineSegments geometry={chords} frustumCulled={false} renderOrder={3}>
        <shaderMaterial
          ref={chordMaterial}
          vertexShader={CORE_CHORD_VERTEX}
          fragmentShader={CORE_CHORD_FRAGMENT}
          uniforms={chordUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={AdditiveBlending}
        />
      </lineSegments>
      <points geometry={shell} frustumCulled={false} renderOrder={4}>
        <shaderMaterial
          ref={shellMaterial}
          vertexShader={CORE_VERTEX}
          fragmentShader={CORE_FRAGMENT}
          uniforms={shellUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={AdditiveBlending}
        />
      </points>
    </group>
  );
}
