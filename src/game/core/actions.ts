import {
  MAX_TOWNHALL_LEVEL,
  PARCEL_COUNT,
  START_RESOURCES,
  maxConcurrentBuilds,
  parcelId,
  parseParcelId,
  startParcelIds,
} from "./balance";
import { getBuildingDef } from "./buildings";
import {
  accumulatedStock,
  activeConstructionCount,
  buildCost,
  canAfford,
  countOwned,
  durationSec,
  getTownhallLevel,
  isUnlocked,
  maxBuildingLevel,
  parcelCost,
  pay,
  upgradeCost,
  workersAvailable,
} from "./economy";
import {
  applyTownhallOccupation,
  canPlaceFootprint,
  createInitialCells,
  isAdjacentParcel,
  isParcelUnlocked,
  occupyFootprint,
  townhallOrigin,
} from "./grid";
import type {
  ActionResult,
  BuildingTypeId,
  GameState,
  PlacedBuilding,
  Resources,
} from "./types";

let nextId = 1;

function makeId(prefix: string): string {
  const id = `${prefix}-${nextId}`;
  nextId += 1;
  return id;
}

export function resetIdCounter(): void {
  nextId = 1;
}

export function createInitialState(now: number): GameState {
  resetIdCounter();
  const origin = townhallOrigin();
  const townhall: PlacedBuilding = {
    id: "townhall-0",
    type: "townhall",
    x: origin.x,
    y: origin.y,
    level: 1,
    lastCollectedAt: now,
    construction: null,
  };
  nextId = 1;
  const cells = applyTownhallOccupation(createInitialCells());
  return {
    version: 1,
    resources: { ...START_RESOURCES },
    knowledgeEarned: 0,
    buildings: [townhall],
    cells,
    unlockedParcels: startParcelIds(),
    parcelsBought: 0,
    placingType: null,
    selectedBuildingId: null,
    timeScale: 1,
  };
}

export function tick(state: GameState, now: number): GameState {
  let changed = false;
  const buildings = state.buildings.map((b) => {
    if (!b.construction) return b;
    if (now < b.construction.endsAt) return b;
    changed = true;
    return {
      ...b,
      level: b.construction.targetLevel,
      construction: null,
      lastCollectedAt: now,
    };
  });
  if (!changed) return state;
  return { ...state, buildings };
}

export function setPlacingType(
  state: GameState,
  type: BuildingTypeId | null
): GameState {
  return { ...state, placingType: type, selectedBuildingId: null };
}

export function selectBuilding(
  state: GameState,
  id: string | null
): GameState {
  return { ...state, selectedBuildingId: id, placingType: null };
}

export function placeBuilding(
  state: GameState,
  type: BuildingTypeId,
  x: number,
  y: number,
  now: number
): ActionResult {
  const def = getBuildingDef(type);

  if (!isUnlocked(state, type)) {
    return { ok: false, state, message: "Bâtiment verrouillé." };
  }
  if (def.unique && countOwned(state, type) > 0) {
    return { ok: false, state, message: "Un seul exemplaire autorisé." };
  }
  if (
    !canPlaceFootprint(
      state.cells,
      state.unlockedParcels,
      x,
      y,
      def.width,
      def.height
    )
  ) {
    return {
      ok: false,
      state,
      message:
        "Emplacement invalide (route, hors parcelle, chevauchement ou verrouillé).",
    };
  }

  const cost = buildCost(type, countOwned(state, type));
  if (!canAfford(state.resources, cost)) {
    return { ok: false, state, message: "Pas assez de ressources." };
  }

  if (def.workers > 0 && workersAvailable(state) < def.workers) {
    return {
      ok: false,
      state,
      message: `Travailleurs insuffisants (besoin de ${def.workers}).`,
    };
  }

  const thLevel = getTownhallLevel(state);
  const maxBuilds = maxConcurrentBuilds(thLevel);
  if (activeConstructionCount(state) >= maxBuilds) {
    return {
      ok: false,
      state,
      message: `Trop de chantiers simultanés (max ${maxBuilds}).`,
    };
  }

  const id = type === "townhall" ? "townhall-0" : makeId(type);
  const duration = durationSec(type, 0);
  const building: PlacedBuilding = {
    id,
    type,
    x,
    y,
    level: 0,
    lastCollectedAt: now,
    construction: {
      startedAt: now,
      endsAt: now + duration * 1000,
      targetLevel: 1,
    },
  };

  const cells = occupyFootprint(
    state.cells,
    x,
    y,
    def.width,
    def.height,
    id
  );

  return {
    ok: true,
    state: {
      ...state,
      resources: pay(state.resources, cost),
      buildings: [...state.buildings, building],
      cells,
      placingType: null,
      selectedBuildingId: id,
    },
    message: `${def.nameFr} en construction.`,
  };
}

