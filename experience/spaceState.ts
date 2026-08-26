'use client';

import { DataTexture, FloatType, NearestFilter, RGBAFormat } from 'three';
import { SPACES, SPACE_COUNT } from './Spaces';
import { spaceRuntime } from './navigation';
import { stage } from './stage';

/**
 * What the GPU knows about the eight spaces.
 *
 * One column per space, four rows deep, uploaded once a frame. Both the
 * structure field and the pathways between structures read it, which is what
 * lets a pathway dim itself when the space at one of its ends steps back
 * without anything having to tell it to.
 *
 * A float texture rather than uniform arrays: dynamic indexing of a uniform
 * array by an attribute is not a thing to bet a driver on, and this project
 * already moves per-record state to the GPU exactly this way.
 *
 *   row 0   anchor.xyz, radius
 *   row 1   colour.rgb, presence
 *   row 2   phase, focus, stage, activity
 *   row 3   dim, spare, spare, spare
 */

export const SPACE_ROWS = 4;

let data: Float32Array | null = null;
let texture: DataTexture | null = null;

export function spaceStateTexture(): DataTexture {
  if (!texture) {
    data = new Float32Array(SPACE_COUNT * SPACE_ROWS * 4);
    texture = new DataTexture(data, SPACE_COUNT, SPACE_ROWS, RGBAFormat, FloatType);
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
  }
  return texture;
}

/**
 * Writes this frame's state. Called once, by the first system in the scene that
 * reads it, before anything is drawn.
 */
export function writeSpaceState() {
  const tex = spaceStateTexture();
  const array = data;
  if (!array) return;

  for (let i = 0; i < SPACE_COUNT; i++) {
    const space = SPACES[i];
    const runtime = spaceRuntime[i];

    const row0 = i * 4;
    array[row0] = space.anchor[0];
    array[row0 + 1] = space.anchor[1];
    array[row0 + 2] = space.anchor[2];
    array[row0 + 3] = space.radius;

    const row1 = (SPACE_COUNT + i) * 4;
    array[row1] = space.colour[0];
    array[row1 + 1] = space.colour[1];
    array[row1 + 2] = space.colour[2];
    array[row1 + 3] = runtime.presence;

    const row2 = (SPACE_COUNT * 2 + i) * 4;
    array[row2] = runtime.phase;
    array[row2 + 1] = runtime.focus;
    array[row2 + 2] = runtime.stage;
    array[row2 + 3] = runtime.activity;

    const row3 = (SPACE_COUNT * 3 + i) * 4;
    array[row3] = stage.dim;
    array[row3 + 1] = 0;
    array[row3 + 2] = 0;
    array[row3 + 3] = 0;
  }

  tex.needsUpdate = true;
}
