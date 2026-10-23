import {
  buildCost as coreBuildCost,
  isUnlocked as coreUnlocked,
} from "@/game/core/economy";
import { countOwned as coreCount } from "@/game/core/economy";
import { formatCompact } from "@/game/core/format";
import type { BuildingTypeId, GameState, Resources } from "@/game/core/types";

export function buildCost(type: BuildingTypeId, n: number): Resources {
  return coreBuildCost(type, n);
}

export function countOwned(state: GameState, type: BuildingTypeId): number {
  return coreCount(state, type);
}

export function isUnlocked(state: GameState, type: BuildingTypeId): boolean {
  return coreUnlocked(state, type);
}

export function formatCostLine(cost: Resources): string {
  const parts: string[] = [];
  if (cost.gold) parts.push(`${formatCompact(cost.gold)} or`);
  if (cost.wood) parts.push(`${formatCompact(cost.wood)} bois`);
  if (cost.stone) parts.push(`${formatCompact(cost.stone)} pierre`);
  if (cost.knowledge) parts.push(`${formatCompact(cost.knowledge)} savoir`);
  return parts.join(" · ") || "Gratuit";
}
