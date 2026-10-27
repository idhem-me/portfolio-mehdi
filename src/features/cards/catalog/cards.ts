import type { CardDefinition, Rarity } from "./types";

function card(
  number: number,
  rarity: Rarity,
  name: string,
  description?: string,
): CardDefinition {
  const id = `card-${String(number).padStart(3, "0")}`;
  return { id, name, rarity, number, description };
}

/**
 * First demo set — exactly 40 cards:
 * 20 common, 10 rare, 6 epic, 2 legendary, 1 gold, 1 diamond.
 */
export const CATALOG: readonly CardDefinition[] = [
  // Commons 001–020
  card(1, "common", "Éclat matinal", "Une lueur douce au réveil."),
  card(2, "common", "Brise légère"),
  card(3, "common", "Galet poli"),
  card(4, "common", "Feuille sèche"),
  card(5, "common", "Goutte claire"),
  card(6, "common", "Fil d’argent"),
  card(7, "common", "Ombre courte"),
  card(8, "common", "Pas de danse"),
  card(9, "common", "Écho lointain"),
  card(10, "common", "Craie blanche"),
  card(11, "common", "Nuage bas"),
  card(12, "common", "Grain de sel"),
  card(13, "common", "Note oubliée"),
  card(14, "common", "Lueur de bougie"),
  card(15, "common", "Carte postale"),
  card(16, "common", "Clé rouillée"),
  card(17, "common", "Rameau vert"),
  card(18, "common", "Sable fin"),
  card(19, "common", "Reflet d’eau"),
  card(20, "common", "Soupir discret"),
  // Rares 021–030
  card(21, "rare", "Aurore filtrée", "Un filtre de lumière rare."),
  card(22, "rare", "Prisme doux"),
  card(23, "rare", "Voile argenté"),
  card(24, "rare", "Cristal pâle"),
  card(25, "rare", "Comète courte"),
  card(26, "rare", "Marée haute"),
  card(27, "rare", "Chant de verre"),
  card(28, "rare", "Arc brisé"),
  card(29, "rare", "Nébuleuse locale"),
  card(30, "rare", "Sceau lunaire"),
  // Epics 031–036
  card(31, "epic", "Néon violet", "Un halo dense et électrique."),
  card(32, "epic", "Tempête figée"),
  card(33, "epic", "Couronne d’éther"),
  card(34, "epic", "Abysse miroir"),
  card(35, "epic", "Forge stellaire"),
  card(36, "epic", "Danse des ions"),
  // Legendaries 037–038
  card(37, "legendary", "Souverain d’aube", "Une présence qui change la table."),
  card(38, "legendary", "Gardien du crépuscule"),
  // Gold 039
  card(39, "gold", "Lingot vivant", "Métal qui chante sous la lumière."),
  // Diamond 040
  card(40, "diamond", "Cœur prismatique", "Scintillement cristallin absolu."),
] as const;

export const CATALOG_BY_ID: ReadonlyMap<string, CardDefinition> = new Map(
  CATALOG.map((c) => [c.id, c]),
);

export function cardsByRarity(rarity: Rarity): readonly CardDefinition[] {
  return CATALOG.filter((c) => c.rarity === rarity);
}

export function getCard(id: string): CardDefinition | undefined {
  return CATALOG_BY_ID.get(id);
}

export const EXPECTED_RARITY_COUNTS: Record<Rarity, number> = {
  common: 20,
  rare: 10,
  epic: 6,
  legendary: 2,
  gold: 1,
  diamond: 1,
};
