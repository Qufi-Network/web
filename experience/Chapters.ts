'use client';

/**
 * The seven discoveries.
 *
 * Scrolling this site is not scrolling a page — it is descending through the
 * network. Each chapter owns a camera position, a set of network states, and the
 * statements that surface while you are inside it. Everything is expressed as a
 * target rather than an animation: the scroll director interpolates between the
 * chapter you are leaving and the one you are entering, so there is no sequence
 * to get out of step with the scrollbar.
 *
 * Copy discipline: every claim here traces back to what QUFI actually describes
 * — hybrid post-quantum signatures, threshold quorums, the spent-nullifier
 * registry, collateral confirmation, and independently verifiable records. The
 * network on screen is simulated and the site says so.
 */

export interface ChapterCamera {
  px: number;
  py: number;
  pz: number;
  tx: number;
  ty: number;
  tz: number;
  fov: number;
}

export interface ChapterState {
  /** Traffic level, 0..1. */
  intensity: number;
  /** Network brightness relative to everything else. */
  networkDim: number;
  fieldDim: number;
  /** Core assembly, 0..1. */
  coherence: number;
  /**
   * Cryptographic stress, 0..1. Fractures connections and drops nodes out of
   * the structure. This is the quantum transition made visible.
   */
  instability: number;
  /** The QUFI layer beneath the network, 0..1. */
  substrate: number;
  /** How far the pointer can push the structure around. */
  pointerAmp: number;
  bow: number;

  /**
   * The hue this chapter dresses the network in, as an RGB weight, and how
   * strongly. Neutral white at zero strength leaves the QUFI blue alone.
   */
  tint: [number, number, number];
  tintAmount: number;

  // ---- economic layer ---------------------------------------------------
  /** 0..1 — how much of the economic layer has arrived. */
  economy: number;
  /** Which district holds the frame: 0 assets, 1 money, 2 settlement, -1 none. */
  district: number;
  /** 0..1 — how busy the districts are. */
  districtActivity: number;
  /** 0..1 — money circulating on its loop. */
  moneyFlow: number;
}

export interface ChapterLine {
  /** Local progress through the chapter at which this appears, 0..1. */
  at: number;
  /** Large declarative statement, set in the display face. */
  statement?: string;
  /**
   * Set on the one statement a chapter builds to. Takes the display size and
   * carries the light of the mark through it — used once, at the end.
   */
  emphasis?: boolean;
  /**
   * A phrase inside the statement that carries the light.
   *
   * The closing beat is a sentence rather than a single word, and running the
   * sweep through all of it would leave nothing for the eye to land on. The
   * accent is the part that answers the line before it; the rest stays white.
   */
  accent?: string;
  /** Supporting sentence, set small. */
  body?: string;
  /** Small technical label above the statement. */
  eyebrow?: string;
}

export interface Chapter {
  id: string;
  /**
   * Where the camera ends up by the close of the chapter, if it should travel
   * within it rather than hold a single position. Most chapters are one shot;
   * the ones that are a journey through something are not.
   */
  cameraExit?: ChapterCamera;
  /** Two-digit index shown on the depth rail. */
  index: string;
  /** Rail label. */
  label: string;
  camera: ChapterCamera;
  state: ChapterState;
  lines: ChapterLine[];
  /**
   * Words pinned to individual nodes in the scene. Discovery works by labelling
   * things the visitor is already looking at rather than by listing them in a
   * paragraph somewhere else.
   */
  nodeLabels?: string[];
  /** Terms laid out as a grid once the chapter has settled. */
  grid?: Array<{ term: string; note: string }>;
  /**
   * Capabilities, reached one at a time as the visitor descends.
   *
   * Not a list. Each one is anchored to a participant out in the network and
   * arrives as the camera comes to it, so the six things QUFI does are found in
   * the same way everything else on this site is found — by travelling to them.
   */
  features?: Array<{ term: string; note: string; glyph: string }>;
  /**
   * Named stops along a route, reached one at a time.
   *
   * Rendered exactly like the capabilities: anchored to a participant out in
   * the network and arriving as the camera comes to it. A numbered sequence
   * rather than a taxonomy, so these carry their position instead of a glyph.
   */
  stops?: Array<{ term: string; note: string }>;
  /**
   * The three ways on from the intersection. Selecting one travels to that
   * journey rather than opening anything.
   */
  routes?: Array<{ label: string; line: string; cta: string; chapter: string; glyph: string }>;

