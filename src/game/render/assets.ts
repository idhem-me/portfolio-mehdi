/**
 * Mapping type/palier → texture (DA top-down).
 *
 * Convention DA :
 * - Tuile bâtiment = 1254×1254 px monde (= art).
 * - Grille de pose / route = 320×320 px.
 * - Empreinte 1×1 / 2×1 ancrée [0,0] coin HG.
 * - Chargement réel via villageAssets.ts (placeholders si absent).
 */

import { VISUAL_TIER_THRESHOLDS } from "@/game/core/balance";
import { ASSET_VILLAGE_BASE, TILE_PX } from "@/game/core/mapConfig";
import type { BuildingTypeId } from "@/game/core/types";
import { VILLAGE_FILES } from "./villageAssets";
import manifest from "./assets.manifest.json";

/** Pixels art par tuile constructible. */
export const ASSET_PX_PER_TILE = TILE_PX;

export type VisualTier = number;

export type BuildingSpriteSet = {
  default?: string;
  [level: number]: string | undefined;
};

function assetUrl(rel: string): string {
  return `${ASSET_VILLAGE_BASE}/${rel
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/")}`;
}

export const BUILDING_SPRITES: Partial<
  Record<BuildingTypeId, BuildingSpriteSet>
> = {
  townhall: {
    1: assetUrl(VILLAGE_FILES.buildings.townhall),
    2: assetUrl(VILLAGE_FILES.buildings.townhall_2),
    default: assetUrl(VILLAGE_FILES.buildings.townhall),
  },
  house: {
    1: assetUrl(VILLAGE_FILES.buildings.house_1),
    2: assetUrl(VILLAGE_FILES.buildings.house_2),
    3: assetUrl(VILLAGE_FILES.buildings.house_3),
    4: assetUrl(VILLAGE_FILES.buildings.house_4),
    default: assetUrl(VILLAGE_FILES.buildings.house_1),
  },
  apartment: {
    1: assetUrl(VILLAGE_FILES.buildings.apartment_1),
    2: assetUrl(VILLAGE_FILES.buildings.apartment_2),
    3: assetUrl(VILLAGE_FILES.buildings.apartment_3),
    default: assetUrl(VILLAGE_FILES.buildings.apartment_1),
  },
  coal_plant: { default: assetUrl(VILLAGE_FILES.buildings.coal_plant) },
  shop: { default: assetUrl(VILLAGE_FILES.buildings.shop) },
  factory: { default: assetUrl(VILLAGE_FILES.buildings.factory) },
  sawmill: { default: assetUrl(VILLAGE_FILES.buildings.sawmill) },
  quarry: { default: assetUrl(VILLAGE_FILES.buildings.quarry) },
  school: { default: assetUrl(VILLAGE_FILES.buildings.school) },
  solar_plant: { default: assetUrl(VILLAGE_FILES.buildings.solar_plant) },
  carpenter: { default: assetUrl(VILLAGE_FILES.buildings.carpenter) },
  pharmacy: { default: assetUrl(VILLAGE_FILES.buildings.pharmacy) },
  police: { default: assetUrl(VILLAGE_FILES.buildings.police) },
  fire_station: { default: assetUrl(VILLAGE_FILES.buildings.fire_station) },
  church: { default: assetUrl(VILLAGE_FILES.buildings.church) },
  park: { default: assetUrl(VILLAGE_FILES.buildings.park) },
  tennis: { default: assetUrl(VILLAGE_FILES.buildings.tennis) },
  skyscraper: { default: assetUrl(VILLAGE_FILES.buildings.skyscraper) },
};

export function allBuildingSpriteUrls(): string[] {
  const urls = new Set<string>();
  for (const set of Object.values(BUILDING_SPRITES)) {
    if (!set) continue;
    for (const v of Object.values(set)) {
      if (v) urls.add(v);
    }
  }
  return [...urls];
}

export function resolveBuildingAsset(
  type: BuildingTypeId,
  level: number
): string | null {
  const set = BUILDING_SPRITES[type];
  if (!set) return null;
  const lvl = Math.max(1, Math.floor(level));
  if (set[lvl]) return set[lvl]!;
  // Au-delà du dernier stade art : clamp au plus haut niveau défini
  let best = 0;
  for (const k of Object.keys(set)) {
    const n = Number(k);
    if (!Number.isNaN(n) && n <= lvl && n > best) best = n;
  }
  if (best > 0 && set[best]) return set[best]!;
  return set.default ?? null;
}

export function visualTier(level: number): VisualTier {
  let tier = 1;
  for (let i = 0; i < VISUAL_TIER_THRESHOLDS.length; i++) {
    if (level >= VISUAL_TIER_THRESHOLDS[i]!) tier = i + 1;
  }
  return tier;
}

export { manifest };
