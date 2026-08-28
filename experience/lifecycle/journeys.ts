import { STAGES, type Stage } from './stages';

/**
 * Which products can be walked, and what the walk is.
 *
 * A product with stages here gets a journey: the visitor lands in the scene and
 * moves through it, and the written product only appears once they have. A
 * product without them goes straight to the writing.
 *
 * That distinction is deliberate and it is not a placeholder for its own sake:
 * a journey has to be built out of what the product actually does, and one
 * assembled out of adjectives would be worse than the page it replaced. The
 * three that are still being built say so on the launcher.
 */
export const JOURNEYS: Record<string, Stage[]> = {
  ubtc: STAGES,
};

export function journeyFor(id: string): Stage[] | null {
  return JOURNEYS[id] ?? null;
}
