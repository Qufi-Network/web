import { QUFI_COMMON } from './common';

/**
 * A walkthrough scene, in one draw call.
 *
 * The journey decides what is happening; this decides what that looks like.
 * Every point carries the behaviour of the figure it belongs to and its own
 * colour, and reads how present and how busy that figure is from a row of
 * texels written once a frame. Adding a product means adding figures, not
 * adding branches here.
 *
 * The path is shared. One journey moves one thing through its scene — a unit,
 * an instrument, an instruction — and everything that travels reads the same
 * waypoints, so a mark and the swarm escorting it can never come apart.
 *
 * Same discipline as the rest of the site: unresolved points draw small, the
 * sprite ceiling sits well below the one participants get, and anything close
 * to the lens fades rather than filling the frame. Fill rate is the only
 * budget that matters on the machines this has to run on.
 */
export const SCENE_VERTEX = /* glsl */ `
  ${QUFI_COMMON}

  attribute vec3  aOrigin;
  attribute vec3  aColour;
  attribute vec4  aParam;   // seed, figure, u, sub
  attribute vec4  aTrait;   // behaviour, size, soft, spin

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uDim;
  uniform float uMaxPointSize;

  /**
   * How each figure is doing, one texel apiece.
   *
   * r how present it is, g how busy, b where on the path it rides, a one spare
   * number the journey can mean anything by — an entry struck out, a deposit
   * confirmed, a threshold reached.
   */
  uniform sampler2D uState;
  uniform float uFigures;

  /** The path anything travelling rides, and how much it bows on each leg. */
  uniform vec3  uPath[5];
  uniform vec3  uBend[4];
  uniform float uLegs;

  /** How big a mark is drawn, in world units. */
  uniform float uMarkScale;

  varying float vAlpha;
  varying float vCharge;
  varying vec3  vColour;
  varying float vSoft;

  const float ASSEMBLE = 0.0;
  const float STREAM   = 1.0;
  const float DROP     = 2.0;
  const float HOLD     = 3.0;
  const float SPIN     = 4.0;
  const float ESCORT   = 5.0;
  const float MARK     = 6.0;

  vec4 figureState(float id) {
    return texture2D(uState, vec2((id + 0.5) / uFigures, 0.25));
  }

  /**
   * Where a figure stands.
   *
   * The second row of the same texture. A figure that turns has to turn about
   * its own middle rather than about the world origin, and the only way the
   * shader can know where its middle is, is to be told.
   */
  vec3 figureAnchor(float id) {
    return texture2D(uState, vec2((id + 0.5) / uFigures, 0.75)).rgb;
  }

  /**
   * Where the travelling thing is, t legs along the path.
   *
   * Each leg bows rather than running straight, because a straight line between
   * two points is a diagram and the whole business of this scene is that it is
   * a place. The bend is authored per leg so the arcs stay in the volume the
   * camera is flying through rather than wherever the maths would put them.
   */
  vec3 pathAt(float t) {
    float clamped = clamp(t, 0.0, uLegs);
    float leg = min(floor(clamped), uLegs - 1.0);
    float k = clamp(clamped - leg, 0.0, 1.0);
    k = smoothstep(0.0, 1.0, k);

    vec3 a = uPath[0];
    vec3 b = uPath[1];
    vec3 bend = uBend[0];
    for (int i = 1; i < 4; i++) {
      if (float(i) <= leg + 0.001 && float(i) < uLegs) {
        a = uPath[i];
        b = uPath[i + 1];
        bend = uBend[i];
      }
    }

    vec3 control = mix(a, b, 0.5) + bend;
    float inv = 1.0 - k;
    return inv * inv * a + 2.0 * inv * k * control + k * k * b;
  }

  void main() {
    float seed = aParam.x;
    float u    = aParam.z;
    float sub  = aParam.w;
    float kind = aTrait.x;
    float spin = aTrait.w;
    float spinPhase = seed * TAU;

    vec4 state = figureState(aParam.y);
    float presence = state.r;
    float activity = state.g;
    float travel   = state.b;
    float extra    = state.a;

    vec3 world = position;
    vec3 offset = vec3(0.0);   // filled in by a mark, added in view space
    float alpha = 0.0;
    float charge = 0.5;
    float soft = aTrait.z;
    vec3 colour = aColour;
    float billboard = 0.0;
    float grow = 0.0;   // a point the journey wants noticed

    /* ---- coming together out of nothing ----------------------------------- */
    if (kind < ASSEMBLE + 0.5) {
      float form = qufiEaseOut(clamp((presence * 1.5 - u * 0.5) / 0.7, 0.0, 1.0));
      world = mix(qufiDrift(aOrigin, seed, uTime * 0.5), position, form);
      charge = 0.25 + form * 0.55 + activity * 0.4;
      alpha = mix(0.1, 0.86, form) * presence;
      soft = max(soft, 1.0 - form);
      // Whatever the journey means by the spare number, it means it a little
      // brighter: a vault holding something is not a vault holding nothing.
      charge += extra * 0.25;
    }

    /* ---- arriving from somewhere ------------------------------------------ */
    else if (kind < STREAM + 0.5) {
      /*
       * Each point has its own place in the queue, so value arrives as a stream
       * rather than as a block — but the queue has to close up when the arrival
       * is over, or a deposit that settled two stages ago is still a hundred
       * units of gold strung across the scene behind it.
       */
      float lag = u * 0.34;
      float t = qufiEaseOut(clamp((presence - lag) / max(0.001, 1.0 - lag), 0.0, 1.0));
      world = qufiDrift(mix(aOrigin, position, t), seed, uTime * 0.4);
      charge = 0.4 + t * 0.6;
      alpha = (0.22 + t * 0.78) * presence;
      soft = max(soft, 1.0 - t * 0.7);
    }

    /* ---- falling, and settling when it lands ------------------------------ */
    else if (kind < DROP + 0.5) {
      float t = qufiEaseOut(clamp(presence, 0.0, 1.0));
      world = mix(aOrigin, position, t);
      // It lands rather than arriving: one short bounce at the bottom.
      world.y += sin(clamp((presence - 0.84) * 7.0, 0.0, 1.0) * 3.1416) * 1.7;
      charge = 0.5 + t * 0.5;
      alpha = presence > 0.001 ? mix(0.45, 1.0, t) : 0.0;
    }

    /* ---- standing where it was put, and turning where it turns ------------ */
    else if (kind < SPIN + 0.5) {
      float arrive = qufiEaseOut(clamp(presence * 1.3 - u * 0.3, 0.0, 1.0));
      world = mix(aOrigin, position, arrive);

      if (kind > HOLD + 0.5) {
        // Each ring turns in its own plane, at its own rate and its own way
        // round, so a stack of them reads as machinery rather than as a shape.
        // About the figure's own middle, or a gate at the edge of the scene
        // would swing through half of it.
        float a = uTime * spin * (0.6 + sub * 0.34) * (mod(sub, 2.0) < 0.5 ? 1.0 : -1.0);
        vec3 centre = figureAnchor(aParam.y);
        vec3 rel = world - centre;
        float c = cos(a);
        float s = sin(a);
        world = centre + vec3(rel.x * c - rel.y * s, rel.x * s + rel.y * c, rel.z);
      }

      // A figure the journey has struck out goes red and lifts out of its
      // plane, so it is legible as struck out rather than merely different.
      float struck = step(0.5, sub) * extra;
      colour = mix(colour, vec3(1.0, 0.42, 0.38), struck);
      world.z += struck * 4.0;

      /*
       * A pass running outward through whatever this is made of: gates check in
       * order, a registry lights the entry being written to. What it does not
       * do is disappear when nothing is happening — a figure the journey has
       * brought in is part of the place, and a place you can only see the busy
       * parts of is not a place.
       */
      float pass = smoothstep(sub * 0.28, sub * 0.28 + 0.42, activity);
      charge = 0.3 + pass * 0.7 + struck * 0.4;
      alpha = (0.34 + pass * 0.5 + struck * 0.4) * presence;
      // A struck entry is drawn larger as well as redder. One cell of a grid of
      // sixty is four points, and four points changing colour is not an event.
      grow = struck * 0.9;
    }

    /* ---- riding the path -------------------------------------------------- */
    else if (kind < ESCORT + 0.5) {
      // The tail is the same path, a little way behind.
      vec3 at = pathAt(travel - u);
      world = at + position + vec3(
        sin(uTime * 1.6 + spinPhase),
        cos(uTime * 1.27 + spinPhase * 1.7),
        sin(uTime * 2.05 + spinPhase * 2.3)
      ) * 0.5;
      charge = 0.55 + activity * 0.45;
      // Thins out along the tail, so it reads as trailing rather than as a rod.
      alpha = presence * (1.0 - u * 0.55) * (0.5 + sub * 0.5);
      soft = max(soft, u * 0.8);
    }

    /* ---- and the mark itself ---------------------------------------------- */
    else {
      billboard = 1.0;
      world = pathAt(travel);
      float form = qufiEaseOut(clamp(presence * 1.4 - u * 0.4, 0.0, 1.0));
      vec2 rest = position.xy;
      vec2 start = aOrigin.xy;
      vec2 flat_ = mix(start, rest, form);
      // A slow turn in its own plane, so it reads as an object rather than as
      // a sticker: it is a coin, and a coin is never quite square on. Every
      // point of it turns by the same angle, or it would not be a mark.
      float a = sin(uTime * 0.32) * 0.18;
      float c = cos(a);
      float s = sin(a);
      offset = vec3(flat_.x * c - flat_.y * s, flat_.x * s + flat_.y * c, 0.0) * uMarkScale;
      // The glyph inside the mark sits under the ring rather than over it: it
      // is stamped into the thing, and a solid shape drawn at the brightness of
      // an outline reads as a blot.
      charge = 0.78 - sub * 0.18 + activity * 0.2;
      alpha = presence * mix(0.7, 1.0, form);
      soft = max(soft, (1.0 - form) * 0.7);
    }

    if (alpha * uDim < 0.002) {
      gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      vAlpha = 0.0;
      return;
    }

    vec4 mvPosition = modelViewMatrix * vec4(world, 1.0);
    // A mark is flat to the camera: its points are placed in view space, which
    // is the only way a logo stays a logo from every angle the flight takes.
    mvPosition.xy += offset.xy * billboard;
    float viewDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;

    float size = uSize * aTrait.y * (0.55 + charge * 0.9) * (1.0 + grow);
    float ceiling = uMaxPointSize * 0.44;
    if (soft > 0.5) {
      size *= 0.5;
      ceiling = min(ceiling, 11.0);
    }
    if (billboard > 0.5) {
      ceiling = uMaxPointSize * 0.6;
      // The filled parts of a mark are drawn smaller than its outlines, for the
      // same reason: the same point size that draws a line draws a puddle.
      size *= 1.0 - sub * 0.3;
    }
    gl_PointSize = clamp(size * (240.0 / max(viewDepth, 1.0)) * uPixelRatio, 0.8, ceiling);

    float depth = qufiDepthFade(viewDepth, uFogNear, uFogFar);
    vAlpha = alpha * depth * smoothstep(1.4, 7.0, viewDepth) * uDim;
    vCharge = charge;
    vColour = colour;
    vSoft = soft;
  }
`;

export const SCENE_FRAGMENT = /* glsl */ `
  precision highp float;

  varying float vAlpha;
  varying float vCharge;
  varying vec3  vColour;
  varying float vSoft;

  void main() {
    if (vAlpha < 0.0022) discard;

    vec2 p = gl_PointCoord - 0.5;
    float r2 = dot(p, p);
    float core = exp(-r2 * 32.0);
    float halo = exp(-r2 * 7.0);
    float mask = mix(core + halo * 0.26, halo * 0.7, vSoft);
    if (mask * vAlpha < 0.0018) discard;

    vec3 colour = mix(vColour * 0.55, vColour, vCharge);
    colour = mix(colour, vec3(0.94, 0.98, 1.0), pow(max(vCharge, 0.0), 4.0) * 0.5);
    gl_FragColor = vec4(colour, mask * vAlpha);
  }
`;
