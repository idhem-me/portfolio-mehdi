import type { DrawnCard } from "./draw";

/** Classify each pull as new vs duplicate relative to the collection before this opening. */
export function classifyOpeningPulls(
  cards: DrawnCard[],
  collection: Record<string, { qty?: number }>,
  options: { simulation?: boolean } = {},
) {
  const inPack = new Map<string, number>();
  for (const card of cards) {
    inPack.set(card.cardId, (inPack.get(card.cardId) ?? 0) + 1);
  }

  const beforeQty = new Map<string, number>();
  for (const [cardId, count] of inPack) {
    const owned = collection[cardId]?.qty ?? 0;
    beforeQty.set(
      cardId,
      options.simulation ? owned : Math.max(0, owned - count),
    );
  }

  const seen = new Map<string, number>();
  return cards.map((drawn, index) => {
    const priorCopies =
      (beforeQty.get(drawn.cardId) ?? 0) + (seen.get(drawn.cardId) ?? 0);
    seen.set(drawn.cardId, (seen.get(drawn.cardId) ?? 0) + 1);
    const isNew = priorCopies === 0;
    const ownedNow = options.simulation
      ? (beforeQty.get(drawn.cardId) ?? 0)
      : (collection[drawn.cardId]?.qty ?? priorCopies + 1);
    return { drawn, index, isNew, ownedNow };
  });
}
