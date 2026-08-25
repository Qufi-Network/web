import { QUFI_COMMON } from './common';

/**
 * The economic layer.
 *
 * Three shaders that share one visual language with the rest of the network —
 * same palette, same additive point sprites, same depth falloff — so the
 * districts read as parts of the network rather than as a second scene laid over
 * the first.
 */

/**
 * Districts.
 *
 * Each region is arranged by its own rule (assets stack, money circulates,
 * settlement converges), and the class of a region is expressed through that
 * arrangement rather than through colour. Focusing a district lifts it and
 * settles the other two back.
 */
export const DISTRICT_VERTEX = /* glsl */ `
  ${QUFI_COMMON}

  attribute float aDistrict;
  attribute float aSeed;
  attribute float aLocal;

  uniform float uTime;
  uniform float uReveal;
  uniform float uFocus;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uDim;
  uniform float uMaxPointSize;
  uniform float uIsLine;
  uniform float uActivity;

  varying float vAlpha;
  varying float vCharge;
  varying float vDistrict;

  void main() {
    // Districts arrive one after another so the intersection reads as the
    // network dividing rather than as three things switching on together.
    float slot = aDistrict * 0.18;
    float arrival = clamp((uReveal - slot) / 0.42, 0.0, 1.0);
    float eased = qufiEaseOut(arrival);

    vec3 world = qufiDrift(position, aSeed, uTime * 0.7);
    // Regions condense toward their own centre as they arrive.
    world = mix(world * 1.16, world, eased);

    vec4 mvPosition = modelViewMatrix * vec4(world, 1.0);
    float viewDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;

    // Attention: the district being visited burns brighter, the others recede
    // without disappearing, because they are still part of the same network.
    // With no district selected all three are shown at full strength: that is
    // the intersection, where the whole point is seeing that there are three.
    float attention = uFocus < -0.5 ? 1.0 : mix(0.26, 1.0, 1.0 - min(1.0, abs(uFocus - aDistrict)));

    // A slow circulation of brightness around each region, so a district reads
    // as somewhere that is running rather than somewhere that is drawn.
    float pulse = 0.5 + 0.5 * sin(aLocal * 6.2831 - uTime * 1.1 + aDistrict * 2.0);
    vCharge = pulse * attention * uActivity;
    vDistrict = aDistrict;

    float size = uSize * (0.55 + pulse * 0.75) * eased * mix(0.7, 1.25, attention);
    gl_PointSize = clamp(size * (220.0 / max(viewDepth, 1.0)) * uPixelRatio, 1.0, uMaxPointSize);

    float depth = qufiDepthFade(viewDepth, uFogNear, uFogFar);
    float weight = mix(1.0, 0.4, uIsLine);
    vAlpha = eased * depth * uDim * attention * weight * (0.7 + pulse * 1.1);
  }
`;

export const DISTRICT_FRAGMENT = /* glsl */ `
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
  varying float vDistrict;

  uniform float uIsLine;

  void main() {
    float mask = 1.0;
    if (uIsLine < 0.5) {
      vec2 p = gl_PointCoord - 0.5;
      float r2 = dot(p, p);
      mask = exp(-r2 * 28.0) + exp(-r2 * 7.0) * 0.3;

    }
    if (mask * vAlpha < 0.002) discard;

    vec3 colour = mix(vec3(0.075, 0.24, 0.62), vec3(0.16, 0.58, 1.0), vCharge);
    colour = mix(colour, vec3(0.88, 0.95, 1.0), pow(vCharge, 3.0) * 0.7);
    gl_FragColor = vec4(qufiApplyTint(colour), mask * vAlpha);
  }
`;

