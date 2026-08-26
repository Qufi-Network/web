import type { Space } from '../../experience/Spaces';

/**
 * A space's colour, as the interface can use it.
 *
 * The scene works in linear-ish floats because that is what a shader wants; the
 * overlay works in CSS. One conversion, in one place, so a space's colour on
 * screen and the colour of the words describing it can never drift apart.
 *
 * Lifted slightly on the way out: a value that reads correctly as additive
 * light against black reads as muddy when it is text on a dark background.
 */
export function toneOf(space: Space): string {
  const lift = (v: number) => Math.round(Math.min(1, v * 0.72 + 0.28) * 255);
  return `rgb(${lift(space.colour[0])}, ${lift(space.colour[1])}, ${lift(space.colour[2])})`;
}
