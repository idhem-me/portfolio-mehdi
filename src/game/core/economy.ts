import {
  BUILD_GROWTH,
  FOUNTAIN_ADJ_BONUS,
  MAX_TOWNHALL_LEVEL,
  PARCEL_BASE,
  PARCEL_GROWTH,
  PROD_GROWTH,
  STORAGE_BASE_SEC,
  STORAGE_LVL_BONUS,
  TAX_MULT_BY_NEED,
  TAX_PER_HAB,
  TIME_CAP_SEC,
  TIME_GROWTH,
  UPGRADE_GROWTH,
  WAREHOUSE_STORAGE_BONUS,
} from "./balance";
import { getBuildingDef } from "./buildings";
import {
  buildingEfficiency,
  capacityAtLevel,
  computeCity,
} from "./city";
import type {
  BuildingTypeId,
  Cost,
  GameState,
  PlacedBuilding,
  ResourceId,
  Resources,
} from "./types";

/** Une seule fonction d'arrondi pour affichage ET paiement. */
export function roundCost(n: number): number {
  return Math.ceil(n);
}

export function emptyResources(): Resources {
  return { gold: 0, wood: 0, stone: 0, knowledge: 0 };
}

export function scaleCost(base: Resources, factor: number): Resources {
  return {
    gold: roundCost(base.gold * factor),
    wood: roundCost(base.wood * factor),
    stone: roundCost(base.stone * factor),
    knowledge: roundCost(base.knowledge * factor),
  };
}

/** Coût du prochain exemplaire : ceil(base × 1.15^n), n = nb déjà possédés. */
export function buildCost(type: BuildingTypeId, ownedCount: number): Resources {
  const def = getBuildingDef(type);
  return scaleCost(def.baseCost, Math.pow(BUILD_GROWTH, ownedCount));
}

/** Coût pour passer de lvl à lvl+1 : ceil(base × 1.6^lvl). */
export function upgradeCost(type: BuildingTypeId, level: number): Resources {
  const def = getBuildingDef(type);
  return scaleCost(def.baseCost, Math.pow(UPGRADE_GROWTH, level));
}

/** Durée chantier : min(round(baseTime × 1.45^lvl), 28800). Construction initiale = baseTime (lvl 0). */
export function durationSec(type: BuildingTypeId, fromLevel: number): number {
  const def = getBuildingDef(type);
  return Math.min(
    Math.round(def.baseTimeSec * Math.pow(TIME_GROWTH, fromLevel)),
    TIME_CAP_SEC
  );
}

/** Production /s : baseProd × lvl × 1.1^lvl. */
export function productionPerSec(type: BuildingTypeId, level: number): number {
  const def = getBuildingDef(type);
  if (!def.produces || def.baseProdPerSec <= 0 || level <= 0) return 0;
  return def.baseProdPerSec * level * Math.pow(PROD_GROWTH, level);
}

/** Coût d'achat de parcelle : ceil(150 × 1.45^k), k = parcelles déjà achetées. */
export function parcelCost(parcelsBought: number): number {
  return roundCost(PARCEL_BASE * Math.pow(PARCEL_GROWTH, parcelsBought));
}

export function canAfford(resources: Resources, cost: Cost): boolean {
  const keys: ResourceId[] = ["gold", "wood", "stone", "knowledge"];
  for (const k of keys) {
    const need = cost[k] ?? 0;
    if (need > 0 && resources[k] < need) return false;
  }
  return true;
}

export function pay(resources: Resources, cost: Cost): Resources {
  return {
    gold: resources.gold - (cost.gold ?? 0),
    wood: resources.wood - (cost.wood ?? 0),
    stone: resources.stone - (cost.stone ?? 0),
    knowledge: resources.knowledge - (cost.knowledge ?? 0),
  };
}

export function countOwned(state: GameState, type: BuildingTypeId): number {
  return state.buildings.filter((b) => b.type === type).length;
}

export function getTownhall(state: GameState): PlacedBuilding | undefined {
  return state.buildings.find((b) => b.type === "townhall");
}

export function getTownhallLevel(state: GameState): number {
  return getTownhall(state)?.level ?? 1;
}

export function maxBuildingLevel(state: GameState): number {
  const th = getTownhallLevel(state);
  return Math.min(th, MAX_TOWNHALL_LEVEL);
}

/** Capacité de logement (hors chantiers). */
export function housingCapacity(state: GameState): number {
  let cap = 0;
  for (const b of state.buildings) {
    if (b.construction || b.level <= 0) continue;
    const def = getBuildingDef(b.type);
    cap += capacityAtLevel(def.housing, b.level);
  }
  return cap;
}

/** Emplois offerts (hors chantiers). */
export function jobsOffered(state: GameState): number {
  let jobs = 0;
  for (const b of state.buildings) {
    if (b.construction || b.level <= 0) continue;
    const def = getBuildingDef(b.type);
    jobs += capacityAtLevel(def.jobs, b.level);
  }
  return jobs;
}

