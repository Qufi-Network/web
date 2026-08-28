/**
 * Custody the owner can leave without asking anyone.
 *
 * A vault is created together with a tree of pre-signed redemption
 * transactions, each encrypted to the owner. One of them takes effect
 * immediately; two more open on their own after delays written into the Bitcoin
 * script itself. The whole product is that last sentence, so the whole scene is
 * built to show it: three ways out, drawn as three paths of different lengths,
 * and the owner taking the shortest one without anybody's help.
 *
 * The shapes are the custody shapes rather than the ledger ones. A vault at the
 * middle with its conditions turning around it, key material coming in from one
 * side, and three arcs leaving it — nothing here is a page, and nothing here is
 * a swarm crossing a network.
 */

import { Behaviour, type Figure } from '../../../network/scene';
import { arc, ball, blocks, boxEdges, escort, gates, ring, shards, type Vec3 } from '../../../network/shapes';
import { during, since, type Journey, type Mark, type Stage } from '../journey';

/* ----------------------------------------------------------- the geography -- */

const KEYS: Vec3 = [-42, 12, 26];
const VAULT: Vec3 = [0, 0, 0];
const OWNER: Vec3 = [42, -6, -28];
const CHAIN: Vec3 = [0, -30, 4];

/** Where each way out comes to rest. Longer path, longer delay. */
const IMMEDIATE: Vec3 = [26, -4, -16];
const EMERGENCY: Vec3 = [22, -20, 24];
const RECOVERY: Vec3 = [-14, -24, -30];

const to = (from: Vec3, at: Vec3): Vec3 => [at[0] - from[0], at[1] - from[1], at[2] - from[2]];

/* -------------------------------------------------------------- the palette -- */

const GOLD: Vec3 = [1.0, 0.69, 0.23];
const AMBER: Vec3 = [1.0, 0.85, 0.55];
const COOL: Vec3 = [0.5, 0.72, 1.0];
const STEEL: Vec3 = [0.44, 0.44, 0.56];
const DARK: Vec3 = [0.34, 0.28, 0.2];

/* ----------------------------------------------------------------- the path -- */

/** Key material in, and then the owner leaving with what is theirs. */
const PATH: Vec3[] = [KEYS, VAULT, OWNER];
const BEND: Vec3[] = [
  [4, -6, 8],
  [2, 8, -6],
];

function travelAt(at: number): number {
  return since(at, 1.15, 0.7) + since(at, 3.3, 0.7);
}

/* --------------------------------------------------------------- the figures -- */

