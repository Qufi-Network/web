/**
 * Custody with two conditions on it, one of which is your hand.
 *
 * A Taproot output can be spent two ways — by its key, or by a script
 * committed into it — and a QuVault gives up the first. What is left is a set
 * of scripts, and the one that matters requires two things at once: a key that
 * only exists wrapped, and a biometric authorisation from the hardware that
 * reads the vein pattern under a palm. Neither is enough alone.
 *
 * Around that sits the record: the bitcoin is entered in a registry against an
 * owner as soon as it lands, the owner is issued a certificate signed under
 * post-quantum keys, and both are anchored to Bitcoin. If the coin is ever
 * taken, that is what is left — a quantum-signed owner of record that does not
 * depend on QuFi, the operator, or the reader still existing.
 *
 * The shapes are the custody shapes rather than the ledger ones: a spending
 * tree, a woven wrap, a register, a certificate with a seal on it, and a hand.
 * The hand is ported from the anatomy the VEYNS work is built on, at a
 * fraction of the size — it is one stage of this walk, not the subject of it.
 */

import { Behaviour, type Figure } from '../../../network/scene';
import {
  arc,
  ball,
  blocks,
  boxEdges,
  disc,
  escort,
  gates,
  grid,
  scanned,
  shards,
  sheet,
  tree,
  weave,
  type Vec3,
} from '../../../network/shapes';
import { HAND_POINTS } from '../../../assets/hand-points';
import { during, since, type Journey, type Mark, type Stage } from '../journey';

/* ----------------------------------------------------------- the geography -- */

/** Where the spending conditions are written, before there is a vault. */
const TREE: Vec3 = [-46, 6, 20];
/** The vault itself, and the wrap around it. The scene is composed on this. */
const VAULT: Vec3 = [0, 0, 0];
/** The register of who owns what is in it. */
const REGISTRY: Vec3 = [15, 27, -12];
/** And the certificate the owner is given. */
const CERTIFICATE: Vec3 = [-17, 23, 8];
/** The reader: forward and to the right, turned toward whoever is using it. */
const SCANNER: Vec3 = [38, -3, 24];
/** Whoever the bitcoin belongs to. */
const OWNER: Vec3 = [60, -13, -20];
const CHAIN: Vec3 = [0, -30, 4];

const to = (from: Vec3, at: Vec3): Vec3 => [at[0] - from[0], at[1] - from[1], at[2] - from[2]];

/* -------------------------------------------------------------- the palette -- */

const GOLD: Vec3 = [1.0, 0.69, 0.23];
const AMBER: Vec3 = [1.0, 0.85, 0.55];
const SKIN: Vec3 = [0.9, 0.8, 0.74];
const VEIN: Vec3 = [1.0, 0.36, 0.24];
const COOL: Vec3 = [0.5, 0.72, 1.0];
const STEEL: Vec3 = [0.46, 0.46, 0.58];
const DARK: Vec3 = [0.34, 0.28, 0.2];

/* ----------------------------------------------------------------- the path -- */

/**
 * The conditions in, the request out to the reader, and the bitcoin away.
 *
 * Three legs, and the middle one is the whole product: nothing gets from the
 * vault to its owner without going past the hand first.
 */
const PATH: Vec3[] = [TREE, VAULT, SCANNER, OWNER];
const BEND: Vec3[] = [
  [4, -5, 8],
  [4, 9, 4],
  [6, 6, -8],
];

function travelAt(at: number): number {
  return since(at, 1.2, 0.7) + since(at, 4.5, 0.7) + since(at, 5.4, 0.6);
}

/* --------------------------------------------------------------- the figures -- */

