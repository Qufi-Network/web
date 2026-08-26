'use client';

/**
 * The network map.
 *
 * QUFI is not a page with sections. It is one environment with places in it,
 * and this file is the map: where each place stands in the volume, what shape
 * it takes, what colour it burns, and the very few words it is allowed to say
 * when the visitor arrives.
 *
 * Nothing here is a menu item. A space has a position in world space before it
 * has a label, which is what makes navigation a movement rather than a click.
 *
 * Copy discipline: everything below describes what QUFI does — verification
 * ahead of settlement, post-quantum signing, proof generation off the
 * settlement path, collateral confirmation, proof-gated movement, recovery
 * pathways, multiple settlement environments. There is no commercial or
 * investor material in this experience; the source one-pager was used for the
 * technology and the visual language only.
 */

/** The kind of structure a space is made of. Drives the vertex shader branch. */
export enum StructureKind {
  /** The Core. Drawn by its own system, not by the structure field. */
  Core = 0,
  /** A crystalline signature that continuously assembles and disassembles. */
  Signature = 1,
  /** A lattice that builds itself from a computational field and emits a proof. */
  Lattice = 2,
  /** Objects orbiting a centre, held in a verification field before release. */
  Orbit = 3,
  /** Rings that align to open a pathway, and separate again. */
  Gate = 4,
  /** A branching route that fails, reorganises, and continues. */
  Branch = 5,
  /** Several settlement topologies over one verification plane. */
  Constellation = 6,
  /** Three streams of high-value flow. */
  Streams = 7,
}

export interface SpaceView {
  /**
   * How far out along the space's own axis the camera stands, in structure
   * radii.
   *
   * Derived from what the structure measures rather than chosen by eye: local
   * extents run from a two-thirds-radius lattice to a one-and-a-half-radius
   * field, so a distance that frames one of them puts the camera inside
   * another. `tools/census.mjs` prints the extents these were set from.
   */
  out: number;
  /** Lift above the structure, in structure radii. */
  up: number;
  /**
   * Lateral offset, in structure radii.
   *
   * The camera stands to one side, which puts the structure on the other: this
   * is positive, so the structure sits right of centre and the words that
   * describe it have the left of the frame to themselves.
   */
  side: number;
  fov: number;
}

export interface Space {
  id: string;
  /** Two-digit index, as it appears on the coordinate readout. */
  index: string;
  /** The coordinate this space reports: NETWORK / <nav>. */
  nav: string;
  kind: StructureKind;
  /** Centre of the structure in world space. */
  anchor: [number, number, number];
  /** Radius of the structure in world units. */
  radius: number;
  /** The colour this space burns, linear-ish RGB in 0..1. */
  colour: [number, number, number];
  /**
   * A short clause above the headline, for the one space whose statement is
   * two sentences. Set small; the headline carries the claim.
   */
  lead?: string;
  /** Headline shown on arrival. */
  title: string;
  /** The one thing this space says. */
  body: string;
  /** The movement this space performs, as three or four beats. */
  sequence?: string[];
  /**
   * What becomes visible once the visitor is inside and travelling through the
   * structure. One line per stage of the internal sequence, in order.
   */
  stages?: string[];
  view: SpaceView;
  /** How many points the structure is worth, as a share of the field budget. */
  weight: number;
}

/**
 * The spaces, in the order the network presents them.
 *
 * Positions are art direction, not arithmetic: they are spread around the Core
 * at varying radius and height so that the global view has depth rather than a
 * flat ring, and so no two structures ever overlap from a camera looking at the
 * origin.
 */
