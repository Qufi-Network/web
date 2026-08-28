/**
 * Independent operators, and a threshold of them that has to agree.
 *
 * The claim this product makes is a negative one — no single operator can
 * approve a movement, and no single operator can prevent one — and a negative
 * claim is hard to draw. So the scene is built to show it happening: an
 * instruction arrives, every operator checks it for itself, enough of them
 * agree, and then one of them goes dark and the answer comes out the same.
 *
 * Its shapes are the network's shapes rather than the ledger's: a ring of
 * operators with the agreement drawn as the chords between them, and a
 * threshold band that closes when enough of it is lit. Nothing here is a box,
 * a page or a chain of blocks.
 */

import { Behaviour, type Figure } from '../../../network/scene';
import { arc, ball, blocks, chords, escort, lattice, ring, type Vec3 } from '../../../network/shapes';
import { during, since, type Journey, type Mark, type Stage } from '../journey';

/* ----------------------------------------------------------- the geography -- */

const CORE: Vec3 = [0, 0, 0];
/** Where an instruction comes in from, and where the result goes out to. */
const ARRIVE: Vec3 = [-64, 10, 42];
const DEPART: Vec3 = [62, -8, -36];
const CHAIN: Vec3 = [0, -32, 6];
/** The operator that goes dark in the last stage. */
const ABSENT: Vec3 = [-20, 17, 22];

const to = (from: Vec3, at: Vec3): Vec3 => [at[0] - from[0], at[1] - from[1], at[2] - from[2]];

/* -------------------------------------------------------------- the palette -- */

const CYAN: Vec3 = [0.26, 0.72, 1.0];
const ICE: Vec3 = [0.74, 0.9, 1.0];
const DEEP: Vec3 = [0.2, 0.42, 0.72];
const GOLD: Vec3 = [1.0, 0.66, 0.28];
const DARK: Vec3 = [0.18, 0.3, 0.46];

/* ----------------------------------------------------------------- the path -- */

/** In to be checked, and out again once enough operators have agreed. */
const PATH: Vec3[] = [ARRIVE, CORE, DEPART];
const BEND: Vec3[] = [
  [2, -8, 6],
  [4, 10, -6],
];

function travelAt(at: number): number {
  return since(at, 2.2, 0.7) + since(at, 4.3, 0.7);
}

/* --------------------------------------------------------------- the figures -- */