const figures: Figure[] = [
  {
    id: 'link-keys',
    at: KEYS,
    shape: arc(to(KEYS, VAULT), 5),
    behaviour: Behaviour.Hold,
    tone: DARK,
    share: 0.022,
    soft: true,
  },
  {
    id: 'link-chain',
    at: VAULT,
    shape: arc(to(VAULT, CHAIN), 0),
    behaviour: Behaviour.Hold,
    tone: DARK,
    share: 0.016,
    soft: true,
  },

  {
    id: 'keys',
    at: KEYS,
    shape: shards(13),
    behaviour: Behaviour.Assemble,
    tone: AMBER,
    share: 0.08,
    scatter: 26,
  },
  {
    id: 'vault',
    at: VAULT,
    shape: boxEdges(11),
    behaviour: Behaviour.Assemble,
    tone: GOLD,
    share: 0.16,
    scatter: 20,
    size: 1.05,
  },
  // What the vault will and will not do, turning around it.
  {
    id: 'conditions',
    at: VAULT,
    shape: gates(3, 13, 3.4),
    behaviour: Behaviour.Spin,
    tone: STEEL,
    share: 0.08,
    spin: 0.16,
  },

  /*
   * The three ways out.
   *
   * Drawn as three arcs of visibly different lengths, because the difference
   * between them is time: one is available now, one after a delay, one after a
   * longer delay again. A visitor should be able to see which is which without
   * being told which is which.
   */
  {
    id: 'exit-immediate',
    at: VAULT,
    shape: arc(IMMEDIATE, 5),
    behaviour: Behaviour.Hold,
    tone: GOLD,
    share: 0.05,
  },
  {
    id: 'exit-emergency',
    at: VAULT,
    shape: arc(EMERGENCY, 9),
    behaviour: Behaviour.Hold,
    tone: AMBER,
    share: 0.05,
  },
  {
    id: 'exit-recovery',
    at: VAULT,
    shape: arc(RECOVERY, 13),
    behaviour: Behaviour.Hold,
    tone: STEEL,
    share: 0.05,
  },
  // And the delay each of the two later ones is waiting out.
  {
    id: 'clock-emergency',
    at: EMERGENCY,
    shape: ring(5.5, 0.6),
    behaviour: Behaviour.Hold,
    tone: AMBER,
    share: 0.045,
  },
  {
    id: 'clock-recovery',
    at: RECOVERY,
    shape: ring(7.5, 0.6),
    behaviour: Behaviour.Hold,
    tone: STEEL,
    share: 0.045,
  },

  {
    id: 'owner',
    at: OWNER,
    shape: ball(7),
    behaviour: Behaviour.Assemble,
    tone: COOL,
    share: 0.07,
    scatter: 18,
  },

  {
    id: 'chain',
    at: CHAIN,
    shape: blocks(160, 18, 1.6),
    behaviour: Behaviour.Hold,
    tone: GOLD,
    share: 0.1,
    soft: true,
  },
  {
    id: 'anchor-vault',
    at: [-10, CHAIN[1], CHAIN[2]],
    shape: ball(2.4),
    behaviour: Behaviour.Drop,
    tone: GOLD,
    share: 0.03,
    from: [0, 2, 0],
  },
  {
    id: 'anchor-exit',
    at: [18, CHAIN[1], CHAIN[2]],
    shape: ball(2.4),
    behaviour: Behaviour.Drop,
    tone: GOLD,
    share: 0.03,
    from: [20, -4, -12],
  },

  // What travels: the key material coming in, and then what the owner leaves
  // with. One figure, because they are the same authority at two moments.
  {
    id: 'authority',
    at: VAULT,
    shape: escort(2.6, 0.22),
    behaviour: Behaviour.Escort,
    tone: AMBER,
    share: 0.09,
    lag: 0.7,
    size: 1.0,
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

  const committing = during(at, 1.4, 0.9);
  const leaving = since(at, 3.3, 0.7);
  const waiting = since(at, 4.1, 0.8);

  set('link-keys', since(at, 0, 0.6), 0.1);
  set('link-chain', since(at, 2.4, 0.7), 0.1);

  set('keys', since(at, 0, 0.4), during(at, 0.4, 0.9));
  set('vault', since(at, 0.9, 0.6), committing * 0.6 + leaving * 0.3);
  set('conditions', since(at, 1.5, 0.6), 0.2 + committing * 0.8);

  // The tree is written before any of it is used, and all three ways out exist
  // from the moment the vault does. That is the claim.
  const tree = since(at, 2.3, 0.7);
  set('exit-immediate', tree, 0.3 + leaving * 0.7);
  set('exit-emergency', tree, 0.2 + waiting * 0.6);
  set('exit-recovery', tree, 0.15 + waiting * 0.55);
  set('clock-emergency', since(at, 4.0, 0.6), 0.2 + waiting * 0.8);
  set('clock-recovery', since(at, 4.2, 0.6), 0.15 + waiting * 0.7);

  set('owner', since(at, 2.9, 0.6), leaving);
  set('chain', since(at, 2.4, 0.7), 0.34);
  set('anchor-vault', since(at, 2.0, 0.32));
  set('anchor-exit', since(at, 4.0, 0.32));

  set('authority', since(at, 0.9, 0.4) * (1 - since(at, 5.1, 0.4)), 0.4 + leaving * 0.6);
}

/* ------------------------------------------------------------------ the stages -- */

const stages: Stage[] = [
  {
    id: 'keys',
    index: '01',
    nav: 'KEYS',
    title: 'THE KEYS ARE MADE FIRST',
    body: 'Two independent post-quantum key pairs, generated before there is anything to hold. What the vault will be is decided by what these can do, so they come first and nothing else can change them afterwards.',
    beats: ['GENERATE', 'HOLD', 'COMMIT'],
    says: [
      'Two schemes rather than one, so a break in either leaves the vault standing.',
      'The owner holds what is needed to use them. The operator never does.',
      'And what they commit to is written into the vault as it is created.',
    ],
    focus: KEYS,
    from: [-0.36, 0.28, 0.89],
    far: 62,
    near: 42,
    swing: 0.3,
    fov: 45,
    roll: -1.2,
    chase: 0.25,
    frame: 0.22,
  },
  {
    id: 'vault',
    index: '02',
    nav: 'VAULT',
    title: 'A PLACE WITH CONDITIONS',
    body: 'The vault is a Taproot output whose spending conditions are committed to those keys. Nothing about it is a promise from an operator — the conditions are enforced by the script, and the script is on Bitcoin.',
    beats: ['ADDRESS', 'CONDITIONS', 'ENFORCED'],
    says: [
      'An address anyone can pay, and only these conditions can spend.',
      'The conditions are part of the output rather than a policy applied to it.',
      'What enforces them is Bitcoin, which does not know or care who wrote them.',
    ],
    focus: [0, 1, 0],
    from: [-0.28, 0.22, 0.93],
    far: 76,
    near: 52,
    swing: 0.32,
    fov: 45,
    roll: -1.5,
    chase: 0,
    frame: 0.24,
  },
  {
    id: 'tree',
    index: '03',
    nav: 'TREE',
    title: 'EVERY WAY OUT, WRITTEN IN ADVANCE',
    body: 'A tree of pre-signed redemption transactions is created with the vault, each one encrypted to the owner with lattice key encapsulation. The ways out exist from the first day; what differs is when each of them can be used.',
    beats: ['PRE-SIGNED', 'ENCRYPTED', 'THREE'],
    says: [
      'The transactions that empty the vault are signed before the vault holds anything.',
      'Each is encrypted so that only its owner can ever read it.',
      'Three of them, and the difference between them is time.',
    ],
    focus: [4, -6, -2],
    from: [0.3, 0.24, 0.92],
    far: 96,
    near: 72,
    swing: -0.3,
    fov: 50,
    roll: 1.4,
    chase: 0,
    frame: 0.2,
  },
  {
    id: 'immediate',
    index: '04',
    nav: 'IMMEDIATE',
    title: 'THE OWNER LEAVES',
    body: 'The first way out takes effect immediately and needs nobody’s cooperation. The owner completes a transaction they already hold, and the bitcoin is theirs — with no request, no approval and no counterparty.',
    beats: ['COMPLETE', 'BROADCAST', 'GONE'],
    says: [
      'The owner completes the transaction they were given when the vault was made.',
      'It goes to Bitcoin like any other transaction.',
      'Nobody was asked, and nobody could have refused.',
    ],
    focus: [22, -4, -14],
    from: [-0.02, 0.28, 0.96],
    far: 88,
    near: 64,
    swing: 0.22,
    fov: 50,
    roll: 1.8,
    chase: 0.5,
    frame: 0.24,
  },
  {
    id: 'delays',
    index: '05',
    nav: 'DELAYS',
    title: 'TWO DOORS THAT OPEN ON THEIR OWN',
    body: 'Two more ways out open by themselves after delays written into the script. One is for the case where the immediate path has been lost; the longer one is for the case where everything else has been.',
    beats: ['EMERGENCY', 'RECOVERY', 'NO OPERATOR'],
    says: [
      'The emergency path becomes spendable after a delay the script enforces.',
      'The recovery path takes longer again, and assumes nothing else survived.',
      'Neither of them needs the party who helped create the vault to still exist.',
    ],
    focus: [4, -18, -2],
    from: [0.1, 0.24, 0.96],
    far: 104,
    near: 82,
    swing: -0.22,
    fov: 52,
    roll: -1.2,
    chase: 0,
    frame: 0.2,
  },
  {
    id: 'proof',
    index: '06',
    nav: 'PROOF',
    title: 'WHAT THE OWNER ACTUALLY HAS',
    body: 'Not a balance in somebody’s system: a set of transactions they hold, and a script on Bitcoin that will honour them. Custody is what you can do without asking, and this is a vault the owner can always leave.',
    beats: ['HELD', 'ENFORCED', 'THEIRS'],
    says: [
      'The owner holds the means to spend, encrypted to them and to nobody else.',
      'Bitcoin enforces the conditions, including the ones about time.',
      'Which is the difference between custody and a promise about custody.',
    ],
    focus: [2, -10, 0],
    from: [0.06, 0.3, 0.95],
    far: 88,
    near: 64,
    swing: 0.16,
    fov: 52,
    roll: 0,
    chase: 0.5,
    frame: 0.18,
  },
];

const marks: Mark[] = [
  { id: 'keys', text: 'Two schemes', at: KEYS, during: [0], lift: 10, tone: '#ffd89a', names: 'keys', x: 0, y: 0, on: 0 },
  { id: 'vault', text: 'The vault', at: VAULT, during: [1, 2, 4, 5], lift: 14, tone: '#ffb03a', names: 'vault', x: 0, y: 0, on: 0 },
  { id: 'immediate', text: 'Immediate', at: IMMEDIATE, during: [2, 3, 4], lift: 7, tone: '#ffb03a', names: 'exit-immediate', x: 0, y: 0, on: 0 },
  { id: 'emergency', text: 'Emergency, after a delay', at: EMERGENCY, during: [2, 4], lift: 8, tone: '#ffd89a', names: 'clock-emergency', x: 0, y: 0, on: 0 },
  { id: 'recovery', text: 'Recovery, later again', at: RECOVERY, during: [2, 4], lift: 10, tone: '#9aa0bf', names: 'clock-recovery', x: 0, y: 0, on: 0 },
  { id: 'owner', text: 'The owner', at: OWNER, during: [3, 5], lift: 10, tone: '#8fc0ff', names: 'owner', x: 0, y: 0, on: 0 },
  { id: 'chain', text: 'Bitcoin', at: CHAIN, during: [3, 4, 5], lift: -6, tone: '#ffb03a', names: 'chain', x: 0, y: 0, on: 0 },
];

export const VAULT_JOURNEY: Journey = {
  id: 'vault',
  nav: 'QU-VAULT',
  tone: '#FFB03A',
  figures,
  stages,
  marks,
  path: PATH,
  bend: BEND,
  markScale: 5,
  budget: 0.66,
  traveller: 'authority',
  travelAt,
  score,
};
