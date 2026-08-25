import { QUFI_COMMON } from './common';

export const NODE_VERTEX = /* glsl */ `
  ${QUFI_COMMON}

  attribute float aId;
  attribute float aSeed;
  attribute float aRank;
  attribute float aType;
  attribute float aImportance;

  uniform sampler2D uNodeState;
  uniform float uNodeTexSize;
  uniform float uTime;
  uniform float uReveal;
  uniform float uRevealFade;
  uniform vec3  uPointer;
  uniform float uPointerAmp;
  uniform float uPointerRadius;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uDim;
  uniform float uMaxPointSize;
  uniform float uInstability;

  varying vec3  vColor;
  varying float vAlpha;
  varying float vType;
  varying float vPointSize;
  varying float vCharge;

  void main() {
    // Base positions come straight from the geometry here; the connection
    // shader reads the same values out of a texture. Both then run them through
    // qufiNodeWorld, so the two systems cannot drift apart.
    vec4 state = texture2D(uNodeState, qufiTexel(aId, uNodeTexSize));

    float activity = state.r;
    float focus    = state.g;
    float pulse    = state.b;
    float online   = state.a;

    float appear = qufiReveal(aRank, uReveal, uRevealFade);
    float eased  = qufiEaseOut(appear);

    vec3 world = qufiNodeWorld(position, aSeed, uTime, uPointer, uPointerAmp, uPointerRadius);

    // Under stress a participant the network can no longer verify starts to
    // lose its place, then flickers, then is simply not there any more. Which
    // ones go is fixed per node rather than random per frame, so the same parts
    // of the structure fail consistently as the visitor scrolls back and forth.
    float fate = qufiHash(aId + 0.5);
    float loss = 0.0;
    if (uInstability > 0.0001) {
      // Drift is outward as well as jittery: a structure losing its bonds
      // dilates, which reads very differently from one that is merely shaking.
      vec3 outward = normalize(world + vec3(1e-4));
      world += outward * uInstability * (1.6 + fate * 5.0);
      world += vec3(
        sin(uTime * 2.3 + fate * 31.0),
        cos(uTime * 1.9 + fate * 17.0),
        sin(uTime * 2.7 + fate * 23.0)
      ) * uInstability * (0.4 + fate * 1.4);
      float failing = smoothstep(fate, fate + 0.22, uInstability * 0.42);
      float flicker = step(0.42, fract(uTime * 2.6 + fate * 11.0));
      loss = failing * mix(1.0, flicker, 0.45);
    }
    // Arriving nodes settle inward a little as they resolve, so emergence reads
    // as the network condensing rather than as opacity being turned up.
    world *= mix(1.055, 1.0, eased);

    vec4 mvPosition = modelViewMatrix * vec4(world, 1.0);
    float viewDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;

    float charge = clamp(activity * 0.75 + pulse * 0.9 + focus * 1.1, 0.0, 1.6);
    vCharge = charge;

    float weight = 0.42 + aImportance * 1.25;
    float typeScale = 1.0 + step(2.5, aType) * 0.12 + step(6.5, aType) * 0.1;
    float size = uSize * weight * typeScale * (1.0 + charge * 0.85) * eased;

    // Perspective attenuation, floored so distant nodes stay legible points
    // rather than vanishing into sub-pixel flicker.
    //
    // The ceiling is applied after the pixel ratio, in device pixels, because
    // that is the unit the fill rate is actually spent in. Clamping before the
    // multiply lets a retina display quietly quadruple the cost of every sprite
    // in the scene, which is enough to reset the driver on integrated graphics.
    float attenuated = size * (240.0 / max(viewDepth, 1.0)) * uPixelRatio;
    gl_PointSize = clamp(attenuated, 1.0, uMaxPointSize);
    vPointSize = gl_PointSize;

    vec3 colour = mix(QUFI_REST, QUFI_ACCENT, clamp(activity * 1.15 + 0.12, 0.0, 1.0));
    // A node lit by a passing instruction takes the colour that instruction is
    // carrying, so an arrival reads as the same event as the travel.
    colour = mix(colour, mix(QUFI_SIGNAL, vec3(0.78, 0.62, 1.0), clamp(activity - 0.55, 0.0, 1.0) * 1.6), clamp(pulse, 0.0, 1.0));
    colour = mix(colour, QUFI_PEAK, clamp(focus * 0.85, 0.0, 1.0));
    // Class is expressed as luminance, never as hue. Consensus burns brightest,
    // the outer participants sit back.
    colour *= mix(1.12, 0.72, clamp(aType / 7.0, 0.0, 1.0));
    vColor = colour;

    float depth = qufiDepthFade(viewDepth, uFogNear, uFogFar);
    // Nodes that drift within a few units of the lens would otherwise smear
    // across the frame during the traverse.
    float nearFade = smoothstep(1.5, 7.0, viewDepth);

    vAlpha = eased * depth * nearFade * uDim * mix(0.32, 1.0, online)
           * (0.45 + aImportance * 0.55) * clamp(1.0 - loss, 0.0, 1.0);
    vType = aType;
  }
`;

