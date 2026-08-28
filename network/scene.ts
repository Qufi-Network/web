/**
 * A walkthrough scene, built once into one buffer.
 *
 * A journey is a list of figures: a shape, where it stands, what colour it
 * wears, and how it behaves when the journey asks it to do something. This
 * turns that list into the attributes one draw call needs, and hands back the
 * figure order so the director can address them by index.
 *
 * The division of labour matters. Nothing here knows what a vault or a letter
 * of credit is; the journeys know that. Nothing in a journey knows about
 * buffers. What passes between them is a list of figures and, once a frame, a
 * row of numbers saying how present and how busy each one is.
 */

import { createRng } from './rng';
import { inBall, type Placed, type Shape, type Vec3 } from './shapes';

/**
 * How a figure behaves when the journey brings it in.
 *
 * Seven behaviours cover every scene the site has: things that assemble out of
 * nothing, things that arrive from somewhere, things that fall, things that
 * stand still, things that turn, things that travel, and things that are read.
 */
export const Behaviour = {
  /** Comes together out of scattered material where it stands. */
  Assemble: 0,
  /** Arrives along its own approach, from wherever it starts. */
  Stream: 1,
  /** Falls to where it lands, and settles when it gets there. */
  Drop: 2,
  /** Stands where it is put. Scenery, and the things being written into. */
  Hold: 3,
  /** Stands where it is put and turns about its own middle. */
  Spin: 4,
  /** Rides the journey's path, strung out behind whatever it escorts. */
  Escort: 5,
  /** Rides the journey's path, facing the camera. The marks. */
  Mark: 6,
  /**
   * Arrives from wherever it came from, and is then read across.
   *
   * A band travels along the figure and what it has passed stays lit. It is
   * how a scanner works and there was no way to say it with the others: every
   * one of them describes a thing arriving or moving, and this describes a
   * thing being looked at.
   */
  Scan: 7,
} as const;

export type BehaviourKind = (typeof Behaviour)[keyof typeof Behaviour];

export interface Figure {
  id: string;
  /** Where it stands, in world space. */
  at: Vec3;
  shape: Shape;
  behaviour: BehaviourKind;
  /** The colour it wears, unless a point of it says otherwise. */
  tone: Vec3;
  /** Its share of the point budget, relative to the other figures. */
  share: number;
  /** Where an arriving or falling figure comes from, in world space. */
  from?: Vec3;
  /** How far the material scatters before an assembling figure pulls it in. */
  scatter?: number;
  /** Turns a second, for a figure that spins. */
  spin?: number;
  /** Drawn small and dim: scenery rather than subject. */
  soft?: boolean;
  /** Point size relative to everything else. The subject earns more than 1. */
  size?: number;
  /**
   * How far a figure that rides the path is strung out behind itself.
   *
   * 1 is the tail the shape asked for; 0 is a thing that travels in one piece,
   * which is what an instrument or a sealed document should do. Only means
   * anything for a figure that travels.
   */
  lag?: number;
}

export interface SceneBuffers {
  position: Float32Array;
  origin: Float32Array;
  colour: Float32Array;
  param: Float32Array;
  trait: Float32Array;
  count: number;
  /** Figure ids in the order the shader indexes them. */
  order: string[];
}

/**
 * Builds a scene.
 *
 * `budget` is the total number of points the device can afford. Shares are
 * proportions rather than counts, so a phone draws the same scene with fewer
 * points rather than a different scene.
 */
export function buildScene(figures: Figure[], budget: number, seed = 0x0b7c): SceneBuffers {
  const rng = createRng(seed);
  const position: number[] = [];
  const origin: number[] = [];
  const colour: number[] = [];
  const param: number[] = [];
  const trait: number[] = [];

  const total = figures.reduce((sum, figure) => sum + figure.share, 0) || 1;

  figures.forEach((figure, index) => {
    const count = Math.max(24, Math.floor((budget * figure.share) / total));
    const placed: Placed[] = figure.shape(count, rng);
    const scatter = figure.scatter ?? 8;

    for (let i = 0; i < placed.length; i++) {
      const point = placed[i];
      const local = point.p;
      const tone = point.tone ?? figure.tone;
      // A figure that rides the path reads u as how far behind the front of it
      // this point sits, so scaling u is how a swarm becomes a solid thing.
      const u = (point.u ?? i / Math.max(1, placed.length)) * (figure.lag ?? 1);

      /*
       * A mark is drawn facing the camera, so its points stay in the mark's own
       * flat space and the shader puts them on the screen; everything else is
       * placed where it stands, in the world.
       */
      const billboard = figure.behaviour === Behaviour.Mark;
      const px = billboard ? local[0] : figure.at[0] + local[0];
      const py = billboard ? local[1] : figure.at[1] + local[1];
      const pz = billboard ? local[2] : figure.at[2] + local[2];

      /*
       * Where it comes from. A figure that arrives from somewhere says where;
       * a figure that assembles pulls itself together out of material scattered
       * around where it will end up; a figure that neither does starts where it
       * finishes and the shader never looks.
       */
      let from: Vec3;
      if (point.from) {
        from = billboard
          ? point.from
          : [figure.at[0] + point.from[0], figure.at[1] + point.from[1], figure.at[2] + point.from[2]];
      } else if (figure.from) {
        const spread = inBall(rng, scatter * 0.4);
        from = [figure.from[0] + spread[0], figure.from[1] + spread[1], figure.from[2] + spread[2]];
      } else {
        const spread = inBall(rng, scatter);
        from = billboard
          ? [local[0] + spread[0], local[1] + spread[1], local[2] + spread[2] * 0.2]
          : [px + spread[0], py + spread[1], pz + spread[2]];
      }

      position.push(px, py, pz);
      origin.push(from[0], from[1], from[2]);
      colour.push(tone[0], tone[1], tone[2]);
      param.push(rng(), index, u, point.sub ?? 0);
      trait.push(figure.behaviour, figure.size ?? 1, figure.soft ? 1 : 0, figure.spin ?? 0);
    }
  });

  return {
    position: new Float32Array(position),
    origin: new Float32Array(origin),
    colour: new Float32Array(colour),
    param: new Float32Array(param),
    trait: new Float32Array(trait),
    count: param.length / 4,
    order: figures.map((figure) => figure.id),
  };
}
