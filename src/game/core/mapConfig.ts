/**
 * Constantes carte / DA top-down (vue de dessus).
 *
 * Grille de pose = CELL_PX (320) : snap fin pour routes & origines.
 * Empreinte visuelle bâtiment = TILE_PX (1254) par unité width/height.
 * Route = 1 case de CELL_PX de large.
 * 1 tuile bâtiment ≈ CELLS_PER_TILE cases (4 × 320 = 1280 ≈ 1254).
 */

/** Pas de la grille de placement / largeur de route (px monde). */
export const CELL_PX = 320;

/** Taille visuelle d'une tuile bâtiment 1×1 (px monde). */
export const TILE_PX = 1254;

/**
 * Cases de grille couvertes par 1 unité d'empreinte bâtiment.
 * 4 × 320 = 1280 px réservés pour un art 1254×1254.
 */
export const CELLS_PER_TILE = 4;

/**
 * Segment de route classique (asset route-*.png) : 1254×320.
 * Une « route » = 1 intersection (320²) + 1 segment.
 * Virages uniquement aux intersections.
 */
export const ROAD_LENGTH_PX = TILE_PX;
export const ROAD_PX = CELL_PX;
export const INTERSECTION_PX = CELL_PX;
/** Cases de grille pour un segment classique (= CELLS_PER_TILE). */
export const ROAD_SEGMENT_CELLS = CELLS_PER_TILE;

/** Cases par côté d'un bloc débloquable (16 × 320 = 5120 px). */
export const PARCEL_CELLS = 16;

/** Taille d'un bloc en px monde. */
export const BLOCK_PX = CELL_PX * PARCEL_CELLS;

/**
 * Carte 10×8 blocs → carré de départ 2×2 exactement centré
 * (indices départ : bx 4–5, by 3–4).
 */
export const MAP_BLOCKS_W = 10;
export const MAP_BLOCKS_H = 8;

export const MAP_SEED = 0x7111a9e;

export const ROAD_COST = 10;
export const INTERSECTION_COST = 5;
export const ROAD_REFUND_RATIO = 0.5;
/** Remboursement à la démolition d'un bâtiment (fraction du coût de construction). */
export const BUILDING_REFUND_RATIO = 0.5;

/** Overlay gris — bloc verrouillé adjacent (débloquable). */
export const LOCKED_OVERLAY_ALPHA = 0.35;
/** Overlay gris — bloc verrouillé non adjacent (plus marqué). */
export const LOCKED_OVERLAY_ALPHA_FAR = 0.55;

export const USE_BIOME_ROAD_SPRITES = true;

export const CAMERA_MAX_ZOOM = 1.2;
export const CAMERA_MIN_ZOOM_ABS = 0.04;
export const CAMERA_FIT_START_RATIO = 0.75;

export const ASSET_VILLAGE_BASE = "/game/asset-village";

export type BiomeId = "herbe" | "foret" | "eau";

export const BIOMES: readonly BiomeId[] = ["herbe", "foret", "eau"] as const;

export const TOOLTIP_DELAY_MS = 150;
export const TOAST_DURATION_MS = 2000;
export const UNLOCK_FADE_MS = 300;

export const HL_BUILD_VALID = 0x3ecf6a;
export const HL_BUILD_INVALID = 0xe85a5a;
export const HL_BUILD_FILL_ALPHA = 0.22;
export const HL_ROAD_VALID = 0xf5e6a3;
export const HL_ROAD_INVALID = 0xe85a5a;
export const HL_ROAD_PREVIEW_ALPHA = 0.55;
export const HL_UNLOCK_GOLD = 0xd4a017;
export const HL_GHOST_ALPHA = 0.6;
