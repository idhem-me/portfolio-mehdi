import type { BiomeId } from "./mapConfig";

/** Identifiants de bâtiments. */
export type BuildingTypeId =
  | "townhall"
  | "house"
  | "apartment"
  | "skyscraper"
  | "shop"
  | "sawmill"
  | "quarry"
  | "factory"
  | "carpenter"
  | "school"
  | "market"
  | "warehouse"
  | "library"
  | "fountain"
  | "church"
  | "park"
  | "tennis"
  | "pharmacy"
  | "police"
  | "fire_station"
  | "coal_plant"
  | "solar_plant"
  | "nuclear_plant"
  | "monument";

export type BuildingCategory =
  | "municipal"
  | "residential"
  | "commerce"
  | "industry"
  | "education"
  | "culture"
  | "leisure"
  | "energy"
  | "service";

export type NeedId =
  | "commerce"
  | "education"
  | "culture"
  | "leisure"
  | "health"
  | "safety";

export type ServesSpec = {
  need: NeedId;
  capacity: number;
};

export type ResourceId = "gold" | "wood" | "stone" | "knowledge" | "planks";

export type Resources = Record<ResourceId, number>;

export type UnlockCondition =
  | { kind: "start" }
  | { kind: "townhallLevel"; min: number }
  | { kind: "knowledgeEarned"; min: number }
  | { kind: "townhallAndKnowledge"; townhallMin: number; knowledgeMin: number };

export type BuildingDef = {
  id: BuildingTypeId;
  nameFr: string;
  category: BuildingCategory;
  width: number;
  height: number;
  unlock: UnlockCondition;
  baseCost: Resources;
  baseTimeSec: number;
  produces: ResourceId | null;
  baseProdPerSec: number;
  /** MW : + produit, − consomme. */
  power: number;
  /** Emplois offerts. */
  jobs: number;
  /** Capacité de logement (niveau 1 / formule si pas de housingLevels). */
  housing: number;
  /**
   * Capacité logement par niveau (index 0 = niv.1).
   * Si défini, remplace la formule capacityAtLevel pour le logement
   * et plafonne les améliorations à housingLevels.length.
   */
  housingLevels?: readonly number[];
  serves: ServesSpec | null;
  /** Rayon de couverture Manhattan (services). */
  serviceRadius?: number;
  pollution: number;
  unique?: boolean;
  storageBonus?: boolean;
  adjacentProdBonus?: boolean;
  /** Monument : multiplie la capacité culture ×2. */
  cultureMultiplier?: number;
};

export type Construction = {
  startedAt: number;
  endsAt: number;
  targetLevel: number;
};

/** Orientation d'une empreinte 2×1 (rotation H/V dans un îlot). */
export type FootprintRotation = "H" | "V";

export type PlacedBuilding = {
  id: string;
  type: BuildingTypeId;
  x: number;
  y: number;
  level: number;
  lastCollectedAt: number;
  construction: Construction | null;
  /** Empreinte 2×1 : H = (w,h) def, V = swap. Défaut H. */
  rotation?: FootprintRotation;
  /** Début de la période où les conditions du prochain palier sont remplies. */
  needsSince?: number | null;
  /** Début de la période où le palier actuel n'est plus justifié. */
  unmetSince?: number | null;
  /** Affiche le sprite chantier upgrade jusqu'à ce timestamp. */
  evolvingUntil?: number | null;
};

export type CellKind = "tile" | "road" | "intersection";

/** Orientation d'un segment de route (pas pour les intersections). */
export type RoadDir = "H" | "V";

/**
 * Case de la grille (CELL_PX = 320).
 * - tile : constructible
 * - road : segment bitume (art 1254×320) ; `roadDir` H ou V
 * - intersection : carrefour 320×320 (virages autorisés)
 */
export type Cell = {
  kind: CellKind;
  /** "bx,by" — parcelle propriétaire. */
  blockId: string | null;
  /** @deprecated alias de blockId. */
  parcelId: string | null;
  biome: BiomeId;
  /** Bitume construit (route ou intersection). */
  paved: boolean;
  /** Route d'entrée : indémolissable. */
  permanent: boolean;
  buildingId: string | null;
  /** Direction du segment si kind === "road". */
  roadDir?: RoadDir | null;
};

export type GameState = {
  /** v5 : tailles school/solar/factory 1×1 + ressource planks. */
  version: 5;
  mapSeed: number;
  resources: Resources;
  knowledgeEarned: number;
  buildings: PlacedBuilding[];
  /** Grille row-major : index = y * LANE_COUNT_X + x */
  cells: Cell[];
  /** Ids de blocs débloqués ("bx,by"). */
  unlockedParcels: string[];
  /** Nombre de blocs achetés (hors départ). */
  parcelsBought: number;
  placingType: BuildingTypeId | null;
  /** Orientation pendant le placement (R pour basculer H/V). */
  placingRotation: FootprintRotation;
  /** Mode outil Route : glisser pour bitumer les lanes. */
  placingRoad: boolean;
  /** Mode outil Bulldozer : sélection puis confirmation. */
  bulldozeMode: boolean;
  selectedBuildingId: string | null;
  /** Mode déplacement : id du bâtiment à repositionner (ghost). */
  movingBuildingId: string | null;
  timeScale: number;
  population: number;
  populationUpdatedAt: number;
};

export type { BiomeId };

export type ActionResult =
  | { ok: true; state: GameState; message?: string }
  | { ok: false; state: GameState; message: string };

export type Cost = Partial<Resources>;
