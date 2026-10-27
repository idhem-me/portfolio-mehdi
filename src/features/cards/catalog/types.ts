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
  rare: "Peu commune",
  epic: "Rare",
  legendary: "Épique",
  gold: "Légendaire",
  diamond: "God",
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
  setId?: "origins" | "horizons";
  id: string;
  name: string;
  rarity: Rarity;
  number: number;
  description?: string;
};
