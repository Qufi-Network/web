/**
 * A letter of credit, and the swap that settles it.
 *
 * Two parties who have no reason to trust each other, an undertaking written
 * between them, everyone who has to agree agreeing, and then both legs crossing
 * at the same instant — because the whole difficulty of trade finance is the
 * gap between one side performing and the other side performing, and the answer
 * is to have no gap.
 *
 * It is built out of different shapes from the unit's lifecycle on purpose. An
 * instrument is a page before it is anything else, so the middle of this scene
 * is a sheet with terms ruled across it and seals turning in front of it, where
 * the uBTC walk has a box and a chain. Same hand, different subject.
 *
 * The path has four legs and doubles back on itself, which is how one set of
 * waypoints carries two things crossing in opposite directions at once: the
 * goods ride the first half, the payment rides the second, and both are driven
 * by the same number.
 */

import { Behaviour, type Figure } from '../../../network/scene';
import {
  arc,
  ball,
  blocks,
  boxEdges,
  escort,
  gates,
  sheet,
  type Vec3,
} from '../../../network/shapes';
import { during, since, type Journey, type Mark, type Stage } from '../journey';

/* ----------------------------------------------------------- the geography -- */

const BUYER: Vec3 = [-38, 6, 26];
const CORE: Vec3 = [0, 0, 0];
const SELLER: Vec3 = [40, -6, -28];
const CHAIN: Vec3 = [0, -28, 6];
const HOLD_GOODS: Vec3 = [-13, -17, 8];
const HOLD_MONEY: Vec3 = [15, -15, -10];

const to = (from: Vec3, at: Vec3): Vec3 => [at[0] - from[0], at[1] - from[1], at[2] - from[2]];

/* -------------------------------------------------------------- the palette -- */

const VIOLET: Vec3 = [0.66, 0.48, 1.0];
const PALE: Vec3 = [0.7, 0.64, 1.0];
const GOODS: Vec3 = [1.0, 0.66, 0.28];
const MONEY: Vec3 = [0.42, 0.86, 1.0];
const DARK: Vec3 = [0.28, 0.26, 0.46];

/* ----------------------------------------------------------------- the path -- */

/**
 * Buyer, middle, seller, middle, buyer.
 *
 * Out and back, so the two legs of the swap can be two positions on one path:
 * the goods travel the first half while the payment travels the second, and
 * they pass each other in the middle because they are driven by the same
 * number. That is the whole claim the product makes, expressed as geometry.
 */
const PATH: Vec3[] = [BUYER, CORE, SELLER, CORE, BUYER];
const BEND: Vec3[] = [
  [0, 9, 8],
  [0, 12, -4],
  [0, -9, -8],
  [0, -12, 6],
];

/** Where the goods are: the first half of the path, during the swap. */
function travelAt(at: number): number {
  return 2 * since(at, 4.2, 0.66);
}

/* --------------------------------------------------------------- the figures -- */

const figures: Figure[] = [
  {
    id: 'link-buyer',
    at: BUYER,
    shape: arc(to(BUYER, CORE), 7),
    behaviour: Behaviour.Hold,
    tone: DARK,
    share: 0.025,
    soft: true,
  },
  {
    id: 'link-seller',
    at: CORE,
    shape: arc(to(CORE, SELLER), 8),
    behaviour: Behaviour.Hold,
    tone: DARK,
    share: 0.025,
    soft: true,
  },
  {
    id: 'link-chain',
    at: CORE,
    shape: arc(to(CORE, CHAIN), 0),
    behaviour: Behaviour.Hold,
    tone: DARK,
    share: 0.016,
    soft: true,
  },

  {
    id: 'buyer',
    at: BUYER,
    shape: ball(6.5),
    behaviour: Behaviour.Assemble,
    tone: VIOLET,
    share: 0.07,
    scatter: 18,
  },
  {
    id: 'seller',
    at: SELLER,
    shape: ball(6.5),
    behaviour: Behaviour.Assemble,
    tone: VIOLET,
    share: 0.07,
    scatter: 18,
  },

  // The instrument itself: a page, ruled, standing between the two of them.
  {
    id: 'instrument',
    at: CORE,
    shape: sheet(19, 13, 7),
    behaviour: Behaviour.Assemble,
    tone: PALE,
    share: 0.16,
    scatter: 20,
    size: 1.05,
  },
  // And everyone who has to sign it, turning in front of it.
  {
    id: 'seals',
    at: CORE,
    shape: gates(4, 5.5, 2.6),
    behaviour: Behaviour.Spin,
    tone: VIOLET,
    share: 0.11,
    spin: 0.18,
  },

  // What each side has committed, held where it can be seen but not taken.
  {
    id: 'lock-goods',
    at: HOLD_GOODS,
    shape: boxEdges(5.5, 0.15),
    behaviour: Behaviour.Assemble,
    tone: GOODS,
    share: 0.06,
    scatter: 12,
  },
  {
    id: 'lock-money',
    at: HOLD_MONEY,
    shape: boxEdges(5.5, 0.15),
    behaviour: Behaviour.Assemble,
    tone: MONEY,
    share: 0.06,
    scatter: 12,
  },

  {
    id: 'chain',
    at: CHAIN,
    shape: blocks(170, 20, 1.6),
    behaviour: Behaviour.Hold,
    tone: GOODS,
    share: 0.1,
    soft: true,
  },
  {
    id: 'anchor-credit',
    at: [-12, CHAIN[1], CHAIN[2]],
    shape: ball(2.4),
    behaviour: Behaviour.Drop,
    tone: GOODS,
    share: 0.03,
    from: [0, 2, 0],
  },
  {
    id: 'anchor-settle',
    at: [16, CHAIN[1], CHAIN[2]],
    shape: ball(2.4),
    behaviour: Behaviour.Drop,
    tone: GOODS,
    share: 0.03,
    from: [0, 2, 0],
  },

  // The two legs of the swap. They travel in one piece rather than trailing,
  // because a shipment and a payment are things rather than flows.
  {
    id: 'goods',
    at: CORE,
    shape: escort(3.6, 0.16),
    behaviour: Behaviour.Escort,
    tone: GOODS,
    share: 0.1,
    lag: 0.4,
    size: 1.05,
  },
  {
    id: 'money',
    at: CORE,
    shape: escort(3.6, 0.16),
    behaviour: Behaviour.Escort,
    tone: MONEY,
    share: 0.1,
    lag: 0.4,
    size: 1.05,
  },
];

