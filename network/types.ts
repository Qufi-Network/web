/**
 * QUFI Network — data model.
 *
 * The visual layer never invents geometry of its own: it renders whatever this
 * model describes. That constraint is the point. Today the model is filled by
 * `simulate()`; later it can be filled by a QUFI node feed without the renderer
 * knowing the difference.
 */

/**
 * Strata of the network, ordered from consensus outwards. A node's stratum
 * determines where it sits in space — distance from the centre is distance from
 * consensus — and which other strata it is permitted to connect to.
 */
export const enum Stratum {
  Consensus = 0,
  Registry = 1,
  Anchor = 2,
  Application = 3,
  Participant = 4,
}

/**
 * Participant classes. These map to what actually exists in the QUFI
 * architecture rather than to a generic "blockchain node" taxonomy.
 */
export const enum NodeType {
  /** Independent node that checks signatures and holds one share of a threshold signature. */
  Verifier = 0,
  /** Guardian of the spent-nullifier registry — the replay check. */
  Registry = 1,
  /** Confirms collateral on an underlying chain or with a custodian. */
  Anchor = 2,
  /** Something built on the network: a unit of value, an instrument, a corridor. */
  Application = 3,
  /** Teams building against the SDKs. */
  Builder = 4,
  /** Banks, funds, corporates consuming the network. */
  Institution = 5,
  /** Cryptographic and network research. */
  Research = 6,
  /** Parameter and policy decisions. */
  Governance = 7,
}

export const NODE_TYPE_COUNT = 8;

/** Operational condition of a node. Drives colour temperature, not shape. */
export const enum NodeStatus {
  Dormant = 0,
  Online = 1,
  Verifying = 2,
  Degraded = 3,
}

/** What a relationship between two participants actually is. */
export const enum EdgeKind {
  /** Verifier to verifier inside one threshold quorum. */
  Quorum = 0,
  /** Quorum to quorum — the consensus backbone. */
  Trunk = 1,
  /** Verifier to registry — the replay check. */
  Replay = 2,
  /** Verifier to anchor — the collateral confirmation. */
  Collateral = 3,
  /** Application to the verifiers that approve its instructions. */
  Instruction = 4,
  /** Participant to the application it uses or builds. */
  Membership = 5,
}

export interface NetworkNode {
  id: number;
  type: NodeType;
  stratum: Stratum;
  /** Static world position. Drift is applied in the vertex shader, not here. */
  position: [number, number, number];
  status: NodeStatus;
  /** 0..1 — how much verification work this node is doing right now. */
  activity: number;
  /**
   * 0..1 — disorder in this node's local view. High entropy means the node is
   * seeing instructions it has not yet reconciled. Purely a simulated quantity.
   */
  entropy: number;
  /** 0..1 — degree centrality, normalised. Drives size and draw priority. */
  importance: number;
  /** Edge indices incident to this node. */
  connections: number[];
  /** 0..1 — signal energy currently at this node, decays every tick. */
  signal: number;
  /**
   * Emergence rank, 0..nodeCount-1. Lower appears first, fixed at build time.
   * Kept as a rank rather than a 0..1 fraction so the reveal reads identically
   * at every quality tier: "the first twenty-four nodes" means the same thing
   * whether the network has five hundred participants or two thousand.
   */
  rank: number;
  /** Which threshold quorum this node belongs to, or -1. */
  quorum: number;
  /** Per-node random constant, so shaders can de-synchronise motion. */
  seed: number;
}

export interface NetworkEdge {
  id: number;
  source: number;
  target: number;
  kind: EdgeKind;
  /** 0..1 — how much this relationship is relied upon. Drives opacity. */
  strength: number;
  /** 0..1 — sustained traffic on this edge, decays every tick. */
  state: number;
  /** Head position of a signal travelling this edge, or -1 for none. */
  signal: number;
  /** Emergence rank, in the same units as `NetworkNode.rank`. */
  rank: number;
  /** Cached world length, used for signal travel time. */
  length: number;
}

/** One instruction moving through the network along real edges. */
export interface Signal {
  id: number;
  /** Node ids, in order. Produced by a route search over real edges. */
  path: number[];
  /** Edge ids, parallel to `path`; `edges[i]` joins `path[i]` to `path[i+1]`. */
  edges: number[];
  /** Index of the hop currently being traversed. */
  hop: number;
  /** 0..1 progress along the current hop. */
  progress: number;
  /** World units per second. */
  speed: number;
  intensity: number;
  kind: SignalKind;
}

export const enum SignalKind {
  /** Application asking for a mint, transfer, approval or redemption. */
  Instruct = 0,
  /** Quorum agreeing, then co-signing. */
  Verify = 1,
  /** Result written back and the nullifier marked spent. */
  Settle = 2,
}

export interface NetworkSnapshot {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  quorumCount: number;
  /** World-space radius that contains every node. */
  extent: number;
}
