import {
  EdgeKind,
  NODE_TYPE_COUNT,
  NodeStatus,
  NodeType,
  Stratum,
  type NetworkEdge,
  type NetworkNode,
  type NetworkSnapshot,
} from './types';
import { createRng, fibonacciSphere, gaussian, range } from './rng';

export interface TopologyOptions {
  nodeCount: number;
  seed?: number;
}

/**
 * The volume is deliberately not a ball. Squashing one axis hard and stretching
 * another gives the network a silhouette with a readable orientation, so a
 * camera moving through it produces parallax instead of the flat rotation you
 * get from a sphere.
 */
const ANISOTROPY: [number, number, number] = [1.0, 0.44, 0.82];

/** Share of the population by class. Sums to 1. */
const MIX: Record<NodeType, number> = {
  [NodeType.Verifier]: 0.34,
  [NodeType.Registry]: 0.08,
  [NodeType.Anchor]: 0.05,
  [NodeType.Application]: 0.18,
  [NodeType.Builder]: 0.12,
  [NodeType.Institution]: 0.1,
  [NodeType.Research]: 0.07,
  [NodeType.Governance]: 0.06,
};

const STRATUM_OF: Record<NodeType, Stratum> = {
  [NodeType.Verifier]: Stratum.Consensus,
  [NodeType.Registry]: Stratum.Registry,
  [NodeType.Anchor]: Stratum.Anchor,
  [NodeType.Application]: Stratum.Application,
  [NodeType.Builder]: Stratum.Participant,
  [NodeType.Institution]: Stratum.Participant,
  [NodeType.Research]: Stratum.Participant,
  [NodeType.Governance]: Stratum.Participant,
};

const EDGE_STRENGTH: Record<EdgeKind, [number, number]> = {
  [EdgeKind.Quorum]: [0.72, 1.0],
  [EdgeKind.Trunk]: [0.85, 1.0],
  [EdgeKind.Replay]: [0.5, 0.78],
  [EdgeKind.Collateral]: [0.55, 0.85],
  [EdgeKind.Instruction]: [0.3, 0.62],
  [EdgeKind.Membership]: [0.14, 0.4],
};

type Vec3 = [number, number, number];

function squash(v: Vec3): Vec3 {
  return [v[0] * ANISOTROPY[0], v[1] * ANISOTROPY[1], v[2] * ANISOTROPY[2]];
}