/**
 * The demonstration asset.
 *
 * One point cloud with four positions for every point: the object as it exists
 * in the world, the same object expressed as separated layers of rights and
 * conditions, the compact digital representation those layers collapse into,
 * and the place it takes up in the network once issued. Moving between them is
 * a lerp, which means the transformation is continuous and reversible — scroll
 * back up and the asset un-tokenises, because nothing here fired once.
 *
 * Colour carries the argument: warm and metallic while the asset is a thing in
 * the world, network blue once it is a representation of rights to that thing.
 */
export const ASSET_VERTEX = /* glsl */ `
  ${QUFI_COMMON}

  attribute vec3  aStructured;
  attribute vec3  aToken;
  attribute vec3  aIssued;
  attribute float aSeed;
  attribute float aLayer;

  uniform float uTime;
  uniform float uStage;
  uniform float uPresence;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uDim;
  uniform float uMaxPointSize;

  varying float vAlpha;
  varying float vDigital;
  varying float vScan;

  void main() {
    // Points do not all convert at once; each carries a small delay so every
    // transition cascades through the object instead of snapping.
    float delay = aSeed * 0.55;
    float stage = clamp(uStage - delay, 0.0, 5.0);

    vec3 world = position;
    world = mix(world, aStructured, clamp(stage, 0.0, 1.0));
    world = mix(world, aToken, clamp(stage - 1.0, 0.0, 1.0));
    world = mix(world, aIssued, clamp(stage - 2.0, 0.0, 1.0));

    // Motion belongs to the physical object; the digital representation is
    // still, because a representation of rights does not shimmer.
    float physical = 1.0 - clamp(stage - 1.4, 0.0, 1.0);
    world += vec3(
      sin(uTime * 0.8 + aSeed * 31.0),
      cos(uTime * 0.7 + aSeed * 17.0),
      sin(uTime * 0.9 + aSeed * 23.0)
    ) * 0.06 * physical;

    vec4 mvPosition = modelViewMatrix * vec4(world, 1.0);
    float viewDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;

    // A verification pass travelling up the object during the first stage.
    float front = fract(uTime * 0.35) * 2.4 - 0.7;
    vScan = exp(-pow((aLayer - front) * 7.0, 2.0)) * (1.0 - clamp(uStage, 0.0, 1.0));

    vDigital = clamp(stage - 1.0, 0.0, 1.0);

    float size = uSize * (0.7 + aSeed * 0.5);
    gl_PointSize = clamp(size * (230.0 / max(viewDepth, 1.0)) * uPixelRatio, 1.0, uMaxPointSize);

    float depth = qufiDepthFade(viewDepth, uFogNear, uFogFar);
    vAlpha = uPresence * depth * uDim * (0.55 + vScan * 1.4);
  }
`;

export const ASSET_FRAGMENT = /* glsl */ `
  precision highp float;

  varying float vAlpha;
  varying float vDigital;
  varying float vScan;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float r2 = dot(p, p);
    float mask = exp(-r2 * 34.0) + exp(-r2 * 9.0) * 0.26;
    if (mask * vAlpha < 0.002) discard;

    // Warm metal for the thing in the world, network blue for the claim on it.
    vec3 physical = vec3(0.92, 0.78, 0.46);
    vec3 digital = vec3(0.16, 0.55, 1.0);
    vec3 colour = mix(physical, digital, vDigital);
    colour = mix(colour, vec3(1.0), vScan * 0.7);

    gl_FragColor = vec4(colour, mask * vAlpha);
  }
`;

/**
 * Value in motion.
 *
 * Particles advected along cubic curves. Money circulates on a closed loop —
 * issued, held, transferred, redeemed, and back — while settlement runs two
 * separate legs that approach one point from opposite sides and are held there
 * until both have arrived. The holding is the whole idea: neither leg completes
 * on its own.
 */
