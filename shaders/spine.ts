import { QUFI_COMMON } from './common';

/**
 * The architecture, drawn as relationships.
 *
 * These are the pathways between the eight spaces. In the global view they are
 * the whole argument of the site: QUFI is not a collection of capabilities, it
 * is one connected thing, and you can see that before you have read a word.
 *
 * A spine reads the presence of both of the spaces it joins out of the same
 * state texture the structures use, so when the visitor enters one space, every
 * pathway that does not touch it steps back on its own. Nothing has to tell it
 * to.
 */
export const SPINE_VERTEX = /* glsl */ `
  ${QUFI_COMMON}

  attribute float aT;
  attribute float aSeed;
  attribute vec2  aEnds;

  uniform sampler2D uSpaceState;
  uniform float uSpaceCount;
  uniform float uTime;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uDim;

  varying float vAlpha;
  varying float vCharge;
  varying vec3  vColour;

  vec4 spaceRow(float space, float row) {
    return texture2D(uSpaceState, vec2((space + 0.5) / uSpaceCount, (row + 0.5) / 4.0));
  }

  void main() {
    vec4 lookA = spaceRow(aEnds.x, 1.0);
    vec4 lookB = spaceRow(aEnds.y, 1.0);
    vec4 motionA = spaceRow(aEnds.x, 2.0);
    vec4 motionB = spaceRow(aEnds.y, 2.0);

    float presence = min(lookA.a, lookB.a);
    float focus = max(motionA.y, motionB.y);

    vec3 world = qufiDrift(position, aSeed, uTime * 0.35);

    vec4 mvPosition = modelViewMatrix * vec4(world, 1.0);
    float viewDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;

    // Verification travelling the pathway. Direction alternates by seed so the
    // network does not read as flowing one way.
    float direction = aSeed > 0.5 ? 1.0 : -1.0;
    float travel = fract(aT * direction - uTime * (0.055 + aSeed * 0.045) + aSeed);
    float head = smoothstep(0.86, 1.0, travel) + smoothstep(0.965, 1.0, travel) * 1.6;

    float depth = qufiDepthFade(viewDepth, uFogNear, uFogFar);
    // Faint by default. A pathway is infrastructure; it should be legible and
    // never the brightest thing in the frame.
    float base = 0.085 + focus * 0.12;
    vAlpha = (base + head * 0.44) * depth * uDim * presence;
    vCharge = head;

    // The pathway takes the colour of whichever end is lit.
    vColour = mix(lookA.rgb, lookB.rgb, aT);
  }
`;

export const SPINE_FRAGMENT = /* glsl */ `
  precision highp float;

  varying float vAlpha;
  varying float vCharge;
  varying vec3  vColour;

  void main() {
    if (vAlpha < 0.0018) discard;
    vec3 colour = mix(vColour * 0.5, vec3(0.72, 0.9, 1.0), min(1.0, vCharge));
    gl_FragColor = vec4(colour, vAlpha);
  }
`;
