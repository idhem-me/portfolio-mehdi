import { cardsByRarity, getCard } from "../catalog/cards";
import type { CardDefinition, Rarity } from "../catalog/types";
import { cryptoRandom, type Rng } from "@/lib/games/rng";
import {
  GOLD_PACK_PROBABILITY,
  STANDARD_COMMON_SLOTS,
  STANDARD_PACK_SIZE,
  buildFifthCardIntervals,
} from "./rates";

export type PackKind = "standard" | "gold_pack";

export type DrawnCard = {
  cardId: string;
  rarity: Rarity;
  slot: number;
};

export type PackResult = {
  kind: PackKind;
  cards: DrawnCard[];
};

export type DrawOptions = {
  rng?: Rng;
  /** Force pack kind (dev preview). Does not alter live rates. */
  forceKind?: PackKind;
  /** Force 5th-card rarity for standard packs (dev preview). */
  forceFifthRarity?: Exclude<Rarity, "common">;
};

function pickUniform(list: readonly CardDefinition[], rng: Rng): CardDefinition {
  if (list.length === 0) {
    throw new Error("Empty rarity pool");
  }
  const index = Math.floor(rng() * list.length);
  return list[Math.min(index, list.length - 1)]!;
}

function pickByRarity(rarity: Rarity, rng: Rng): CardDefinition {
  return pickUniform(cardsByRarity(rarity), rng);
}

function rollFifthRarity(
  rng: Rng,
  force?: Exclude<Rarity, "common">,
): Exclude<Rarity, "common"> {
  if (force) return force;
  const roll = rng();
  const intervals = buildFifthCardIntervals();
  for (const interval of intervals) {
    if (roll >= interval.start && roll < interval.end) {
      return interval.rarity;
    }
  }
  return intervals[intervals.length - 1]!.rarity;
}

function toDrawn(card: CardDefinition, slot: number): DrawnCard {
  return { cardId: card.id, rarity: card.rarity, slot };
}

/**
 * Draw a 5-card pack. Content is determined entirely by this call —
 * never re-roll on React render or resume.
 */
export function drawPack(options: DrawOptions = {}): PackResult {
  const rng = options.rng ?? cryptoRandom;

  const isGoldPack =
    options.forceKind === "gold_pack" ||
    (options.forceKind !== "standard" && rng() < GOLD_PACK_PROBABILITY);

  if (isGoldPack) {
    const cards: DrawnCard[] = [];
    for (let slot = 0; slot < STANDARD_PACK_SIZE; slot++) {
      cards.push(toDrawn(pickByRarity("legendary", rng), slot));
    }
    return { kind: "gold_pack", cards };
  }

  const cards: DrawnCard[] = [];
  for (let slot = 0; slot < STANDARD_COMMON_SLOTS; slot++) {
    cards.push(toDrawn(pickByRarity("common", rng), slot));
  }
  const fifthRarity = rollFifthRarity(rng, options.forceFifthRarity);
  cards.push(toDrawn(pickByRarity(fifthRarity, rng), STANDARD_COMMON_SLOTS));
  return { kind: "standard", cards };
}

export function resolveDrawnCards(
  drawn: DrawnCard[],
): (CardDefinition & { slot: number })[] {
  return drawn.map((d) => {
    const card = getCard(d.cardId);
    if (!card) throw new Error(`Unknown card ${d.cardId}`);
    return { ...card, slot: d.slot };
  });
}
