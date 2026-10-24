import {
  POP_TAU_SEC,
  START_RESOURCES,
  maxConcurrentBuilds,
  parcelId,
  parseParcelId,
  startParcelIds,
} from "./balance";
import {
  BUILDING_REFUND_RATIO,
  MAP_BLOCKS_H,
  MAP_BLOCKS_W,
  MAP_SEED,
} from "./mapConfig";
import { getBuildingDef, V5_SIZE_CHANGED } from "./buildings";
import { computeCity } from "./city";
import { isAutoEvolveResidential, tickHousingEvolution } from "./housingEvolution";
import {
  accumulatedStock,
  activeConstructionCount,
  buildCost,
  canAfford,
  carpenterPlanksFromDt,
  countOwned,
  durationSec,
  effectiveProductionPerSec,
  getTownhallLevel,
  isUnlocked,
  maxLevelForType,
  parcelCost,
  pay,
  scaleCost,
  storageCap,
  upgradeCost,
} from "./economy";
import {
  applyTownhallOccupation,
  canPlaceFootprint,
  clearBuildingFromCells,
  createInitialCells,
  isAdjacentParcel,
  isParcelUnlocked,
  occupyFootprint,
  townhallOrigin,
} from "./grid";
import type {
  ActionResult,
  BuildingTypeId,
  FootprintRotation,
  GameState,
  PlacedBuilding,
  Resources,
} from "./types";

function refundResources(base: Resources, ratio: number): Resources {
  return scaleCost(base, ratio);
}

function credit(resources: Resources, amount: Resources): Resources {
  return {
    gold: resources.gold + amount.gold,
    wood: resources.wood + amount.wood,
    stone: resources.stone + amount.stone,
    knowledge: resources.knowledge + amount.knowledge,
    planks: (resources.planks ?? 0) + (amount.planks ?? 0),
  };
}

function normalizeResources(r: Partial<Resources> | undefined): Resources {
  return {
    gold: r?.gold ?? 0,
    wood: r?.wood ?? 0,
    stone: r?.stone ?? 0,
    knowledge: r?.knowledge ?? 0,
    planks: r?.planks ?? 0,
  };
}

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
    /** Parking face sud → route d'entrée (H). */
    rotation: "H",
  };
  nextId = 1;
  const cells = applyTownhallOccupation(createInitialCells(MAP_SEED));
  return {
    version: 5,
    mapSeed: MAP_SEED,
    resources: { ...START_RESOURCES },
    knowledgeEarned: 0,
    buildings: [townhall],
    cells,
    unlockedParcels: startParcelIds(),
    parcelsBought: 0,
    placingType: null,
    placingRotation: "H",
    placingRoad: false,
    bulldozeMode: false,
    selectedBuildingId: null,
    movingBuildingId: null,
    timeScale: 1,
    population: 0,
    populationUpdatedAt: now,
  };
}

/**
 * v5 : tailles school/solar/factory 1×1 + planks.
 * v4 → migrate in-place (garde case d'origine).
 * version < 4 → reset complet.
 */
export function migrate(raw: unknown): GameState {
  const s = raw as { version?: number; populationUpdatedAt?: number };
  const now =
    typeof s.populationUpdatedAt === "number"
      ? s.populationUpdatedAt
      : Date.now();
  if (s.version === 5) {
    const g = raw as GameState;
    return {
      ...g,
      resources: normalizeResources(g.resources),
      placingRotation: g.placingRotation ?? "H",
      placingRoad: g.placingRoad ?? false,
      bulldozeMode: g.bulldozeMode ?? false,
      movingBuildingId: g.movingBuildingId ?? null,
    };
  }
  if (s.version === 4) {
    const g = raw as GameState & { version: 4 };
    let cells = g.cells;
    // Empreinte réduite : libère l'ancienne, réoccupe depuis (x,y) d'origine.
    for (const b of g.buildings) {
      if (!V5_SIZE_CHANGED.has(b.type)) continue;
      const def = getBuildingDef(b.type);
      const rot = b.rotation ?? "H";
      cells = clearBuildingFromCells(cells, b.id);
      cells = occupyFootprint(
        cells,
        b.x,
        b.y,
        def.width,
        def.height,
        b.id,
        rot
      );
    }
    return {
      ...g,
      version: 5,
      resources: normalizeResources(g.resources),
      cells,
      placingRotation: g.placingRotation ?? "H",
      placingRoad: g.placingRoad ?? false,
      bulldozeMode: g.bulldozeMode ?? false,
      movingBuildingId: g.movingBuildingId ?? null,
    };
  }
  return createInitialState(now);
}