const figures: Figure[] = [
  {
    id: 'link-tree',
    at: TREE,
    shape: arc(to(TREE, VAULT), 5),
    behaviour: Behaviour.Hold,
    tone: DARK,
    share: 0.02,
    soft: true,
  },
  {
    id: 'link-registry',
    at: VAULT,
    shape: arc(to(VAULT, REGISTRY), 3),
    behaviour: Behaviour.Hold,
    tone: DARK,
    share: 0.016,
    soft: true,
  },
  {
    id: 'link-certificate',
    at: VAULT,
    shape: arc(to(VAULT, CERTIFICATE), 3),
    behaviour: Behaviour.Hold,
    tone: DARK,
    share: 0.016,
    soft: true,
  },
  {
    id: 'link-scanner',
    at: VAULT,
    shape: arc(to(VAULT, SCANNER), 5),
    behaviour: Behaviour.Hold,
    tone: DARK,
    share: 0.018,
    soft: true,
  },
  {
    id: 'link-chain',
    at: VAULT,
    shape: arc(to(VAULT, CHAIN), 0),
    behaviour: Behaviour.Hold,
    tone: DARK,
    share: 0.014,
    soft: true,
  },

  /*
   * The spending tree.
   *
   * One branch up the middle is the key path, and it is the one this vault does
   * not use — so it is drawn and then put out, which is a good deal clearer
   * than never drawing it.
   */
  {
    id: 'tree',
    at: TREE,
    shape: tree(24, 5, 12),
    // Held rather than assembled, because holding is the behaviour that can
    // strike one of its own parts out, and striking one out is the point.
    behaviour: Behaviour.Hold,
    tone: STEEL,
    share: 0.08,
    scatter: 22,
  },
  {
    id: 'keys',
    at: [-26, 16, 12],
    shape: shards(9),
    behaviour: Behaviour.Assemble,
    tone: AMBER,
    share: 0.05,
    scatter: 20,
  },

  {
    id: 'vault',
    at: VAULT,
    shape: boxEdges(10),
    behaviour: Behaviour.Assemble,
    tone: GOLD,
    share: 0.09,
    scatter: 20,
    size: 1.05,
  },
  // What 'quantum wrapped' looks like: something put around it, turning.
  {
    id: 'wrap',
    at: VAULT,
    shape: weave(13, 4),
    behaviour: Behaviour.Spin,
    tone: AMBER,
    share: 0.07,
    scatter: 30,
    spin: 0.12,
  },

  // The register of who owns what is inside, with this owner's entry lit.
  {
    id: 'registry',
    at: REGISTRY,
    shape: grid(9, 5, 3.3),
    behaviour: Behaviour.Hold,
    tone: STEEL,
    share: 0.08,
    scatter: 20,
  },
  // And the certificate that says the same thing, in the owner's own hands.
  {
    id: 'certificate',
    at: CERTIFICATE,
    shape: sheet(15, 10, 5),
    behaviour: Behaviour.Assemble,
    tone: AMBER,
    share: 0.07,
    scatter: 18,
  },
  {
    id: 'seal',
    at: [-13, 19, 9],
    shape: disc(4),
    behaviour: Behaviour.Hold,
    tone: GOLD,
    share: 0.035,
    scatter: 10,
  },

  /*
   * The reader, and the hand in it.
   *
   * The housing is two square frames because that is what the hardware is —
   * something you put your palm into. The hand is the anatomy from the VEYNS
   * work, and the veins are drawn brighter than the skin because the veins are
   * what is being read.
   */
  {
    id: 'scanner',
    at: SCANNER,
    shape: gates(2, 21, 6),
    behaviour: Behaviour.Hold,
    tone: STEEL,
    share: 0.05,
    scatter: 16,
  },
  /*
   * The hand, and the reader running across it.
   *
   * Sampled off the VEYNS render rather than drawn from an anatomy
   * description, because a hand built out of a description reads as a diagram
   * of a hand. It comes in from the right, the way somebody actually puts a
   * palm into a reader, and the scan follows it in: the band starts at the
   * wrist and runs out to the fingertips, and the veins it has passed stay lit.
   */
  {
    id: 'hand',
    at: SCANNER,
    shape: scanned(HAND_POINTS, [SKIN, VEIN], 13),
    behaviour: Behaviour.Scan,
    tone: SKIN,
    from: [SCANNER[0] + 74, SCANNER[1] - 5, SCANNER[2] + 4],
    // The largest share in the scene, because a hand is the one figure here
    // that has to read as a photograph rather than as a shape that means one.
    share: 0.32,
    size: 0.6,
  },

  {
    id: 'owner',
    at: OWNER,
    shape: ball(7),
    behaviour: Behaviour.Assemble,
    tone: COOL,
    share: 0.05,
    scatter: 18,
  },

  {
    id: 'chain',
    at: CHAIN,
    shape: blocks(160, 18, 1.6),
    behaviour: Behaviour.Hold,
    tone: GOLD,
    share: 0.08,
    soft: true,
  },
  {
    id: 'anchor-registry',
    at: [-8, CHAIN[1], CHAIN[2]],
    shape: ball(2.4),
    behaviour: Behaviour.Drop,
    tone: GOLD,
    share: 0.026,
    from: [12, 24, -10],
  },
  {
    id: 'anchor-move',
    at: [20, CHAIN[1], CHAIN[2]],
    shape: ball(2.4),
    behaviour: Behaviour.Drop,
    tone: GOLD,
    share: 0.026,
    from: [34, -2, 20],
  },

  // What travels: the conditions in, the request out to the reader, and then
  // the bitcoin. One figure, because it is the same authority at three moments.
  {
    id: 'authority',
    at: VAULT,
    shape: escort(2.6, 0.2),
    behaviour: Behaviour.Escort,
    tone: AMBER,
    share: 0.09,
    lag: 0.6,
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

  const wrapping = during(at, 1.5, 1.0);
  const wrapped = since(at, 2.0, 0.5);
  const registered = since(at, 2.4, 0.6);
  const certified = since(at, 3.4, 0.6);
  const reading = during(at, 4.5, 1.1);
  const authorised = since(at, 5.05, 0.4);
  const moving = since(at, 5.4, 0.6);

  set('link-tree', since(at, 0, 0.6), 0.1);
  set('link-registry', since(at, 2.2, 0.6), 0.1);
  set('link-certificate', since(at, 3.2, 0.6), 0.1);
  set('link-scanner', since(at, 4.2, 0.6), 0.1);
  set('link-chain', since(at, 2.3, 0.7), 0.1);

  /*
   * The key path is drawn with everything else and then put out.
   *
   * `extra` is what the shader strikes out, and the tree marks the key path as
   * the branch to strike — so the one route an ordinary wallet would take is
   * visibly the one this vault does not have.
   */
  set('tree', since(at, 0, 0.5), 0.25 + during(at, 0.4, 1.0) * 0.75, since(at, 0.75, 0.4));
  set('keys', since(at, 0.15, 0.5) * (1 - wrapped * 0.7), during(at, 1.2, 0.9));

  set('vault', since(at, 1.0, 0.6), 0.2 + wrapping * 0.4 + moving * 0.4);
  set('wrap', since(at, 1.45, 0.7), 0.2 + wrapping * 0.6 + authorised * 0.3);

  set('registry', registered, 0.3 + during(at, 2.6, 1.0) * 0.6);
  set('certificate', certified, 0.25 + during(at, 3.6, 0.9) * 0.65);
  set('seal', since(at, 3.7, 0.5), 0.3 + since(at, 3.9, 0.4) * 0.7);

  set('scanner', since(at, 4.1, 0.6), 0.24 + reading * 0.6);
  /*
   * The hand, and the scan running through it.
   *
   * Activity drives the two halves of this figure apart: the skin comes up
   * first and the veins light after it, which is the order a reader actually
   * works in — the hand is there, and then the pattern under it is read.
   */
  /*
   * In from the right, and then read across.
   *
   * Presence slides it into the reader; the spare number is the head of the
   * scan, which only starts once the hand is actually there. It stays at one
   * afterwards, so the pattern it read is still lit while the bitcoin moves.
   */
  set('hand', since(at, 4.15, 0.5), 0.2 + reading * 0.5 + authorised * 0.3, since(at, 4.7, 0.6));

  set('owner', since(at, 5.0, 0.6), moving);
  set('chain', since(at, 2.3, 0.7), 0.34);
  set('anchor-registry', since(at, 3.0, 0.32));
  set('anchor-move', since(at, 6.05, 0.32));

  set('authority', since(at, 0.9, 0.4) * (1 - since(at, 6.2, 0.4)), 0.35 + reading * 0.4 + moving * 0.5);
}

/* ------------------------------------------------------------------ the stages -- */

const stages: Stage[] = [
  {
    id: 'script',
    index: '01',
    nav: 'SCRIPT PATH',
    title: 'SPENT BY A SCRIPT, NOT BY A KEY',
    body: 'A Taproot output can be spent two ways: by its key, or by one of the scripts committed into it. A QuVault gives up the first. Everything that can ever move the bitcoin is a script, and every script is written before the vault holds anything at all.',
    beats: ['KEY PATH', 'SCRIPT PATHS', 'COMMITTED'],
    says: [
      'The key path is the route an ordinary wallet takes — and this vault puts it out, by committing to a point nobody holds a secret for.',
      'What is left is a set of scripts, each naming exactly what has to be true before it can spend.',
      'They are committed into the address itself, so no one can add one afterwards.',
    ],
    focus: TREE,
    from: [-0.36, 0.28, 0.89],
    far: 74,
    near: 54,
    swing: 0.3,
    fov: 46,
    roll: -1.2,
    chase: 0.2,
    frame: 0.22,
  },
  {
    id: 'wrap',
    index: '02',
    nav: 'WRAP',
    title: 'THE KEYS ARE WRAPPED',
    body: 'Key management here is wrapped rather than stored. The material that satisfies those scripts is sealed under lattice key encapsulation, and what sits on any machine is a wrapped key rather than a key — useless to whoever takes the machine.',
    beats: ['ENCAPSULATE', 'SEAL', 'HOLD'],
    says: [
      'Every key the vault depends on is encapsulated under a post-quantum scheme.',
      'What is written down anywhere is the wrapping, and the wrapping alone spends nothing.',
      'Which is what makes quantum-wrapped a property of the vault rather than a claim about it.',
    ],
    focus: [0, 1, 0],
    from: [-0.3, 0.22, 0.93],
    far: 96,
    near: 70,
    swing: 0.32,
    fov: 46,
    roll: -1.5,
    chase: 0.15,
    frame: 0.24,
  },
  {
    id: 'registry',
    index: '03',
    nav: 'REGISTRY',
    title: 'A REGISTER OF WHO OWNS IT',
    body: 'The moment bitcoin lands in the vault it is entered in the Quantum Registry: an entry naming the owner, signed under post-quantum keys, and anchored to Bitcoin. Ownership stops being something a database asserts and becomes something the chain carries.',
    beats: ['ENTERED', 'SIGNED', 'ANCHORED'],
    says: [
      'The deposit is registered against an owner as soon as it settles.',
      'The entry is signed under two independent post-quantum schemes.',
      'And its hash goes to Bitcoin, so the register cannot be quietly rewritten later.',
    ],
    focus: [12, 20, -8],
    from: [0.28, 0.2, 0.94],
    far: 76,
    near: 54,
    swing: -0.3,
    fov: 48,
    roll: 1.3,
    chase: 0,
    frame: 0.22,
  },
  {
    id: 'certificate',
    index: '04',
    nav: 'CERTIFICATE',
    title: 'A CERTIFICATE THAT SAYS SO',
    body: 'What the owner holds is a certificate: the registry entry, the vault it refers to, and a quantum signature over both. It is theirs, it is portable, and it can be checked years later by anyone — without QuFi, and without the operator.',
    beats: ['ISSUED', 'SIGNED', 'PORTABLE'],
    says: [
      'The certificate names the vault, the amount and the owner.',
      'It carries a post-quantum signature an adversary with a quantum computer still cannot forge.',
      'And it verifies against the chain, so nobody has to be asked whether it is genuine.',
    ],
    focus: [-14, 18, 8],
    from: [-0.24, 0.2, 0.95],
    far: 70,
    near: 50,
    swing: 0.28,
    fov: 46,
    roll: -1.2,
    chase: 0,
    frame: 0.24,
  },
  {
    id: 'palm',
    index: '05',
    nav: 'BIOMETRIC',
    title: 'YOUR HAND IS THE SECOND CONDITION',
    body: 'One of those scripts requires a biometric authorisation, and the hardware that gives it reads the vein pattern under a palm rather than the surface of it. Nothing leaves the vault without that scan — not the operator, not a stolen key, not a signed instruction on its own.',
    beats: ['PRESENT', 'READ', 'AUTHORISE'],
    says: [
      'A palm is presented to the reader, and what it reads is the vascular pattern underneath it.',
      'The match happens on the device. What leaves the device is an authorisation, never a template.',
      'And that authorisation is signed under the same post-quantum keys as everything else here.',
    ],
    focus: [38, -1, 22],
    from: [0.16, 0.2, 0.97],
    far: 80,
    near: 58,
    swing: -0.24,
    fov: 46,
    roll: 1.4,
    chase: 0,
    frame: 0.22,
  },
  {
    id: 'release',
    index: '06',
    nav: 'RELEASE',
    title: 'AND ONLY THEN DOES IT MOVE',
    body: 'The script path is satisfied when both of its conditions are: the wrapped key, and the biometric authorisation. Neither is enough alone. With both, Bitcoin itself lets the spend through — and the movement, with who authorised it, is anchored.',
    beats: ['BOTH', 'SPEND', 'ANCHOR'],
    says: [
      'The wrapped key will not spend it on its own, and a palm will not either.',
      'With both, the script is satisfied and the spend is valid to every node on the network.',
      'What moved, and what authorised it, go to the chain together.',
    ],
    focus: [42, -8, 4],
    from: [0.1, 0.28, 0.95],
    far: 102,
    near: 78,
    swing: 0.22,
    fov: 50,
    roll: 1.8,
    chase: 0.7,
    frame: 0.22,
  },
  {
    id: 'proof',
    index: '07',
    nav: 'PROOF',
    title: 'WHAT SURVIVES A COMPROMISE',
    body: 'If the bitcoin is ever taken, the registry entry and the certificate are still there — still signed, still anchored. A quantum-signed owner of record that does not depend on QuFi, on the operator, or on the reader still existing.',
    beats: ['REGISTRY', 'CERTIFICATE', 'OWNER OF RECORD'],
    says: [
      'The register says who owned it, and from when.',
      'The certificate says the same thing in a form the owner holds themselves.',
      'Both are anchored to Bitcoin, so neither can be edited after the fact.',
    ],
    focus: [6, 2, 0],
    from: [0.06, 0.3, 0.95],
    far: 150,
    near: 124,
    swing: 0.16,
    fov: 52,
    roll: 0,
    chase: 0,
    frame: 0.18,
  },
];

const marks: Mark[] = [
  { id: 'tree', text: 'The spending conditions', at: TREE, during: [0], lift: 18, tone: '#9aa0bf', names: 'tree', x: 0, y: 0, on: 0 },
  { id: 'vault', text: 'The vault', at: VAULT, during: [1, 5, 6], lift: 13, tone: '#ffb03a', names: 'vault', x: 0, y: 0, on: 0 },
  { id: 'wrap', text: 'Quantum wrapped', at: VAULT, during: [1], lift: -18, tone: '#ffd89a', names: 'wrap', x: 0, y: 0, on: 0 },
  { id: 'registry', text: 'Quantum Registry', at: REGISTRY, during: [2, 6], lift: 10, tone: '#9aa0bf', names: 'registry', x: 0, y: 0, on: 0 },
  { id: 'certificate', text: 'Certificate of ownership', at: CERTIFICATE, during: [3, 6], lift: 9, tone: '#ffd89a', names: 'certificate', x: 0, y: 0, on: 0 },
  { id: 'hand', text: 'Palm vein scan', at: SCANNER, during: [4, 5], lift: 14, tone: '#ffc98a', names: 'hand', x: 0, y: 0, on: 0 },
  { id: 'owner', text: 'The owner', at: OWNER, during: [5], lift: 10, tone: '#8fc0ff', names: 'owner', x: 0, y: 0, on: 0 },
  { id: 'chain', text: 'Bitcoin', at: CHAIN, during: [2, 5, 6], lift: -6, tone: '#ffb03a', names: 'chain', x: 0, y: 0, on: 0 },
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
