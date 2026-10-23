/** Identifiants de bâtiments V1. */
export type BuildingTypeId =
  | "townhall"
  | "house"
  | "sawmill"
  | "quarry"
  | "school"
  | "market"
  | "warehouse"
  | "library"
  | "fountain"
  | "monument";

export type ResourceId = "gold" | "wood" | "stone" | "knowledge";

export type Resources = Record<ResourceId, number>;

export type UnlockCondition =
  | { kind: "start" }
  | { kind: "townhallLevel"; min: number }
  | { kind: "knowledgeEarned"; min: number }
  | { kind: "townhallAndKnowledge"; townhallMin: number; knowledgeMin: number };

export type BuildingDef = {
  id: BuildingTypeId;
  nameFr: string;
  width: number;
  height: number;
  unlock: UnlockCondition;
  baseCost: Resources;
  baseTimeSec: number;
  produces: ResourceId | null;
  baseProdPerSec: number;
  workers: number;
  populationBonus: number;
  unique?: boolean;
  storageBonus?: boolean;
  adjacentProdBonus?: boolean;
};

export type Construction = {
  startedAt: number;
  endsAt: number;
  targetLevel: number;
};

export type PlacedBuilding = {
  id: string;
  type: BuildingTypeId;
  x: number;
  y: number;
  level: number;
  lastCollectedAt: number;
  construction: Construction | null;
};

export type CellKind = "road" | "block" | "highway";

/**
 * Case de la grille jouable (MAP_SIZE×MAP_SIZE).
 * `parcelId` non null uniquement pour les blocs.
 */
export type Cell = {
  kind: CellKind;
  /** "px,py" si block, sinon null. */
  parcelId: string | null;
  buildingId: string | null;
};

export type GameState = {
  version: 1;
  resources: Resources;
  knowledgeEarned: number;
  buildings: PlacedBuilding[];
  /** Grille row-major : index = y * MAP_SIZE + x */
  cells: Cell[];
  /** Ids de parcelles débloquées ("px,py"), sérialisable. */
  unlockedParcels: string[];
  /** Nombre de parcelles achetées (hors départ). */
  parcelsBought: number;
  placingType: BuildingTypeId | null;
  selectedBuildingId: string | null;
  timeScale: number;
};

export type ActionResult =
  | { ok: true; state: GameState; message?: string }
  | { ok: false; state: GameState; message: string };

export type Cost = Partial<Resources>;