export function tick(state: GameState, now: number): GameState {
  let buildings = state.buildings;
  let constructionChanged = false;
  buildings = state.buildings.map((b) => {
    if (!b.construction) return b;
    if (now < b.construction.endsAt) return b;
    constructionChanged = true;
    return {
      ...b,
      level: b.construction.targetLevel,
      construction: null,
      lastCollectedAt: now,
    };
  });

  let next: GameState = constructionChanged
    ? { ...state, buildings }
    : state;

  const dtSec = Math.max(0, (now - next.populationUpdatedAt) / 1000);
  if (dtSec > 0 || constructionChanged) {
    const city = computeCity(next, now);
    const target = city.targetPopulation;
    const pop0 = next.population;
    const population =
      target + (pop0 - target) * Math.exp(-dtSec / POP_TAU_SEC);
    next = {
      ...next,
      population,
      populationUpdatedAt: now,
    };
  }

  next = tickHousingEvolution(next, now);
  return next;
}

export function setPlacingType(
  state: GameState,
  type: BuildingTypeId | null
): GameState {
  return {
    ...state,
    placingType: type,
    placingRotation: "H",
    placingRoad: false,
    bulldozeMode: false,
    selectedBuildingId: null,
    movingBuildingId: null,
  };
}

/** Active / désactive l'outil route (tracé au glisser). */
export function setPlacingRoad(
  state: GameState,
  on: boolean
): GameState {
  return {
    ...state,
    placingRoad: on,
    bulldozeMode: on ? false : state.bulldozeMode,
    placingType: on ? null : state.placingType,
    selectedBuildingId: on ? null : state.selectedBuildingId,
    movingBuildingId: on ? null : state.movingBuildingId,
  };
}

/** Active / désactive l'outil bulldozer. */
export function setBulldozeMode(
  state: GameState,
  on: boolean
): GameState {
  return {
    ...state,
    bulldozeMode: on,
    placingRoad: on ? false : state.placingRoad,
    placingType: on ? null : state.placingType,
    selectedBuildingId: on ? null : state.selectedBuildingId,
    movingBuildingId: on ? null : state.movingBuildingId,
  };
}

/** Bascule H ↔ V (empreintes non carrées). */
export function cyclePlacingRotation(state: GameState): GameState {
  if (!state.placingType) return state;
  const def = getBuildingDef(state.placingType);
  if (def.width === def.height) return state;
  const next: FootprintRotation =
    state.placingRotation === "H" ? "V" : "H";
  return { ...state, placingRotation: next };
}

export function selectBuilding(
  state: GameState,
  id: string | null
): GameState {
  return {
    ...state,
    selectedBuildingId: id,
    placingType: null,
    placingRoad: false,
    bulldozeMode: false,
    movingBuildingId: null,
  };
}

export function startMoveBuilding(
  state: GameState,
  id: string
): GameState {
  const b = state.buildings.find((x) => x.id === id);
  if (!b) return state;
  return {
    ...state,
    movingBuildingId: id,
    selectedBuildingId: id,
    placingType: null,
    placingRoad: false,
    bulldozeMode: false,
    placingRotation: b.rotation ?? "H",
  };
}

export function cancelMove(state: GameState): GameState {
  if (!state.movingBuildingId) return state;
  return { ...state, movingBuildingId: null };
}

export function moveBuilding(
  state: GameState,
  id: string,
  x: number,
  y: number
): ActionResult {
  const building = state.buildings.find((b) => b.id === id);
  if (!building) {
    return { ok: false, state, message: "Bâtiment introuvable." };
  }
  if (state.movingBuildingId !== id) {
    return { ok: false, state, message: "Pas en mode déplacement." };
  }
  const def = getBuildingDef(building.type);
  const rotation = building.rotation ?? "H";
  if (
    !canPlaceFootprint(
      state.cells,
      state.unlockedParcels,
      x,
      y,
      def.width,
      def.height,
      rotation,
      id
    )
  ) {
    return {
      ok: false,
      state,
      message:
        "Emplacement invalide (route, hors îlot, chevauchement ou verrouillé).",
    };
  }
  if (building.x === x && building.y === y) {
    return {
      ok: true,
      state: { ...state, movingBuildingId: null, selectedBuildingId: id },
      message: "Emplacement inchangé.",
    };
  }

  let cells = clearBuildingFromCells(state.cells, id);
  cells = occupyFootprint(
    cells,
    x,
    y,
    def.width,
    def.height,
    id,
    rotation
  );
  const buildings = state.buildings.map((b) =>
    b.id === id ? { ...b, x, y } : b
  );
  return {
    ok: true,
    state: {
      ...state,
      cells,
      buildings,
      movingBuildingId: null,
      selectedBuildingId: id,
      placingType: null,
    },
    message: `${def.nameFr} déplacé.`,
  };
}

