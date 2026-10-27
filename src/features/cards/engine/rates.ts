import type { Rarity } from "../catalog/types";

/**
 * Centralized drop rates for the cards prototype.
 *
 * Percent values are the source of truth; decimal probabilities are derived.
 * Fifth-card rates sum to exactly 100 %.
 *
 * Client-side draws are not cheat-resistant; a future server version should
 * generate and validate packs.
 */

/** Gold Pack pre-roll: 0.005 % = 0.00005 ≈ 1 / 20_000. */
export const GOLD_PACK_PERCENT = 0.005;
export const GOLD_PACK_PROBABILITY = GOLD_PACK_PERCENT / 100;

/**
 * Exclusive probabilities for the 5th card of a standard booster.
 * Rare floor: never common.
 */
export const FIFTH_CARD_PERCENT: Readonly<
  Record<Exclude<Rarity, "common">, number>
> = {
  rare: 82.49,
  epic: 15,
  legendary: 2,
  gold: 0.5,
  diamond: 0.01,
};

export const FIFTH_CARD_ORDER = [
  "rare",
  "epic",
  "legendary",
  "gold",
  "diamond",
] as const satisfies readonly Exclude<Rarity, "common">[];

export function fifthCardPercentSum(): number {
  return FIFTH_CARD_ORDER.reduce(
    (sum, key) => sum + FIFTH_CARD_PERCENT[key],
    0,
  );
}

/** Cumulative exclusive intervals on [0, 1) for the 5th card. */
export function buildFifthCardIntervals(): {
  rarity: Exclude<Rarity, "common">;
  start: number;
  end: number;
}[] {
  const total = fifthCardPercentSum();
  let cursor = 0;
  return FIFTH_CARD_ORDER.map((rarity) => {
    const width = FIFTH_CARD_PERCENT[rarity] / total;
    const start = cursor;
    const end = cursor + width;
    cursor = end;
    return { rarity, start, end };
  });
}

export const STANDARD_PACK_SIZE = 5;
export const STANDARD_COMMON_SLOTS = 4;
