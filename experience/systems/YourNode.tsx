'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three';
import { NodeType } from '../../network/types';
import { CHAPTERS } from '../Chapters';
import { useNetwork } from '../NetworkContext';
import { stage } from '../stage';

/**
 * The node that is not there yet.
 *
 * At the end of the descent the network fades back until one point is left,
 * unconnected, sitting closer to the visitor than anything else in the scene.
 * Reaching for one of the ways in draws a connection from it into the part of
 * the network that way in belongs to — so the closing call to action is not a
 * row of buttons under the experience, it is the last move in it.
 */

/**
 * Sixteen units in front of the closing camera position, just below the last
 * line. Kept near the lens on purpose: the network is being seen from a long
 * way back by this point, and this node has to read as being on the visitor's
 * side of that distance rather than as one more point in the structure.
 */
const HOME: [number, number, number] = [0, 1.55, 72];
const SEGMENTS = 14;
const FINAL_CHAPTER = CHAPTERS.length - 1;

const VERTEX = /* glsl */ `
  attribute float aLane;
  attribute float aT;

  uniform float uTime;
  uniform float uPresence;
  uniform float uReach;
  uniform float uJoined;
  uniform float uPixelRatio;
  uniform float uIsLine;
  uniform float uMaxPointSize;

  varying float vAlpha;
  varying float vHead;

  void main() {
    vec3 world = position;

    // The unconnected node keeps its own small motion, so it reads as waiting
    // rather than as a marker dropped on the scene.
    if (uIsLine < 0.5) {
      world += vec3(sin(uTime * 0.9), cos(uTime * 0.7), sin(uTime * 1.1)) * 0.12;
    }

    vec4 mvPosition = modelViewMatrix * vec4(world, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    // This is one point, so the usual fill-rate ceiling does not apply to it.
    // It is also the emotional centre of the last chapter and has to be big
    // enough to carry that.
    gl_PointSize = clamp(72.0 * uPixelRatio, 12.0, 150.0);

    if (uIsLine < 0.5) {
      vAlpha = uPresence;
      vHead = 0.0;
    } else {
      // A connection only exists while its own way in is being reached for, and
      // it establishes from this end outward rather than appearing whole.
      float selected = max(1.0 - min(1.0, abs(uReach - aLane)), uJoined);
      float growth = selected * uPresence;
      float drawn = 1.0 - smoothstep(growth - 0.15, growth + 0.02, aT);
      float head = exp(-pow((aT - growth) * 9.0, 2.0)) * step(0.02, growth) * (1.0 - step(0.99, growth));
      vHead = head;
      vAlpha = (drawn * 0.5 + head) * uPresence * selected;
    }
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  varying float vAlpha;
  varying float vHead;

  uniform float uTime;
  uniform float uIsLine;

  void main() {
    if (uIsLine > 0.5) {
      if (vAlpha < 0.003) discard;
      gl_FragColor = vec4(mix(vec3(0.09, 0.41, 1.0), vec3(0.85, 0.95, 1.0), vHead), vAlpha);
      return;
    }

    vec2 p = gl_PointCoord - 0.5;
    float r = length(p);

    // A core with a ring pulsing outward from it: one participant, transmitting,
    // waiting to be answered.
    float core = exp(-r * r * 150.0);
    float phase = fract(uTime * 0.5);
    float ring = exp(-pow((r - phase * 0.46) / 0.012, 2.0)) * (1.0 - phase);
    float mask = core + ring * 0.85;
    if (mask * vAlpha < 0.004) discard;

    gl_FragColor = vec4(mix(vec3(0.29, 0.75, 1.0), vec3(0.95, 0.98, 1.0), core), mask * vAlpha);
  }
`;

