import { buildTopology } from './topology';
import { SpatialHash } from './spatialHash';
import {
  EdgeKind,
  NodeStatus,
  NodeType,
  SignalKind,
  Stratum,
  type NetworkSnapshot,
  type Signal,
} from './types';

export interface EngineOptions {
  nodeCount: number;
  maxSignals: number;
  seed?: number;
}

/**
 * Runtime simulation over a fixed topology.
 *
 * The renderer owns no state of its own. Everything it draws is read out of the
 * three buffers this class maintains, which are uploaded as data textures each
 * frame. Swapping simulated traffic for a live QUFI feed means writing different
 * numbers into `nodeState` and `edgeState` — nothing in the shaders changes.
 *
 * Buffer layouts, all RGBA:
 *   nodeStatic  x, y, z, seed                       (uploaded once)
 *   nodeState   activity, focus, pulse, status
 *   edgeState   signalHead, signalIntensity, traffic, signalKind
 */
export class NetworkEngine {
  readonly snapshot: NetworkSnapshot;
  readonly nodeCount: number;
  readonly edgeCount: number;

  /** Square texture dimensions, so shaders can index by id. */
  readonly nodeTexSize: number;
  readonly edgeTexSize: number;

  readonly nodeStatic: Float32Array;
  readonly nodeState: Float32Array;
  readonly edgeState: Float32Array;

  /** Flat xyz copy of node positions, for the spatial index. */
  private readonly flatPositions: Float32Array;
  private readonly index: SpatialHash;

  private readonly signals: Signal[] = [];
  private readonly maxSignals: number;
  private nextSignalId = 0;
  private spawnAccumulator = 0;
  private tour: { path: number[]; edges: number[] } | null = null;
  private rngState = 0x2f6e2b1;

  /** Emergence rank reached so far. Nothing ranked above this is live. */
  revealLevel = 0;
  /** 0..1 — scales how much traffic the network is carrying. */
  intensity = 0;
  /** Node the pointer is currently closest to, or -1. */
  focusNode = -1;

  constructor({ nodeCount, maxSignals, seed }: EngineOptions) {
    this.snapshot = buildTopology({ nodeCount, seed });
    this.nodeCount = this.snapshot.nodes.length;
    this.edgeCount = this.snapshot.edges.length;
    this.maxSignals = maxSignals;

    this.nodeTexSize = Math.ceil(Math.sqrt(this.nodeCount));
    this.edgeTexSize = Math.ceil(Math.sqrt(this.edgeCount));

    this.nodeStatic = new Float32Array(this.nodeTexSize * this.nodeTexSize * 4);
    this.nodeState = new Float32Array(this.nodeTexSize * this.nodeTexSize * 4);
    this.edgeState = new Float32Array(this.edgeTexSize * this.edgeTexSize * 4);
    this.flatPositions = new Float32Array(this.nodeCount * 3);

    for (const node of this.snapshot.nodes) {
      const i = node.id * 4;
      this.nodeStatic[i] = node.position[0];
      this.nodeStatic[i + 1] = node.position[1];
      this.nodeStatic[i + 2] = node.position[2];
      this.nodeStatic[i + 3] = node.seed;
      this.flatPositions[node.id * 3] = node.position[0];
      this.flatPositions[node.id * 3 + 1] = node.position[1];
      this.flatPositions[node.id * 3 + 2] = node.position[2];
      this.nodeState[i + 3] = node.status === NodeStatus.Online ? 1 : 0;
    }
    for (let e = 0; e < this.edgeCount; e++) this.edgeState[e * 4] = -1;

    this.index = new SpatialHash(this.flatPositions, 8);
  }

