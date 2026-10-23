/**
 * Paramètres d'équilibrage.
 * Formules en puissance (valides au-delà du niveau max) — pas de tables par niveau.
 */

/** Nombre de parcelles par côté (8×8). */
export const PARCEL_COUNT = 8;

/**
 * Grille de cases : période 3 = 2 blocs + 1 route partagée.
 * MAP_SIZE = PARCEL_COUNT * 3 → indices 0..23, dernière ligne/colonne = route.
 * (La mention « 19×19 » dans un draft correspondait à 6 parcelles ; on garde 8×8.)
 */
export const MAP_SIZE = PARCEL_COUNT * 3;

/** 2×2 blocs constructibles par parcelle. */
export const PARCEL_BLOCKS = 2;

export const BUILD_GROWTH = 1.15;
export const UPGRADE_GROWTH = 1.6;
export const TIME_GROWTH = 1.45;
export const TIME_CAP_SEC = 28800;
export const PROD_GROWTH = 1.1;

/** Coût parcelle : ceil(150 × 1.45^k). */
export const PARCEL_BASE = 150;
export const PARCEL_GROWTH = 1.45;

export const STORAGE_BASE_SEC = 600;
export const STORAGE_LVL_BONUS = 0.25;
export const WAREHOUSE_STORAGE_BONUS = 0.25;
export const FOUNTAIN_ADJ_BONUS = 0.1;

/** Niveau max mairie (= plafond des autres bâtiments). */
export const MAX_TOWNHALL_LEVEL = 10;

/** @deprecated alias — utiliser MAX_TOWNHALL_LEVEL */
export const TOWNHALL_MAX_LEVEL = MAX_TOWNHALL_LEVEL;

/**
 * Seuils de paliers visuels (t1, t2, t3, …).
 * Ajouter un t4 = pousser un seuil ici, sans toucher au rendu.
 * Index 0 → tier 1 pour level >= thresholds[0], etc.
 */
export const VISUAL_TIER_THRESHOLDS = [1, 5, 10] as const;

export const START_RESOURCES = {
  gold: 100,
  wood: 50,
  stone: 0,
  knowledge: 0,
} as const;

export const MAP_SEED = 0x7111a9e;

/** Anneau hors-jeu (cases décor) autour de la carte jouable. */
export const SCENERY_RING = 3;

export function maxConcurrentBuilds(townhallLevel: number): number {
  if (townhallLevel >= 7) return 3;
  if (townhallLevel >= 4) return 2;
  return 1;
}

/** Parcelles centrales de départ (2×2). */
export function startParcelIds(): string[] {
  const c = PARCEL_COUNT / 2 - 1; // 3 pour 8
  return [
    parcelId(c, c),
    parcelId(c + 1, c),
    parcelId(c, c + 1),
    parcelId(c + 1, c + 1),
  ];
}

export function parcelId(px: number, py: number): string {
  return `${px},${py}`;
}

export function parseParcelId(id: string): { px: number; py: number } {
  const [a, b] = id.split(",");
  return { px: Number(a), py: Number(b) };
}