  /** A closing question that hands the visitor to the next journey. */
  handover?: { question: string; answer: string; chapter: string };
  /**
   * A small technical note pinned under the copy. Used where the scene needs a
   * qualification the statement above it should not be carrying.
   */
  caption?: string;
/**
   * The register of interest. Only the final chapter has this.
   *
   * There is exactly one way in, because there is exactly one thing on offer:
   * a place among the genesis nodes. A row of speculative calls to action would
   * dilute that, and most of them would have to be marked as not yet available.
   */
  genesis?: { eyebrow: string; heading: string; body: string };
}

const CALM: ChapterState = {
  intensity: 0.45,
  networkDim: 1,
  fieldDim: 0.7,
  coherence: 1,
  instability: 0,
  substrate: 0,
  pointerAmp: 2.1,
  bow: 3.2,
  economy: 0,
  district: -1,
  districtActivity: 0,
  moneyFlow: 0,
  tint: [1, 1, 1],
  tintAmount: 0,
};

/**
 * A colour per journey.
 *
 * Amber for assets, because that is the colour the demonstration asset arrives
 * in and the journey should belong to it. Green for money, the one hue in the
 * set that reads as value without being borrowed from anything else here.
 * Violet for settlement, sitting between the two it joins.
 */
const ASSET_TINT: [number, number, number] = [1.0, 0.7, 0.32];
const MONEY_TINT: [number, number, number] = [0.36, 1.0, 0.72];
const SETTLE_TINT: [number, number, number] = [0.74, 0.56, 1.0];

/** Once the districts exist they never go away; the network is larger now. */
const ECONOMIC: ChapterState = {
  ...CALM,
  economy: 1,
  districtActivity: 0.8,
  substrate: 0.6,
};