const index = new Map(figures.map((figure, i) => [figure.id, i]));

/* ------------------------------------------------------------------ the score -- */

function score(at: number, state: Float32Array) {
  const travel = travelAt(at);
  const set = (id: string, presence: number, activity = 0, extra = 0, rides = travel) => {
    const i = (index.get(id) ?? 0) * 4;
    state[i] = presence;
    state[i + 1] = activity;
    state[i + 2] = rides;
    state[i + 3] = extra;
  };

  const signing = during(at, 2.3, 1.0);
  const locked = since(at, 3.4, 0.6);
  const crossing = since(at, 4.2, 0.66);

  set('link-buyer', since(at, 0, 0.6), 0.1);
  set('link-seller', since(at, 0.2, 0.7), 0.1);
  set('link-chain', since(at, 4.6, 0.7), 0.1);

  set('buyer', since(at, 0, 0.35), during(at, 0.4, 0.8));
  set('seller', since(at, 0.06, 0.4), during(at, 0.7, 0.8));

  set('instrument', since(at, 1.2, 0.7), 0.2 + signing * 0.5 + crossing * 0.3);
  set('seals', since(at, 2.1, 0.6), 0.3 + signing * 0.7);

  set('lock-goods', locked * (1 - crossing * 0.75), signing * 0.3 + crossing * 0.5);
  set('lock-money', since(at, 3.6, 0.6) * (1 - crossing * 0.75), crossing * 0.5);

  set('chain', since(at, 4.5, 0.7), 0.34);
  set('anchor-credit', since(at, 3.1, 0.32));
  set('anchor-settle', since(at, 5.0, 0.32));

  /*
   * Both legs, at the same instant.
   *
   * The goods ride the first half of the path and the payment rides the second,
   * off the same number — so there is no arrangement of the route where one has
   * moved and the other has not. That is the product.
   */
  set('goods', locked, 0.4 + crossing * 0.6, 0, travel);
  set('money', since(at, 3.6, 0.6), 0.4 + crossing * 0.6, 0, 2 + travel);
}

/* ------------------------------------------------------------------ the stages -- */