export function demolishBuilding(
  state: GameState,
  id: string
): ActionResult {
  const building = state.buildings.find((b) => b.id === id);
  if (!building) {
    return { ok: false, state, message: "Bâtiment introuvable." };
  }
  if (building.type === "townhall") {
    return {
      ok: false,
      state,
      message: "La mairie ne peut pas être démolie.",
    };
  }
  const owned = countOwned(state, building.type);
  const base = buildCost(building.type, Math.max(0, owned - 1));
  const refund = refundResources(base, BUILDING_REFUND_RATIO);
  const cells = clearBuildingFromCells(state.cells, id);
  const buildings = state.buildings.filter((b) => b.id !== id);
  const def = getBuildingDef(building.type);
  return {
    ok: true,
    state: {
      ...state,
      cells,
      buildings,
      resources: credit(state.resources, refund),
      selectedBuildingId: null,
      movingBuildingId: null,
      placingType: null,
      bulldozeMode: state.bulldozeMode,
    },
    message: `${def.nameFr} démoli — +${refund.gold}🪙`,
  };
}

export function placeBuilding(
  state: GameState,
  type: BuildingTypeId,
  x: number,
  y: number,
  now: number,
  rotation: FootprintRotation = state.placingRotation ?? "H"
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
      def.height,
      rotation
    )
  ) {
    return {
      ok: false,
      state,
      message:
        "Emplacement invalide (route, hors îlot, chevauchement ou verrouillé).",
    };
  }

  const cost = buildCost(type, countOwned(state, type));
  if (!canAfford(state.resources, cost)) {
    const missing: string[] = [];
    if ((cost.gold ?? 0) > state.resources.gold) missing.push("or");
    if ((cost.wood ?? 0) > state.resources.wood) missing.push("bois");
    if ((cost.stone ?? 0) > state.resources.stone) missing.push("pierre");
    if ((cost.knowledge ?? 0) > state.resources.knowledge) {
      missing.push("savoir");
    }
    if ((cost.planks ?? 0) > (state.resources.planks ?? 0)) {
      missing.push("planches");
    }
    return {
      ok: false,
      state,
      message:
        missing.length > 0
          ? `Pas assez de ressources (${missing.join(", ")}).`
          : "Pas assez de ressources.",
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
    rotation,
  };

  const cells = occupyFootprint(
    state.cells,
    x,
    y,
    def.width,
    def.height,
    id,
    rotation
  );

  return {
    ok: true,
    state: {
      ...state,
      resources: pay(state.resources, cost),
      buildings: [...state.buildings, building],
      cells,
      placingType: null,
      placingRotation: "H",
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
  if (isAutoEvolveResidential(building.type)) {
    return {
      ok: false,
      state,
      message: "Les logements évoluent automatiquement.",
    };
  }
  if (building.construction) {
    return { ok: false, state, message: "Chantier déjà en cours." };
  }

  const maxLvl = maxLevelForType(state, building.type);

  if (building.level >= maxLvl) {
    const def = getBuildingDef(building.type);
    const tableCapped =
      def.housingLevels &&
      building.level >= def.housingLevels.length;
    return {
      ok: false,
      state,
      message:
        building.type === "townhall" || tableCapped
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

  const resources: Resources = normalizeResources(state.resources);

  if (building.type === "carpenter") {
    const rate = effectiveProductionPerSec(state, building);
    const elapsed = Math.max(0, (now - building.lastCollectedAt) / 1000);
    const cap = storageCap(state, building);
    const theoretical = Math.min(elapsed * rate, cap);
    const { planks, woodSpent } = carpenterPlanksFromDt(
      theoretical,
      resources.wood
    );
    if (planks < 0.01) {
      return {
        ok: false,
        state,
        message:
          resources.wood < 2
            ? "Pas assez de bois pour produire des planches."
            : "Stock vide.",
      };
    }
    resources.wood = Math.max(0, resources.wood - woodSpent);
    resources.planks += planks;
    const buildings = state.buildings.map((b) =>
      b.id === buildingId ? { ...b, lastCollectedAt: now } : b
    );
    return {
      ok: true,
      state: { ...state, resources, buildings },
    };
  }

  const amount = accumulatedStock(state, building, now);
  if (amount < 0.01) {
    return { ok: false, state, message: "Stock vide." };
  }

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
  if (px < 0 || py < 0 || px >= MAP_BLOCKS_W || py >= MAP_BLOCKS_H) {
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
    message: `Bloc débloqué −${cost}🪙`,
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
