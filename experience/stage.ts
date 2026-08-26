'use client';

import { Vector3 } from 'three';

/**
 * Mutable per-frame bus.
 *
 * The opening sequence changes a dozen scalars sixty times a second. Routing
 * those through React would re-render the tree on every frame to move a number
 * that only a shader uniform ever reads. GSAP writes here, the systems read
 * here, and React is left to handle the things React is good at.
 */
/** A word pinned to a participant, already projected to screen space. */
export interface ProjectedLabel {
  x: number;
  y: number;
  opacity: number;
  text: string;
}

export const stage = {
  /** Seconds since the sequence began. */
  time: 0,

  /**
   * The mark in the opening: how present its pieces are, and how far through
   * coming apart. Held separately from the DOM logo so the two can hand over.
   */
  markPresence: 0,
  markBurst: 0,

  /**
   * Distance at which the scene has fully faded to the void.
   *
   * Derived from how far the camera is standing off rather than fixed, because
   * a falloff tuned for a camera thirty units out erases the entire network when
   * the same scene is viewed from a hundred and forty. The pull-back at the end
   * of the economic journeys is exactly that shot.
   */
  fogFar: 150,

  /**
   * How far the camera is standing from the middle of the network.
   *
   * Written once a frame by the camera and read by anything whose brightness
   * has to survive being flown into. Additive sprites do not get dimmer as you
   * approach them, they get larger, so a structure that is beautifully lit from
   * eighty units out is a white hole from twenty.
   */
  cameraDistance: 120,

  /**
   * How much the visitor is standing inside one space rather than travelling
   * the whole network, 0..1.
   *
   * The surrounding network has to get out of the way when they are, and not
   * by dimming alone: at these distances an ordinary participant is a sprite
   * thirty pixels across, and a dozen of them in front of the structure the
   * visitor came to look at is fog, however faint each one is.
   */
  inside: 0,

  /**
   * How tall and narrow the frame is, 0..1.
   *
   * A phone is not a small desk monitor, it is a different composition: there
   * is no room beside a structure for the words about it, so the structure
   * takes the top of the frame and the words take the bottom. The camera has to
   * know that, because the only way to put an object in the upper half of a
   * frame is to aim below it.
   */
  portrait: 0,

  // ---- emergence --------------------------------------------------------
  /** 0..1 threshold against each record's `order`. Drives the whole reveal. */
  reveal: 0,
  /** Global fade from the void. */
  dim: 0,
  /** Network brightness relative to the Core, so the Core can take the frame. */
  networkDim: 1,
  fieldDim: 1,

  // ---- traffic ----------------------------------------------------------
  /** 0..1 — how much the network is carrying. Feeds the engine spawn rate. */
  intensity: 0,

  // ---- interaction ------------------------------------------------------
  pointer: new Vector3(0, 0, 400),
  pointerAmp: 0,
  pointerRadius: 9,
  /** Perpendicular bend applied to connections near the pointer. */
  bow: 0,
  /** 0..1 — how much the pointer is currently steering the camera. */
  parallax: 0,
  pointerX: 0,
  pointerY: 0,

  // ---- core -------------------------------------------------------------
  coherence: 0,

  // ---- chapters ---------------------------------------------------------
  /**
   * Cryptographic stress, 0..1. Fractures relationships and drops participants
   * out of the structure. The quantum transition, made visible.
   */
  instability: 0,
  /** The QUFI layer beneath the network, 0..1. */
  substrate: 0,
  /** Continuous position through the seven chapters. */
  depth: 0,
  /** Index of the chapter holding the frame. */
  chapter: -1,
  /** Progress inside that chapter, 0..1. */
  chapterLocal: 0,

  // ---- economic layer ---------------------------------------------------
  /** 0..1 — how much of the economic layer has arrived. */
  economy: 0,
  /** Which district holds the frame: 0 assets, 1 money, 2 settlement, -1 none. */
  district: -1,
  /** 0..1 — how busy the districts are. */
  districtActivity: 0,
  /** 0..5, continuous, through the asset lifecycle. */
  assetStage: 0,
  /** 0..1 — how present the demonstration asset is. */
  assetPresence: 0,
  /** 0..1 — money circulating on its loop. */
  moneyFlow: 0,
  /** 0..1 progress of each settlement leg toward the settlement point. */
  settleAsset: 0,
  settleMoney: 0,
  /** 0..1 — the confirmation, once both legs are in place. */
  settleConfirm: 0,
  /**
   * Which stop of the current journey the visitor has reached, and whether any
   * journey is running. Shared by every chapter that has a list of stops, so
   * the overlay does not need to know which journey it is showing.
   */
  stopIndex: 0,
  stopActive: 0,

  // ---- guided signal ----------------------------------------------------
  /** 0..1 — how much the camera is riding the signal rather than the chapter. */
  tour: 0,
  /** World position of the signal being followed. */
  tourPoint: new Vector3(),
  /** Which stop along the route is current, and how far into it. */
  tourStop: 0,
  /**
   * Which way into the network the visitor is reaching for in the closing
   * chapter, or -1. Drives the connection their node establishes.
   */
  reach: -1,

  // ---- camera -----------------------------------------------------------
  camera: {
    px: 0,
    py: 6,
    pz: 78,
    tx: 0,
    ty: 0,
    tz: 0,
    fov: 42,
    roll: 0,
  },

  /**
   * Words attached to nodes, projected each frame inside the render loop and
   * read by the DOM layer. Mutated in place; never reallocated.
   */
  labels: [] as ProjectedLabel[],

  /**
   * The colour the network is wearing, and how much of it.
   *
   * Each journey has its own hue and the whole scene takes it on while the
   * visitor is inside — so which part of QUFI you are in is something you can
   * see without reading anything. Held as a target the director eases toward,
   * never set directly, or the palette would jump at every chapter boundary.
   */
  tint: new Vector3(1, 1, 1),
  tintAmount: 0,

  /**
   * Which side of the frame the current reading is on, and how far the network
   * has moved to the other side to make room for it. Smoothed, so consecutive
   * readings slide the scene across rather than cutting it.
   */
  featureSide: 0,
  /**
   * The side actually used, after checking what the copy is occupying.
   *
   * The preferred side alternates; this is what it resolved to once the words
   * already on screen were taken into account. The camera shift reads this, not
   * the preference, or the scene would move away from the wrong half.
   */
  featureSideUsed: 0,
  featureShift: 0,

  /** 0..1 — how far the closing register has arrived. */
  genesis: 0,

  /** Which capability has come forward, and how present it is. */
  featureIndex: 0,
  featurePresence: 0,
  /** Screen position of the participant the current capability hangs off. */
  featureAnchor: { x: 0, y: 0, visible: 0 },
  /**
   * The same participant in world space, and how hard the network is bursting
   * at it. A reading does not appear near a node — it comes out of one, and the
   * node has to be somewhere in the scene for that to be true.
   */
  featureAnchorWorld: new Vector3(),
  featureBurst: 0,

  // ---- readouts ---------------------------------------------------------
  focusNode: -1,
  fps: 60,
  drawCalls: 0,
};