const stages: Stage[] = [
  {
    id: 'parties',
    index: '01',
    nav: 'PARTIES',
    title: 'TWO PARTIES, NO TRUST',
    body: 'A seller who will not ship until they are sure of payment, and a buyer who will not pay until they are sure of shipment. Every letter of credit ever written exists because of that gap.',
    beats: ['BUYER', 'SELLER', 'THE GAP'],
    says: [
      'One side has goods and needs certainty that money will follow.',
      'The other has money and needs certainty that goods will follow.',
      'Today a bank stands between them holding both, and everybody pays for that.',
    ],
    focus: [4, -2, -8],
    from: [-0.66, 0.28, 0.7],
    far: 112,
    near: 88,
    swing: 0.24,
    fov: 50,
    roll: -1,
    chase: 0,
    frame: 0.3,
  },
  {
    id: 'instrument',
    index: '02',
    nav: 'INSTRUMENT',
    title: 'THE CREDIT IS WRITTEN',
    body: 'A letter of credit is an instruction that several parties have to agree to before anybody is paid. Here it is written as that instruction rather than as a document a bank holds on everyone else’s behalf.',
    beats: ['TERMS', 'PARTIES', 'INSTRUCTION'],
    says: [
      'The terms are what the instruction says, and they are the whole of it.',
      'Everyone who has to agree is named in it before it is signed by anybody.',
      'It is not a document held somewhere. It is an instruction the network can check.',
    ],
    focus: [0, 1, 0],
    from: [-0.34, 0.2, 0.92],
    far: 68,
    near: 46,
    swing: 0.3,
    fov: 45,
    roll: -1.4,
    chase: 0,
    frame: 0.24,
  },
  {
    id: 'signatures',
    index: '03',
    nav: 'SIGNATURES',
    title: 'EVERYONE WHO HAS TO AGREE',
    body: 'Multi-signature approval under post-quantum schemes, so the undertaking survives the arrival of an adversary who can break today’s curves. An instrument that outlives its signatures is not an undertaking.',
    beats: ['SIGN', 'THRESHOLD', 'BINDING'],
    says: [
      'Each party signs under two independent post-quantum schemes.',
      'The instrument binds when the parties it names have all agreed to it.',
      'And it stays binding: nothing about it depends on elliptic curves holding.',
    ],
    focus: [1, 0, 2],
    from: [0.3, 0.16, 0.94],
    far: 58,
    near: 36,
    swing: -0.34,
    fov: 44,
    roll: 1.5,
    chase: 0,
    frame: 0.24,
  },
  {
    id: 'escrow',
    index: '04',
    nav: 'ESCROW',
    title: 'BOTH SIDES COMMIT',
    body: 'Each leg is committed where the other can verify it and neither can take it. Nothing has moved yet — what has happened is that both sides are now provably able to perform.',
    beats: ['GOODS', 'PAYMENT', 'PROVABLE'],
    says: [
      'The shipment leg is committed against the instrument.',
      'The payment leg is committed against the same instrument.',
      'Both are checkable by anyone, and spendable by nobody.',
    ],
    focus: [1, -11, 0],
    from: [0.08, 0.3, 0.95],
    far: 80,
    near: 58,
    swing: 0.26,
    fov: 50,
    roll: -1.2,
    chase: 0,
    frame: 0.26,
  },
  {
    id: 'swap',
    index: '05',
    nav: 'SWAP',
    title: 'THEY CROSS AT ONCE',
    body: 'Settlement is atomic: the document and the payment complete together or neither of them completes. There is no window in which one side has performed and the other has not.',
    beats: ['RELEASE', 'CROSS', 'COMPLETE'],
    says: [
      'One instruction releases both legs. There is not a first one.',
      'They pass each other. Neither party is exposed at any point in between.',
      'Either the whole swap completed, or nothing did and both sides still hold what they had.',
    ],
    focus: [0, 0, -4],
    from: [-0.05, 0.44, 0.9],
    far: 126,
    near: 100,
    swing: 0.2,
    fov: 52,
    roll: 2,
    chase: 0,
    frame: 0.18,
  },
  {
    id: 'settled',
    index: '06',
    nav: 'SETTLED',
    title: 'NOTHING WAS HELD IN THE MIDDLE',
    body: 'The instrument, the approvals and the settlement are all anchored, and at no point did an intermediary hold both sides while it decided. What replaced the bank in the middle is a proof.',
    beats: ['ANCHORED', 'NEUTRAL', 'FINAL'],
    says: [
      'The credit and the settlement are both written to the chain.',
      'No party held the other side at any point, so no party had to be trusted with it.',
      'And the record is checkable afterwards by anyone, including a court.',
    ],
    focus: [4, -10, 0],
    from: [0.08, 0.3, 0.95],
    far: 128,
    near: 106,
    swing: 0.16,
    fov: 52,
    roll: 0,
    chase: 0,
    frame: 0.18,
  },
];

const marks: Mark[] = [
  { id: 'buyer', text: 'The buyer', at: BUYER, during: [0, 3, 4], lift: 10, tone: '#a97bff', names: 'buyer', x: 0, y: 0, on: 0 },
  { id: 'seller', text: 'The seller', at: SELLER, during: [0, 3, 4], lift: 10, tone: '#a97bff', names: 'seller', x: 0, y: 0, on: 0 },
  { id: 'instrument', text: 'The letter of credit', at: CORE, during: [1, 2], lift: 11, tone: '#cfc8ff', names: 'instrument', x: 0, y: 0, on: 0 },
  { id: 'seals', text: 'Signatures', at: [0, -10, 0], during: [2], tone: '#a97bff', names: 'seals', x: 0, y: 0, on: 0 },
  { id: 'goods', text: 'The shipment leg', at: HOLD_GOODS, during: [3], lift: 9, tone: '#ffa94d', names: 'lock-goods', x: 0, y: 0, on: 0 },
  { id: 'money', text: 'The payment leg', at: HOLD_MONEY, during: [3], lift: 9, tone: '#6cd8ff', names: 'lock-money', x: 0, y: 0, on: 0 },
  { id: 'chain', text: 'Anchored', at: CHAIN, during: [5], lift: -6, tone: '#ffa94d', names: 'chain', x: 0, y: 0, on: 0 },
];

export const SETTLE_JOURNEY: Journey = {
  id: 'settle',
  nav: 'QU-SETTLE',
  tone: '#A97BFF',
  figures,
  stages,
  marks,
  path: PATH,
  bend: BEND,
  markScale: 5,
  budget: 0.66,
  traveller: 'goods',
  travelAt,
  score,
};
