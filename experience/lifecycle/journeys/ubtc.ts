/**
 * The life of one uBTC, as a place you fly through.
 *
 * A vault is created, bitcoin goes into it, an instruction crosses the network
 * to be checked, and the unit is issued at the far end of that check — which is
 * the moment its mark appears, because that is the moment it exists. From there
 * it travels: out to whoever it is sent to, and back again to be redeemed for
 * the bitcoin underneath it.
 *
 * The geography is spread through depth on purpose. The vault stands forward
 * and to the left, the holder sits back and to the right, the registry is above
 * and behind, and the chain runs underneath all of it — so moving from one to
 * the next is a flight through a volume rather than a pan across a picture. The
 * faint links between them are there for the same reason: without something
 * joining the places up, a scene of separate objects in the dark is a diagram
 * with the paper taken away.
 *
 * Every number below comes out of the route position. Nothing is tweened,
 * nothing is triggered, and scrolling back up unwinds a mint exactly the way
 * scrolling down performed it.
 */

import { Behaviour, type Figure } from '../../../network/scene';
import {
  arc,
  ball,
  blocks,
  boxEdges,
  escort,
  fromPoints,
  gates,
  grid,
  shards,
  stream,
  type Vec3,
} from '../../../network/shapes';
import { UBTC_POINTS } from '../../../assets/ubtc-points';
import { during, since, type Journey, type Mark, type Stage } from '../journey';

/* ----------------------------------------------------------- the geography -- */

/** Where the vault stands: forward of everything else, and to the left. */
export const VAULT: Vec3 = [-46, 6, 26];
/** Where the checking happens. The scene is composed around it. */
export const CORE: Vec3 = [0, 0, 0];
/** Whoever the unit is sent to: far side, and a good way back. */
export const HOLDER: Vec3 = [44, -8, -34];
/** The spent-nullifier registry, above and behind. */
export const REGISTRY: Vec3 = [10, 27, -14];
/** The Bitcoin chain, running underneath all of it. */
export const CHAIN: Vec3 = [0, -29, 6];
/** Where the deposit comes in from, out beyond the vault. */
const OUTSIDE: Vec3 = [-112, -20, 54];
/**
 * And where the underlying bitcoin goes when it is redeemed.
 *
 * Out past the holder rather than back the way it came, because that is what
 * happens: redemption returns the bitcoin to whoever is holding the unit, and
 * they are on the other side of the network from the vault. It also means the
 * release crosses the whole scene, which is the one stage where something
 * ought to.
 */
const RETURN: Vec3 = [92, -20, -62];

const to = (from: Vec3, at: Vec3): Vec3 => [at[0] - from[0], at[1] - from[1], at[2] - from[2]];

/* -------------------------------------------------------------- the palette -- */

const GOLD: Vec3 = [1.0, 0.64, 0.2];
const MINT: Vec3 = [0.23, 0.9, 0.58];
const GLYPH: Vec3 = [0.88, 1.0, 0.95];
const VIOLET: Vec3 = [0.55, 0.45, 0.92];
const STEEL: Vec3 = [0.4, 0.42, 0.6];
const DARK: Vec3 = [0.24, 0.28, 0.44];

/* ----------------------------------------------------------------- the path -- */

/**
 * Vault, core, holder, core.
 *
 * Each leg bows rather than running straight: the instruction lifts as it
 * crosses to be checked, the unit swings wide and high on its way out to the
 * holder, and it comes back low and deep. Three legs, and the camera rides
 * beside all of them.
 */
const PATH: Vec3[] = [VAULT, CORE, HOLDER, CORE];
const BEND: Vec3[] = [
  [4, 10, 12],
  [2, 14, 4],
  [-6, -12, -12],
];

/** Where the unit is, in legs along that path. */
function travelAt(at: number): number {
  return since(at, 2.3, 0.65) + since(at, 3.3, 0.65) + since(at, 4.1, 0.6);
}

/* --------------------------------------------------------------- the figures -- */