export type Stage = typeof stage;

export function resetStage() {
  stage.time = 0;
  stage.markPresence = 0;
  stage.markBurst = 0;
  stage.fogFar = 150;
  stage.cameraDistance = 120;
  stage.inside = 0;
  stage.portrait = 0;
  stage.reveal = 0;
  stage.dim = 0;
  stage.networkDim = 1;
  stage.fieldDim = 1;
  stage.intensity = 0;
  stage.pointer.set(0, 0, 400);
  stage.pointerAmp = 0;
  stage.pointerRadius = 9;
  stage.bow = 0;
  stage.parallax = 0;
  stage.coherence = 0;
  stage.instability = 0;
  stage.substrate = 0;
  stage.depth = 0;
  stage.chapter = -1;
  stage.chapterLocal = 0;
  stage.tour = 0;
  stage.tourStop = 0;
  stage.reach = -1;
  stage.economy = 0;
  stage.district = -1;
  stage.districtActivity = 0;
  stage.assetStage = 0;
  stage.assetPresence = 0;
  stage.moneyFlow = 0;
  stage.settleAsset = 0;
  stage.settleMoney = 0;
  stage.settleConfirm = 0;
  stage.tint.set(1, 1, 1);
  stage.tintAmount = 0;
  stage.genesis = 0;
  stage.featureSide = 0;
  stage.featureSideUsed = 0;
  stage.featureShift = 0;
  stage.featureIndex = 0;
  stage.featurePresence = 0;
  stage.featureAnchor.x = 0;
  stage.featureAnchor.y = 0;
  stage.featureAnchor.visible = 0;
  stage.featureAnchorWorld.set(0, 0, 0);
  stage.featureBurst = 0;
  stage.stopIndex = 0;
  stage.stopActive = 0;
  stage.tourPoint.set(0, 0, 0);
  stage.focusNode = -1;
  Object.assign(stage.camera, {
    px: 0,
    py: 6,
    pz: 78,
    tx: 0,
    ty: 0,
    tz: 0,
    fov: 42,
    roll: 0,
  });
}