export const FLOW_VERTEX = /* glsl */ `
  ${QUFI_COMMON}

  attribute float aPath;
  attribute float aOffset;
  attribute float aRole;
  attribute float aSeed;

  uniform vec3  uControls[24];
  uniform float uTime;
  uniform float uMoney;
  uniform float uAssetLeg;
  uniform float uMoneyLeg;
  uniform float uConfirm;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uDim;
  uniform float uMaxPointSize;

  varying float vAlpha;
  varying float vRole;
  varying float vHot;

  vec3 curveAt(int path, float t) {
    int base = path * 4;
    vec3 a = uControls[base];
    vec3 b = uControls[base + 1];
    vec3 c = uControls[base + 2];
    vec3 d = uControls[base + 3];
    float u = 1.0 - t;
    return u * u * u * a + 3.0 * u * u * t * b + 3.0 * u * t * t * c + t * t * t * d;
  }

  void main() {
    int path = int(aPath + 0.5);
    float role = aRole;
    float t;
    float presence;

    if (role < 0.5) {
      // Money circulating. A closed loop, always moving.
      t = fract(aOffset + uTime * 0.09);
      presence = uMoney;
    } else if (role < 2.5) {
      // A settlement leg. Progress is driven by the transaction, and a particle
      // that has reached the settlement point waits there rather than passing
      // through it.
      float leg = role < 1.5 ? uAssetLeg : uMoneyLeg;
      float travel = fract(aOffset + uTime * 0.16);
      t = min(travel, leg);
      presence = max(uAssetLeg, uMoneyLeg) > 0.001 ? 1.0 : 0.0;
    } else {
      // The confirmation. A ring expanding from the settlement point once both
      // legs are in place.
      t = 1.0;
      presence = uConfirm;
    }

    vec3 world = curveAt(path, t);

    float ringPhase = 0.0;
    if (role > 2.5) {
      // A settled transaction stays settled, so the confirmation cannot be a
      // one-shot expansion keyed to the confirmation value — it would finish and
      // then be invisible for as long as the visitor stayed there. It repeats
      // instead, quietly, the way a status light does.
      ringPhase = fract(uTime * 0.42);
      float angle = aOffset * TAU;
      float radius = ringPhase * 22.0;
      world += vec3(cos(angle), sin(angle) * 0.35, sin(angle)) * radius;
    }

    vec4 mvPosition = modelViewMatrix * vec4(world, 1.0);
    float viewDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;

    // A particle held at the settlement point burns brighter the longer it
    // waits, so an unmatched leg reads as pressure rather than as a queue.
    float held = role > 0.5 && role < 2.5 ? step(0.995, t / max(role < 1.5 ? uAssetLeg : uMoneyLeg, 0.001)) : 0.0;
    vHot = max(held, uConfirm);
    vRole = role;

    float size = uSize * (0.6 + aSeed * 0.6) * (1.0 + vHot * 0.8);
    gl_PointSize = clamp(size * (220.0 / max(viewDepth, 1.0)) * uPixelRatio, 1.0, uMaxPointSize);

    float depth = qufiDepthFade(viewDepth, uFogNear, uFogFar);
    float fade = role > 2.5 ? (1.0 - ringPhase) * (1.0 - ringPhase) : 1.0;
    vAlpha = presence * depth * uDim * fade * 0.9;
  }
`;

export const FLOW_FRAGMENT = /* glsl */ `
  precision highp float;

  varying float vAlpha;
  varying float vRole;
  varying float vHot;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float r2 = dot(p, p);
    float mask = exp(-r2 * 30.0) + exp(-r2 * 8.0) * 0.3;
    if (mask * vAlpha < 0.002) discard;

    // The asset leg keeps the warm cast it carried out of the asset journey, so
    // the two legs are told apart by where they came from.
    vec3 asset = vec3(0.86, 0.72, 0.45);
    vec3 money = vec3(0.13, 0.62, 1.0);
    vec3 colour = vRole > 0.5 && vRole < 1.5 ? asset : money;
    colour = mix(colour, vec3(0.95, 0.98, 1.0), vHot * 0.85);

    gl_FragColor = vec4(colour, mask * vAlpha);
  }
`;
