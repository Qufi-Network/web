import { QUFI_COMMON } from './common';

export const CONNECTION_VERTEX = /* glsl */ `
  ${QUFI_COMMON}

  attribute float aSrc;
  attribute float aDst;
  attribute float aT;
  attribute float aEdgeId;
  attribute float aWeight;
  attribute float aRank;
  attribute float aKind;

  uniform sampler2D uNodeStatic;
  uniform sampler2D uEdgeState;
  uniform float uNodeTexSize;
  uniform float uEdgeTexSize;
  uniform float uTime;
  uniform float uReveal;
  uniform float uGrowSpan;
  uniform vec3  uPointer;
  uniform float uPointerAmp;
  uniform float uPointerRadius;
  uniform float uBow;
  uniform float uBaseAlpha;
  uniform float uInstability;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uDim;

  varying vec3  vColor;
  varying float vAlpha;


  vec3 endpoint(float id) {
    vec4 stat = texture2D(uNodeStatic, qufiTexel(id, uNodeTexSize));
    return qufiNodeWorld(stat.xyz, stat.w, uTime, uPointer, uPointerAmp, uPointerRadius);
  }

  void main() {
    vec3 src = endpoint(aSrc);
    vec3 dst = endpoint(aDst);
    vec3 pos = mix(src, dst, aT);

    vec3 span = dst - src;
    float len = length(span);
    vec3 dir = span / max(len, 1e-4);
    float arch = sin(aT * 3.14159265);

    // A relationship under load bows away from whatever is disturbing it. The
    // endpoints stay pinned to their nodes, so the connection stretches rather
    // than detaching.
    vec3 toPointer = pos - uPointer;
    float fall = 1.0 - smoothstep(0.0, uPointerRadius * 1.4, length(toPointer));
    vec3 perp = toPointer - dir * dot(toPointer, dir);
    pos += normalize(perp + vec3(1e-4)) * fall * fall * uBow * arch;

    // A little permanent slack, so long links read as suspended rather than
    // ruled with a straight edge.
    vec3 lateral = normalize(cross(dir, vec3(0.0, 1.0, 0.0)) + vec3(1e-4));
    pos += lateral * arch * len * 0.012 * sin(uTime * 0.35 + aEdgeId * 0.37);

    // Cryptographic stress. A relationship that can no longer be verified stops
    // being a relationship: it wanders off true, breaks into fragments, and
    // eventually goes. The weakest ties fail first and the consensus backbone
    // holds longest, so the structure comes apart from the outside in rather
    // than dissolving uniformly.
    float fate = qufiHash(aEdgeId);
    float fragmentation = 0.0;
    if (uInstability > 0.0001) {
      float exposure = uInstability * 0.46 * (1.35 - aWeight * 0.55);
      float failed = smoothstep(fate, fate + 0.18, exposure);
      pos += lateral * arch * uInstability * (1.4 + fate * 2.2)
           * sin(uTime * 1.7 + aEdgeId * 0.9);
      // Chop the line into pieces that grow further apart as stress rises.
      float duty = 0.95 - uInstability * 0.34;
      float chop = step(fract(aT * (4.0 + fate * 6.0) + fate * 9.0 + uTime * 0.4), duty);
      fragmentation = failed + (1.0 - chop) * uInstability;
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float viewDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;

    // Connections draw themselves outward from the source rather than fading in
    // whole: a relationship is something that gets established.
    //
    // The born gate is not optional. Without it an edge that has not emerged
    // yet still evaluates its leading tip at aT = 0 and paints a bright point
    // on its source node, so the whole unrevealed graph shows up as a burst of
    // spikes at every cluster centre.
    float born = step(aRank, uReveal);
    float growth = clamp((uReveal - aRank) / uGrowSpan, 0.0, 1.0);
    float drawn = born * (1.0 - smoothstep(growth - 0.12, growth + 0.02, aT));
    float tip = born
      * exp(-pow((aT - growth) * 11.0, 2.0))
      * smoothstep(0.0, 0.09, growth)
      * (1.0 - smoothstep(0.94, 1.0, growth));

    vec4 state = texture2D(uEdgeState, qufiTexel(aEdgeId, uEdgeTexSize));
    float head = state.r;
    float carried = state.g;
    float traffic = state.b;

    float pulse = 0.0;
    if (head >= 0.0) {
      float d = aT - head;
      pulse = (exp(-d * d * 520.0) + exp(-d * d * 46.0) * 0.22) * carried;
    }

    /*
     * A signal changes colour as it gets further along its route.
     *
     * Instructed, checked, agreed, settled — the same dot the whole way tells
     * you something is moving; a dot that changes as it goes tells you
     * something is being processed, which is what is actually happening.
     */
    float along = state.a;
    vec3 journey = mix(QUFI_ACCENT, QUFI_SIGNAL, smoothstep(0.0, 0.45, along));
    journey = mix(journey, vec3(0.72, 0.55, 1.0), smoothstep(0.45, 0.8, along));
    journey = mix(journey, QUFI_PEAK, smoothstep(0.8, 1.0, along));

    vec3 colour = mix(QUFI_REST * 0.62, QUFI_ACCENT, clamp(traffic * 0.9, 0.0, 1.0));
    colour = mix(colour, journey, clamp(pulse, 0.0, 1.0));
    colour = mix(colour, QUFI_PEAK, clamp((pulse - 0.7) * 2.0, 0.0, 1.0));
    colour = mix(colour, QUFI_PEAK, tip * 0.7);
    // A relationship flares as it fails. Without it the loss is silent, and
    // silent loss reads as nothing happening rather than as something breaking.
    colour = mix(colour, QUFI_PEAK, clamp(fragmentation, 0.0, 1.0) * 0.55);
    // The backbone reads warmer than the periphery, purely through level.
    colour *= mix(1.0, 1.3, step(0.5, aKind) * (1.0 - step(1.5, aKind)));
    vColor = colour;

    float depth = qufiDepthFade(viewDepth, uFogNear, uFogFar);
    float nearFade = smoothstep(1.0, 6.0, viewDepth);
    // Survivors carry more weight under stress, so what is left of the
    // structure stays legible while the rest goes.
    float base = uBaseAlpha * aWeight * drawn * (1.0 + uInstability * 0.9);
    vAlpha = (base + pulse * 1.15 + tip * 0.85 * aWeight) * depth * nearFade * uDim
           * clamp(1.0 - fragmentation, 0.0, 1.0);
  }
`;

export const CONNECTION_FRAGMENT = /* glsl */ `
  precision highp float;

  varying vec3  vColor;
  varying float vAlpha;

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


  void main() {
    if (vAlpha < 0.002) discard;
    gl_FragColor = vec4(qufiApplyTint(vColor), vAlpha);
  }
`;
