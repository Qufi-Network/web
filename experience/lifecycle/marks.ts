'use client';

import { CHAIN_Y, HOLDER, REGISTRY, VAULT } from './stages';

/**
 * Names for the things in the scene.
 *
 * A walkthrough that shows six shapes and describes them in a column on the
 * left asks the visitor to work out which is which. These are the labels that
 * remove that question: each one is pinned to the thing it names, appears while
 * that thing matters, and goes away again.
 *
 * Positions are world space; the director projects them and the overlay reads
 * the result. Same arrangement as the markers on the front of the site, for the
 * same reason — this changes sixty times a second and React should not see it.
 */

export interface Mark {
  id: string;
  text: string;
  at: [number, number, number];
  /**
   * Which stages this is worth naming in. Everything in the scene is present
   * most of the time; a label is only useful while its subject is the subject.
   */
  during: number[];
  /** Screen position, filled each frame. */
  x: number;
  y: number;
  on: number;
}

export const MARKS: Mark[] = [
  { id: 'vault', text: 'The vault', at: [VAULT[0], VAULT[1] + 11, VAULT[2]], during: [0, 1, 2, 4], x: 0, y: 0, on: 0 },
  { id: 'deposit', text: 'Bitcoin, arriving', at: [VAULT[0] - 34, VAULT[1] - 12, 0], during: [1], x: 0, y: 0, on: 0 },
  { id: 'verifier', text: 'Verification', at: [0, 13, 0], during: [2, 3, 4], x: 0, y: 0, on: 0 },
  { id: 'unit', text: 'uBTC', at: [0, 0, 0], during: [2, 3, 4], x: 0, y: 0, on: 0 },
  { id: 'holder', text: 'The holder', at: [HOLDER[0], HOLDER[1] + 9, HOLDER[2]], during: [3], x: 0, y: 0, on: 0 },
  { id: 'chain', text: 'Bitcoin', at: [0, CHAIN_Y - 5, 0], during: [2, 3, 4, 5], x: 0, y: 0, on: 0 },
  { id: 'registry', text: 'Spent-nullifier registry', at: [REGISTRY[0], REGISTRY[1] + 9, REGISTRY[2]], during: [4, 5], x: 0, y: 0, on: 0 },
  { id: 'anchors', text: 'Three anchors', at: [6, CHAIN_Y + 7, 0], during: [5], x: 0, y: 0, on: 0 },
];

/** The unit moves, so its label has to be told where it is. */
export const unitAt = { x: 0, y: 0, z: 0 };
