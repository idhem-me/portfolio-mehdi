/**
 * Mapping type/palier → texture d'atlas (V1 : placeholders).
 * Paliers pilotés par VISUAL_TIER_THRESHOLDS dans balance.ts.
 */
import { VISUAL_TIER_THRESHOLDS } from "@/game/core/balance";
import type { BuildingTypeId } from "@/game/core/types";
import manifest from "./assets.manifest.json";

export type VisualTier = number;

export function visualTier(level: number): VisualTier {
  let tier = 1;
  for (let i = 0; i < VISUAL_TIER_THRESHOLDS.length; i++) {
    if (level >= VISUAL_TIER_THRESHOLDS[i]!) tier = i + 1;
  }
  return tier;
}

export function resolveBuildingAsset(
  type: BuildingTypeId,
  tier: VisualTier
): string | null {
  void type;
  void tier;
  void manifest;
  return null;
}

export { manifest };
