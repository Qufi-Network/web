'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { NodeType } from '../../network/types';
import { CHAPTERS } from '../Chapters';
import { useNetwork } from '../NetworkContext';
import { stage } from '../stage';

/**
 * Anchors each capability to a participant in the network.
 *
 * A capability that appears in a panel at the side of the screen is a list item
 * with a nicer background. A capability that arrives attached to a specific node
 * — one the camera is currently travelling toward, that lights up as its turn
 * comes — is somewhere the visitor has been taken. The difference is entirely in
 * whether the thing on screen has a position in the world.
 *
 * The projection runs here, in the render loop, where the camera matrices are
 * already current. The card in the DOM only reads the result.
 */

/**
 * Every chapter that presents a series of things, and how many it presents.
 *
 * Capabilities and route stops are the same idea wearing different labels — a
 * set of things reached one after another as the camera travels — so they share
 * one anchoring mechanism rather than each having their own.
 */
const SERIES = CHAPTERS.map((chapter, index) => ({
  index,
  id: chapter.id,
  count: (chapter.features ?? chapter.stops ?? []).length,
})).filter((entry) => entry.count > 0);

export function FeatureProjector() {
  const { engine } = useNetwork();
  const { camera, size } = useThree();
  const scratch = useRef(new Vector3());
  const lit = useRef(-1);
  const announced = useRef(-1);

  /**
   * One participant per capability, chosen from the applications — the class
   * that exists to be something built on the network — and spread as widely as
   * the topology allows so consecutive capabilities are not neighbours.
   */
  const anchors = useMemo(() => {
    const pool = engine.snapshot.nodes.filter((node) => node.type === NodeType.Application);
    if (pool.length === 0) return [];

    const most = SERIES.reduce((n, entry) => Math.max(n, entry.count), 0);
    const chosen: typeof pool = [];
    const remaining = [...pool];
    for (let i = 0; i < most && remaining.length; i++) {
      let bestIndex = 0;
      let bestScore = -Infinity;
      for (let a = 0; a < remaining.length; a++) {
        const candidate = remaining[a];
        const [x, y, z] = candidate.position;

        let nearest = Infinity;
        for (const taken of chosen) {
          const dx = x - taken.position[0];
          const dy = y - taken.position[1];
          const dz = z - taken.position[2];
          nearest = Math.min(nearest, dx * dx + dy * dy + dz * dz);
        }

        // Staying in frame matters more than spreading out. An anchor far up
        // the y axis or way out to the side projects off the edge of the
        // screen part way through the camera move, and then the card is
        // tethered to something nobody can see.
        // Inner participants stay in frame for the whole camera move; outer
        // ones slide off the edge as it pushes in.
        const lateral = Math.hypot(x, z);
        const inBand = 1 - Math.min(1, Math.abs(lateral - 15) / 16);
        const level = 1 - Math.min(1, Math.abs(y) / 14);
        const spread = chosen.length ? Math.min(nearest, 900) / 900 : 0;

        const score = inBand * 4.2 + level * 2.4 + spread * 1.1;
        if (score > bestScore) {
          bestScore = score;
          bestIndex = a;
        }
      }
      chosen.push(remaining.splice(bestIndex, 1)[0]);
    }
    return chosen;
  }, [engine]);

  useFrame(() => {
    const anchor = stage.featureAnchor;
    const here = Math.floor(stage.depth);
    const inChapter = SERIES.some((entry) => entry.index === here);

    if (!inChapter || stage.featurePresence <= 0.002 || anchors.length === 0) {
      anchor.visible = 0;
      if (lit.current >= 0) lit.current = -1;
      return;
    }

    const node = anchors[Math.min(anchors.length - 1, stage.featureIndex)];
    if (!node) {
      anchor.visible = 0;
      return;
    }

    // The participant this capability belongs to is doing the work: it burns
    // while its turn is running, so the card and the node read as one thing.
    const offset = node.id * 4;
    engine.nodeState[offset] = Math.max(engine.nodeState[offset], stage.featurePresence);
    engine.nodeState[offset + 1] = Math.max(engine.nodeState[offset + 1], stage.featurePresence);
    if (lit.current !== node.id) {
      engine.nodeState[offset + 2] = 1;
      lit.current = node.id;
    }

    // The world position is what the burst and the card's flight both need;
    // the screen position is only what the DOM needs.
    stage.featureAnchorWorld.set(node.position[0], node.position[1], node.position[2]);

    // Every change of reading detonates the network at the node it came from.
    if (announced.current !== stage.featureIndex) {
      announced.current = stage.featureIndex;
      stage.featureBurst = 1;
    }

    scratch.current.set(node.position[0], node.position[1], node.position[2]);
    scratch.current.project(camera);

    const behind = scratch.current.z > 1;
    const projectedX = (scratch.current.x * 0.5 + 0.5) * size.width;
    const projectedY = (-scratch.current.y * 0.5 + 0.5) * size.height;

    // Held inside the frame whatever the camera does. Anchor choice already
    // favours participants that stay in shot, but the camera travels during
    // this chapter and a guarantee is worth more here than a tendency: a card
    // tethered to a point beyond the edge of the screen points at nothing.
    const margin = 90;
    anchor.x = Math.min(Math.max(projectedX, margin), size.width - margin);
    anchor.y = Math.min(Math.max(projectedY, margin), size.height - margin);
    anchor.visible = behind ? 0 : stage.featurePresence;
  });

  return null;
}
