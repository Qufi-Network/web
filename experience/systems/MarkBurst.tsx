'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  ShaderMaterial,
  Vector3,
} from 'three';
import { QUFI_MARK } from '../../assets/mark';
import { createRng } from '../../network/rng';
import { useNetwork } from '../NetworkContext';
import { stage } from '../stage';

/**
 * The mark, coming apart.
 *
 * The opening flies into the middle of the Q, and at the point where the letter
 * would fill the frame it stops being a letter: it breaks into a few thousand
 * points that rush past the camera as the network resolves behind them. The
 * logo does not fade out — the visitor goes through it, and the pieces it
 * leaves behind are the same kind of thing the network is made of.
 *
 * The points are sampled from the artwork itself, keeping the colour of the
 * pixel each one came from, so what shatters is genuinely the mark rather than
 * a cloud shaped like it.
 */

const COUNT = { low: 1200, medium: 2200, high: 3400, ultra: 4800 } as const;

/** Distance in front of the camera the mark is held at. */
const HOLD = 34;

const VERTEX = /* glsl */ `
  attribute vec3 aColour;
  attribute vec3 aDirection;
  attribute float aSeed;

  uniform float uBurst;
  uniform float uPresence;
  uniform float uScale;
  uniform float uPixelRatio;
  uniform float uSize;

  varying vec3 vColour;
  varying float vAlpha;

  void main() {
    // Each piece leaves on its own line and at its own speed, so the break-up
    // reads as a shatter rather than as a uniform expansion.
    float held = smoothstep(0.0, 0.16, uBurst);
    float eased = held * uBurst * uBurst * (1.0 + aSeed * 0.9);

    vec3 local = position * uScale;
    local += aDirection * eased * 46.0;
    // ...and everything rushes toward the lens as well as outward, which is
    // what makes the camera feel like it is passing through the letter.
    local.z += eased * 60.0;

    vec4 mvPosition = modelViewMatrix * vec4(local, 1.0);
    float viewDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;

    /*
     * Debris stays small.
     *
     * These pieces travel straight at the lens, so perspective wants to make
     * every one of them enormous just as thousands of them are on screen at
     * once. Left alone that is several million additively blended fragments a
     * frame and the whole opening drops to half rate. A tight ceiling costs
     * nothing visually — they are fragments, not objects.
     */
    float size = uSize * (0.75 + aSeed * 0.7) * (1.0 + uBurst * 0.6);
    gl_PointSize = clamp(size * (300.0 / max(viewDepth, 1.0)) * uPixelRatio, 1.0, 16.0);

    vColour = aColour;
    // Pieces fade as they scatter, and anything that comes near the lens is
    // gone well before it can fill the frame.
    vAlpha = uPresence
           * (1.0 - smoothstep(0.5, 0.96, uBurst))
           * smoothstep(3.0, 16.0, viewDepth);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  varying vec3 vColour;
  varying float vAlpha;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float r2 = dot(p, p);
    float mask = exp(-r2 * 26.0) + exp(-r2 * 6.5) * 0.3;
    if (mask * vAlpha < 0.003) discard;
    gl_FragColor = vec4(vColour, mask * vAlpha);
  }
`;

export function MarkBurst() {
  const { capability } = useNetwork();
  const { camera, viewport, size } = useThree();
  const material = useRef<ShaderMaterial>(null);
  const group = useRef<Group>(null);
  const forward = useRef(new Vector3());
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);

  const count = COUNT[capability.tier];

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.src = QUFI_MARK;

    image.onload = () => {
      if (cancelled) return;

      // Read the artwork so each point can carry the pixel it came from.
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(image, 0, 0);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const rng = createRng(0x9a17);
      const positions: number[] = [];
      const colours: number[] = [];
      const directions: number[] = [];
      const seeds: number[] = [];

      // Rejection sampling against the artwork: keep a candidate only where the
      // mark is actually opaque and lit, which is what gives the cloud the
      // shape of the letter instead of the shape of its bounding box.
      let guard = 0;
      while (positions.length < count * 3 && guard < count * 220) {
        guard++;
        const px = Math.floor(rng() * canvas.width);
        const py = Math.floor(rng() * canvas.height);
        const offset = (py * canvas.width + px) * 4;
        const alpha = data[offset + 3] / 255;
        const r = data[offset] / 255;
        const g = data[offset + 1] / 255;
        const b = data[offset + 2] / 255;
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (alpha < 0.35 || luminance < 0.06) continue;
        // Bias toward the lit parts, so the glowing edges of the mark carry
        // more of the pieces than the dark body does.
        if (rng() > 0.25 + luminance * 1.1) continue;

        const u = px / canvas.width - 0.5;
        const v = 0.5 - py / canvas.height;
        positions.push(u, v, (rng() - 0.5) * 0.02);
        colours.push(Math.min(1, r * 1.15), Math.min(1, g * 1.15), Math.min(1, b * 1.15));

        // Outward from the middle of the letter, with a little spin.
        const angle = Math.atan2(v, u) + (rng() - 0.5) * 0.5;
        const radius = 0.4 + rng() * 0.9;
        directions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, (rng() - 0.5) * 0.4);
        seeds.push(rng());
      }

      const geo = new BufferGeometry();
      geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
      geo.setAttribute('aColour', new BufferAttribute(new Float32Array(colours), 3));
      geo.setAttribute('aDirection', new BufferAttribute(new Float32Array(directions), 3));
      geo.setAttribute('aSeed', new BufferAttribute(new Float32Array(seeds), 1));
      setGeometry(geo);
    };

    return () => {
      cancelled = true;
    };
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uBurst: { value: 0 },
      uPresence: { value: 0 },
      uScale: { value: 20 },
      uPixelRatio: { value: 1 },
      uSize: { value: 1.5 },
    }),
    [],
  );

  useFrame(() => {
    const visible = stage.markPresence > 0.002 && geometry !== null;
    if (group.current) group.current.visible = visible;
    if (!visible || !group.current) return;

    // Held in front of the lens rather than placed in the world, so the mark
    // stays put in frame while the camera is still moving toward the network.
    camera.getWorldDirection(forward.current);
    group.current.position
      .copy(camera.position)
      .addScaledVector(forward.current, HOLD);
    group.current.quaternion.copy(camera.quaternion);

    const u = material.current?.uniforms;
    if (!u) return;
    u.uBurst.value = stage.markBurst;
    u.uPresence.value = stage.markPresence;
    u.uPixelRatio.value = viewport.dpr;

    /*
     * Matched to the drawn mark, in pixels, every frame.
     *
     * The pieces take over from a logo the DOM is still drawing, and the two
     * only read as one object if they are the same size in the same place at
     * the moment they cross over. A fixed world scale cannot do that: it drifts
     * with the field of view and with the width of the window, and what the
     * visitor sees then is one Q replaced by a different Q.
     *
     * So the scale is derived from the same clamp the stylesheet uses, through
     * the lens as it is right now.
     */
    const markPixels = Math.min(260, Math.max(150, window.innerWidth * 0.2));
    const perspective = camera as unknown as { fov: number; isPerspectiveCamera?: boolean };
    const fov = perspective.isPerspectiveCamera ? perspective.fov : 42;
    const worldPerPixel = (2 * HOLD * Math.tan((fov * Math.PI) / 360)) / size.height;
    u.uScale.value = markPixels * worldPerPixel;
  });

  if (!geometry) return null;

  return (
    <group ref={group}>
      <points geometry={geometry} frustumCulled={false} renderOrder={8}>
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