export const SPACES: Space[] = [
  {
    id: 'core',
    index: '01',
    nav: 'CORE',
    kind: StructureKind.Core,
    anchor: [0, 0, 0],
    radius: 8.6,
    colour: [0.16, 0.74, 1.0],
    title: 'THE VERIFICATION LAYER',
    body: 'QuFi sits beneath high-value digital settlement, providing an independent verification layer between action and settlement.',
    sequence: ['INSTRUCT', 'VERIFY', 'SETTLE'],
    stages: [
      'An instruction is defined — a transfer, a mint, an approval, a redemption.',
      'The network checks it independently, away from the settlement path.',
      'The settlement environment receives a verified result and settles it.',
    ],
    view: { out: 3.1, up: 0.42, side: 0.72, fov: 40 },
    weight: 0,
  },
  {
    id: 'signing',
    index: '02',
    nav: 'POST-QUANTUM',
    kind: StructureKind.Signature,
    anchor: [37.2, 22, 33.5],
    radius: 10.4,
    colour: [0.46, 0.44, 1.0],
    title: 'POST-QUANTUM SIGNING',
    body: 'QuFi enables verification designed for a world where today’s cryptographic assumptions can no longer be taken for granted.',
    sequence: ['SIGN', 'VERIFY', 'PROVE'],
    stages: [
      'A signature is assembled from a structure no classical shortcut resolves.',
      'The network verifies it against the scheme it was built under.',
      'What travels onward is the proof that verification happened.',
    ],
    view: { out: 3.3, up: 0.4, side: 0.78, fov: 42 },
    weight: 1.15,
  },
  {
    id: 'proof',
    index: '03',
    nav: 'PROOF',
    kind: StructureKind.Lattice,
    anchor: [43.7, -20, -14.2],
    radius: 10.0,
    colour: [0.19, 0.88, 0.55],
    title: 'PROOF',
    body: 'QuFi moves computationally intensive verification away from the settlement path and returns a compact proof.',
    sequence: ['ACTION', 'COMPUTATION', 'PROOF', 'SETTLEMENT'],
    stages: [
      'An action arrives and the field takes it up.',
      'The expensive work happens here, inside the network.',
      'It contracts to one compact object.',
      'Settlement receives the result, not the work.',
    ],
    view: { out: 3.6, up: 0.32, side: 0.74, fov: 42 },
    weight: 1.25,
  },
  {
    id: 'collateral',
    index: '04',
    nav: 'COLLATERAL',
    kind: StructureKind.Orbit,
    anchor: [16.1, 16, -49.5],
    radius: 10.8,
    colour: [1.0, 0.68, 0.22],
    title: 'COLLATERAL CONFIRMATION',
    body: 'Assets can be verified before they move.',
    sequence: ['VERIFY', 'AUTHORISE', 'MOVE'],
    stages: [
      'An asset approaches and is held, not passed.',
      'The field confirms the asset genuinely exists.',
      'Only then does the pathway open.',
    ],
    view: { out: 3.5, up: 0.46, side: 0.7, fov: 44 },
    weight: 1.05,
  },
  {
    id: 'movement',
    index: '05',
    nav: 'MOVEMENT',
    kind: StructureKind.Gate,
    anchor: [-22.1, -24, -41.5],
    radius: 11.4,
    colour: [0.68, 0.36, 1.0],
    title: 'PROOF-GATED MOVEMENT',
    body: 'Movement becomes conditional on verified proof.',
    sequence: ['APPROACH', 'ALIGN', 'PASS'],
    stages: [
      'Value arrives at the gateway and waits.',
      'The rings align only on a valid proof.',
      'What is verified passes. What is not, does not.',
    ],
    view: { out: 3.5, up: 0.2, side: 0.72, fov: 44 },
    weight: 1.1,
  },
  {
    id: 'recovery',
    index: '06',
    nav: 'RECOVERY',
    kind: StructureKind.Branch,
    anchor: [-51.4, 10, -16.7],
    radius: 11.0,
    colour: [0.2, 0.82, 0.92],
    title: 'RECOVERY',
    body: 'Recovery pathways allow verified processes to continue when a route, environment or connection changes.',
    sequence: ['ROUTE', 'BREAK', 'REFORM', 'CONTINUE'],
    stages: [
      'A verified process is travelling its route.',
      'The route is lost.',
      'The network detects the break and reorganises.',
      'The process continues on the pathway that formed.',
    ],
    view: { out: 3.5, up: 0.42, side: 0.74, fov: 43 },
    weight: 1.0,
  },
  {
    id: 'networks',
    index: '07',
    nav: 'MULTI-NETWORK',
    kind: StructureKind.Constellation,
    anchor: [-52.1, -14, 25.4],
    radius: 13.6,
    colour: [0.28, 0.6, 1.0],
    lead: 'One verification layer.',
    title: 'MULTI-SETTLEMENT',
    body: 'QuFi is designed to operate beneath multiple settlement environments rather than replacing them.',
    sequence: ['ENVIRONMENTS', 'VERIFICATION', 'SETTLEMENT'],
    stages: [
      'Settlement environments, each with its own architecture.',
      'One verification layer running beneath all of them.',
      'Each environment settles what the layer has verified.',
    ],
    view: { out: 3.4, up: -0.24, side: 0.66, fov: 46 },
    weight: 1.35,
  },
  {
    id: 'flows',
    index: '08',
    nav: 'FLOWS',
    kind: StructureKind.Streams,
    anchor: [-16.8, 26, 46.0],
    radius: 12.4,
    colour: [0.9, 0.72, 0.3],
    title: 'HIGH-VALUE FLOWS',
    body: 'Three kinds of value move through the network, and each has its own shape.',
    sequence: ['DIGITAL ASSETS', 'MONEY', 'TRADE FINANCE'],
    stages: [
      'DIGITAL ASSETS — tokenised value, digital assets and high-value settlement.',
      'MONEY — stablecoins, deposits and cross-border settlement.',
      'TRADE FINANCE — invoices, receivables and other high-value financial flows.',
    ],
    view: { out: 3.4, up: 0.34, side: 0.7, fov: 45 },
    weight: 1.3,
  },
];

export const SPACE_COUNT = SPACES.length;

/**
 * The architecture, as relationships.
 *
 * Read in the global view this is the whole claim of the site: the spaces are
 * not a collection of products, they are one connected thing. Recovery is
 * deliberately joined to more of the network than anything else, because that
 * is what recovery is.
 */
export const SPINES: Array<[number, number]> = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 6],
  [0, 7],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 6],
  [6, 7],
  [5, 0],
  [5, 1],
  [5, 3],
  [5, 4],
  [5, 6],
];

/** Index of a space by id, or -1. */
export function spaceIndex(id: string): number {
  return SPACES.findIndex((space) => space.id === id);
}

/**
 * The closing statement.
 *
 * Reached by travelling into the Core rather than by scrolling to the bottom of
 * anything — the centre of the network is where the network explains itself.
 */
export const CENTRE = {
  mark: 'QUFI',
  title: 'THE VERIFICATION LAYER',
  statement: 'VERIFY BEFORE VALUE MOVES.',
  body: 'An independent verification layer designed for the post-quantum economy.',
};
