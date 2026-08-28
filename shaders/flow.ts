import { QUFI_COMMON } from './common';

/**
 * The life of one uBTC, in one draw call.
 *
 * The vault assembling out of key material, the deposit arriving, the unit
 * being carried between the parties, three anchors falling to the chain, and a
 * nullifier being spent. Each part is a branch; what drives all of them is a
 * dozen numbers written once a frame.
 *
 * Same discipline as the structure shader: unresolved points draw small, the
 * sprite ceiling sits well below the one participants use, and anything close
 * to the lens is faded rather than allowed to fill the frame.
 *
 * The palette is deliberately not the front page's. That is a cyan network with
 * a colour per space; this is a ledger, and it reads in three: bitcoin gold for
 * the collateral, the unit's own green for what is issued against it, and a
 * cool violet-steel for the machinery in between. Cyan appears nowhere.
 */
export const FLOW_VERTEX = /* glsl */ `
  ${QUFI_COMMON}

  attribute vec3  aOrigin;
  attribute vec4  aParam;   // seed, part, u, sub

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uDim;
  uniform float uMaxPointSize;

  uniform float uVault;
  uniform float uDeposit;
  uniform float uConfirmed;
  uniform float uUnit;
  uniform float uCarried;
  uniform vec3  uAnchors;
  uniform float uSpent;
  uniform float uReleased;
  uniform float uChain;
  uniform float uRegistry;
  uniform float uVerifier;
  uniform float uVerifying;

  /** Where the unit is carried between: the vault, the core, and the holder. */
  uniform vec3 uVaultAt;
  uniform vec3 uHolderAt;

  varying float vAlpha;
  varying float vCharge;
  varying vec3  vColour;
  varying float vSoft;

  const float PART_VAULT    = 0.0;
  const float PART_DEPOSIT  = 1.0;
  const float PART_UNIT     = 2.0;
  const float PART_CHAIN    = 3.0;
  const float PART_ANCHOR   = 4.0;
  const float PART_REGISTRY = 5.0;
  const float PART_HOLDER   = 6.0;
  const float PART_RELEASE  = 7.0;
  const float PART_VERIFIER = 8.0;

  /* The palette this scene speaks in: bitcoin gold, QuFi cyan, the unit green. */
  const vec3 GOLD   = vec3(1.00, 0.64, 0.20);
  const vec3 GREEN  = vec3(0.23, 0.90, 0.54);
  const vec3 VIOLET = vec3(0.55, 0.45, 0.92);
  const vec3 STEEL  = vec3(0.44, 0.46, 0.66);

  /**
   * The path the unit travels.
   *
   * Vault, then the verification core at the origin, then the holder, then back
   * to the core to be redeemed. Expressed as one number so the director can
   * scrub it and the shader does not need to know which stage it is in.
   */
  vec3 carriedAt(float t) {
    vec3 core = vec3(0.0, 0.0, 0.0);
    if (t < 1.0) return mix(uVaultAt, core, smoothstep(0.0, 1.0, t));
    if (t < 2.0) return mix(core, uHolderAt, smoothstep(0.0, 1.0, t - 1.0));
    return mix(uHolderAt, core, smoothstep(0.0, 1.0, clamp(t - 2.0, 0.0, 1.0)));
  }

  void main() {
    float seed = aParam.x;
    float part = aParam.y;
    float u    = aParam.z;
    float sub  = aParam.w;
    float spin = seed * TAU;

    vec3 world = position;
    float alpha = 0.0;
    float charge = 0.5;
    float soft = 0.0;
    vec3 colour = STEEL;

    /* ---- the vault, assembling out of key material ------------------------ */
    if (part < PART_VAULT + 0.5) {
      float form = clamp((uVault * 1.5 - u * 0.5) / 0.7, 0.0, 1.0);
      form = qufiEaseOut(form);
      world = mix(qufiDrift(aOrigin, seed, uTime * 0.5), position, form);
      // It tightens once there is something in it.
      world = mix(world, position * 0.985 + uVaultAt * 0.015, uConfirmed * 0.4);
      colour = mix(STEEL, VIOLET, form);
      charge = form;
      alpha = mix(0.12, 0.9, form) * uVault;
      soft = 1.0 - form;
    }

    /* ---- bitcoin arriving ------------------------------------------------- */
    else if (part < PART_DEPOSIT + 0.5) {
      // Each particle has its own place in the queue, so the deposit arrives as
      // a stream rather than as a block.
      float t = clamp((uDeposit * 1.35 - u * 0.35), 0.0, 1.0);
      t = qufiEaseOut(t);
      world = mix(aOrigin, position, t);
      world = qufiDrift(world, seed, uTime * 0.4);
      colour = GOLD;
      charge = 0.4 + t * 0.6;
      // Once confirmed it stops moving and settles into the vault.
      alpha = (0.25 + t * 0.75) * uDeposit * (1.0 - uReleased);
      soft = 1.0 - t * 0.7;
    }

    /* ---- the unit --------------------------------------------------------- */
    else if (part < PART_UNIT + 0.5) {
      vec3 at = carriedAt(uCarried);
      // A little internal motion, so it reads as a thing rather than a dot.
      vec3 offset = mix(aOrigin, position, uUnit);
      offset += vec3(
        sin(uTime * 1.7 + spin),
        cos(uTime * 1.3 + spin * 1.7),
        sin(uTime * 2.1 + spin * 2.3)
      ) * 0.22;
      world = at + offset;
      colour = mix(GREEN, vec3(0.90, 1.0, 0.94), 0.3 + 0.3 * sin(uTime * 2.2 + spin));
      charge = 1.0;
      alpha = uUnit;
    }

    /* ---- the chain -------------------------------------------------------- */
    else if (part < PART_CHAIN + 0.5) {
      float rise = clamp(uChain * 1.4 - u * 0.4, 0.0, 1.0);
      world = mix(aOrigin, position, qufiEaseOut(rise));
      // Blocks alternate, and a slow wave runs the length of it.
      float wave = 0.5 + 0.5 * sin(u * 40.0 - uTime * 0.8);
      colour = mix(GOLD * 0.5, GOLD, 0.4 + sub * 0.3);
      charge = 0.2 + wave * 0.35;
      alpha = (0.12 + wave * 0.2) * uChain;
      soft = 1.0;
    }

    /* ---- the anchors ------------------------------------------------------ */
    else if (part < PART_ANCHOR + 0.5) {
      // Which of the three this belongs to, and how far it has fallen.
      float fall = sub < 0.5 ? uAnchors.x : (sub < 1.5 ? uAnchors.y : uAnchors.z);
      float t = qufiEaseOut(clamp(fall, 0.0, 1.0));
      world = mix(aOrigin, position, t);
      // It lands rather than arriving: a short settle at the bottom.
      world.y += sin(clamp((fall - 0.86) * 7.0, 0.0, 1.0) * 3.1416) * 1.6;
      colour = mix(GREEN, GOLD, t);
      charge = 0.5 + t * 0.5;
      alpha = fall > 0.001 ? mix(0.5, 1.0, t) : 0.0;
    }

    /* ---- the registry ----------------------------------------------------- */
    else if (part < PART_REGISTRY + 0.5) {
      float arrive = clamp(uRegistry * 1.3 - u * 0.3, 0.0, 1.0);
      world = mix(aOrigin, position, qufiEaseOut(arrive));
      float mine = sub;
      // Every entry is quiet except the one that gets spent, which goes out.
      float gone = mine * uSpent;
      colour = mix(STEEL, vec3(1.0, 0.42, 0.38), gone);
      charge = 0.22 + mine * 0.4 + gone * 0.4;
      alpha = (0.16 + mine * 0.5) * uRegistry * (1.0 - gone * 0.25);
      soft = 1.0 - mine;
      // The spent one lifts out of the plane, so it is legible as struck out.
      world.z += gone * 4.0;
    }

    /* ---- the holder ------------------------------------------------------- */
    else if (part < PART_HOLDER + 0.5) {
      // Present from the moment the unit starts moving toward it.
      float here = smoothstep(0.35, 1.15, uCarried);
      world = mix(aOrigin, position, qufiEaseOut(here));
      colour = mix(STEEL, VIOLET, here);
      charge = 0.3 + here * 0.6;
      alpha = here * 0.75;
      soft = 1.0 - here;
    }

    /* ---- what checks it --------------------------------------------------- */
    else if (part > PART_VERIFIER - 0.5) {
      // The gates are always there; they light when something is being checked,
      // and a pass runs outward through them while it is.
      // Present from the moment the first instruction is being checked, and
      // not before: gates standing empty for two stages are scenery.
      float arrive = clamp(uVerifier, 0.0, 1.0);
      world = mix(aOrigin, position, qufiEaseOut(arrive));
      float ring = sub;
      // Each gate turns in its own plane, at its own rate.
      float a = uTime * (0.16 + ring * 0.07) * (ring == 1.0 ? -1.0 : 1.0);
      float c = cos(a);
      float sn = sin(a);
      world = vec3(world.x * c - world.y * sn, world.x * sn + world.y * c, world.z);

      float pass = smoothstep(ring * 0.3, ring * 0.3 + 0.4, uVerifying);
      colour = mix(STEEL, VIOLET, 0.4 + pass * 0.6);
      charge = 0.25 + pass * 0.75;
      alpha = (0.16 + pass * 0.6) * arrive;
      soft = 1.0 - pass * 0.6;
    }

    /* ---- and the bitcoin leaving again ------------------------------------ */
    else {
      float t = clamp(uReleased * 1.35 - u * 0.35, 0.0, 1.0);
      t = qufiEaseOut(t);
      world = mix(aOrigin, position, t);
      world = qufiDrift(world, seed, uTime * 0.4);
      colour = GOLD;
      charge = 0.4 + t * 0.6;
      alpha = t * uReleased;
      soft = 1.0 - t * 0.7;
    }

    if (alpha * uDim < 0.002) {
      gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      vAlpha = 0.0;
      return;
    }

    vec4 mvPosition = modelViewMatrix * vec4(world, 1.0);
    float viewDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;

    float size = uSize * (0.55 + charge * 0.9);
    float ceiling = uMaxPointSize * 0.44;
    if (soft > 0.5) {
      size *= 0.5;
      ceiling = min(ceiling, 11.0);
    }
    // The unit is the subject of the whole scene and is allowed to be brighter
    // and larger than anything else in it.
    if (part > PART_UNIT - 0.5 && part < PART_UNIT + 0.5) {
      size *= 1.5;
      ceiling = uMaxPointSize * 0.7;
    }
    gl_PointSize = clamp(size * (240.0 / max(viewDepth, 1.0)) * uPixelRatio, 0.8, ceiling);

    float depth = qufiDepthFade(viewDepth, uFogNear, uFogFar);
    vAlpha = alpha * depth * smoothstep(1.4, 7.0, viewDepth) * uDim;
    vCharge = charge;
    vColour = colour;
    vSoft = soft;
  }
`;

export const FLOW_FRAGMENT = /* glsl */ `
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