export const NODE_FRAGMENT = /* glsl */ `
  precision highp float;

  varying vec3  vColor;
  varying float vAlpha;
  varying float vType;
  varying float vPointSize;
  varying float vCharge;

  uniform float uGlyphs;

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


  /**
   * One unit of gl_PointCoord is exactly vPointSize pixels across, so the
   * antialiasing width is known without derivatives. That keeps these glyphs
   * crisp on every device instead of depending on an extension.
   */
  float aaStep(float edge, float value, float width) {
    return smoothstep(edge - width, edge + width, value);
  }

  float band(float value, float centre, float halfWidth, float width) {
    return 1.0 - aaStep(halfWidth, abs(value - centre), width);
  }

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float r = length(p);
    float aa = 1.6 / max(vPointSize, 2.0);

    // Every node is a soft point of light first. The glyph is detail that only
    // resolves once the node is close enough for detail to mean anything.
    float core = exp(-r * r * 26.0);
    float halo = exp(-r * r * 7.0) * 0.35;
    float mask = core + halo;

    float detail = smoothstep(7.0, 17.0, vPointSize) * uGlyphs;
    if (detail > 0.001) {
      float glyph = 0.0;
      float type = floor(vType + 0.5);

      if (type < 0.5) {
        // Verifier — a core inside a ring: it signs, but only as one share.
        glyph = exp(-r * r * 60.0) + band(r, 0.33, 0.028, aa) * 0.9;
      } else if (type < 1.5) {
        // Registry — a ledger cell with a spent mark through it.
        float sq = max(abs(p.x), abs(p.y));
        glyph = band(sq, 0.30, 0.026, aa) * 0.95 + exp(-r * r * 150.0);
      } else if (type < 2.5) {
        // Anchor — a chevron pointing down and out to the underlying chain.
        float v = abs(p.x) * 0.95 + p.y;
        glyph = band(v, 0.12, 0.03, aa) * (1.0 - aaStep(0.34, abs(p.x), aa)) * 0.95;
      } else if (type < 3.5) {
        // Application — an enclosure: something built to hold value.
        float sq = max(abs(p.x), abs(p.y) * 1.25);
        glyph = band(sq, 0.31, 0.05, aa) * 0.85;
      } else if (type < 4.5) {
        // Builder — an open cross, unfinished by design.
        glyph = max(
          band(abs(p.x), 0.0, 0.028, aa) * (1.0 - aaStep(0.30, abs(p.y), aa)),
          band(abs(p.y), 0.0, 0.028, aa) * (1.0 - aaStep(0.30, abs(p.x), aa))
        ) * 0.9;
      } else if (type < 5.5) {
        // Institution — stacked bars, weight and permanence.
        glyph = (band(p.y, -0.14, 0.045, aa) + band(p.y, 0.14, 0.045, aa))
              * (1.0 - aaStep(0.30, abs(p.x), aa)) * 0.85;
      } else if (type < 6.5) {
        // Research — an observation: a ring and a point off centre.
        glyph = band(r, 0.30, 0.024, aa) * 0.8 + exp(-dot(p - vec2(0.0, 0.16), p - vec2(0.0, 0.16)) * 320.0);
      } else {
        // Governance — two arcs facing each other, agreement not authority.
        float arc = band(r, 0.30, 0.026, aa);
        glyph = arc * (1.0 - aaStep(0.62, abs(p.x) / max(r, 1e-3), aa)) * 0.9;
      }
      mask = mix(mask, max(mask * 0.55, glyph), detail);
    }

    if (mask < 0.004) discard;

    vec3 colour = qufiApplyTint(vColor * (1.0 + vCharge * 0.55));
    gl_FragColor = vec4(colour, mask * vAlpha);
  }
`;
