import { QUFI_COMMON } from './common';

/**
 * The medium the network sits in: instructions that have not entered it yet,
 * and the noise it has to resolve against. It exists to give the traverse real
 * parallax — without something between the camera and the structure, moving
 * through the network looks identical to zooming toward it.
 */
export const FIELD_VERTEX = /* glsl */ `
  ${QUFI_COMMON}

  attribute float aSeed;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform vec3  uPointer;
  uniform float uPointerAmp;
  uniform float uPointerRadius;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uDim;
  /** Distance inside which the medium is fog on the lens, not atmosphere. */
  uniform float uNearCut;

  varying float vAlpha;
  varying float vTemp;


  void main() {
    vec3 world = qufiDrift(position, aSeed, uTime * 0.4);
    world = qufiPointer(world, uPointer, uPointerAmp * 0.55, uPointerRadius * 1.6);

    vec4 mvPosition = modelViewMatrix * vec4(world, 1.0);
    float viewDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;

    gl_PointSize = clamp(uSize * (200.0 / max(viewDepth, 1.0)) * uPixelRatio, 0.7, 7.0);

    // Slow, unsynchronised flicker keeps the field at the edge of perception
    // instead of reading as a static dust layer.
    float breathe = 0.45 + 0.55 * sin(uTime * 0.7 + aSeed * TAU);
    float depth = qufiDepthFade(viewDepth, uFogNear, uFogFar);
    vAlpha = breathe * depth * smoothstep(uNearCut * 0.18, uNearCut, viewDepth) * uDim;
    vTemp = aSeed;
  }
`;

export const FIELD_FRAGMENT = /* glsl */ `
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
  varying float vTemp;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float mask = exp(-dot(p, p) * 18.0);
    if (mask * vAlpha < 0.0015) discard;
    vec3 colour = mix(vec3(0.13, 0.22, 0.40), vec3(0.20, 0.36, 0.62), vTemp);
    gl_FragColor = vec4(qufiApplyTint(colour), mask * vAlpha);
  }
`;