const figures: Figure[] = [
  {
    id: 'link-in',
    at: ARRIVE,
    shape: arc(to(ARRIVE, CORE), 6),
    behaviour: Behaviour.Hold,
    tone: DARK,
    share: 0.022,
    soft: true,
  },
  {
    id: 'link-out',
    at: CORE,
    shape: arc(to(CORE, DEPART), 8),
    behaviour: Behaviour.Hold,
    tone: DARK,
    share: 0.022,
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

  /*
   * The operators, and the agreement between them.
   *
   * One figure rather than two, because the whole point is that the parties and
   * the agreement are the same object: a quorum is not a set of machines with a
   * protocol laid over it, it is what those machines are doing.
   */
  {
    id: 'operators',
    at: CORE,
    shape: lattice(32, 14, 0),
    behaviour: Behaviour.Assemble,
    tone: CYAN,
    share: 0.26,
    scatter: 40,
  },
  // What they have agreed, drawn thin: it is the relation between the parties
  // rather than a thing standing beside them.
  {
    id: 'agreement',
    at: CORE,
    shape: chords(32, 14),
    behaviour: Behaviour.Hold,
    tone: DEEP,
    share: 0.12,
    scatter: 40,
    soft: true,
  },
  // The share of them that has to agree, drawn as a band that closes.
  {
    id: 'threshold',
    at: CORE,
    shape: ring(38, 1.6),
    behaviour: Behaviour.Hold,
    tone: ICE,
    share: 0.1,
    scatter: 24,
  },
  // And the operator that stops answering, to show that it does not matter.
  {
    id: 'absent',
    at: ABSENT,
    shape: ball(3.4),
    behaviour: Behaviour.Assemble,
    tone: DEEP,
    share: 0.05,
    scatter: 10,
  },

  {
    id: 'chain',
    at: CHAIN,
    shape: blocks(170, 20, 1.6),
    behaviour: Behaviour.Hold,
    tone: GOLD,
    share: 0.1,
    soft: true,
  },
  {
    id: 'anchor',
    at: [14, CHAIN[1], CHAIN[2]],
    shape: ball(2.4),
    behaviour: Behaviour.Drop,
    tone: GOLD,
    share: 0.03,
    from: [0, 2, 0],
  },

  // The instruction: in to be checked, and out again as a decision.
  {
    id: 'instruction',
    at: CORE,
    shape: escort(3.4, 0.24),
    behaviour: Behaviour.Escort,
    tone: ICE,
    share: 0.16,
    size: 1.05,
  },
];

const index = new Map(figures.map((figure, i) => [figure.id, i]));

/* ------------------------------------------------------------------ the score -- */

function score(at: number, state: Float32Array) {
  const travel = travelAt(at);
  const set = (id: string, presence: number, activity = 0, extra = 0) => {
    const i = (index.get(id) ?? 0) * 4;
    state[i] = presence;
    state[i + 1] = activity;
    state[i + 2] = travel;
    state[i + 3] = extra;
  };

  const generating = during(at, 1.2, 1.0);
  const checking = since(at, 3.1, 0.7);
  const agreed = since(at, 4.0, 0.6);
  // One operator stops answering in the last stage, and nothing else changes.
  const gone = since(at, 5.2, 0.4);

  set('link-in', since(at, 1.9, 0.6), 0.1);
  set('link-out', since(at, 4.1, 0.6), 0.1);
  set('link-chain', since(at, 4.4, 0.6), 0.1);

  set('operators', since(at, 0, 0.6), 0.18 + generating * 0.4 + checking * 0.34 + agreed * 0.2);
  set('agreement', since(at, 1.1, 0.8), 0.14 + generating * 0.4 + agreed * 0.4);
  set('threshold', since(at, 3.7, 0.6), 0.2 + agreed * 0.8);
  set('absent', since(at, 0.4, 0.6) * (1 - gone), 0.3);

  set('chain', since(at, 4.4, 0.7), 0.34);
  set('anchor', since(at, 4.9, 0.32));

  set(
    'instruction',
    since(at, 2.1, 0.4) * (1 - since(at, 5.4, 0.4)),
    0.4 + checking * 0.6,
  );
}

/* ------------------------------------------------------------------ the stages -- */

const stages: Stage[] = [
  {
    id: 'operators',
    index: '01',
    nav: 'OPERATORS',
    title: 'PARTIES WHO DO NOT TRUST EACH OTHER',
    body: 'Verification is not something one machine does. The layer is made of independent operators, run by different people in different places, and none of them is the network.',
    beats: ['INDEPENDENT', 'MANY', 'NO CENTRE'],
    says: [
      'Each operator is run by someone else, with their own machines and their own reasons.',
      'There are enough of them that no single failure is the network failing.',
      'And there is no middle: nothing here is the one that the others report to.',
    ],
    focus: CORE,
    from: [-0.3, 0.26, 0.92],
    far: 128,
    near: 94,
    swing: 0.3,
    fov: 48,
    roll: -1,
    chase: 0,
    frame: 0.2,
  },
  {
    id: 'keygen',
    index: '02',
    nav: 'KEY GENERATION',
    title: 'A KEY THAT NEVER EXISTS',
    body: 'The key is generated between the operators, with no point at which a whole one is assembled anywhere. Each holds a share; the key itself is never in a place it could be taken from.',
    beats: ['SHARES', 'BETWEEN', 'NEVER WHOLE'],
    says: [
      'Every operator ends up holding a share, and only a share.',
      'The shares are produced between them, in the open, and checked by each other.',
      'At no moment in that process does a complete key exist on any machine.',
    ],
    focus: [0, 0, 2],
    from: [0.26, 0.2, 0.94],
    far: 104,
    near: 74,
    swing: -0.32,
    fov: 46,
    roll: 1.4,
    chase: 0,
    frame: 0.22,
  },
  {
    id: 'arrives',
    index: '03',
    nav: 'INSTRUCTION',
    title: 'SOMETHING ARRIVES TO BE CHECKED',
    body: 'An instruction reaches the network with its post-quantum proof attached. It is not addressed to an operator — it is put in front of all of them.',
    beats: ['ARRIVES', 'BROADCAST', 'QUEUED'],
    says: [
      'The instruction comes in carrying everything needed to check it.',
      'It goes to every operator rather than to one that then tells the others.',
      'Nothing has been decided, and nothing has moved.',
    ],
    focus: [-16, 4, 14],
    from: [-0.12, 0.28, 0.95],
    far: 86,
    near: 62,
    swing: 0.24,
    fov: 50,
    roll: 1.6,
    chase: 0.6,
    frame: 0.24,
  },
  {
    id: 'checks',
    index: '04',
    nav: 'VERIFY',
    title: 'EACH ONE CHECKS FOR ITSELF',
    body: 'Every operator verifies the proof independently before it will sign anything. No operator takes another’s word for it, which is what makes agreement between them worth something.',
    beats: ['VERIFY', 'INDEPENDENT', 'SIGN'],
    says: [
      'Each checks the signatures and the conditions itself, from the instruction alone.',
      'None of them is relying on any of the others having done it.',
      'An operator that is not satisfied does not sign, and says so.',
    ],
    focus: [0, 2, 0],
    from: [-0.2, 0.24, 0.95],
    far: 100,
    near: 76,
    swing: 0.3,
    fov: 48,
    roll: -1.4,
    chase: 0,
    frame: 0.24,
  },
  {
    id: 'threshold',
    index: '05',
    nav: 'THRESHOLD',
    title: 'ENOUGH OF THEM AGREE',
    body: 'A threshold of the operators co-signs as a group, and the result is one signature rather than a pile of them. Below the threshold nothing settles; at the threshold it settles without anybody deciding to allow it.',
    beats: ['QUORUM', 'CO-SIGN', 'SETTLE'],
    says: [
      'The shares are combined only once enough operators have agreed.',
      'What comes out is a single signature, indistinguishable from any other.',
      'And the instruction settles — anchored, like everything else on this core.',
    ],
    focus: [4, 0, -6],
    from: [0.24, 0.22, 0.94],
    far: 116,
    near: 88,
    swing: -0.26,
    fov: 50,
    roll: -1.2,
    chase: 0.2,
    frame: 0.2,
  },
  {
    id: 'independence',
    index: '06',
    nav: 'INDEPENDENCE',
    title: 'NO ONE CAN APPROVE, AND NO ONE CAN BLOCK',
    body: 'One operator goes dark. The threshold is still met, and the answer is the same. That symmetry is the product: a layer neutral enough that the parties using it do not have to trust the parties running it.',
    beats: ['ONE LEAVES', 'STILL AGREED', 'NEUTRAL'],
    says: [
      'An operator stops answering — failed, seized, or simply unwilling.',
      'Enough of the others still agree, so the instruction settles anyway.',
      'And no operator could have forced it through on their own either.',
    ],
    focus: [2, -4, -2],
    from: [0.06, 0.3, 0.95],
    far: 150,
    near: 124,
    swing: 0.18,
    fov: 52,
    roll: 0,
    chase: 0,
    frame: 0.18,
  },
];

const marks: Mark[] = [
  { id: 'operators', text: 'Independent operators', at: CORE, during: [0, 1, 3], lift: 32, tone: '#4cc9ff', names: 'operators', x: 0, y: 0, on: 0 },
  { id: 'instruction', text: 'The instruction', at: 'travel', during: [2, 3], lift: 7, tone: '#d6f2ff', x: 0, y: 0, on: 0 },
  { id: 'threshold', text: 'The threshold', at: [0, -32, 0], during: [4], tone: '#d6f2ff', names: 'threshold', x: 0, y: 0, on: 0 },
  { id: 'absent', text: 'Gone dark', at: ABSENT, during: [5], lift: 7, tone: '#5b7fa8', names: 'absent', x: 0, y: 0, on: 0 },
  { id: 'chain', text: 'Anchored', at: CHAIN, during: [4, 5], lift: -6, tone: '#ffa94d', names: 'chain', x: 0, y: 0, on: 0 },
];

export const NODES_JOURNEY: Journey = {
  id: 'nodes',
  nav: 'QU-NODES',
  tone: '#4CC9FF',
  figures,
  stages,
  marks,
  path: PATH,
  bend: BEND,
  markScale: 5,
  budget: 0.66,
  traveller: 'instruction',
  travelAt,
  score,
};
