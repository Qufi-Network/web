'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { NodeType } from '../../network/types';
import { CHAPTERS } from '../Chapters';
import { useNetwork } from '../NetworkContext';
import { stage, type ProjectedLabel } from '../stage';

/**
 * Pins words to participants.
 *
 * Discovery one works by naming things the visitor is already looking at. The
 * labels therefore have to be attached to actual nodes and track them through
 * camera moves, drift and pointer displacement — a caption floating in a corner
 * would not be the same idea at all.
 *
 * Projection happens here, inside the render loop where the camera matrices are
 * already current. The DOM layer only reads the results, so no React component
 * re-renders while the camera is moving.
 */

/**
 * Chapters that name participants, and where those names should attach.
 *
 * Discovery labels applications, because an application is a thing built on the
 * network. Trust labels the lowest nodes in the structure, because that chapter
 * is about what everything else is standing on — attaching those words to the
 * same six application nodes would say the opposite of what the chapter says.
 */
const LABELLED = CHAPTERS.map((chapter, index) => ({ index, chapter }))
  .filter((entry) => entry.chapter.nodeLabels?.length)
  .map((entry) => ({
    index: entry.index,
    id: entry.chapter.id,
    labels: entry.chapter.nodeLabels ?? [],
  }));

const MAX_LABELS = LABELLED.reduce((most, entry) => Math.max(most, entry.labels.length), 0);

export function NodeLabelProjector() {
  const { engine } = useNetwork();
  const { camera, size } = useThree();
  const scratch = useRef(new Vector3());

  /**
   * The nodes that get named. Applications, because an application is by
   * definition something built on the network, and spread as widely as possible
   * so the words do not stack on top of each other.
   */
  const targetsByChapter = useMemo(() => {
    const pick = (pool: typeof engine.snapshot.nodes, wanted: number) => {
    const applications = [...pool];
    if (applications.length === 0) return [];

    const chosen: typeof applications = [];
    for (let i = 0; i < wanted && applications.length > 0; i++) {
      let bestIndex = 0;
      let bestScore = -Infinity;
      for (let a = 0; a < applications.length; a++) {
        const candidate = applications[a];
        // Prefer candidates far from everything already chosen, and prefer the
        // near side of the network so labels sit in front of the structure.
        let nearest = Infinity;
        for (const taken of chosen) {
          const dx = candidate.position[0] - taken.position[0];
          const dy = candidate.position[1] - taken.position[1];
          const dz = candidate.position[2] - taken.position[2];
          nearest = Math.min(nearest, dx * dx + dy * dy + dz * dz);
        }
        const score = (chosen.length ? nearest : 0) + candidate.position[2] * 6;
        if (score > bestScore) {
          bestScore = score;
          bestIndex = a;
        }
      }
      chosen.push(applications.splice(bestIndex, 1)[0]);
    }
      return chosen;
    };

    const nodes = engine.snapshot.nodes;
    const result: Record<number, typeof nodes> = {};
    for (const entry of LABELLED) {
      const pool =
        entry.id === 'trust'
          ? nodes.filter((node) => node.position[1] < -2)
          : nodes.filter((node) => node.type === NodeType.Application);
      result[entry.index] = pick(pool.length ? pool : nodes, entry.labels.length);
    }
    return result;
  }, [engine]);

  useFrame(() => {
    const slots: ProjectedLabel[] = stage.labels;

    // Find the labelled chapter the visitor is actually inside, if any.
    let active: (typeof LABELLED)[number] | null = null;
    let presence = 0;
    for (const entry of LABELLED) {
      const local = stage.depth - entry.index;
      if (local < -0.08 || local > 1) continue;
      active = entry;
      presence = Math.max(0, 1 - Math.abs(local - 0.45) * 1.7);
      break;
    }

    const targets = active ? targetsByChapter[active.index] ?? [] : [];

    for (let i = 0; i < MAX_LABELS; i++) {
      const slot = slots[i] ?? (slots[i] = { x: 0, y: 0, opacity: 0, text: '' });
      const node = targets[i];
      if (!active || !node) {
        slot.opacity = 0;
        continue;
      }
      slot.text = active.labels[i] ?? '';
      if (presence <= 0.001) {
        slot.opacity = 0;
        continue;
      }

      scratch.current.set(node.position[0], node.position[1], node.position[2]);
      // Matching the drift applied in the vertex shader would mean duplicating
      // it on the CPU every frame for six nodes; the amplitude is under half a
      // unit, which is well inside the label's own offset.
      scratch.current.project(camera);

      const behind = scratch.current.z > 1;
      slot.x = (scratch.current.x * 0.5 + 0.5) * size.width;
      slot.y = (-scratch.current.y * 0.5 + 0.5) * size.height;

      // Fade near the frame edge rather than clipping, and never draw a label
      // for a node that is behind the lens.
      const marginX = Math.min(slot.x, size.width - slot.x) / (size.width * 0.12);
      const marginY = Math.min(slot.y, size.height - slot.y) / (size.height * 0.12);
      const edge = Math.max(0, Math.min(1, Math.min(marginX, marginY)));

      // Stagger them in, so a row of words does not appear at once.
      const staggered = Math.max(0, Math.min(1, (presence - i * 0.06) / 0.3));
      slot.opacity = behind ? 0 : edge * staggered;
    }
  });

  return null;
}