  private random(): number {
    this.rngState = (this.rngState + 0x6d2b79f5) >>> 0;
    let t = this.rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  private isLive(id: number): boolean {
    return this.snapshot.nodes[id].rank <= this.revealLevel;
  }

  /**
   * Walks the graph one hop at a time, preferring neighbours that move toward
   * (or away from) consensus. Routes are real paths over real edges, not
   * decorative blinking, which is what lets an instruction read as an
   * instruction: it always arrives somewhere that could actually approve it.
   */
  private route(startId: number, inward: boolean, maxHops: number) {
    const path = [startId];
    const edgeIds: number[] = [];
    let current = startId;
    let previous = -1;

    for (let hop = 0; hop < maxHops; hop++) {
      const node = this.snapshot.nodes[current];
      if (inward && node.stratum === Stratum.Consensus && hop > 0) break;
      if (!inward && node.stratum >= Stratum.Application && hop > 0) break;

      let bestEdge = -1;
      let bestNext = -1;
      let bestScore = -Infinity;
      for (const edgeId of node.connections) {
        const edge = this.snapshot.edges[edgeId];
        const next = edge.source === current ? edge.target : edge.source;
        if (next === previous || !this.isLive(next)) continue;
        const candidate = this.snapshot.nodes[next];
        const delta = candidate.stratum - node.stratum;
        // Moving one stratum in the intended direction is worth far more than
        // any distance gain, so signals do not wander sideways forever.
        const score =
          (inward ? -delta : delta) * 2 + edge.strength * 0.5 + this.random() * 0.35;
        if (score > bestScore) {
          bestScore = score;
          bestEdge = edgeId;
          bestNext = next;
        }
      }
      if (bestEdge < 0) break;
      previous = current;
      current = bestNext;
      path.push(current);
      edgeIds.push(bestEdge);
    }
    return { path, edges: edgeIds };
  }

  private emit(startId: number, kind: SignalKind, inward: boolean, maxHops: number, speed: number) {
    if (this.signals.length >= this.maxSignals) return;
    const { path, edges } = this.route(startId, inward, maxHops);
    if (edges.length === 0) return;
    this.signals.push({
      id: this.nextSignalId++,
      path,
      edges,
      hop: 0,
      progress: 0,
      speed,
      intensity: kind === SignalKind.Verify ? 1 : 0.78,
      kind,
    });
  }

  /**
   * Starts one instruction from a live application or participant. The rest of
   * the lifecycle — quorum agreement, the replay check, settlement travelling
   * back out — is triggered as the signal arrives.
   */
  private spawnInstruction() {
    const nodes = this.snapshot.nodes;
    for (let attempt = 0; attempt < 12; attempt++) {
      const candidate = nodes[Math.floor(this.random() * this.nodeCount)];
      if (!this.isLive(candidate.id)) continue;
      if (candidate.stratum < Stratum.Application) continue;
      if (candidate.connections.length === 0) continue;
      this.emit(candidate.id, SignalKind.Instruct, true, 6, 30);
      return;
    }
  }

  /** A quorum agreeing: short bursts across quorum edges, plus the replay check. */
  private spawnAgreement(verifierId: number) {
    const node = this.snapshot.nodes[verifierId];
    let quorumHops = 0;
    let replayDone = false;
    for (const edgeId of node.connections) {
      const edge = this.snapshot.edges[edgeId];
      const other = edge.source === verifierId ? edge.target : edge.source;
      if (!this.isLive(other)) continue;
      if (edge.kind === EdgeKind.Quorum && quorumHops < 3) {
        quorumHops++;
        this.emit(other, SignalKind.Verify, false, 1, 56);
      } else if (edge.kind === EdgeKind.Replay && !replayDone) {
        replayDone = true;
        this.emit(other, SignalKind.Verify, false, 1, 56);
      }
    }
  }

  /** Advances the simulation. `dt` is seconds, clamped by the caller. */
  tick(dt: number) {
    const { nodes, edges } = this.snapshot;

    // Decay. Activity and traffic are memories of recent work, not levels.
    const nodeDecay = Math.exp(-dt * 1.7);
    const pulseDecay = Math.exp(-dt * 3.4);
    for (let i = 0; i < this.nodeCount; i++) {
      const o = i * 4;
      this.nodeState[o] *= nodeDecay;
      this.nodeState[o + 2] *= pulseDecay;
    }
    const edgeDecay = Math.exp(-dt * 2.2);
    for (let e = 0; e < this.edgeCount; e++) {
      const o = e * 4;
      this.edgeState[o] = -1;
      this.edgeState[o + 1] = 0;
      this.edgeState[o + 2] *= edgeDecay;
    }

    // New traffic. Rate rises with intensity; the network is quiet at first.
    if (this.intensity > 0) {
      this.spawnAccumulator += dt * this.intensity * 14;
      while (this.spawnAccumulator >= 1) {
        this.spawnAccumulator -= 1;
        this.spawnInstruction();
      }
    }

    // Advance every live signal along its route.
    for (let s = this.signals.length - 1; s >= 0; s--) {
      const signal = this.signals[s];
      const edge = edges[signal.edges[signal.hop]];
      const length = Math.max(0.5, edge.length);
      signal.progress += (signal.speed * dt) / length;

      while (signal.progress >= 1) {
        signal.progress -= 1;
        const arrivedAt = signal.path[signal.hop + 1];
        const arrived = nodes[arrivedAt];
        const o = arrivedAt * 4;
        this.nodeState[o] = Math.min(1, this.nodeState[o] + 0.55);
        this.nodeState[o + 2] = 1;
        arrived.activity = this.nodeState[o];
        signal.hop++;

        if (signal.hop >= signal.edges.length) {
          // End of the route. What happens next depends on what this was.
          if (signal.kind === SignalKind.Instruct && arrived.stratum === Stratum.Consensus) {
            this.spawnAgreement(arrivedAt);
            this.emit(arrivedAt, SignalKind.Settle, false, 6, 38);
          }
          this.signals.splice(s, 1);
          break;
        }
      }

      if (signal.hop < signal.edges.length) {
        const active = edges[signal.edges[signal.hop]];
        const o = active.id * 4;
        // A node earlier in the route is a lower id in `path`; the head runs
        // from source to target only if the edge is stored that way round.
        const forward = active.source === signal.path[signal.hop];
        this.edgeState[o] = forward ? signal.progress : 1 - signal.progress;
        this.edgeState[o + 1] = Math.max(this.edgeState[o + 1], signal.intensity);
        this.edgeState[o + 2] = Math.min(1, this.edgeState[o + 2] + dt * 5);
        // How far along its route this instruction has come. The renderer
        // colours the pulse from it, so a transaction visibly progresses as it
        // crosses the network rather than being one moving dot throughout.
        this.edgeState[o + 3] = signal.hop / Math.max(1, signal.edges.length - 1);
        active.signal = signal.progress;
        active.state = this.edgeState[o + 2];
      }
    }

    // Focus decays on every node; the one under the pointer is topped back up.
    const focusDecay = Math.exp(-dt * 5);
    for (let i = 0; i < this.nodeCount; i++) this.nodeState[i * 4 + 1] *= focusDecay;
    if (this.focusNode >= 0) {
      const o = this.focusNode * 4;
      this.nodeState[o + 1] = Math.min(1, this.nodeState[o + 1] + dt * 9);
    }
  }

  /**
   * Points the pointer at the network. Returns the id of the node it settled
   * on, which is what the discovery mechanic will later hang off.
   */
  setPointer(x: number, y: number, z: number, radius: number): number {
    const hit = this.index.nearest(x, y, z, radius, (id) => this.isLive(id));
    this.focusNode = hit;
    return hit;
  }

  clearPointer() {
    this.focusNode = -1;
  }

  /**
   * Sends an instruction from wherever the visitor just touched. This is the
   * network answering back, and it is the whole reason the interaction reads as
   * a system rather than as a hover effect.
   */
  disturb(nodeId: number) {
    if (nodeId < 0 || !this.isLive(nodeId)) return;
    const node = this.snapshot.nodes[nodeId];
    const o = nodeId * 4;
    this.nodeState[o] = 1;
    this.nodeState[o + 2] = 1;
    this.emit(nodeId, SignalKind.Instruct, node.stratum > Stratum.Consensus, 5, 46);
  }

  /**
   * A fixed route from the edge of the network to consensus and back.
   *
   * Discovery four hands the scrollbar to a single instruction and lets the
   * visitor push it through the network themselves. That only works if the
   * route is stable — scrubbing backwards has to retrace the same path — so it
   * is built once, from real edges, and cached.
   *
   * The five stops are the ones the protocol actually has: an instruction is
   * submitted, a quorum checks it, the registry is consulted, a threshold
   * co-signs, and a record is written.
   */
  buildTour(): { path: number[]; edges: number[] } {
    if (this.tour) return this.tour;
    const nodes = this.snapshot.nodes;
    const previousReveal = this.revealLevel;
    // Routing has to see the whole network, whatever the intro has revealed.
    this.revealLevel = Number.POSITIVE_INFINITY;

    let best: { path: number[]; edges: number[] } | null = null;
    for (let attempt = 0; attempt < 60; attempt++) {
      const start = nodes[Math.floor(this.random() * this.nodeCount)];
      if (start.stratum < Stratum.Participant) continue;
      const inward = this.route(start.id, true, 7);
      if (inward.edges.length < 3) continue;
      const arrival = inward.path[inward.path.length - 1];
      if (nodes[arrival].stratum !== Stratum.Consensus) continue;

      // Continue from consensus out to the registry, then back outward, so the
      // route covers the whole lifecycle rather than stopping at approval.
      const replay = this.routeToward(arrival, NodeType.Registry, 3);
      const settle = this.route(replay.path[replay.path.length - 1], false, 5);
      const path = [...inward.path, ...replay.path.slice(1), ...settle.path.slice(1)];
      const edges = [...inward.edges, ...replay.edges, ...settle.edges];
      if (edges.length < 6) continue;
      best = { path, edges };
      break;
    }

    this.revealLevel = previousReveal;
    this.tour = best ?? { path: [], edges: [] };
    return this.tour;
  }

  /** Shortest walk it can find toward the nearest node of a given class. */
  private routeToward(startId: number, type: NodeType, maxHops: number) {
    const path = [startId];
    const edgeIds: number[] = [];
    let current = startId;
    let previous = -1;
    for (let hop = 0; hop < maxHops; hop++) {
      const node = this.snapshot.nodes[current];
      if (hop > 0 && node.type === type) break;
      let bestEdge = -1;
      let bestNext = -1;
      let bestScore = -Infinity;
      for (const edgeId of node.connections) {
        const edge = this.snapshot.edges[edgeId];
        const next = edge.source === current ? edge.target : edge.source;
        if (next === previous) continue;
        const score =
          (this.snapshot.nodes[next].type === type ? 4 : 0) + edge.strength + this.random() * 0.3;
        if (score > bestScore) {
          bestScore = score;
          bestEdge = edgeId;
          bestNext = next;
        }
      }
      if (bestEdge < 0) break;
      previous = current;
      current = bestNext;
      path.push(current);
      edgeIds.push(bestEdge);
    }
    return { path, edges: edgeIds };
  }

  /**
   * Places the guided instruction at `progress` along its route and lights the
   * network accordingly. Returns the world position so the camera can ride it.
   */
  driveTour(progress: number, out: { x: number; y: number; z: number }): number {
    const tour = this.buildTour();
    if (tour.edges.length === 0) return 0;

    const span = tour.edges.length;
    const at = Math.max(0, Math.min(span - 0.0001, progress * span));
    const hop = Math.floor(at);
    const local = at - hop;

    const edge = this.snapshot.edges[tour.edges[hop]];
    const from = this.snapshot.nodes[tour.path[hop]];
    const to = this.snapshot.nodes[tour.path[hop + 1]];

    out.x = from.position[0] + (to.position[0] - from.position[0]) * local;
    out.y = from.position[1] + (to.position[1] - from.position[1]) * local;
    out.z = from.position[2] + (to.position[2] - from.position[2]) * local;

    const forward = edge.source === from.id;
    const o = edge.id * 4;
    this.edgeState[o] = forward ? local : 1 - local;
    this.edgeState[o + 1] = 1;
    this.edgeState[o + 2] = 1;
    // The guided instruction reports its own progress the same way, so the
    // followed signal changes colour along the route the visitor is watching.
    this.edgeState[o + 3] = hop / Math.max(1, span - 1);

    // Everything already passed stays warm, so the route reads as a trail
    // rather than as a single moving dot with no history.
    for (let i = 0; i <= hop && i < tour.edges.length; i++) {
      const passed = tour.edges[i] * 4;
      this.edgeState[passed + 2] = Math.max(this.edgeState[passed + 2], 0.85);
    }
    for (let i = 0; i <= hop + 1 && i < tour.path.length; i++) {
      const node = tour.path[i] * 4;
      this.nodeState[node] = Math.max(this.nodeState[node], 0.8);
      this.nodeState[node + 2] = Math.max(this.nodeState[node + 2], i === hop + 1 ? 1 : 0.4);
    }

    return hop / Math.max(1, span - 1);
  }

  get activeSignalCount(): number {
    return this.signals.length;
  }

  typeOf(id: number): NodeType {
    return this.snapshot.nodes[id].type;
  }
}
