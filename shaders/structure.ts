import { QUFI_COMMON } from './common';

/**
 * Seven structures, one draw call.
 *
 * Everything the visitor reads as behaviour happens in here: a signature
 * assembling and coming apart, a lattice drawing a proof out of a field of
 * computation, assets held until they are confirmed, a gateway that only opens
 * on valid proof, a route failing and re-forming, four settlement environments
 * over one verification layer, and three kinds of value in motion.
 *
 * The shader knows nothing about QUFI. It is handed, per space, an anchor, a
 * scale, a colour, a presence, a cycling phase and a stage — and each point
 * carries which structure it belongs to and what part of it it is. The names in
 * the branch labels are the only place the meaning appears.
 *
 * Per-space state arrives as a small float texture rather than as uniform
 * arrays, for the same reason node state does: dynamic indexing of a uniform
 * array is not something to bet a driver on, and this project already knows how
 * to move numbers to the GPU this way.
 *
 * Texture layout, one column per space:
 *   row 0   anchor.xyz, scale
 *   row 1   colour.rgb, presence
 *   row 2   phase, focus, stage, activity
 *   row 3   dim, spare, spare, spare
 */

export const STRUCTURE_VERTEX = /* glsl */ `
  ${QUFI_COMMON}

  attribute vec3  aScatter;
  attribute vec4  aParam;   // seed, role, u, sub
  attribute vec2  aIndex;   // space, kind

  uniform sampler2D uSpaceState;
  uniform float uSpaceCount;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uDim;
  uniform float uMaxPointSize;
  uniform vec3  uPointer;
  uniform float uPointerAmp;

  varying float vAlpha;
  varying float vCharge;
  varying vec3  vColour;
  varying float vSoft;

  const float KIND_SIGNATURE     = 1.0;
  const float KIND_LATTICE       = 2.0;
  const float KIND_ORBIT         = 3.0;
  const float KIND_GATE          = 4.0;
  const float KIND_BRANCH        = 5.0;
  const float KIND_CONSTELLATION = 6.0;
  const float KIND_STREAMS       = 7.0;

  vec4 spaceRow(float space, float row) {
    return texture2D(uSpaceState, vec2((space + 0.5) / uSpaceCount, (row + 0.5) / 4.0));
  }

  mat3 rotY(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
  }

  mat3 rotX(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);
  }

  mat3 rotZ(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0);
  }

  /* ------------------------------------------------- 06 recovery pathways --
   * These control points are the same three the CPU generator uses to lay the
   * routes down. The packet has to travel along a route rather than near it,
   * so the curve has to exist on both sides. If one changes, both change.
   */
  vec3 routePoint(float route, float t) {
    vec3 from = vec3(-0.92, -0.16, 0.0);
    vec3 to   = vec3( 0.92,  0.16, 0.0);
    vec3 control = vec3(0.0, 0.62, 0.3);
    if (route > 1.5)      control = vec3(-0.1, 0.1, 0.72);
    else if (route > 0.5) control = vec3(0.05, -0.58, -0.34);
    float m = 1.0 - t;
    return m * m * from + 2.0 * m * t * control + t * t * to;
  }

  /* ------------------------------------------------------ 08 high-value flows --
   * The three stream paths, so value can genuinely travel along them instead of
   * a brightness moving over stationary points. Matches the CPU generator.
   */
  vec3 streamPoint(float stream, float t, float spin) {
    if (stream < 0.5) {
      // Digital assets: a dense braid, travelling straight through.
      float rad = 0.1 + 0.05 * sin(t * 11.0);
      return vec3(
        (t - 0.5) * 2.0,
        0.52 + sin(t * 5.2) * 0.08 + sin(spin) * rad,
        0.46 + cos(spin) * rad + sin(t * 3.1) * 0.1
      );
    }
    if (stream < 1.5) {
      // Money: it circulates, so it comes back.
      float a = t * TAU;
      float rad = 0.62 + sin(a * 3.0) * 0.06;
      float jitter = 0.055;
      return vec3(
        cos(a) * rad + cos(spin) * jitter,
        -0.04 + sin(a * 2.0) * 0.14 + sin(spin) * jitter,
        sin(a) * rad * 0.5 + sin(spin * 1.7) * jitter
      );
    }
    // Trade finance: structured, and it moves in steps.
    float step9 = floor(t * 9.0) / 9.0;
    return vec3(
      (t - 0.5) * 1.9,
      -0.62 + step9 * 0.3,
      -0.44 + (fract(spin * 0.31831) - 0.5) * 0.22 + sin(step9 * 8.0) * 0.1
    );
  }

  /** Where the four settlement environments stand. Matches the CPU generator. */
  vec3 environmentAt(float e) {
    if (e < 0.5) return vec3(-0.72, 0.40, -0.14);
    if (e < 1.5) return vec3(-0.24, 0.50,  0.17);
    if (e < 2.5) return vec3( 0.24, 0.47, -0.17);
    return vec3(0.72, 0.38, 0.12);
  }

  void main() {
    float space = aIndex.x;
    float kind  = aIndex.y;
    float seed  = aParam.x;
    float role  = aParam.y;
    float u     = aParam.z;
    float sub   = aParam.w;

    vec4 place  = spaceRow(space, 0.0);
    vec4 look   = spaceRow(space, 1.0);
    vec4 motion = spaceRow(space, 2.0);
    vec4 extra  = spaceRow(space, 3.0);

    vec3  anchor   = place.xyz;
    float scale    = place.w;
    vec3  colour   = look.rgb;
    float presence = look.a;
    float phase    = motion.x;
    float focus    = motion.y;
    float stage    = motion.z;
    float activity = motion.w;
    float dim      = extra.x;

    // A structure the visitor cannot see costs nothing beyond this line.
    if (presence * dim < 0.002) {
      gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      vAlpha = 0.0;
      return;
    }

    vec3 local = position;
    vec3 scattered = qufiDrift(aScatter, seed, uTime * 0.5);
    float charge = 0.5;
    float alpha = 1.0;
    float soft = 0.0;
    float palette = -1.0;
    float spin = seed * TAU;

    /* ---------------------------------------------- 02 post-quantum signing --
     * The signature never finishes. It resolves, holds, and comes apart again,
     * because the claim is about a scheme rather than about one signature.
     */
    if (kind < KIND_SIGNATURE + 0.5) {
      // Resolves quickly, holds for most of the cycle, then comes apart. A
      // symmetric breathe spends half its life as a cloud, and a cloud is not
      // what a signature looks like.
      float c = fract(phase);
      float auto_ = smoothstep(0.0, 0.3, c) - smoothstep(0.76, 0.99, c);
      // Under the visitor's hand the crystal resolves during SIGN and then
      // holds, because VERIFY and PROVE are things that happen to a signature
      // that exists. It came apart under them when this tracked the stage
      // linearly, which said the opposite.
      float driven = clamp(stage * 2.8, 0.0, 1.0);
      float drive = mix(auto_, driven, focus);

      float form = clamp((drive * 1.5 - u * 0.7) / 0.55, 0.0, 1.0);
      form = qufiEaseOut(form);

      // PROVE: the outer shells leave and what continues is the small thing at
      // the middle. The proof is not a copy of the signature, it is what is
      // left once the signature has been checked.
      float prove = smoothstep(0.66, 0.97, stage) * focus;

      vec3 target = local;
      // Inside, the shells separate so the interior is a place and not a
      // surface. Nothing here is decoration: it is the layering being shown.
      if (role < 0.5) target *= 1.0 + focus * (0.1 + sub * 0.2) + prove * sub * 0.7;
      else target *= 1.0 + focus * 0.44 + prove * sub * 0.7;

      // The lattice never sits perfectly still; disorder is proportional to how
      // far it is from resolved.
      target += vec3(
        sin(uTime * 1.3 + spin),
        cos(uTime * 1.1 + spin * 1.7),
        sin(uTime * 0.9 + spin * 2.3)
      ) * 0.016 * (1.0 - form * 0.7);

      local = mix(scattered * 0.85, target, form);
      charge = form;
      alpha = mix(0.2, 1.0, form * form);
      if (role > 0.5) alpha *= 0.4 + 0.75 * form;
      alpha *= 1.0 - prove * clamp(sub, 0.0, 1.0) * 0.82;
      soft = 1.0 - form;
    }

    /* ------------------------------------------------------------- 03 proof --
     * A field of computation contracts to a lattice, the lattice emits one very
     * small object, and that object leaves. The size difference is the argument.
     */
    else if (kind < KIND_LATTICE + 0.5) {
      float auto_ = fract(phase);
      float drive = mix(auto_, clamp(stage, 0.0, 1.0), focus);

      if (role < 0.5) {
        // The lattice, built in a sweep.
        float form = clamp((drive * 1.6 - u) * 3.4, 0.0, 1.0);
        form = qufiEaseOut(form);
        local = mix(scattered * 0.7, local, form);
        charge = 0.35 + form * 0.65;
        alpha = mix(0.12, 1.0, form * form);
        soft = 1.0 - form;
      } else if (role < 1.5) {
        // The computational field. It swirls, then gives itself up.
        float converge = smoothstep(0.36, 0.74, drive);
        vec3 swirled = rotY(uTime * 0.16 + u * 2.0) * local;
        swirled.y += sin(uTime * 0.5 + spin) * 0.06;
        local = mix(swirled, swirled * 0.08, converge);
        charge = 0.2 + converge * 0.5;
        // Bright while it is working, spent once the work has moved on.
        alpha = (0.2 + 0.28 * sin(uTime * 1.4 + spin)) * (1.0 - converge * 0.72);
        alpha = max(alpha, 0.04);
        soft = 1.0;
      } else {
        // The proof. Small, concentrated, and it does not stay.
        float born = smoothstep(0.6, 0.76, drive);
        float leave = smoothstep(0.82, 1.0, drive);
        local = local * (0.4 + born * 0.6);
        local.y += leave * 2.4;
        local.x += leave * 0.5;
        charge = 1.0;
        alpha = born * (1.0 - leave * 0.85);
      }
    }

    /* ----------------------------------------------- 04 collateral confirmation --
     * Nothing passes the field until it has been confirmed. The orbiters are what
     * has been; the arrivals are what has not.
     */
    else if (kind < KIND_ORBIT + 0.5) {
      float auto_ = fract(phase);
      float drive = mix(auto_, clamp(stage, 0.0, 1.0), focus);

      if (role < 0.5) {
        float breathe = 1.0 + sin(uTime * 0.7) * 0.03;
        local = rotY(uTime * 0.18) * (local * breathe);
        charge = 0.85;
        alpha = 0.9;
      } else if (role < 1.5) {
        float a = uTime * (0.34 + sub * 0.055) + u * TAU;
        float radius = 0.52 + sub * 0.1;
        float incl = 0.22 + sub * 0.3;
        vec3 centre = vec3(
          cos(a) * radius,
          sin(a) * radius * sin(incl),
          sin(a) * radius * cos(incl)
        );
        local = centre + local;
        charge = 0.95;
        alpha = 1.0;
      } else if (role < 2.5) {
        // The verification field. Banded, and it tightens while it is checking.
        float check = 0.5 - 0.5 * cos(drive * TAU);
        local *= 1.0 - check * 0.06;
        float band = 0.5 + 0.5 * sin(local.y * 9.0 - uTime * 1.1 + spin * 0.4);
        charge = 0.22 + band * 0.34;
        alpha = (0.2 + band * 0.42) * (0.6 + check * 0.7);
        soft = 1.0;
      } else {
        // An arrival: approach, be held, then be let through.
        float t = fract(drive + sub * 0.333);
        float approach = smoothstep(0.0, 0.42, t);
        float held = smoothstep(0.42, 0.5, t) * (1.0 - smoothstep(0.68, 0.76, t));
        float pass = smoothstep(0.72, 0.98, t);

        float a = sub * 2.1;
        vec3 outside = vec3(cos(a) * 2.3, 0.5 + sin(a) * 0.4, sin(a) * 2.3);
        vec3 atField = normalize(outside) * 1.12;
        vec3 inside = normalize(outside) * 0.3;

        vec3 travel = mix(outside, atField, approach);
        travel = mix(travel, inside, pass);
        local = travel + local;

        // While it is being checked it flickers; once confirmed it is steady.
        float doubt = held * (0.5 + 0.5 * sin(uTime * 9.0 + sub * 2.0));
        charge = mix(0.5, 1.0, pass) - doubt * 0.35;
        alpha = (0.35 + approach * 0.65) * (1.0 - smoothstep(0.94, 1.0, t));
      }
    }

    /* ----------------------------------------------- 05 proof-gated movement --
     * Alignment is one number. Everything the visitor understands about this
     * space comes from watching it reach one and then let go again.
     */
    else if (kind < KIND_GATE + 0.5) {
      float auto_ = fract(phase);
      float drive = mix(auto_, clamp(stage, 0.0, 1.0), focus);
      // Left to itself the gateway opens and closes. Under the visitor's hand
      // it opens on ALIGN and stays open through PASS — a gate that shuts again
      // at the exact moment the copy says things are passing through it is a
      // scene arguing with its own caption.
      float cycling = smoothstep(0.3, 0.52, auto_) * (1.0 - smoothstep(0.76, 0.94, auto_));
      float held = smoothstep(0.3, 0.6, stage);
      float align = mix(cycling, held, focus);

      if (role < 0.5) {
        float tilt = (1.0 - align) * (0.42 + sub * 0.3);
        float ringSpin = uTime * (0.22 + sub * 0.11) * (1.0 - align * 0.82);
        local = rotZ(ringSpin) * local;
        local = rotX(tilt * sin(sub * 1.7 + 0.4)) * local;
        local = rotY(tilt * cos(sub * 2.3)) * local;
        // The rings draw together as they align.
        local.z *= 1.0 - align * 0.72;
        charge = 0.4 + align * 0.6;
        alpha = 0.55 + align * 0.45;
      } else if (role < 1.5) {
        float valid = sub;
        float t = fract(u + uTime * 0.13);
        float z = -1.55 + t * 3.1;
        // Anything without proof is stopped at the face of the gateway, and
        // anything arriving while the rings are apart is stopped too.
        float admitted = valid * step(0.5, align + 0.5 * valid - 0.5);
        admitted = valid * step(0.35, align);
        float wall = -0.12;
        float blocked = 1.0 - admitted;
        float zBlocked = min(z, wall) - max(0.0, z - wall) * 0.9;
        z = mix(zBlocked, z, admitted);
        local = vec3(local.x, local.y, z);
        // Rejected traffic spreads out again rather than piling up.
        local.xy *= 1.0 + blocked * max(0.0, t - 0.42) * 1.8;
        charge = mix(0.25, 1.0, admitted);
        alpha = (0.45 + 0.55 * admitted) * (1.0 - smoothstep(0.86, 1.0, t));
        if (blocked > 0.5) alpha *= 0.55;
      } else {
        // The open pathway.
        float travel = 0.5 + 0.5 * sin(u * 12.0 - uTime * 3.4);
        charge = 1.0;
        alpha = align * (0.12 + travel * 0.35);
        soft = 1.0;
      }
    }

    /* ---------------------------------------------------------- 06 recovery --
     * The route is genuinely lost and a different one genuinely forms. Fading
     * one line up while another fades down would say the network has options;
     * this says the network adapts.
     */
    else if (kind < KIND_BRANCH + 0.5) {
      // Unattended, the process crosses and re-routes over and over. Under the
      // visitor's hand it does it once, timed so that ROUTE, BREAK, REFORM and
      // CONTINUE each land on the thing they name.
      float turn = mix(phase * 3.0, clamp(stage, 0.0, 1.0), focus);
      float live = floor(mod(turn, 3.0));
      float next = mod(live + 1.0, 3.0);
      float t = fract(turn) + step(0.999, turn);

      float fail = smoothstep(0.28, 0.5, t);
      float form = smoothstep(0.52, 0.78, t);

      if (role < 0.5) {
        float isLive = 1.0 - step(0.5, abs(sub - live));
        float isNext = 1.0 - step(0.5, abs(sub - next));

        float lit = isLive * (1.0 - fail) + isNext * form;
        float broken = isLive * fail;

        // The lost route does not dim. It comes apart.
        local = mix(local, mix(local, scattered * 0.55, 0.75), broken);
        charge = 0.3 + lit * 0.7;
        alpha = 0.07 + lit * 0.8;
        soft = broken;
      } else if (role < 1.5) {
        // The process in transit, on whichever route is carrying it.
        float route = mix(live, next, form);
        float along = fract(t * 1.6 + 0.1);
        local = routePoint(route, along) + local;
        charge = 1.0;
        alpha = 0.9;
      } else {
        float pulse = 0.5 + 0.5 * sin(uTime * 1.3 + sub * 2.0);
        local = rotY(uTime * 0.2 * (sub * 2.0 - 1.0)) * local;
        charge = 0.7 + pulse * 0.3;
        alpha = 0.85;
      }
    }

    /* --------------------------------------------------- 07 multi-network ----
     * Four environments with four architectures, and one layer beneath all of
     * them. The layer is flat and wide on purpose: QUFI is not a fifth
     * environment standing alongside the others.
     */
    else if (kind < KIND_CONSTELLATION + 0.5) {
      // ENVIRONMENTS, VERIFICATION, SETTLEMENT: the same picture read three
      // ways. Each beat brings its own layer forward rather than replacing
      // anything, because the claim is that all three are true at once.
      float onEnv = 1.0 - smoothstep(0.0, 0.42, stage) * focus * 0.55;
      float onLayer = mix(1.0, 0.45 + smoothstep(0.2, 0.55, stage) * 1.5, focus);
      float onSettle = mix(1.0, 0.4 + smoothstep(0.55, 0.9, stage) * 1.7, focus);

      if (role < 0.5) {
        vec3 centre = environmentAt(sub);
        vec3 offset = local - centre;
        offset = rotY(uTime * (0.1 + sub * 0.06)) * offset;
        offset.y += sin(uTime * 0.42 + sub * 1.7) * 0.014;
        local = centre + offset;
        charge = 0.75 + 0.25 * sin(uTime * 0.8 + sub * 2.0);
        alpha = 0.92 * onEnv;
        palette = sub;
      } else if (role < 3.5) {
        // The verification layer, with work moving across it.
        float wave = 0.5 + 0.5 * sin(u * 11.0 - uTime * 1.5 + sub * 1.4);
        local.y += sin(u * 7.0 + uTime * 0.5) * 0.012;
        charge = 0.3 + wave * 0.6;
        alpha = (0.26 + wave * 0.5) * onLayer;
        palette = 4.0;
      } else {
        // Each environment reaching down into the layer, and the layer
        // answering. The pulse travels down, because verification precedes
        // settlement rather than following it.
        float travel = fract(u + uTime * 0.32 + sub * 0.25);
        float head = smoothstep(0.82, 1.0, 1.0 - abs(travel - 0.5) * 2.0);
        charge = 0.4 + head * 0.6;
        alpha = (0.1 + head * 0.65) * onSettle;
        palette = 4.0;
        soft = 0.4;
      }
    }

    /* ------------------------------------------------- 08 high-value flows ----
     * Three ecosystems in motion. The value genuinely travels along the path:
     * a brightness sliding over stationary points reads as a diagram, and the
     * brief for this space is explicitly not a diagram.
     */
    else if (kind < KIND_STREAMS + 0.5) {
      float speed = 0.055 + sub * 0.016;
      float t = fract(u + uTime * speed);
      if (role < 0.5) {
        local = streamPoint(sub, t, spin);
      } else {
        // The tails that join the streams to the middle of the network.
        vec3 head = streamPoint(sub, fract(t * 0.5), spin);
        local = mix(vec3(0.0, (1.0 - sub) * 0.08, 0.0), head, u);
        alpha = 0.34;
      }
      // The sequence names one flow at a time, so that flow comes forward and
      // the other two carry on quietly behind it. Nothing stops; a stream the
      // visitor is not reading about is still a stream.
      float named = 1.0 - clamp(abs(clamp(stage, 0.0, 0.999) * 3.0 - 0.5 - sub), 0.0, 1.0);
      float emphasis = mix(1.0, 0.34 + named * 0.9, focus);

      float pulse = 0.5 + 0.5 * sin(t * TAU * 3.0 - uTime * 1.6);
      charge = 0.45 + pulse * 0.55;
      alpha *= (0.5 + pulse * 0.55) * emphasis;
      palette = 5.0 + sub;
    }

    // Structures hold station the way nodes do, so nothing in the scene is ever
    // completely still.
    local += vec3(
      sin(uTime * 0.19 + spin),
      cos(uTime * 0.23 + spin * 1.4),
      sin(uTime * 0.17 + spin * 2.1)
    ) * 0.01;

    // Every structure turns, slowly, on an axis that is not the vertical — a
    // single-axis spin is what makes an object read as a globe.
    float turnRate = 0.026 + mod(space, 3.0) * 0.008;
    mat3 orientation = rotY(uTime * turnRate) * rotX(sin(uTime * 0.09 + space) * 0.09);
    vec3 world = anchor + orientation * (local * scale);

    // The pointer parts the structures the way it parts the network, but much
    // less: these are architecture, not participants.
    world = qufiPointer(world, uPointer, uPointerAmp * 0.35, 14.0);

    vec4 mvPosition = modelViewMatrix * vec4(world, 1.0);
    float viewDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;

    /*
     * Fill rate is the only budget in this scene, and a sprite costs the square
     * of its size.
     *
     * Two structures in particular - the computational field around the proof
     * lattice, and the settlement constellation - put a thousand unresolved
     * points within twenty units of the lens, where each one rasterises across
     * a third of the frame. That is not a slow frame, it is a driver reset on
     * integrated graphics, and it is what these three lines are for. Anything
     * unresolved is drawn small, everything is capped well below the sprite
     * ceiling the participants use, and whatever comes closer than a few units
     * to the lens is fog rather than architecture and is faded out.
     */
    float size = uSize * (0.55 + charge * 0.85) * (1.0 + focus * 0.24);
    float ceiling = uMaxPointSize * 0.40;
    if (soft > 0.5) {
      size *= 0.44;
      ceiling = min(ceiling, 10.0);
    }
    gl_PointSize = clamp(size * (240.0 / max(viewDepth, 1.0)) * uPixelRatio, 0.8, ceiling);

    float depth = qufiDepthFade(viewDepth, uFogNear, uFogFar);
    vAlpha = alpha * depth * smoothstep(1.6, 7.0, viewDepth) * dim * presence *
             (0.55 + activity * 0.45);
    vCharge = charge;
    vSoft = soft;

    // Palette overrides let one structure carry several colours without a
    // second draw call: the settlement environments and the three flows.
    vec3 base = colour;
    if (palette >= 0.0) {
      if (palette < 0.5)      base = vec3(1.00, 0.60, 0.22);
      else if (palette < 1.5) base = vec3(0.18, 0.88, 0.53);
      else if (palette < 2.5) base = vec3(0.25, 0.78, 1.00);
      else if (palette < 3.5) base = vec3(0.60, 0.42, 1.00);
      else if (palette < 4.5) base = vec3(0.18, 0.48, 1.00);
      else if (palette < 5.5) base = vec3(1.00, 0.69, 0.23);
      else if (palette < 6.5) base = vec3(0.20, 0.86, 0.55);
      else                    base = vec3(0.60, 0.40, 1.00);
    }
    vColour = base;
  }
`;

export const STRUCTURE_FRAGMENT = /* glsl */ `
  precision highp float;

  varying float vAlpha;
  varying float vCharge;
  varying vec3  vColour;
  varying float vSoft;

  void main() {
    if (vAlpha < 0.0022) discard;

    vec2 p = gl_PointCoord - 0.5;
    float r2 = dot(p, p);
    // A tight core with a wide halo. Unresolved points get the halo alone, so
    // a structure coming apart looks like vapour and not like small dots.
    float core = exp(-r2 * 32.0);
    float halo = exp(-r2 * 7.0);
    float mask = mix(core + halo * 0.26, halo * 0.7, vSoft);
    if (mask * vAlpha < 0.0018) discard;

    vec3 colour = mix(vColour * 0.55, vColour, vCharge);
    // Only the most excited points reach white, which is what keeps the palette
    // from washing out as a structure comes up to full.
    colour = mix(colour, vec3(0.92, 0.97, 1.0), pow(max(vCharge, 0.0), 4.0) * 0.55);

    gl_FragColor = vec4(colour, mask * vAlpha);
  }
`;
