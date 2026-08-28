/**
 * The life of one uBTC.
 *
 * The front of this site is a place with parts; this is a single thing
 * happening, in order, and the visitor travels alongside it. Same engine, same
 * network, same wheel — but the route follows the instruction rather than the
 * architecture, from the vault being created to the bitcoin coming back out.
 *
 * Every stage is something the running system actually does. The three anchors
 * are the three OP_RETURN writes; the registry mark is the spent nullifier; the
 * quorum step is the threshold that has to agree before any of it settles.
 *
 * Data only, and deliberately not a client module: the page that renders the
 * document underneath this journey is a server component, and a server
 * component importing from a `use client` file gets references rather than
 * values. The store that goes with this lives next door in `life.ts`.
 */

export interface Stage {
  id: string;
  index: string;
  /** The coordinate readout: UBTC / MINT. */
  nav: string;
  title: string;
  body: string;
  /** The three or four beats this stage moves through. */
  beats: string[];
  /** One line per beat, in order. */
  says: string[];
  /** Where the camera stands: a point to look at, and how far off it sits. */
  look: [number, number, number];
  out: [number, number, number];
  distance: number;
  fov: number;
  /**
   * How far the camera stands to the left of its subject, in world units.
   *
   * The camera standing left puts the subject right, and the words live on the
   * left — so this is what stops the thing being described from sitting
   * underneath the description of it. Ignored on a tall frame, where the words
   * are below rather than beside and the subject wants the middle.
   */
  side: number;
}

/* ------------------------------------------------------------ the geography -- */

/** Where the vault stands, where the network verifies, and who receives. */
export const VAULT: [number, number, number] = [-48, 5, 0];
export const HOLDER: [number, number, number] = [48, -5, 0];
/** The Bitcoin chain the anchors are written to, well below everything else. */
export const CHAIN_Y = -34;
/** The spent-nullifier registry. */
export const REGISTRY: [number, number, number] = [4, 27, -22];

export const STAGES: Stage[] = [
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
    look: VAULT,
    out: [-0.26, 0.28, 1],
    distance: 40,
    fov: 44,
    side: -26,
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
    look: [-40, -2, 4],
    out: [-0.14, 0.28, 1],
    distance: 54,
    fov: 46,
    side: -30,
  },
  {
    id: 'mint',
    index: '03',
    nav: 'MINT',
    title: 'THE UNIT IS ISSUED',
    body: 'The instruction to mint is signed, verified against the collateral that is actually there, and only then does uBTC exist. The mint is anchored to Bitcoin with the QUANTUM prefix.',
    beats: ['INSTRUCT', 'VERIFY', 'ISSUE', 'ANCHOR'],
    says: [
      'A mint instruction, signed under both post-quantum schemes.',
      'The network checks the signatures, the collateral and the ratio — away from the settlement path.',
      'uBTC is issued against the deposit, one for one.',
      'QUANTUM: and the hash of the mint go to Bitcoin in an OP_RETURN. Forty bytes, on the chain, readable by anyone.',
    ],
    look: [-4, -2, 0],
    out: [0.04, 0.22, 1],
    distance: 60,
    fov: 46,
    side: -40,
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
      'The unit arrives with whoever it was sent to.',
      'QUANTUM: and the hash of the transfer are written to Bitcoin in their turn.',
    ],
    look: [24, -4, 0],
    out: [0.24, 0.22, 1],
    distance: 62,
    fov: 46,
    side: -38,
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
    look: [2, 4, 0],
    out: [-0.04, 0.26, 1],
    distance: 74,
    fov: 48,
    side: -40,
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
    look: [10, -20, 0],
    out: [0.04, 0.26, 1],
    distance: 122,
    fov: 50,
    side: -44,
  },
];

export const STAGE_COUNT = STAGES.length;
