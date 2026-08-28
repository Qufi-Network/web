/**
 * What a walkthrough is.
 *
 * A journey is four things: the figures the scene is built out of, the stages
 * the visitor moves through, the path the travelling thing takes, and a score
 * that turns one number — where they are on the route — into how present and
 * how busy every figure is at that moment.
 *
 * Nothing is tweened. Every value comes out of the route position, which is
 * what makes scrolling back up unwind a mint rather than replay it, and what
 * lets the whole thing be scrubbed by a harness rather than only watched.
 *
 * Data only, and deliberately not a client module: the page that renders the
 * document under a walk is a server component, and a server component
 * importing from a `use client` file gets references rather than values.
 */

import type { Figure } from '../../network/scene';
import type { Vec3 } from '../../network/shapes';

export type { Vec3 };

export interface Stage {
  id: string;
  index: string;
  /** The coordinate readout, after the journey's own prefix: MINT, REDEEM. */
  nav: string;
  title: string;
  body: string;
  /** The three or four beats this stage moves through. */
  beats: string[];
  /** One line per beat, in order. */
  says: string[];

  /* ---- and how it is watched --------------------------------------------- */

  /** What the shot is about. */
  focus: Vec3;
  /** The direction it is watched from. Normalised on use. */
  from: Vec3;
  /** How far off the camera arrives, and where it has got to by the end. */
  far: number;
  near: number;
  /** How far it arcs around the subject across the stage, in radians. */
  swing: number;
  fov: number;
  /** How much it banks, in degrees. Small numbers; this is not a fairground. */
  roll: number;
  /**
   * How much this shot follows the travelling thing rather than standing still.
   *
   * 0 is a fixed camera on a fixed subject. 1 is riding alongside whatever is
   * moving. The stages where something is actually crossing the scene are the
   * ones worth riding; the rest are worth holding.
   */
  chase: number;
  /**
   * How far the camera stands to one side of its subject, as a fraction of how
   * far away it is.
   *
   * Standing left puts the subject right, and the words live on the left — so
   * this is what stops the thing being described from sitting underneath the
   * description of it. A fraction rather than a distance because the angle is
   * what composes a frame: twenty units to the side is most of the picture on
   * a close shot and nothing at all on a wide one.
   *
   * Ignored on a tall frame, where the words are below rather than beside and
   * the subject wants the middle.
   */
  frame: number;
}

/** A name pinned to something in the scene. */
export interface Mark {
  id: string;
  text: string;
  /** Where it sits, or `travel` to follow whatever is moving. */
  at: Vec3 | 'travel';
  /** Which stages it is worth naming in. */
  during: number[];
  /**
   * The figure it names, where it names one.
   *
   * A label is only true while its subject is there, and the stage it belongs
   * to starts before the subject does — so naming a thing that has not arrived
   * yet is a caption pointing at empty space. Given a figure, the label fades
   * in with it and out with it.
   */
  names?: string;
  /** How far above the thing it names. */
  lift?: number;
  /**
   * The colour it wears.
   *
   * Held here rather than in a stylesheet keyed by name: four journeys name
   * four different sets of things, and a rule that says the label called
   * `vault` is violet is a rule that only knows about one of them.
   */
  tone?: string;
  /** Screen position, filled each frame. */
  x: number;
  y: number;
  on: number;
}

export interface Journey {
  id: string;
  /** The coordinate prefix: UBTC / MINT. */
  nav: string;
  /** The colour the reading column and the rail wear. */
  tone: string;
  figures: Figure[];
  stages: Stage[];
  marks: Mark[];
  /** The waypoints anything travelling rides, and how each leg bows. */
  path: Vec3[];
  bend: Vec3[];
  /** How big the mark is drawn, in world units. */
  markScale: number;
  /** How much of the point budget this scene is worth. */
  budget: number;
  /**
   * Which figure is the thing making the journey.
   *
   * The label that follows it has to disappear when it does, and the only way
   * to know whether it is there is to ask the figure that is it.
   */
  traveller?: string;
  /**
   * Where the travelling thing is at this point on the route, in legs.
   *
   * Held apart from the score because the camera needs it too: a shot that
   * rides alongside the unit has to know where the unit is, and asking the
   * score for it would mean running the score twice.
   */
  travelAt(at: number): number;
  /**
   * How present and how busy every figure is, written into `state` as four
   * numbers each: presence, activity, travel, and one spare the journey can
   * mean anything by.
   */
  score(at: number, state: Float32Array): void;
}

/* -------------------------------------------------------------- the maths -- */

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** How far past a point on the route we are, 0..1 over `span`. */
export const since = (at: number, from: number, span: number) => smoothstep(from, from + span, at);

/**
 * A pulse: on by `from`, off again by the time `span` has passed twice.
 *
 * Most of what happens in these scenes happens and then stops happening, and
 * writing that as the difference of two ramps everywhere was the sort of thing
 * that goes wrong once and is then wrong for good.
 */
export const during = (at: number, from: number, span: number) =>
  since(at, from, span * 0.4) - since(at, from + span * 0.6, span * 0.5);

/**
 * Where the travelling thing is, `t` legs along a path.
 *
 * The same curve the shader draws, in the same shape, because the camera rides
 * alongside what the shader is drawing and the two coming apart by even a
 * little would read as the subject sliding out of frame.
 */
export function pathAt(path: Vec3[], bend: Vec3[], t: number, out: Vec3): Vec3 {
  const legs = path.length - 1;
  const clamped = Math.max(0, Math.min(legs, t));
  const leg = Math.min(Math.floor(clamped), legs - 1);
  const raw = Math.max(0, Math.min(1, clamped - leg));
  const k = raw * raw * (3 - 2 * raw);

  const a = path[leg];
  const b = path[leg + 1];
  const curve = bend[leg] ?? [0, 0, 0];
  const inv = 1 - k;
  for (let i = 0; i < 3; i++) {
    const control = (a[i] + b[i]) * 0.5 + curve[i];
    out[i] = inv * inv * a[i] + 2 * inv * k * control + k * k * b[i];
  }
  return out;
}
