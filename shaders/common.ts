/**
 * GLSL shared by every system in the experience.
 *
 * The important piece here is `qufiNodeWorld`. Nodes and connections are drawn
 * by two different shaders in two different draw calls, but a connection has to
 * land exactly on the nodes it joins — including after drift and after the
 * pointer has pushed things around. Both shaders call this one function, so the
 * two can never disagree.
 */
export const QUFI_COMMON = /* glsl */ `
  const float TAU = 6.28318530718;

  // The whole experience is one accent colour at four levels of excitation.
  const vec3 QUFI_REST   = vec3(0.086, 0.176, 0.353);
  const vec3 QUFI_ACCENT = vec3(0.090, 0.412, 1.000);
  const vec3 QUFI_SIGNAL = vec3(0.094, 0.722, 1.000);
  const vec3 QUFI_PEAK   = vec3(0.870, 0.945, 1.000);

  /** Centre of the texel holding record 'id' in a 'size' x 'size' texture. */
  vec2 qufiTexel(float id, float size) {
    float row = floor(id / size);
    float col = id - row * size;
    return (vec2(col, row) + 0.5) / size;
  }

  /**
   * Idle motion. Nodes are live machines, not pinned markers, so they hold
   * station rather than sitting perfectly still. Amplitude stays under half a
   * world unit — enough to read as alive, not enough to blur the structure.
   */
  vec3 qufiDrift(vec3 base, float seed, float time) {
    float a = seed * TAU;
    return base + vec3(
      sin(time * 0.21 + a)        * 0.42,
      cos(time * 0.17 + a * 1.7)  * 0.30,
      sin(time * 0.13 + a * 2.31) * 0.42
    );
  }

  /**
   * Pointer influence. Nodes are displaced away from the pointer with a squared
   * falloff, so the effect is strongly local: the visitor parts the network in
   * front of them instead of dragging the whole thing about.
   */
  vec3 qufiPointer(vec3 pos, vec3 pointer, float amp, float radius) {
    vec3 delta = pos - pointer;
    float dist = length(delta);
    float falloff = 1.0 - smoothstep(0.0, radius, dist);
    falloff *= falloff;
    return pos + normalize(delta + vec3(1e-4)) * falloff * amp;
  }

  vec3 qufiNodeWorld(vec3 base, float seed, float time, vec3 pointer, float amp, float radius) {
    return qufiPointer(qufiDrift(base, seed, time), pointer, amp, radius);
  }

  /** 0 before this record has emerged, 1 once it has fully arrived. */
  float qufiReveal(float order, float reveal, float fade) {
    return smoothstep(order, order + fade, reveal);
  }

  /**
   * Shifts a colour toward a target hue without changing how bright it is.
   *
   * Each journey has its own colour, and the network takes that colour on while
   * the visitor is inside it. Recolouring has to preserve luminance or the
   * structure of the scene changes with the hue — the bright parts have to stay
   * the bright parts, or the network appears to reorganise every time the
   * palette moves.
   */
  vec3 qufiTint(vec3 colour, vec3 tint, float amount) {
    float lum = dot(colour, vec3(0.2126, 0.7152, 0.0722));
    return mix(colour, tint * lum * 1.3, amount);
  }

  /** Cheap stable hash. Used to give each record its own fate under stress. */
  float qufiHash(float n) {
    return fract(sin(n * 12.9898 + 4.1414) * 43758.5453);
  }

  float qufiEaseOut(float t) {
    float inv = 1.0 - t;
    return 1.0 - inv * inv * inv;
  }

  /**
   * Depth attenuation toward the void colour. With additive blending there is
   * no fog to mix into, so distance is expressed as loss of energy instead.
   */
  float qufiDepthFade(float viewDepth, float near, float far) {
    return smoothstep(far, near, viewDepth);
  }
`;
