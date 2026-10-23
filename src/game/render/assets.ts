/**
 * Mapping type/palier → texture (V1 : placeholders + premiers PNG).
 * Paliers pilotés par VISUAL_TIER_THRESHOLDS dans balance.ts.
 */
import { VISUAL_TIER_THRESHOLDS } from "@/game/core/balance";
import type { BuildingTypeId } from "@/game/core/types";
import manifest from "./assets.manifest.json";

export type VisualTier = number;

/**
 * Sprites prêts sous /public/game/asset.
 * Clé numérique = niveau bâtiment (0 = chantier / base).
 * `default` = fallback si le niveau exact n'existe pas.
 */
export type BuildingSpriteSet = {
  default?: string;
  [level: number]: string | undefined;
};

export const BUILDING_SPRITES: Partial<Record<BuildingTypeId, BuildingSpriteSet>> =
  {
    house: {
      0: "/game/asset/maison-fr-niv-0.png",
      default: "/game/asset/maison-fr-niv-0.png",
    },
  };

/** Toutes les URLs uniques à précharger. */
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
  const lvl = Math.max(0, Math.floor(level));
  return set[lvl] ?? set.default ?? null;
}

export function visualTier(level: number): VisualTier {
  let tier = 1;
  for (let i = 0; i < VISUAL_TIER_THRESHOLDS.length; i++) {
    if (level >= VISUAL_TIER_THRESHOLDS[i]!) tier = i + 1;
  }
  return tier;
}

export { manifest };
