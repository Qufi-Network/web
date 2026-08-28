/**
 * A letter of credit with three parties to it.
 *
 * A buyer who will not pay before shipment, a seller who will not ship before
 * payment, and a verifier whose whole job is to say whether what was promised
 * was actually done. The payment goes in first and sits where none of the three
 * can take it; the documents are presented against it; and it moves to the
 * seller when two of the three sign — which means no single party can release
 * it, and no single party can hold it hostage.
 *
 * That last sentence is the product, so the scene is built to show it. Three
 * parties standing at three corners, three seals around the instrument, and two
 * of them filling.
 *
 * It is built out of different shapes from the unit's lifecycle on purpose. An
 * instrument is a page before it is anything else, so the middle of this scene
 * is a sheet with terms ruled across it and seals turning in front of it, where
 * the uBTC walk has a box and a chain. Same hand, different subject.
 *
 * The path doubles back on itself, which is how one set of waypoints carries
 * two things moving in opposite directions: the documents come up from the
 * seller on the low lane, and the payment goes down to them on the high one.
 */

import { Behaviour, type Figure } from '../../../network/scene';
import {
  arc,
  ball,
  blocks,
  boxEdges,
  escort,
  gates,
  ring,
  sheet,
  type Vec3,
} from '../../../network/shapes';
import { during, since, type Journey, type Mark, type Stage } from '../journey';

/* ----------------------------------------------------------- the geography -- */

/** The three parties, at three corners. */
const BUYER: Vec3 = [-40, 4, 24];
const SELLER: Vec3 = [40, -4, -26];
const VERIFIER: Vec3 = [4, 30, -8];
/** Where the instrument stands, and where the payment waits. */
const CREDIT: Vec3 = [0, 0, 0];
const CHAIN: Vec3 = [0, -28, 6];
/** Where the payment waits while the documents are checked. */
const ESCROW: Vec3 = [0, -13, 3];

/** One seal apiece, on the line between each party and the instrument. */
const SEAL_BUYER: Vec3 = [-17, 3, 12];
const SEAL_SELLER: Vec3 = [17, -2, -12];
const SEAL_VERIFIER: Vec3 = [2, 15, -4];

const to = (from: Vec3, at: Vec3): Vec3 => [at[0] - from[0], at[1] - from[1], at[2] - from[2]];

/* -------------------------------------------------------------- the palette -- */

const VIOLET: Vec3 = [0.66, 0.48, 1.0];
const PALE: Vec3 = [0.7, 0.64, 1.0];
/** The verifier is the one party that is neither buying nor selling. */
const ICE: Vec3 = [0.62, 0.88, 1.0];
const MONEY: Vec3 = [1.0, 0.66, 0.28];
const PAPER: Vec3 = [0.82, 0.86, 1.0];
const DARK: Vec3 = [0.28, 0.26, 0.46];

/* ----------------------------------------------------------------- the path -- */

/**
 * Buyer, the credit, the seller, and back to the credit.
 *
 * Three legs off one set of waypoints: the payment rides the first two, out of
 * the buyer's hands and — much later, and only once it has been signed for —
 * down to the seller. The documents ride the third, up from the seller to be
 * checked. They bow in opposite directions so the two are visibly two lanes
 * rather than one corridor used twice.
 */
const PATH: Vec3[] = [BUYER, ESCROW, SELLER, CREDIT];
const BEND: Vec3[] = [
  [0, 6, 6],
  [2, 14, -2],
  [-2, -12, 8],
];

/** Where the payment is: into the credit, and much later out to the seller. */
function travelAt(at: number): number {
  return since(at, 1.2, 0.75) + since(at, 5.15, 0.7);
}

/** And where the documents are, on the lane that runs the other way. */
function documentsAt(at: number): number {
  return 2 + since(at, 2.25, 0.8);
}

/* --------------------------------------------------------------- the figures -- */

