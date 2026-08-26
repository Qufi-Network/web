import { QUFI_COMMON } from './common';

/**
 * The QUFI Core.
 *
 * Not an object placed in the middle of the network — the network's own state
 * arriving at one place. Every point on the Core starts somewhere out in the
 * node field and collapses onto a lattice position as coherence rises, which is
 * why the structure has to assemble rather than fade in. The shell it lands on
 * is deliberately lobed and banded so its silhouette is never a sphere.
 */
export const CORE_VERTEX = /* glsl */ `
  ${QUFI_COMMON}

  attribute vec3  aScatter;
  attribute float aSeed;
  attribute float aDelay;
  attribute float aBand;

  uniform float uTime;
  uniform float uCoherence;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uDim;
  uniform float uMaxPointSize;
  /** How much of the Core the visitor is standing inside, 0..1. */
  uniform float uFocus;
  /** Where they are in INSTRUCT -> VERIFY -> SETTLE, 0..1. */
  uniform float uStage;

  varying float vAlpha;
  varying float vCharge;
  varying float vBand;
  varying float vSweep;


  void main() {
    // Points do not all collapse together; the lattice fills in over the span
    // of the transition so the assembly reads as a sequence.
    float local = clamp((uCoherence - aDelay) / max(1.0 - aDelay, 0.001), 0.0, 1.0);
    float eased = qufiEaseOut(local);

    vec3 scattered = qufiDrift(aScatter, aSeed, uTime * 0.6);
    vec3 settled = position;
    // Residual motion is proportional to disorder: the assembled lattice is
    // almost still, the unresolved cloud is not.
    settled += vec3(
      sin(uTime * 1.1 + aSeed * TAU),
      cos(uTime * 0.9 + aSeed * 4.1),
      sin(uTime * 1.3 + aSeed * 2.7)
    ) * 0.09 * (1.0 - eased * 0.82);

    // Inside, the shell opens out so the interior is a place rather than a
    // surface, and the visitor can see the layers they are between.
    settled *= 1.0 + uFocus * 0.18;

    vec3 world = mix(scattered, settled, eased);

    vec4 mvPosition = modelViewMatrix * vec4(world, 1.0);
    float viewDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;

    // Interference banding across the shell, so the surface shows structure
    // instead of even coverage.
    float fringe = 0.55 + 0.45 * sin(aBand * 9.0 + uTime * 0.6);

    // An instruction crossing the Core. The band each point sits on is its
    // position from pole to pole, so a narrow window sweeping that band is one
    // thing travelling through the structure rather than the structure pulsing.
    float front = uStage * 1.3 - 0.15;
    float sweep = exp(-pow((aBand - front) * 4.2, 2.0)) * uFocus;
    vSweep = sweep;

    vCharge = eased * fringe + sweep * 0.7;
    vBand = fringe;

    float size = uSize * (0.5 + fringe * 0.9) * (0.55 + eased * 0.8);
    gl_PointSize = clamp(size * (230.0 / max(viewDepth, 1.0)) * uPixelRatio, 1.0, uMaxPointSize);

    float depth = qufiDepthFade(viewDepth, uFogNear, uFogFar);
    vAlpha = mix(0.22, 1.0, eased) * depth * smoothstep(0.6, 4.0, viewDepth) * uDim * uCoherence;
    vAlpha *= 1.0 + sweep * 1.4;
  }
`;

export const CORE_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform vec3  uTint;
  uniform float uTintAmount;

  /**
   * Shifts a colour toward the journey's hue without changing how bright it is.
   * Declared here rather than pulled from the shared chunk because these are
   * fragment shaders and do not otherwise need it.
   */
  vec3 qufiApplyTint(vec3 colour) {
    if (uTintAmount < 0.001) return colour;
    float lum = dot(colour, vec3(0.2126, 0.7152, 0.0722));
    return mix(colour, uTint * lum * 1.3, uTintAmount);
  }



  varying float vAlpha;
  varying float vCharge;
  varying float vBand;
  varying float vSweep;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float r2 = dot(p, p);
    float mask = exp(-r2 * 30.0) + exp(-r2 * 8.0) * 0.28;
    if (mask * vAlpha < 0.002) discard;

    vec3 colour = mix(vec3(0.09, 0.35, 0.86), vec3(0.30, 0.78, 1.0), vCharge);
    colour = mix(colour, vec3(0.90, 0.96, 1.0), pow(vCharge, 3.0) * 0.6);
    gl_FragColor = vec4(qufiApplyTint(colour * (0.75 + vBand * 0.6)), mask * vAlpha);
  }
`;

/** Chords across the interior. What the Core knows, drawn as relationships. */
export const CORE_CHORD_VERTEX = /* glsl */ `
  ${QUFI_COMMON}

  attribute vec3  aScatter;
  attribute float aSeed;
  attribute float aDelay;
  attribute float aT;

  uniform float uTime;
  uniform float uCoherence;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uDim;

  varying float vAlpha;

  void main() {
    float local = clamp((uCoherence - aDelay) / max(1.0 - aDelay, 0.001), 0.0, 1.0);
    float eased = qufiEaseOut(local);
    vec3 world = mix(qufiDrift(aScatter, aSeed, uTime * 0.6), position, eased);

    vec4 mvPosition = modelViewMatrix * vec4(world, 1.0);
    float viewDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;

    // Chords only mean anything once the lattice they join has resolved, so
    // they arrive late and stay faint.
    float depth = qufiDepthFade(viewDepth, uFogNear, uFogFar);
    float travel = 0.5 + 0.5 * sin(aT * 9.0 - uTime * 2.2 + aSeed * 6.28);
    vAlpha = pow(local, 2.2) * 0.16 * depth * uDim * uCoherence * (0.5 + travel * 0.9);
  }
`;

export const CORE_CHORD_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform vec3  uTint;
  uniform float uTintAmount;

  /**
   * Shifts a colour toward the journey's hue without changing how bright it is.
   * Declared here rather than pulled from the shared chunk because these are
   * fragment shaders and do not otherwise need it.
   */
  vec3 qufiApplyTint(vec3 colour) {
    if (uTintAmount < 0.001) return colour;
    float lum = dot(colour, vec3(0.2126, 0.7152, 0.0722));
    return mix(colour, uTint * lum * 1.3, uTintAmount);
  }

  varying float vAlpha;
  void main() {

    if (vAlpha < 0.002) discard;
    gl_FragColor = vec4(qufiApplyTint(vec3(0.36, 0.72, 1.0)), vAlpha);
  }
`;