/** @deprecated alias — utiliser housingCapacity */
export function populationCap(state: GameState): number {
  return housingCapacity(state);
}

/** @deprecated — jobs offerts (ex-workersUsed) */
export function workersUsed(state: GameState): number {
  return jobsOffered(state);
}

/** @deprecated — plus de gate construction ; conservé pour compat tests/UI. */
export function workersAvailable(state: GameState): number {
  return Math.max(0, housingCapacity(state) - jobsOffered(state));
}

export function activeConstructionCount(state: GameState): number {
  return state.buildings.filter((b) => b.construction !== null).length;
}

export function warehouseCount(state: GameState): number {
  return state.buildings.filter(
    (b) => b.type === "warehouse" && !b.construction
  ).length;
}

/** Multiplicateur de stockage global via entrepôts. */
export function storageMultiplier(state: GameState): number {
  return 1 + WAREHOUSE_STORAGE_BONUS * warehouseCount(state);
}

/**
 * Capacité de stockage pour un bâtiment producteur :
 * production × 600 × (1 + 0.25 × (lvl-1)) × bonusEntrepôts
 */
export function storageCap(state: GameState, building: PlacedBuilding): number {
  let prod = productionPerSec(building.type, building.level);
  if (building.type === "townhall") {
    prod += taxIncomePerSec(state);
  }
  if (prod <= 0) return 0;
  const levelFactor = 1 + STORAGE_LVL_BONUS * (building.level - 1);
  return prod * STORAGE_BASE_SEC * levelFactor * storageMultiplier(state);
}

function tilesOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

/** Une fontaine adjacente (4-voisinage d'empreintes) donne +10 % prod. */
export function adjacentFountainBonus(
  state: GameState,
  building: PlacedBuilding
): number {
  const def = getBuildingDef(building.type);
  for (const other of state.buildings) {
    if (other.id === building.id) continue;
    if (other.type !== "fountain" || other.construction) continue;
    const od = getBuildingDef(other.type);
    // Adjacence : empreintes se touchent en 4-voisinage (pas diagonale seule).
    const expanded = tilesOverlap(
      building.x - 1,
      building.y - 1,
      def.width + 2,
      def.height + 2,
      other.x,
      other.y,
      od.width,
      od.height
    );
    const overlapping = tilesOverlap(
      building.x,
      building.y,
      def.width,
      def.height,
      other.x,
      other.y,
      od.width,
      od.height
    );
    if (expanded && !overlapping) {
      // Vérifier qu'il y a au moins un bord partagé (pas seulement coin).
      const shareEdge =
        building.x + def.width === other.x ||
        other.x + od.width === building.x ||
        building.y + def.height === other.y ||
        other.y + od.height === building.y;
      if (shareEdge) return FOUNTAIN_ADJ_BONUS;
    }
  }
  return 0;
}

export function taxIncomePerSec(state: GameState): number {
  const city = computeCity(state);
  const mult = TAX_MULT_BY_NEED[city.needLevel];
  return state.population * TAX_PER_HAB * mult;
}

export function effectiveProductionPerSec(
  state: GameState,
  building: PlacedBuilding
): number {
  if (building.construction || building.level <= 0) return 0;
  const city = computeCity(state);
  const eff = buildingEfficiency(building, city);
  const fountain = 1 + adjacentFountainBonus(state, building);

  if (building.type === "townhall") {
    const base = productionPerSec(building.type, building.level);
    return (base * fountain + taxIncomePerSec(state)) * eff;
  }

  const base = productionPerSec(building.type, building.level);
  if (base <= 0) return 0;
  return base * fountain * eff;
}

/** Stock accumulé depuis lastCollectedAt, plafonné. */
export function accumulatedStock(
  state: GameState,
  building: PlacedBuilding,
  now: number
): number {
  const def = getBuildingDef(building.type);
  if (!def.produces || building.construction) return 0;
  const rate = effectiveProductionPerSec(state, building);
  if (rate <= 0) return 0;
  const elapsed = Math.max(0, (now - building.lastCollectedAt) / 1000);
  const cap = storageCap(state, building);
  return Math.min(elapsed * rate, cap);
}

export function isUnlocked(
  state: GameState,
  type: BuildingTypeId
): boolean {
  const def = getBuildingDef(type);
  const th = getTownhallLevel(state);
  switch (def.unlock.kind) {
    case "start":
      return true;
    case "townhallLevel":
      return th >= def.unlock.min;
    case "knowledgeEarned":
      return state.knowledgeEarned >= def.unlock.min;
    case "townhallAndKnowledge":
      return (
        th >= def.unlock.townhallMin &&
        state.knowledgeEarned >= def.unlock.knowledgeMin
      );
  }
}
