import type { Journey } from '../journey';
import { NODES_JOURNEY } from './nodes';
import { SETTLE_JOURNEY } from './settle';
import { UBTC_JOURNEY } from './ubtc';
import { VAULT_JOURNEY } from './vault';

/**
 * A walk for every product.
 *
 * Each one lands the visitor inside the thing and moves them through what it
 * does, and the written product waits at the far end. They are built out of one
 * vocabulary and deliberately do not look alike: the unit's lifecycle is a
 * ledger of boxes and blocks, the trade instrument is a page with seals turning
 * in front of it, custody is a vault with three ways out of different lengths,
 * and the verification network is a ring of operators and the chords between
 * them.
 *
 * Every stage of every one of them describes something the protocol actually
 * does. A walk assembled out of adjectives would be worse than the page it
 * replaced, so where a product is not built yet the walk says what it will do
 * and the status on the written page says it is not running.
 */
export const JOURNEYS: Record<string, Journey> = {
  ubtc: UBTC_JOURNEY,
  settle: SETTLE_JOURNEY,
  vault: VAULT_JOURNEY,
  nodes: NODES_JOURNEY,
};

export function journeyFor(id: string): Journey | null {
  return JOURNEYS[id] ?? null;
}
