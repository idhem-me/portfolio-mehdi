export const RARITIES = [
  "common",
  "rare",
  "epic",
  "legendary",
  "gold",
  "diamond",
] as const;

export type Rarity = (typeof RARITIES)[number];

export const RARITY_LABELS: Record<Rarity, string> = {
  common: "Commune",
  rare: "Rare",
  epic: "Épique",
  legendary: "Légendaire",
  gold: "Gold",
  diamond: "Diamant",
};

/** Ordered from lowest to highest for comparisons / “best rarity”. */
export const RARITY_RANK: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
  gold: 4,
  diamond: 5,
};

export type CardDefinition = {
  id: string;
  name: string;
  rarity: Rarity;
  number: number;
  description?: string;
};