const figures: Figure[] = [
  // The places, joined up. Dim, and present from the start: the network is
  // there before anything happens in it.
  {
    id: 'link-vault',
    at: VAULT,
    shape: arc(to(VAULT, CORE), 7),
    behaviour: Behaviour.Hold,
    tone: DARK,
    share: 0.022,
    soft: true,
  },
  {
    id: 'link-holder',
    at: CORE,
    shape: arc(to(CORE, HOLDER), 9),
    behaviour: Behaviour.Hold,
    tone: DARK,
    share: 0.022,
    soft: true,
  },
  {
    id: 'link-registry',
    at: CORE,
    shape: arc(to(CORE, REGISTRY), 3),
    behaviour: Behaviour.Hold,
    tone: DARK,
    share: 0.016,
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
    id: 'vault',
    at: VAULT,
    shape: boxEdges(9.5),
    behaviour: Behaviour.Assemble,
    tone: VIOLET,
    share: 0.14,
    scatter: 15,
  },
  {
    id: 'keys',
    at: VAULT,
    shape: shards(14),
    behaviour: Behaviour.Assemble,
    tone: STEEL,
    share: 0.05,
    scatter: 24,
    soft: true,
  },
  {
    id: 'deposit',
    at: VAULT,
    shape: stream(to(VAULT, OUTSIDE), 7),
    behaviour: Behaviour.Stream,
    tone: GOLD,
    share: 0.11,
  },
  {
    id: 'gates',
    at: CORE,
    shape: gates(3, 7, 3.8),
    behaviour: Behaviour.Spin,
    tone: VIOLET,
    share: 0.1,
    spin: 0.22,
  },
  {
    id: 'chain',
    at: CHAIN,
    shape: blocks(170, 20, 1.6),
    behaviour: Behaviour.Hold,
    tone: GOLD,
    share: 0.11,
    soft: true,
  },
  // The three OP_RETURN writes, each falling from where its instruction
  // happened to the block that carries it.
  {
    id: 'anchor-mint',
    at: [-14, CHAIN[1], CHAIN[2]],
    shape: ball(2.4),
    behaviour: Behaviour.Drop,
    tone: GOLD,
    share: 0.03,
    from: [-4, 2, 4],
  },
  {
    id: 'anchor-transfer',
    at: [10, CHAIN[1], CHAIN[2]],
    shape: ball(2.4),
    behaviour: Behaviour.Drop,
    tone: GOLD,
    share: 0.03,
    from: [22, -6, -18],
  },
  {
    id: 'anchor-redeem',
    at: [32, CHAIN[1], CHAIN[2]],
    shape: ball(2.4),
    behaviour: Behaviour.Drop,
    tone: GOLD,
    share: 0.03,
    from: [4, 2, -2],
  },
  {
    id: 'registry',
    at: REGISTRY,
    shape: grid(9, 5, 3.4),
    behaviour: Behaviour.Hold,
    tone: STEEL,
    share: 0.12,
    scatter: 20,
  },
  {
    id: 'holder',
    at: HOLDER,
    shape: ball(7),
    behaviour: Behaviour.Assemble,
    tone: VIOLET,
    share: 0.06,
    scatter: 18,
  },
  {
    id: 'release',
    at: RETURN,
    shape: stream(to(RETURN, VAULT), 8),
    behaviour: Behaviour.Stream,
    tone: GOLD,
    share: 0.07,
  },
  // What surrounds the unit while it moves: the instruction that carries it,
  // strung out behind it along the path it is taking.
  {
    id: 'escort',
    at: CORE,
    shape: escort(3.2, 0.22),
    behaviour: Behaviour.Escort,
    tone: MINT,
    share: 0.09,
    size: 0.9,
  },
  // And the unit itself.
  {
    id: 'mark',
    at: CORE,
    shape: fromPoints(UBTC_POINTS, [MINT, GLYPH], 1),
    behaviour: Behaviour.Mark,
    tone: MINT,
    share: 0.12,
    size: 1.1,
    scatter: 2.2,
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

  // How much collateral is sitting in the vault, and for how long.
  const held = since(at, 1.86, 0.3) * (1 - since(at, 4.72, 0.3));
  // A check running: at the mint, at the transfer, and at the redemption.
  const checking = Math.max(
    during(at, 2.42, 0.6),
    Math.max(during(at, 3.42, 0.6), during(at, 4.24, 0.6)),
  );
  const spent = since(at, 4.5, 0.28);

  const network = since(at, 0, 0.5);
  set('link-vault', network, 0.1);
  set('link-holder', network * since(at, 2.6, 0.8), 0.1);
  set('link-registry', network * since(at, 3.9, 0.8), 0.1);
  set('link-chain', network * since(at, 2.1, 0.8), 0.1);

  // Something is forming from the first notch: a visitor who arrives at an
  // empty scene has been asked to take it on trust that one is coming.
  set('vault', since(at, 0.02, 0.55), checking * 0.2, held);
  set('keys', since(at, 0, 0.32), during(at, 0.3, 0.9));
  // Slow enough that it is still on its way while the stage about it is being
  // read: a deposit that finished arriving during the previous stage leaves
  // this one looking at an empty corridor.
  set('deposit', since(at, 1.12, 0.86) * (1 - since(at, 4.66, 0.3)), held);
  set('gates', since(at, 1.8, 0.55), 0.2 + checking * 0.8);
  set('chain', since(at, 2.1, 0.8), 0.34);

  set('anchor-mint', since(at, 2.86, 0.32));
  set('anchor-transfer', since(at, 3.96, 0.32));
  set('anchor-redeem', since(at, 4.92, 0.32));

  set('registry', since(at, 4.0, 0.6), 0.3 + spent * 0.6, spent);
  set('holder', since(at, 3.1, 0.6), during(at, 3.8, 0.7));
  set('release', since(at, 4.72, 0.55));

  // The instruction leaves before the unit exists, and stops once the unit has
  // been redeemed: it is what carries it, not what it is.
  set('escort', since(at, 2.2, 0.3) * (1 - since(at, 4.72, 0.3)), 0.4 + checking * 0.6);
  // And the unit itself, issued at the far end of the first check.
  set('mark', since(at, 2.72, 0.34) * (1 - since(at, 4.62, 0.3)), checking);
}

/* ------------------------------------------------------------------ the stages -- */

const stages: Stage[] = [
  {
    id: 'vault',
    index: '01',
    nav: 'VAULT',
    title: 'A VAULT IS CREATED',
    body: 'Two post-quantum key pairs are generated and committed into a Taproot address. Nothing has been deposited yet — what exists is a place with conditions on it, and the conditions are the point.',
    beats: ['KEYS', 'COMMIT', 'ADDRESS'],
    says: [
      'Two independent post-quantum schemes, so one broken scheme does not break the vault.',
      'Their commitment is written into the spending conditions themselves.',
      'What comes back is an address. Anyone can pay it; only the conditions can spend it.',
    ],
    focus: VAULT,
    from: [-0.42, 0.3, 0.86],
    far: 72,
    near: 54,
    swing: 0.3,
    fov: 44,
    roll: -1.2,
    chase: 0,
    frame: 0.22,
  },
  {
    id: 'deposit',
    index: '02',
    nav: 'DEPOSIT',
    title: 'BITCOIN ARRIVES',
    body: 'A deposit is paid to the address and the network waits for Bitcoin to confirm it. Nothing is issued against a payment that has not settled on the chain it came from.',
    beats: ['PAID', 'SEEN', 'CONFIRMED'],
    says: [
      'The deposit is made to the vault address like any other Bitcoin payment.',
      'The network watches for it, on a node of its own and a public index as a fallback.',
      'Only once Bitcoin has confirmed it does the deposit count as collateral.',
    ],
    focus: [-56, 1, 30],
    from: [0.3, 0.24, 0.92],
    far: 82,
    near: 58,
    swing: -0.26,
    fov: 48,
    roll: 1.1,
    chase: 0,
    frame: 0.22,
  },
  {
    id: 'mint',
    index: '03',
    nav: 'MINT',
    title: 'THE UNIT IS ISSUED',
    body: 'The instruction to mint crosses the network to be checked against the collateral that is actually there, and only at the far end of that check does uBTC exist. The mint is anchored to Bitcoin with the QUANTUM prefix.',
    beats: ['INSTRUCT', 'VERIFY', 'ISSUE', 'ANCHOR'],
    says: [
      'A mint instruction leaves the vault, signed under both post-quantum schemes.',
      'The network checks the signatures, the collateral and the ratio — away from the settlement path.',
      'uBTC is issued against the deposit, one for one. This is the moment it exists.',
      'QUANTUM: and the hash of the mint go to Bitcoin in an OP_RETURN. Forty bytes, on the chain, readable by anyone.',
    ],
    focus: CORE,
    from: [-0.3, 0.22, 0.93],
    far: 64,
    near: 42,
    swing: 0.34,
    fov: 46,
    roll: -1.6,
    chase: 0.3,
    frame: 0.24,
  },
  {
    id: 'transfer',
    index: '04',
    nav: 'TRANSFER',
    title: 'IT MOVES',
    body: 'A transfer is an instruction like any other: signed, verified, and anchored. Nothing moves because a balance was edited — it moves because a proof was accepted.',
    beats: ['INSTRUCT', 'VERIFY', 'MOVE', 'ANCHOR'],
    says: [
      'The holder signs an instruction to move the unit.',
      'The same verification, and the same threshold of the network agreeing to it.',
      'The unit crosses the network and arrives with whoever it was sent to.',
      'QUANTUM: and the hash of the transfer are written to Bitcoin in their turn.',
    ],
    focus: [24, -5, -18],
    from: [-0.06, 0.3, 0.95],
    far: 54,
    near: 38,
    swing: 0.22,
    fov: 50,
    roll: 2,
    chase: 0.9,
    frame: 0.24,
  },
  {
    id: 'redeem',
    index: '05',
    nav: 'REDEEM',
    title: 'THE BITCOIN COMES BACK',
    body: 'Redemption is the one step that has to be impossible to do twice. The instruction is spent in the registry atomically, and only then is the underlying bitcoin released.',
    beats: ['INSTRUCT', 'SPEND', 'RELEASE', 'ANCHOR'],
    says: [
      'A redemption instruction, signed the same way as everything before it.',
      'The nullifier is marked spent in one atomic step — there is no window in which it is neither.',
      'The bitcoin leaves the vault and returns to its owner.',
      'The third anchor goes to Bitcoin, and the whole lifecycle is now on the chain.',
    ],
    focus: [16, -2, -12],
    from: [0.1, 0.28, 0.95],
    far: 108,
    near: 84,
    swing: -0.28,
    fov: 50,
    roll: -1,
    chase: 0.3,
    frame: 0.22,
  },
  {
    id: 'record',
    index: '06',
    nav: 'RECORD',
    title: 'WHAT IS LEFT BEHIND',
    body: 'Three anchors on Bitcoin, one spent nullifier, and a proof for every step. None of it depends on QuFi still being here to be checked.',
    beats: ['ANCHORS', 'REGISTRY', 'PROOF'],
    says: [
      'Mint, transfer and redeem, each forty bytes on the chain, each carrying the same prefix.',
      'The nullifier is spent and stays spent. The instruction cannot be replayed.',
      'And a record of each step that anyone can verify independently, afterwards.',
    ],
    focus: [4, -11, 0],
    from: [0.06, 0.3, 0.95],
    far: 136,
    near: 112,
    swing: 0.18,
    fov: 52,
    roll: 0,
    chase: 0,
    frame: 0.18,
  },
];

const marks: Mark[] = [
  { id: 'vault', text: 'The vault', at: VAULT, during: [0, 1, 2, 4], lift: 12, tone: '#8f7ce8', names: 'vault', x: 0, y: 0, on: 0 },
  { id: 'deposit', text: 'Bitcoin, arriving', at: [-70, -8, 38], during: [1], tone: '#ffb03a', names: 'deposit', x: 0, y: 0, on: 0 },
  { id: 'gates', text: 'Verification', at: CORE, during: [2, 3, 4], lift: 13, tone: '#8f7ce8', names: 'gates', x: 0, y: 0, on: 0 },
  { id: 'unit', text: 'uBTC', at: 'travel', during: [2, 3, 4], lift: 7, tone: '#3be08f', x: 0, y: 0, on: 0 },
  { id: 'holder', text: 'The holder', at: HOLDER, during: [3], lift: 10, tone: '#8f7ce8', names: 'holder', x: 0, y: 0, on: 0 },
  { id: 'chain', text: 'Bitcoin', at: CHAIN, during: [2, 3, 4, 5], lift: -6, tone: '#ffb03a', names: 'chain', x: 0, y: 0, on: 0 },
  { id: 'registry', text: 'Spent-nullifier registry', at: REGISTRY, during: [4, 5], lift: 10, tone: '#8f97c0', names: 'registry', x: 0, y: 0, on: 0 },
  { id: 'anchors', text: 'Three anchors', at: [10, CHAIN[1] + 7, CHAIN[2]], during: [5], tone: '#ffb03a', names: 'anchor-transfer', x: 0, y: 0, on: 0 },
];

export const UBTC_JOURNEY: Journey = {
  id: 'ubtc',
  nav: 'UBTC',
  tone: '#3BE08F',
  figures,
  stages,
  marks,
  path: PATH,
  bend: BEND,
  markScale: 5.4,
  budget: 0.68,
  traveller: 'mark',
  travelAt,
  score,
};
