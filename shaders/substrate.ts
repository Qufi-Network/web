import { QUFI_COMMON } from './common';

/**
 * The QUFI layer.
 *
 * When the destabilised network reorganises, something appears underneath it —
 * a verification lattice the rest of the structure can stand on. It resolves as
 * a wave travelling outward from directly beneath the Core, so it reads as
 * something switching on rather than something fading up, and it is drawn well
 * below the network so the two never compete for the same space.
 *
 * The lattice is deliberately regular where the network above is organic. That
 * contrast is the point: the network is who is participating, this is the rule
 * they are all participating under.
 */
export const SUBSTRATE_VERTEX = /* glsl */ `
  ${QUFI_COMMON}

  attribute float aSeed;
  attribute float aRadius;
  attribute float aT;

  uniform float uTime;
  uniform float uSubstrate;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uExtent;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uDim;
  uniform float uMaxPointSize;
  uniform float uIsLine;


  varying float vAlpha;
  varying float vCharge;

  void main() {
    // The resolution wave. Everything within the advancing front is present;
    // everything beyond it has not been established yet.
    float front = uSubstrate * uExtent * 1.15;
    float arrival = smoothstep(front, front - uExtent * 0.22, aRadius);

    vec3 world = position;
    // Cells settle onto the plane from below as they arrive.
    world.y -= (1.0 - arrival) * 6.0;
    world.y += sin(uTime * 0.6 + aRadius * 0.18 + aSeed * 6.28) * 0.28 * arrival;

    vec4 mvPosition = modelViewMatrix * vec4(world, 1.0);
    float viewDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;

    // A brightening band that rides the front, so the arrival has an edge.
    float crest = exp(-pow((aRadius - front) / (uExtent * 0.09), 2.0));
    vCharge = crest;

    gl_PointSize = clamp(uSize * (200.0 / max(viewDepth, 1.0)) * uPixelRatio, 1.0, uMaxPointSize);

    float depth = qufiDepthFade(viewDepth, uFogNear, uFogFar);
    // Lines carry the structure and points carry the rhythm, so the lines sit
    // lower and let the points read as the lattice itself.
    float weight = mix(1.0, 0.42, uIsLine);
    float travel = mix(1.0, 0.55 + 0.45 * sin(aT * 5.0 - uTime * 1.4 + aSeed * 6.28), uIsLine);
    vAlpha = arrival * uSubstrate * depth * uDim * weight * travel * (0.62 + crest * 2.4);
  }
`;

export const SUBSTRATE_FRAGMENT = /* glsl */ `
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

  uniform float uIsLine;

  void main() {
    float mask = 1.0;
    if (uIsLine < 0.5) {
      vec2 p = gl_PointCoord - 0.5;
      // Square cells, not dots: this is a lattice, not more particles.
      float square = max(abs(p.x), abs(p.y));
      mask = 1.0 - smoothstep(0.26, 0.34, square);
      mask += exp(-dot(p, p) * 34.0) * 0.7;
    }
    if (mask * vAlpha < 0.002) discard;

    vec3 colour = mix(vec3(0.07, 0.28, 0.72), vec3(0.55, 0.85, 1.0), vCharge);
    gl_FragColor = vec4(qufiApplyTint(colour), mask * vAlpha);
  }
`;