export const CHAPTERS: Chapter[] = [
  // ---- 01 ---------------------------------------------------------------
  {
    id: 'discovery',
    index: '01',
    label: 'Discovery',
    camera: { px: 5, py: 4, pz: 38, tx: 0, ty: 0, tz: 0, fov: 62 },
    state: { ...CALM, intensity: 0.7, coherence: 0.85 },
    lines: [
      { at: 0.04, statement: 'Everything is connected.' },
      {
        at: 0.3,
        statement: 'Every digital system depends on trust.',
      },
      {
        at: 0.72,
        body: 'Identity, payments, data, communication, assets, infrastructure. Almost all of that trust rests on cryptography — on the assumption that certain mathematics is too hard to undo.',
      },
    ],
    nodeLabels: ['Identity', 'Payments', 'Data', 'Communication', 'Assets', 'Infrastructure'],
  },

  // ---- 02 ---------------------------------------------------------------
  {
    id: 'transition',
    index: '02',
    label: 'Transition',
    camera: { px: -11, py: 6, pz: 42, tx: 0, ty: 0, tz: 0, fov: 60 },
    state: {
      ...CALM,
      intensity: 0.5,
      networkDim: 0.92,
      coherence: 0.4,
      // Full stress erases the network rather than damaging it, and an empty
      // frame communicates nothing. Two thirds leaves a structure that is
      // visibly coming apart, which is the point.
      instability: 0.62,
      pointerAmp: 1.4,
      bow: 2.2,
    },
    lines: [
      { at: 0.04, statement: 'The rules are changing.' },
      { at: 0.28, statement: 'The computers are changing.' },
      { at: 0.5, statement: 'The cryptography must change with them.' },
      {
        at: 0.72,
        statement: 'The quantum transition has already begun.',
        body: 'Nothing breaks today. What changes is the deadline. Encrypted traffic and signed records captured now can be opened later, so anything signed today that must still hold in ten years is already exposed. The work is identifying dependencies and migrating deliberately — a programme, not a patch.',
      },
    ],
  },

  // ---- 03 ---------------------------------------------------------------
  {
    id: 'qufi',
    index: '03',
    label: 'QUFI',
    // Pushes inward across the chapter so the capabilities come toward the
    // visitor rather than being scrolled past.
    camera: { px: 2, py: 13, pz: 53, tx: 0, ty: -4, tz: 0, fov: 58 },
    cameraExit: { px: -4, py: 7, pz: 26, tx: 0, ty: -2, tz: 0, fov: 58 },
    state: { ...CALM, intensity: 0.85, coherence: 1, substrate: 1, networkDim: 1 },
    lines: [
      { at: 0.06, statement: 'This is QUFI.' },
      {
        at: 0.34,
        body: 'A verification network for money and the instruments built on it. Independent nodes check every mint, transfer, approval and redemption using post-quantum cryptography, then settle the result.',
      },
    ],
    features: [
      {
        term: 'Verification',
        note: 'Independent nodes check every instruction, confirm the collateral behind it, and only then approve.',
        glyph: 'verification',
      },
      {
        term: 'Custody',
        note: 'Vaults with a post-quantum-gated spend path. Operators never take custody and cannot move funds alone.',
        glyph: 'custody',
      },
      {
        term: 'Settlement',
        note: 'Corridors that move value between parties, with the asset leg and the money leg linked.',
        glyph: 'settlement',
      },
      {
        term: 'Instruments',
        note: 'Letters of credit, guarantees and trade finance, carried as instructions the network can check.',
        glyph: 'instruments',
      },
      {
        term: 'Reserves',
        note: 'Backing a third party can verify for themselves, rather than an assurance they have to take on trust.',
        glyph: 'reserves',
      },
      {
        term: 'Tokenisation',
        note: 'The same vault-and-claim mechanics applied to title, receivables, funds and commodities.',
        glyph: 'tokenisation',
      },
    ],
  },

  // ---- 04 ---------------------------------------------------------------
  {
    id: 'signal',
    index: '04',
    label: 'Signal',
    camera: { px: -4, py: 3, pz: 26, tx: 0, ty: 0, tz: 0, fov: 58 },
    state: {
      ...CALM,
      intensity: 1,
      fieldDim: 0.4,
      networkDim: 0.95,
      // Present, not suppressed. The reading takes one side of the frame and
      // the scene the other, so the Core no longer has to be dimmed to stay out
      // of the way — and without it this chapter was a field of loose points
      // rather than a network.
      coherence: 0.92,
      substrate: 0.5,
    },
    lines: [
      { at: 0.04, statement: 'Follow the signal.' },
      { at: 0.9, statement: 'From instruction to proof.' },
    ],
    stops: [
      { term: 'Instruction', note: 'A mint, transfer, approval or redemption is submitted, carrying two independent post-quantum signatures.' },
      { term: 'Quorum', note: 'Independent nodes check the signature and confirm the collateral genuinely exists.' },
      { term: 'Registry', note: 'The spent-nullifier registry is checked, so the same instruction cannot be used twice.' },
      { term: 'Threshold', note: 'Enough nodes agree, then co-sign as a group. No single signer can approve alone.' },
      { term: 'Record', note: 'The instruction settles, the nullifier is marked spent, and a record is written that anyone can verify.' },
    ],
  },


  // ---- 05  the network divides -------------------------------------------
  {
    id: 'intersection',
    index: '05',
    label: 'Divide',
    // Well back and high, so all three regions are in frame at once and the
    // division is a thing you see rather than a thing you are told.
    camera: { px: 0, py: 16, pz: 52, tx: 0, ty: -2, tz: -4, fov: 76 },
    state: { ...ECONOMIC, intensity: 0.6, networkDim: 0.8, fieldDim: 0.4, districtActivity: 0.5 },
    lines: [
      { at: 0.05, eyebrow: 'The network divides', statement: 'Three things move here.' },
      {
        at: 0.42,
        body: 'An economic transaction has two legs and a place they meet. QUFI carries all three: what is being transferred, what is being paid, and the coordination between them.',
      },
    ],
    routes: [
      {
        label: 'Qu-Assets',
        glyph: 'assets',
        line: 'Bring the real world into the network.',
        cta: 'Explore assets',
        chapter: 'assets',
      },
      {
        label: 'Qu-Money',
        glyph: 'money',
        line: 'Move value through the network.',
        cta: 'Explore money',
        chapter: 'money',
      },
      {
        label: 'Qu-Settlement',
        glyph: 'settlement',
        line: 'Connect assets and value.',
        cta: 'Explore settlement',
        chapter: 'settlement',
      },
    ],
  },

  // ---- 06  assets ---------------------------------------------------------
  {
    id: 'assets',
    index: '06',
    label: 'Assets',
    // Looking to the right of the asset, which puts the asset itself in the
    // left of the frame and leaves the right clear for the lifecycle.
    camera: { px: -30, py: 9, pz: 53, tx: -38, ty: 12, tz: 32, fov: 58 },
    state: {
      ...ECONOMIC,
      intensity: 0.55,
      networkDim: 0.55,
      fieldDim: 0.3,
      district: 0,
      tint: ASSET_TINT,
      tintAmount: 0.72,
    },
    lines: [
      { at: 0.03, eyebrow: 'Assets', statement: 'Bring the real world into the network.' },
      {
        at: 0.86,
        statement: 'Every asset needs a way to move value.',
        body: 'A representation nobody can pay for is a record, not an asset. The next question is what moves the other way.',
      },
    ],
    stops: [
      {
        term: 'Verify',
        note: 'Establish what the asset is, who holds it, and what evidence supports both.',
      },
      {
        term: 'Structure',
        note: 'Express the rights, documentation and conditions attaching to it in a defined form.',
      },
      {
        term: 'Tokenise',
        note: 'Turn those defined rights into a programmable digital representation.',
      },
      { term: 'Issue', note: 'The representation enters the network as a participant.' },
      { term: 'Transfer', note: 'It moves between holders, verified like any other instruction.' },
      { term: 'Settle', note: 'It reaches the point where value moves against it.' },
    ],
    caption: 'Demonstration asset — gold. Illustrative only; not a tokenised instrument.',
    handover: { question: 'How will it move?', answer: 'Enter money', chapter: 'money' },
  },

  // ---- 07  money ----------------------------------------------------------
  {
    id: 'money',
    index: '07',
    label: 'Money',
    camera: { px: 40, py: 12, pz: 52, tx: 46, ty: 11, tz: 24, fov: 58 },
    state: {
      ...ECONOMIC,
      intensity: 0.6,
      networkDim: 0.55,
      fieldDim: 0.3,
      district: 1,
      moneyFlow: 1,
      tint: MONEY_TINT,
      tintAmount: 0.66,
    },
    caption: 'A QUFI monetary layer is in design. Nothing shown here is a live issued unit.',
    lines: [
      { at: 0.03, eyebrow: 'Money', statement: 'Move value through the network.' },
      {
        at: 0.34,
        body: 'A tokenised asset needs a monetary leg to trade against. QUFI is designed to carry that leg on the same network that verifies the asset, so both sides of a transaction are checked by the same nodes.',
      },
      {
        at: 0.86,
        statement: 'Money meets asset.',
        body: 'Two legs, prepared independently. What connects them is the next question.',
      },
    ],
    stops: [
      { term: 'Issue', note: 'A unit enters the network against backing held with a custodian.' },
      {
        term: 'Hold',
        note: 'It exists as a balance, verified by the same nodes as everything else.',
      },
      { term: 'Transfer', note: 'It moves between participants under threshold approval.' },
      { term: 'Redeem', note: 'It leaves the network and the backing is released.' },
    ],
    handover: {
      question: 'How will the transaction complete?',
      answer: 'Enter settlement',
      chapter: 'settlement',
    },
  },

  // ---- 08  settlement -----------------------------------------------------
  {
    id: 'settlement',
    index: '08',
    label: 'Settlement',
    camera: { px: 0, py: 16, pz: -6, tx: 0, ty: -4, tz: -54, fov: 56 },
    state: {
      ...ECONOMIC,
      intensity: 0.75,
      networkDim: 0.5,
      fieldDim: 0.28,
      district: 2,
      districtActivity: 1,
      tint: SETTLE_TINT,
      tintAmount: 0.6,
    },
    lines: [
      { at: 0.03, eyebrow: 'Settlement', statement: 'Connect assets and value.' },
      {
        at: 0.3,
        body: 'A buyer holds money. A seller holds the asset. Run separately, each side has to trust that the other will follow through.',
      },
      {
        at: 0.62,
        statement: 'Delivery versus payment.',
        body: 'The movement of the asset is linked to the movement of value, so neither leg completes on its own.',
      },
      { at: 0.9, statement: 'Settled.' },
    ],
    stops: [
      {
        term: 'Delivery-versus-payment',
        note: 'Asset and payment are coordinated rather than sequential.',
      },
      { term: 'Atomicity', note: 'The two legs can be structured so that they are linked.' },
      { term: 'Programmability', note: 'Settlement conditions can be expressed as rules.' },
      {
        term: 'Evidence',
        note: 'The transaction produces a record that can be verified afterwards.',
      },
    ],
  },

  // ---- 09  trust ----------------------------------------------------------
  {
    id: 'trust',
    index: '09',
    label: 'Trust',
    camera: { px: 0, py: -19, pz: 46, tx: 0, ty: -9, tz: -6, fov: 68 },
    state: {
      ...ECONOMIC,
      intensity: 0.5,
      networkDim: 0.42,
      fieldDim: 0.22,
      substrate: 1,
      districtActivity: 0.4,
    },
    lines: [
      { at: 0.05, eyebrow: 'Underneath all three', statement: 'Trust.' },
      {
        at: 0.44,
        body: 'Every asset needs identity. Every transaction needs verification. Every settlement needs evidence. None of the three journeys above stands up without the layer they all rest on.',
      },
    ],
    nodeLabels: ['Identity', 'Verification', 'Security', 'Governance', 'Evidence', 'Compliance'],
  },

  // ---- 10  the whole thing ------------------------------------------------
  {
    id: 'reveal',
    index: '10',
    label: 'Network',
    // Far enough out that the districts, the network and the layer beneath are
    // all in one frame for the first time.
    // Close enough that the network fills the frame. Far enough back that the
    // districts and the layer beneath are still all in one shot.
    camera: { px: 10, py: 17, pz: 62, tx: 0, ty: -3, tz: -6, fov: 76 },
    state: {
      ...ECONOMIC,
      intensity: 1,
      // Above one on purpose. From this far back every relationship is a few
      // pixels of very low alpha, and the whole point of the shot is that there
      // are thousands of them — so the network is pushed past its normal weight
      // rather than left to fade into the districts around it.
      networkDim: 1.9,
      fieldDim: 0.45,
      substrate: 0.8,
      districtActivity: 1,
      moneyFlow: 0.7,
    },
    lines: [
      { at: 0.06, statement: 'Assets, money and settlement.' },
      { at: 0.4, statement: 'One network.' },
      {
        at: 0.72,
        body: 'Each asset issued gives the monetary leg something to trade against. Each transaction gives settlement something to coordinate. Each settled transaction is more activity the network verifies, and more reason to bring the next asset in.',
      },
    ],
  },

  // ---- 11 -----------------------------------------------------------------
  {
    id: 'protocol',
    index: '11',
    label: 'Protocol',
    camera: { px: 0, py: -16, pz: 34, tx: 0, ty: -6, tz: 0, fov: 52 },
    state: {
      ...CALM,
      intensity: 0.6,
      networkDim: 0.6,
      fieldDim: 0.25,
      coherence: 0.9,
      substrate: 1,
      pointerAmp: 1.2,
      bow: 1.8,
    },
    lines: [
      { at: 0.05, statement: 'Go deeper.' },
      {
        at: 0.3,
        body: 'Below the surface the abstraction becomes specific. This is the layer engineers and auditors ask about first.',
      },
    ],
    stops: [
      { term: 'Signatures', note: 'ML-DSA-65 and SPHINCS+, used together as a hybrid' },
      { term: 'Encryption', note: 'ML-KEM lattice key encapsulation' },
      { term: 'Approval', note: 'Threshold quorum, no single signer' },
      { term: 'Replay', note: 'Spent-nullifier registry' },
      { term: 'Record', note: 'Independently verifiable after the fact' },
      { term: 'Node', note: 'Verifies, confirms collateral, holds one signature share' },
      { term: 'Custody', note: 'Node operators never take custody and cannot move funds alone' },
      { term: 'Record keeping', note: 'Every approval reconstructable from the record' },
    ],
  },

  // ---- 06 ---------------------------------------------------------------
  {
    id: 'live',
    index: '12',
    label: 'Live',
    camera: { px: 8, py: 9, pz: 48, tx: 0, ty: 0, tz: 0, fov: 72 },
    state: { ...CALM, intensity: 0.95, networkDim: 1, fieldDim: 0.5, substrate: 0.35 },
    lines: [
      { at: 0.05, statement: 'A network you can watch.' },
      {
        at: 0.34,
        body: 'The topology on this page is generated in your browser to show the shape of the architecture. It is not a measurement. When the network is live, this view reads from it directly and the readout below becomes real.',
      },
    ],
  },

  // ---- 07 ---------------------------------------------------------------
  {
    id: 'enter',
    index: '13',
    label: 'Enter',
    // Right back, so the whole network is in frame before it recedes.
    camera: { px: 0, py: 0, pz: 88, tx: 0, ty: 0, tz: 0, fov: 42 },
    state: {
      ...CALM,
      intensity: 0.12,
      // Almost gone, but not gone: a ghost of the structure has to remain for
      // the one node to be missing from something.
      networkDim: 0.26,
      fieldDim: 0.18,
      coherence: 0.12,
      /*
       * No lattice here.
       *
       * From 88 units back with everything else dimmed, the substrate is the
       * only thing left with enough contrast to register, and all that survives
       * of it is its outline - a rectangle of white points around an empty
       * frame, which reads as a rendering fault rather than as a floor.
       */
      substrate: 0,
      pointerAmp: 0.9,
      bow: 1.4,
    },
    // A statement and then its answer. They replace one another rather than
    // stacking: the first states a fact and leaves, and what takes its place is
    // the whole point of the chapter.
    /*
     * Three beats, each given the whole screen before the next arrives.
     *
     * The statement fills the frame on its own, is replaced by its answer, and
     * only then does the form come up underneath. Showing the form alongside
     * the words made the line an eyebrow above a sign-up panel rather than the
     * moment the whole descent has been building to.
     */
    lines: [
      // Plain white. The emphasis belongs to the word that answers it, and two
      // lines both carrying the accent would make neither of them the moment.
      { at: 0.06, statement: 'Become part of the quantum future.' },
      {
        at: 0.34,
        statement: 'Become part of the QUFI community.',
        emphasis: true,
        accent: 'QUFI community',
      },
    ],
    genesis: {
      eyebrow: 'Genesis node rollout',
      heading: 'The first thousand nodes.',
      body: 'One thousand independent operators, verifying the first instructions the network settles. Register your interest in the rollout.',
    },
  },
];

/** How much scroll each chapter occupies, in viewport heights. */
export const CHAPTER_SPAN = 2.1;

export interface ChapterPosition {
  /** Index of the chapter currently occupying the frame. */
  index: number;
  /** Progress inside that chapter, 0..1. */
  local: number;
  /** Continuous position across all chapters, 0..CHAPTERS.length. */
  absolute: number;
}

/** Where a normalised scroll position, 0..1, lands in the chapter sequence. */
export function positionAt(scroll: number): ChapterPosition {
  const absolute = Math.max(0, Math.min(CHAPTERS.length - 0.0001, scroll * CHAPTERS.length));
  const index = Math.floor(absolute);
  return { index, local: absolute - index, absolute };
}
