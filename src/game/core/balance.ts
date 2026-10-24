/**
 * Paramètres d'équilibrage.
 * Formules en puissance (valides au-delà du niveau max) — pas de tables par niveau.
 *
 * Dimensions carte / DA → voir mapConfig.ts + mapLanes.ts.
 */

import {
  MAP_BLOCKS_H,
  MAP_BLOCKS_W,
  MAP_SEED as CONFIG_MAP_SEED,
  PARCEL_CELLS,
} from "./mapConfig";
import { startBlockIds } from "./mapLanes";

/** @deprecated alias — utiliser MAP_BLOCKS_W / MAP_BLOCKS_H */
export const PARCEL_COUNT = MAP_BLOCKS_W;

/** Nombre de blocs sur chaque axe. */
export const MAP_BLOCKS_X = MAP_BLOCKS_W;
export const MAP_BLOCKS_Y = MAP_BLOCKS_H;

/** Largeur/hauteur carte en cases. */
export const MAP_SIZE = MAP_BLOCKS_W * PARCEL_CELLS;

/** @deprecated îlots — la parcelle entière est constructible. */
export const PARCEL_BLOCKS = PARCEL_CELLS;

export const BUILD_GROWTH = 1.15;
export const UPGRADE_GROWTH = 1.6;
export const TIME_GROWTH = 1.45;
export const TIME_CAP_SEC = 28800;
export const PROD_GROWTH = 1.1;

/** Coût parcelle/bloc : ceil(150 × 1.45^k). */
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
 */
export const VISUAL_TIER_THRESHOLDS = [1, 5, 10] as const;

export const START_RESOURCES = {
  gold: 300,
  wood: 80,
  /** Assez pour la centrale à charbon du tutoriel (80 pierre). */
  stone: 100,
  knowledge: 0,
  planks: 0,
} as const;

/** Bois consommé par planche produite (charpentier). */
export const WOOD_PER_PLANK = 2;

/** Coût planches : maison → t4. */
export const HOUSE_T4_PLANKS = 4;

/** Coût planches : maison t4 → immeuble. */
export const APARTMENT_EVOLVE_PLANKS = 12;

/** Délai maintien besoins avant évolution (s). */
export const EVOLVE_DELAY_SEC = 120;

/** Délai besoins non remplis avant régression (s). */
export const DEVOLVE_DELAY_SEC = 180;

/** Durée affichage chantier upgrade (ms). */
export const EVOLVE_VISUAL_MS = 2500;

/** Rayon Manhattan de base des services (cases). */
export const SERVICE_RADIUS_BASE = 4;

/** +rayon par niveau au-delà de 1. */
export const SERVICE_RADIUS_PER_LEVEL = 0.5;

/** Capacité × (1 + 0.5 × (lvl − 1)). */
export const CAPACITY_LVL_BONUS = 0.5;

/** Constante de temps pour la convergence population (s). */
export const POP_TAU_SEC = 60;

/** Part de la population active (emplois). */
export const ACTIVE_POP_RATIO = 0.6;

/** Impôt or /s / habitant (avant multiplicateur de besoin). */
export const TAX_PER_HAB = 0.02;

/** Attractivité de base selon niveau de besoins N0–N3. */
export const ATTRACTIVENESS_BY_NEED = [0.5, 0.8, 0.95, 1.0] as const;

/** Multiplicateur d'impôts selon N0–N3. */
export const TAX_MULT_BY_NEED = [0.5, 1, 1.5, 2.2] as const;

export const UNEMPLOYMENT_N1_MAX = 0.1;
export const UNEMPLOYMENT_TARGET_PENALTY = 0.15;
export const POWER_TARGET_PENALTY = 0.5;

export const ATTRACT_POLLUTION_PENALTY = 0.05;
export const ATTRACT_LEISURE_BONUS = 0.05;
export const ATTRACT_MIN = 0.2;
export const ATTRACT_MAX = 1;

export const MAP_SEED = CONFIG_MAP_SEED;

/** Anneau hors-jeu (décor) — réduit : la carte DA est déjà grande. */
export const SCENERY_RING = 1;
export const SCENERY_EXTENT = SCENERY_RING;

export function maxConcurrentBuilds(townhallLevel: number): number {
  if (townhallLevel >= 7) return 3;
  if (townhallLevel >= 4) return 2;
  return 1;
}

/** Blocs centraux de départ (2×2). */
export function startParcelIds(): string[] {
  return startBlockIds();
}

export function parcelId(px: number, py: number): string {
  return `${px},${py}`;
}

export function parseParcelId(id: string): { px: number; py: number } {
  const [a, b] = id.split(",");
  return { px: Number(a), py: Number(b) };
}