const figures: Figure[] = [
  {
    id: 'link-buyer',
    at: BUYER,
    shape: arc(to(BUYER, CREDIT), 6),
    behaviour: Behaviour.Hold,
    tone: DARK,
    share: 0.022,
    soft: true,
  },
  {
    id: 'link-seller',
    at: CREDIT,
    shape: arc(to(CREDIT, SELLER), 7),
    behaviour: Behaviour.Hold,
    tone: DARK,
    share: 0.022,
    soft: true,
  },
  {
    id: 'link-verifier',
    at: CREDIT,
    shape: arc(to(CREDIT, VERIFIER), 3),
    behaviour: Behaviour.Hold,
    tone: DARK,
    share: 0.018,
    soft: true,
  },
  {
    id: 'link-chain',
    at: CREDIT,
    shape: arc(to(CREDIT, CHAIN), 0),
    behaviour: Behaviour.Hold,
    tone: DARK,
    share: 0.014,
    soft: true,
  },

  {
    id: 'buyer',
    at: BUYER,
    shape: ball(6.5),
    behaviour: Behaviour.Assemble,
    tone: VIOLET,
    share: 0.06,
    scatter: 18,
  },
  {
    id: 'seller',
    at: SELLER,
    shape: ball(6.5),
    behaviour: Behaviour.Assemble,
    tone: VIOLET,
    share: 0.06,
    scatter: 18,
  },
  /*
   * The third party.
   *
   * Drawn in its own colour and standing off the line between the other two,
   * because that is exactly what it is: neither buying nor selling, and there
   * only to say whether what was promised was done.
   */
  {
    id: 'verifier',
    at: VERIFIER,
    shape: ball(6),
    behaviour: Behaviour.Assemble,
    tone: ICE,
    share: 0.06,
    scatter: 18,
  },

  // The instrument itself: a page, ruled, standing between all three of them.
  {
    id: 'instrument',
    at: CREDIT,
    shape: sheet(18, 12, 7),
    behaviour: Behaviour.Assemble,
    tone: PALE,
    share: 0.13,
    scatter: 20,
    size: 1.05,
  },
  // Where the payment waits: visible to everyone, spendable by nobody.
  {
    id: 'escrow',
    at: ESCROW,
    shape: boxEdges(6, 0.14),
    behaviour: Behaviour.Assemble,
    tone: MONEY,
    share: 0.06,
    scatter: 14,
  },
  // What the checking is made of.
  {
    id: 'checks',
    at: CREDIT,
    shape: gates(3, 6, 2.8),
    behaviour: Behaviour.Spin,
    tone: ICE,
    share: 0.07,
    spin: 0.2,
  },

  /*
   * Three seals, and two of them fill.
   *
   * One on the line from each party to the instrument, so which signature is
   * whose needs no caption. The seller presents; the other two approve — but
   * any two of the three will do, which is why none of them can block.
   */
  {
    id: 'seal-buyer',
    at: SEAL_BUYER,
    shape: ring(4.2, 0.7),
    behaviour: Behaviour.Hold,
    tone: VIOLET,
    share: 0.035,
    scatter: 10,
  },
  {
    id: 'seal-seller',
    at: SEAL_SELLER,
    shape: ring(4.2, 0.7),
    behaviour: Behaviour.Hold,
    tone: VIOLET,
    share: 0.035,
    scatter: 10,
  },
  {
    id: 'seal-verifier',
    at: SEAL_VERIFIER,
    shape: ring(4.2, 0.7),
    behaviour: Behaviour.Hold,
    tone: ICE,
    share: 0.035,
    scatter: 10,
  },

  {
    id: 'chain',
    at: CHAIN,
    shape: blocks(170, 20, 1.6),
    behaviour: Behaviour.Hold,
    tone: MONEY,
    share: 0.09,
    soft: true,
  },
  {
    id: 'anchor-credit',
    at: [-12, CHAIN[1], CHAIN[2]],
    shape: ball(2.4),
    behaviour: Behaviour.Drop,
    tone: MONEY,
    share: 0.028,
    from: [0, 2, 0],
  },
  {
    id: 'anchor-release',
    at: [16, CHAIN[1], CHAIN[2]],
    shape: ball(2.4),
    behaviour: Behaviour.Drop,
    tone: MONEY,
    share: 0.028,
    from: [0, 2, 0],
  },

  /*
   * The documents: a page that travels rather than a swarm.
   *
   * A bill of lading is a document, and a document arrives in one piece, so it
   * rides the path with its tail closed up.
   */
  {
    id: 'documents',
    at: CREDIT,
    shape: sheet(9, 6, 4),
    behaviour: Behaviour.Escort,
    tone: PAPER,
    share: 0.1,
    lag: 0.06,
    size: 1.0,
  },
  // And the payment, which moves last.
  {
    id: 'deposit',
    at: CREDIT,
    shape: escort(3.4, 0.18),
    behaviour: Behaviour.Escort,
    tone: MONEY,
    share: 0.11,
    lag: 0.6,
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

  const held = since(at, 1.7, 0.5);
  const presented = since(at, 2.4, 0.7);
  const checking = during(at, 3.3, 1.0);
  const verified = since(at, 3.8, 0.5);
  const signing = during(at, 4.25, 1.0);
  const signed = since(at, 4.7, 0.5);
  const released = since(at, 5.15, 0.7);

  set('link-buyer', since(at, 0, 0.6), 0.1);
  set('link-seller', since(at, 0.15, 0.7), 0.1);
  set('link-verifier', since(at, 0.3, 0.7), 0.1);
  set('link-chain', since(at, 4.9, 0.7), 0.1);

  set('buyer', since(at, 0, 0.35), during(at, 0.35, 0.7));
  set('seller', since(at, 0.06, 0.4), during(at, 0.62, 0.7));
  set('verifier', since(at, 0.12, 0.45), during(at, 0.9, 0.8) + checking * 0.6);

  set('instrument', since(at, 0.9, 0.7), 0.2 + presented * 0.3 + signing * 0.5);
  set('escrow', held, 0.2 + held * 0.4 - released * 0.5);
  set('checks', since(at, 2.9, 0.6), 0.16 + checking * 0.84);

  /*
   * Two of the three.
   *
   * The seller is the one presenting, so the other two are the ones approving
   * here — but the third seal stays lit enough to be seen, because the point is
   * that any two of them would have done, and no one of them could have
   * refused on their own.
   */
  const seals = since(at, 4.1, 0.5);
  set('seal-buyer', seals, 0.25 + signed * 0.75);
  set('seal-verifier', seals, 0.25 + signed * 0.75);
  set('seal-seller', seals, 0.22);

  set('chain', since(at, 4.9, 0.7), 0.34);
  set('anchor-credit', since(at, 2.0, 0.32));
  set('anchor-release', since(at, 5.85, 0.32));

  // The documents come up the low lane once they have been issued.
  set('documents', presented, 0.3 + checking * 0.7, 0, documentsAt(at));
  // And the payment sits in the credit until two signatures move it.
  set('deposit', since(at, 1.15, 0.4), 0.35 + released * 0.65);
}

/* ------------------------------------------------------------------ the stages -- */

const stages: Stage[] = [
  {
    id: 'parties',
    index: '01',
    nav: 'PARTIES',
    title: 'A BUYER, A SELLER, AND A VERIFIER',
    body: 'The seller will not ship until they are sure of payment. The buyer will not pay until they are sure of shipment. A third party exists to say whether what was promised was actually done — and none of the three can move the money on their own.',
    beats: ['BUYER', 'SELLER', 'VERIFIER'],
    says: [
      'One side has money and needs certainty that goods will follow.',
      'The other has goods and needs certainty that money will follow.',
      'And a third checks the documents, without being on either side of the trade.',
    ],
    focus: [2, 4, -6],
    from: [-0.6, 0.3, 0.74],
    far: 118,
    near: 92,
    swing: 0.24,
    fov: 50,
    roll: -1,
    chase: 0,
    frame: 0.34,
  },
  {
    id: 'credit',
    index: '02',
    nav: 'CREDIT',
    title: 'THE PAYMENT GOES IN FIRST',
    body: 'The credit is written as an instruction the network can check, and the buyer’s payment is committed against it. From here it is visible to all three parties and spendable by none of them — including the buyer.',
    beats: ['TERMS', 'DEPOSIT', 'HELD'],
    says: [
      'The terms are what the instruction says, and they name everyone who has to agree.',
      'The buyer’s payment goes in against it before anything ships.',
      'It is now out of the buyer’s hands, and not yet in the seller’s.',
    ],
    focus: [0, -4, 0],
    from: [-0.32, 0.24, 0.92],
    far: 76,
    near: 52,
    swing: 0.3,
    fov: 46,
    roll: -1.4,
    chase: 0.35,
    frame: 0.24,
  },
  {
    id: 'documents',
    index: '03',
    nav: 'DOCUMENTS',
    title: 'THE DOCUMENTS ARE PRESENTED',
    body: 'A bill of lading, an inspection certificate, an insurance policy — whatever the terms of the credit name. They are issued by the parties that issue them and presented against the instrument, not posted to a bank and waited on.',
    beats: ['ISSUED', 'PRESENTED', 'AGAINST THE TERMS'],
    says: [
      'The bill of lading is issued when the goods are actually loaded.',
      'It is presented against the credit, along with everything else the terms name.',
      'Each one is signed by whoever issued it, and each signature is post-quantum.',
    ],
    focus: [20, -6, -14],
    from: [0.02, 0.28, 0.96],
    far: 74,
    near: 52,
    swing: -0.24,
    fov: 50,
    roll: 1.6,
    chase: 0.7,
    frame: 0.24,
  },
  {
    id: 'verify',
    index: '04',
    nav: 'VERIFY',
    title: 'CHECKED AGAINST THE TERMS',
    body: 'The verifier checks each document against what the credit requires: the right goods, the right quantity, the right dates, the right signatures. This is the step a bank charges for, and it is the step that decides whether the payment moves.',
    beats: ['READ', 'MATCH', 'DECIDE'],
    says: [
      'Every document is checked against the clause of the credit it answers.',
      'A discrepancy is a discrepancy: the terms are machine-readable, so the check is too.',
      'The verifier signs only what it is satisfied with, and its signature is its own.',
    ],
    focus: [2, 8, -4],
    from: [0.26, 0.22, 0.94],
    far: 68,
    near: 46,
    swing: -0.3,
    fov: 46,
    roll: 1.4,
    chase: 0,
    frame: 0.24,
  },
  {
    id: 'signatures',
    index: '05',
    nav: 'SIGNATURES',
    title: 'TWO OF THE THREE SIGN',
    body: 'Release takes two signatures out of three, under two independent post-quantum schemes. No single party can move the payment, and no single party can hold it: the buyer and the verifier can release without the seller, and the seller and the verifier can release without the buyer.',
    beats: ['SIGN', 'TWO OF THREE', 'BINDING'],
    says: [
      'Each party signs with keys that survive an adversary who can break today’s curves.',
      'Any two of the three are enough. None of them is enough alone.',
      'Which means nobody at this table has to be trusted — only counted.',
    ],
    focus: [0, 4, 0],
    from: [-0.28, 0.2, 0.94],
    far: 62,
    near: 40,
    swing: 0.32,
    fov: 45,
    roll: -1.5,
    chase: 0,
    frame: 0.22,
  },
  {
    id: 'release',
    index: '06',
    nav: 'RELEASE',
    title: 'THE PAYMENT MOVES TO THE SELLER',
    body: 'Two signatures against verified documents, and the deposit goes. Not a bank deciding to pay, and not an instruction to a bank to pay: the condition was met, so the money moved — and the whole of it is anchored where anyone can check it afterwards.',
    beats: ['CONDITION MET', 'RELEASED', 'ANCHORED'],
    says: [
      'The release condition was written into the credit before anything shipped.',
      'The payment leaves the credit and arrives with the seller.',
      'And the record of what was presented, checked and signed is on the chain.',
    ],
    focus: [24, -6, -16],
    from: [0.04, 0.3, 0.95],
    far: 96,
    near: 72,
    swing: 0.2,
    fov: 52,
    roll: 1.8,
    chase: 0.75,
    frame: 0.22,
  },
];

const marks: Mark[] = [
  { id: 'buyer', text: 'The buyer', at: BUYER, during: [0, 1, 4], lift: 10, tone: '#a97bff', names: 'buyer', x: 0, y: 0, on: 0 },
  { id: 'seller', text: 'The seller', at: SELLER, during: [0, 2, 5], lift: 10, tone: '#a97bff', names: 'seller', x: 0, y: 0, on: 0 },
  { id: 'verifier', text: 'The verifier', at: VERIFIER, during: [0, 3, 4], lift: 10, tone: '#9fdcff', names: 'verifier', x: 0, y: 0, on: 0 },
  { id: 'instrument', text: 'The letter of credit', at: CREDIT, during: [1, 3, 4], lift: 10, tone: '#cfc8ff', names: 'instrument', x: 0, y: 0, on: 0 },
  { id: 'escrow', text: 'The payment, held', at: ESCROW, during: [1, 5], lift: 9, tone: '#ffa94d', names: 'escrow', x: 0, y: 0, on: 0 },
  { id: 'documents', text: 'Bill of lading', at: 'travel', during: [2], lift: 7, tone: '#d2d8ff', names: 'documents', x: 0, y: 0, on: 0 },
  { id: 'seal-verifier', text: 'Signed', at: SEAL_VERIFIER, during: [4], lift: 7, tone: '#9fdcff', names: 'seal-verifier', x: 0, y: 0, on: 0 },
  { id: 'seal-buyer', text: 'Signed', at: SEAL_BUYER, during: [4], lift: 7, tone: '#a97bff', names: 'seal-buyer', x: 0, y: 0, on: 0 },
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
  traveller: 'deposit',
  travelAt,
  score,
};