export function startUpgrade(
  state: GameState,
  buildingId: string,
  now: number
): ActionResult {
  const building = state.buildings.find((b) => b.id === buildingId);
  if (!building) {
    return { ok: false, state, message: "Bâtiment introuvable." };
  }
  if (building.construction) {
    return { ok: false, state, message: "Chantier déjà en cours." };
  }

  const maxLvl =
    building.type === "townhall"
      ? MAX_TOWNHALL_LEVEL
      : maxBuildingLevel(state);

  if (building.level >= maxLvl) {
    return {
      ok: false,
      state,
      message:
        building.type === "townhall"
          ? "Niveau maximum atteint."
          : "Améliore d'abord la mairie.",
    };
  }

  const cost = upgradeCost(building.type, building.level);
  if (!canAfford(state.resources, cost)) {
    return { ok: false, state, message: "Pas assez de ressources." };
  }

  const thLevel = getTownhallLevel(state);
  const maxBuilds = maxConcurrentBuilds(thLevel);
  if (activeConstructionCount(state) >= maxBuilds) {
    return {
      ok: false,
      state,
      message: `Trop de chantiers simultanés (max ${maxBuilds}).`,
    };
  }

  const duration = durationSec(building.type, building.level);
  const def = getBuildingDef(building.type);

  const buildings = state.buildings.map((b) =>
    b.id === buildingId
      ? {
          ...b,
          construction: {
            startedAt: now,
            endsAt: now + duration * 1000,
            targetLevel: b.level + 1,
          },
        }
      : b
  );

  return {
    ok: true,
    state: {
      ...state,
      resources: pay(state.resources, cost),
      buildings,
    },
    message: `Amélioration de ${def.nameFr} lancée.`,
  };
}

export function collectBuilding(
  state: GameState,
  buildingId: string,
  now: number
): ActionResult {
  const building = state.buildings.find((b) => b.id === buildingId);
  if (!building) {
    return { ok: false, state, message: "Bâtiment introuvable." };
  }
  const def = getBuildingDef(building.type);
  if (!def.produces || building.construction) {
    return { ok: false, state, message: "Rien à récolter." };
  }

  const amount = accumulatedStock(state, building, now);
  if (amount < 0.01) {
    return { ok: false, state, message: "Stock vide." };
  }

  const resources: Resources = { ...state.resources };
  resources[def.produces] += amount;

  let knowledgeEarned = state.knowledgeEarned;
  if (def.produces === "knowledge") {
    knowledgeEarned += amount;
  }

  const buildings = state.buildings.map((b) =>
    b.id === buildingId ? { ...b, lastCollectedAt: now } : b
  );

  return {
    ok: true,
    state: { ...state, resources, buildings, knowledgeEarned },
  };
}

export function collectAll(state: GameState, now: number): ActionResult {
  let next = state;
  let any = false;
  for (const b of state.buildings) {
    const def = getBuildingDef(b.type);
    if (!def.produces || b.construction) continue;
    const res = collectBuilding(next, b.id, now);
    if (res.ok) {
      next = res.state;
      any = true;
    }
  }
  if (!any) {
    return { ok: false, state, message: "Rien à récolter." };
  }
  return { ok: true, state: next, message: "Récolte effectuée." };
}

export function buyParcel(
  state: GameState,
  px: number,
  py: number
): ActionResult {
  if (px < 0 || py < 0 || px >= PARCEL_COUNT || py >= PARCEL_COUNT) {
    return { ok: false, state, message: "Parcelle hors carte." };
  }
  const id = parcelId(px, py);
  if (isParcelUnlocked(state.unlockedParcels, id)) {
    return { ok: false, state, message: "Parcelle déjà débloquée." };
  }
  if (!isAdjacentParcel(state.unlockedParcels, px, py)) {
    return {
      ok: false,
      state,
      message: "La parcelle doit être adjacente à une zone débloquée.",
    };
  }

  const cost = parcelCost(state.parcelsBought);
  if (!canAfford(state.resources, { gold: cost })) {
    return { ok: false, state, message: "Pas assez d'or." };
  }

  return {
    ok: true,
    state: {
      ...state,
      resources: pay(state.resources, { gold: cost }),
      unlockedParcels: [...state.unlockedParcels, id],
      parcelsBought: state.parcelsBought + 1,
    },
    message: "Parcelle débloquée.",
  };
}

/** @deprecated — utiliser buyParcel */
export function buyTile(
  state: GameState,
  x: number,
  y: number
): ActionResult {
  void x;
  void y;
  return { ok: false, state, message: "Utilise l'achat de parcelle." };
}

export function debugGrantAll(state: GameState): GameState {
  return {
    ...state,
    resources: {
      gold: state.resources.gold + 10000,
      wood: state.resources.wood + 10000,
      stone: state.resources.stone + 10000,
      knowledge: state.resources.knowledge + 10000,
    },
    knowledgeEarned: state.knowledgeEarned + 10000,
  };
}

export function setTimeScale(state: GameState, scale: number): GameState {
  return { ...state, timeScale: Math.max(0.1, scale) };
}

export { parseParcelId };