function dist2(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

/** Ids of the `k` members of `pool` closest to `from`. */
function nearest(from: Vec3, pool: NetworkNode[], k: number, exclude = -1): number[] {
  const scored: Array<[number, number]> = [];
  for (let i = 0; i < pool.length; i++) {
    if (pool[i].id === exclude) continue;
    scored.push([dist2(from, pool[i].position), pool[i].id]);
  }
  scored.sort((a, b) => a[0] - b[0]);
  const out: number[] = [];
  for (let i = 0; i < Math.min(k, scored.length); i++) out.push(scored[i][1]);
  return out;
}

/**
 * Builds the network. Structure comes from the architecture, not from noise:
 * verifiers cluster into threshold quorums, registry guardians sit on an inner
 * band interleaved between them, anchors reach a long way out along the few
 * directions that stand for underlying chains, and everything else hangs off
 * the application it uses.
 */
export function buildTopology({ nodeCount, seed = 0x9f13 }: TopologyOptions): NetworkSnapshot {
  const rng = createRng(seed);
  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];

  // ---- population -------------------------------------------------------
  const counts = new Array<number>(NODE_TYPE_COUNT).fill(0);
  let assigned = 0;
  for (let t = 0; t < NODE_TYPE_COUNT - 1; t++) {
    counts[t] = Math.max(1, Math.round(nodeCount * MIX[t as NodeType]));
    assigned += counts[t];
  }
  counts[NODE_TYPE_COUNT - 1] = Math.max(1, nodeCount - assigned);

  // ---- quorums ----------------------------------------------------------
  // One nucleus quorum sits close to the origin so the opening seconds have a
  // legible first structure; the rest are pushed out onto a shell.
  const quorumCount = Math.max(5, Math.round(counts[NodeType.Verifier] / 30));
  const quorums: Vec3[] = [];
  for (let q = 0; q < quorumCount; q++) {
    const dir = fibonacciSphere(q, quorumCount);
    const radius = q === 0 ? range(rng, 2, 4) : range(rng, 17, 33);
    quorums.push(squash([dir[0] * radius, dir[1] * radius, dir[2] * radius]));
  }

  // A few fixed directions stand in for the underlying chains and custodians
  // the network anchors against.
  const anchorAxisCount = 5;
  const anchorAxes: Vec3[] = [];
  for (let i = 0; i < anchorAxisCount; i++) {
    anchorAxes.push(fibonacciSphere(i, anchorAxisCount));
  }

  const push = (type: NodeType, position: Vec3, quorum: number): NetworkNode => {
    const node: NetworkNode = {
      id: nodes.length,
      type,
      stratum: STRATUM_OF[type],
      position,
      status: NodeStatus.Dormant,
      activity: 0,
      entropy: rng() * 0.35,
      importance: 0,
      connections: [],
      signal: 0,
      rank: 0,
      quorum,
      seed: rng(),
    };
    nodes.push(node);
    return node;
  };

  // ---- verifiers: gaussian clusters around each quorum seed --------------
  const perQuorum = Math.floor(counts[NodeType.Verifier] / quorumCount);
  let verifiersPlaced = 0;
  for (let q = 0; q < quorumCount; q++) {
    const n = q === quorumCount - 1 ? counts[NodeType.Verifier] - verifiersPlaced : perQuorum;
    const spread = q === 0 ? 3.4 : range(rng, 4.0, 7.2);
    const c = quorums[q];
    for (let i = 0; i < n; i++) {
      push(
        NodeType.Verifier,
        [
          c[0] + gaussian(rng) * spread,
          c[1] + gaussian(rng) * spread * ANISOTROPY[1],
          c[2] + gaussian(rng) * spread * ANISOTROPY[2],
        ],
        q,
      );
    }
    verifiersPlaced += n;
  }
  // The origin node is the first thing the visitor ever sees.
  nodes[0].position = [0, 0, 0];
  nodes[0].quorum = 0;

  // ---- registry: an inner band, angularly offset from the quorums --------
  for (let i = 0; i < counts[NodeType.Registry]; i++) {
    const dir = fibonacciSphere(i, counts[NodeType.Registry]);
    const r = range(rng, 11.5, 15.5);
    // Rotating the band off the quorum directions keeps it readable as its own
    // structure instead of dissolving into the consensus cloud.
    const a = Math.atan2(dir[2], dir[0]) + 0.42;
    const xz = Math.hypot(dir[0], dir[2]);
    push(
      NodeType.Registry,
      squash([Math.cos(a) * xz * r, dir[1] * r * 0.7, Math.sin(a) * xz * r]),
      -1,
    );
  }

  // ---- anchors: long reaches along the chain axes ------------------------
  for (let i = 0; i < counts[NodeType.Anchor]; i++) {
    const axis = anchorAxes[i % anchorAxisCount];
    const r = range(rng, 44, 62);
    push(
      NodeType.Anchor,
      squash([
        axis[0] * r + gaussian(rng) * 4.5,
        axis[1] * r + gaussian(rng) * 4.5,
        axis[2] * r + gaussian(rng) * 4.5,
      ]),
      -1,
    );
  }

  // ---- applications: outside consensus, aimed at a quorum ----------------
  const appIds: number[] = [];
  for (let i = 0; i < counts[NodeType.Application]; i++) {
    const q = 1 + Math.floor(rng() * Math.max(1, quorumCount - 1));
    const c = quorums[q % quorumCount];
    const out = range(rng, 1.35, 1.85);
    const node = push(
      NodeType.Application,
      [
        c[0] * out + gaussian(rng) * 6,
        c[1] * out + gaussian(rng) * 3,
        c[2] * out + gaussian(rng) * 6,
      ],
      q % quorumCount,
    );
    appIds.push(node.id);
  }

  // ---- participants: outermost, gathered near the applications -----------
  const participantTypes = [
    NodeType.Builder,
    NodeType.Institution,
    NodeType.Research,
    NodeType.Governance,
  ];
  for (const type of participantTypes) {
    for (let i = 0; i < counts[type]; i++) {
      const host = nodes[appIds[Math.floor(rng() * appIds.length)]];
      const p = host.position;
      const out = range(rng, 1.12, 1.5);
      push(
        type,
        [
          p[0] * out + gaussian(rng) * 9,
          p[1] * out + gaussian(rng) * 4.5,
          p[2] * out + gaussian(rng) * 9,
        ],
        host.quorum,
      );
    }
  }

  // ---- relationships ----------------------------------------------------
  const byType = (t: NodeType) => nodes.filter((n) => n.type === t);
  const verifiers = byType(NodeType.Verifier);
  const registries = byType(NodeType.Registry);
  const anchors = byType(NodeType.Anchor);
  const applications = byType(NodeType.Application);

  const seen = new Set<number>();
  const link = (source: number, target: number, kind: EdgeKind) => {
    if (source === target) return;
    const a = Math.min(source, target);
    const b = Math.max(source, target);
    const key = a * 100000 + b;
    if (seen.has(key)) return;
    seen.add(key);
    const [lo, hi] = EDGE_STRENGTH[kind];
    const edge: NetworkEdge = {
      id: edges.length,
      source,
      target,
      kind,
      strength: range(rng, lo, hi),
      state: 0,
      signal: -1,
      rank: 0,
      length: Math.sqrt(dist2(nodes[source].position, nodes[target].position)),
    };
    edges.push(edge);
    nodes[source].connections.push(edge.id);
    nodes[target].connections.push(edge.id);
  };

  // Inside a quorum every verifier holds a share of the same threshold
  // signature, so they are densely tied to their immediate neighbours.
  for (let q = 0; q < quorumCount; q++) {
    const members = verifiers.filter((n) => n.quorum === q);
    for (const m of members) {
      for (const other of nearest(m.position, members, 3, m.id)) {
        link(m.id, other, EdgeKind.Quorum);
      }
    }
  }

  // Quorum to quorum: the consensus backbone. Long, strong, few.
  for (let q = 0; q < quorumCount; q++) {
    const order = quorums
      .map((c, i) => [dist2(quorums[q], c), i] as [number, number])
      .filter(([, i]) => i !== q)
      .sort((a, b) => a[0] - b[0]);
    for (let k = 0; k < Math.min(2, order.length); k++) {
      const target = order[k][1];
      const a = verifiers.filter((n) => n.quorum === q);
      const b = verifiers.filter((n) => n.quorum === target);
      if (!a.length || !b.length) continue;
      link(a[Math.floor(rng() * a.length)].id, b[Math.floor(rng() * b.length)].id, EdgeKind.Trunk);
    }
  }

  // Every verifier has to reach the spent-nullifier registry to check replay.
  for (const r of registries) {
    for (const v of nearest(r.position, verifiers, 4)) link(r.id, v, EdgeKind.Replay);
  }

  // Anchors report collateral to the verifiers nearest them.
  for (const a of anchors) {
    for (const v of nearest(a.position, verifiers, 3)) link(a.id, v, EdgeKind.Collateral);
  }

  // An application submits its instructions to a quorum.
  for (const app of applications) {
    const pool = verifiers.filter((v) => v.quorum === app.quorum);
    for (const v of nearest(app.position, pool.length >= 3 ? pool : verifiers, 3)) {
      link(app.id, v, EdgeKind.Instruction);
    }
  }

  // Participants attach to what they use or build.
  for (const n of nodes) {
    if (n.stratum !== Stratum.Participant) continue;
    const k = rng() < 0.4 ? 2 : 1;
    for (const app of nearest(n.position, applications, k)) {
      link(n.id, app, EdgeKind.Membership);
    }
  }

  // ---- derived properties -----------------------------------------------
  let maxDegree = 1;
  for (const n of nodes) maxDegree = Math.max(maxDegree, n.connections.length);
  for (const n of nodes) {
    n.importance = Math.pow(n.connections.length / maxDegree, 0.65);
    n.status = n.connections.length > 0 ? NodeStatus.Online : NodeStatus.Dormant;
  }
  // The origin node reads as the network's first participant, so it carries
  // full weight regardless of how many neighbours it happened to acquire.
  nodes[0].importance = 1;

  // ---- emergence order --------------------------------------------------
  // Inner nodes first, with enough jitter that the reveal never reads as a
  // clean expanding shell.
  const ranked = nodes
    .map((n) => {
      const p = n.position;
      const r = Math.hypot(p[0] / ANISOTROPY[0], p[1] / ANISOTROPY[1], p[2] / ANISOTROPY[2]);
      return [n.id === 0 ? -1 : r * range(rng, 0.9, 1.12), n.id] as [number, number];
    })
    .sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < ranked.length; i++) {
    nodes[ranked[i][1]].rank = i;
  }
  // A relationship cannot exist before both of its participants do.
  for (const e of edges) {
    e.rank = Math.max(nodes[e.source].rank, nodes[e.target].rank) + 0.5;
  }

  let extent = 0;
  for (const n of nodes) {
    extent = Math.max(extent, Math.hypot(n.position[0], n.position[1], n.position[2]));
  }

  return { nodes, edges, quorumCount, extent };
}