export function YourNode() {
  const { engine, capability } = useNetwork();
  const viewport = useThree((state) => state.viewport);
  const point = useRef<ShaderMaterial>(null);
  const link = useRef<ShaderMaterial>(null);
  const group = useRef<import('three').Group>(null);
  const reach = useRef(-1);
  const joinedRef = useRef(0);

  const { dot, lanes } = useMemo(() => {
    const dotGeometry = new BufferGeometry();
    dotGeometry.setAttribute('position', new BufferAttribute(new Float32Array(HOME), 3));
    dotGeometry.setAttribute('aLane', new BufferAttribute(new Float32Array([0]), 1));
    dotGeometry.setAttribute('aT', new BufferAttribute(new Float32Array([0]), 1));

    // Each way in reaches a different part of the network, because it does:
    // running a node joins consensus, building attaches to an application, and
    // so on. The destinations are real nodes of the matching class.
    const wanted = [NodeType.Verifier, NodeType.Application, NodeType.Institution, NodeType.Research];
    const destinations = wanted.map((type) => {
      const pool = engine.snapshot.nodes.filter((node) => node.type === type);
      const chosen = pool.length ? pool[Math.floor(pool.length * 0.37)] : engine.snapshot.nodes[0];
      return chosen.position;
    });

    const positions: number[] = [];
    const laneIds: number[] = [];
    const ts: number[] = [];
    destinations.forEach((destination, lane) => {
      for (let s = 0; s < SEGMENTS; s++) {
        for (let end = 0; end < 2; end++) {
          const t = (s + end) / SEGMENTS;
          // A gentle arc, so four connections leaving one point do not read as
          // a bundle of straight spokes.
          const lift = Math.sin(t * Math.PI) * 9;
          positions.push(
            HOME[0] + (destination[0] - HOME[0]) * t,
            HOME[1] + (destination[1] - HOME[1]) * t + lift,
            HOME[2] + (destination[2] - HOME[2]) * t,
          );
          laneIds.push(lane);
          ts.push(t);
        }
      }
    });

    const laneGeometry = new BufferGeometry();
    laneGeometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    laneGeometry.setAttribute('aLane', new BufferAttribute(new Float32Array(laneIds), 1));
    laneGeometry.setAttribute('aT', new BufferAttribute(new Float32Array(ts), 1));

    return { dot: dotGeometry, lanes: laneGeometry };
  }, [engine]);

  const dotUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPresence: { value: 0 },
      uReach: { value: -1 },
      uJoined: { value: 0 },
      uPixelRatio: { value: 1 },
      uIsLine: { value: 0 },
      uMaxPointSize: { value: capability.maxPointSize },
    }),
    [capability.maxPointSize],
  );

  const laneUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPresence: { value: 0 },
      uReach: { value: -1 },
      uJoined: { value: 0 },
      uPixelRatio: { value: 1 },
      uIsLine: { value: 1 },
      uMaxPointSize: { value: capability.maxPointSize },
    }),
    [capability.maxPointSize],
  );

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    // Present only in the closing chapter, arriving as the network recedes.
    const presence = Math.max(0, Math.min(1, (stage.depth - FINAL_CHAPTER - 0.06) / 0.22));

    if (group.current) group.current.visible = presence > 0.002;
    if (presence <= 0.002) return;

    // Reaching is smoothed so a connection establishes rather than snapping on.
    // A reach of 4 means the register has been completed: every lane lights at
    // once rather than one at a time, which is the node actually joining rather
    // than considering it.
    const wanted = stage.reach;
    const joined = wanted >= 3.5;
    reach.current +=
      (wanted < 0 ? reach.current : wanted - reach.current) * (1 - Math.exp(-delta * 9));
    joinedRef.current += ((joined ? 1 : 0) - joinedRef.current) * (1 - Math.exp(-delta * 3));

    for (const [material, isLine] of [
      [point.current, 0],
      [link.current, 1],
    ] as const) {
      const u = material?.uniforms;
      if (!u) continue;
      u.uTime.value = stage.time;
      u.uPresence.value = isLine ? (wanted < 0 ? 0 : presence) : presence;
      u.uReach.value = reach.current;
      u.uJoined.value = joinedRef.current;
      u.uPixelRatio.value = viewport.dpr;
    }
  });

  return (
    <group ref={group}>
      <lineSegments geometry={lanes} frustumCulled={false} renderOrder={6}>
        <shaderMaterial
          ref={link}
          vertexShader={VERTEX}
          fragmentShader={FRAGMENT}
          uniforms={laneUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={AdditiveBlending}
        />
      </lineSegments>
      <points geometry={dot} frustumCulled={false} renderOrder={7}>
        <shaderMaterial
          ref={point}
          vertexShader={VERTEX}
          fragmentShader={FRAGMENT}
          uniforms={dotUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={AdditiveBlending}
        />
      </points>
    </group>
  );
}
