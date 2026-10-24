/**
 * Logique de grille uniforme (CELL_PX) + placement.
 * Maths : mapLanes.ts — ce fichier orchestre Cell / unlock / footprint.
 */

import {
  CELLS_PER_TILE,
  LOCKED_OVERLAY_ALPHA,
  LOCKED_OVERLAY_ALPHA_FAR,
  MAP_SEED,
  type BiomeId,
} from "./mapConfig";
import { biomeOfBlock, generateBlockBiomes } from "./mapGen";
import {
  LANE_COUNT_X,
  LANE_COUNT_Y,
  blockIdOfTile,
  blockIsletOrigins,
  blockLaneOrigin,
  blockOfTileLane,
  blockTiles,
  cellGeomKind,
  cellIndex as laneCellIndex,
  inLaneBounds,
  ownerBlockOfRoad,
  startBlockIds,
} from "./mapLanes";
import type { Cell, FootprintRotation } from "./types";

const ORTHO: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export {
  LANE_COUNT_X,
  LANE_COUNT_Y,
  blockIdOfTile,
  blockIsletOrigins,
  blockLaneOrigin,
  blockTiles,
  cellGeomKind,
  inLaneBounds,
  ownerBlockOfRoad,
  startBlockIds,
};

export function cellIndex(x: number, y: number): number {
  return laneCellIndex(x, y);
}

export function inBounds(x: number, y: number): boolean {
  return inLaneBounds(x, y);
}

export function getCell(cells: Cell[], x: number, y: number): Cell | null {
  if (!inBounds(x, y)) return null;
  return cells[cellIndex(x, y)] ?? null;
}

/** @deprecated plus de lanes structurelles — utiliser cell.paved. */
export function isRoadCoord(_x: number, _y: number): boolean {
  return false;
}

export function parcelOfBlock(x: number, y: number): string | null {
  return blockIdOfTile(x, y);
}

/** @deprecated alias — origine lane NW du bloc. */
export function parcelBlockOrigin(px: number, py: number): { x: number; y: number } {
  return blockLaneOrigin(px, py);
}

export function parcelBlocks(px: number, py: number): { x: number; y: number }[] {
  return blockTiles(px, py);
}

export function isParcelUnlocked(
  unlockedParcels: string[],
  id: string
): boolean {
  return unlockedParcels.includes(id);
}

export function isAdjacentParcel(
  unlockedParcels: string[],
  px: number,
  py: number
): boolean {
  for (const [dx, dy] of ORTHO) {
    const nid = `${px + dx},${py + dy}`;
    if (unlockedParcels.includes(nid)) return true;
  }
  return false;
}

/**
 * Case bitume jouable : déjà pavée, ou dans un bloc débloqué.
 */
export function isRoadPlayable(
  cells: Cell[],
  unlockedParcels: string[],
  x: number,
  y: number
): boolean {
  const c = getCell(cells, x, y);
  if (!c) return false;
  if (c.paved || c.permanent) return true;
  return Boolean(c.blockId && unlockedParcels.includes(c.blockId));
}

/** @deprecated alias de isRoadPlayable */
export function isRoadVisible(
  cells: Cell[],
  unlockedParcels: string[],
  x: number,
  y: number
): boolean {
  return isRoadPlayable(cells, unlockedParcels, x, y);
}

/**
 * Biome d'affichage d'une route/intersection :
 * - eau ssi toutes les tuiles voisines ortho sont eau ;
 * - sinon biome majoritaire des voisines ; herbe en cas d'égalité.
 */
export function resolveRoadBiome(
  cells: Cell[],
  x: number,
  y: number
): BiomeId {
  const self = getCell(cells, x, y);
  if (self) return self.biome;
  return "herbe";
}

export function roadNeighborMask(
  cells: Cell[],
  unlockedParcels: string[],
  x: number,
  y: number
): number {
  let mask = 0;
  const dirs: { dx: number; dy: number; bit: number }[] = [
    { dx: 0, dy: -1, bit: 1 },
    { dx: 1, dy: 0, bit: 2 },
    { dx: 0, dy: 1, bit: 4 },
    { dx: -1, dy: 0, bit: 8 },
  ];
  for (const { dx, dy, bit } of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(nx, ny)) continue;
    if (isRoadPlayable(cells, unlockedParcels, nx, ny)) mask |= bit;
  }
  return mask;
}

/** Empreinte en unités tuile bâtiment (1 = 1254 px visuels). */
export function footprintDims(
  width: number,
  height: number,
  rotation: FootprintRotation = "H"
): { w: number; h: number } {
  if (rotation === "V") return { w: height, h: width };
  return { w: width, h: height };
}

/** Empreinte en cases de grille (320 px) — 1 tuile = CELLS_PER_TILE cases. */
export function fineFootprintDims(
  width: number,
  height: number,
  rotation: FootprintRotation = "H"
): { w: number; h: number } {
  const { w, h } = footprintDims(width, height, rotation);
  return { w: w * CELLS_PER_TILE, h: h * CELLS_PER_TILE };
}

/**
 * Empreinte sur des cases libres d'un même bloc débloqué (pas de bitume).
 * `width`/`height` = unités tuile bâtiment ; occupancy = × CELLS_PER_TILE.
 */
export function canPlaceFootprint(
  cells: Cell[],
  unlockedParcels: string[],
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: FootprintRotation = "H",
  /** Pendant un déplacement : ignore l'empreinte actuelle de ce bâtiment. */
  ignoreBuildingId: string | null = null
): boolean {
  const { w, h } = fineFootprintDims(width, height, rotation);
  if (!inBounds(x, y) || !inBounds(x + w - 1, y + h - 1)) return false;

  let block: string | null = null;

  for (let ty = y; ty < y + h; ty++) {
    for (let tx = x; tx < x + w; tx++) {
      const c = getCell(cells, tx, ty);
      if (!c || !c.blockId) return false;
      if (c.biome === "eau") return false;
      if (c.paved) return false;
      if (c.buildingId && c.buildingId !== ignoreBuildingId) return false;
      if (!unlockedParcels.includes(c.blockId)) return false;
      if (block === null) block = c.blockId;
      else if (block !== c.blockId) return false;
    }
  }
  return true;
}

export function occupyFootprint(
  cells: Cell[],
  x: number,
  y: number,
  width: number,
  height: number,
  buildingId: string,
  rotation: FootprintRotation = "H"
): Cell[] {
  const { w, h } = fineFootprintDims(width, height, rotation);
  const next = cells.slice();
  for (let ty = y; ty < y + h; ty++) {
    for (let tx = x; tx < x + w; tx++) {
      const i = cellIndex(tx, ty);
      const c = next[i];
      if (!c) continue;
      next[i] = { ...c, buildingId };
    }
  }
  return next;
}

/** Libère toutes les cases occupées par `buildingId`. */
export function clearBuildingFromCells(
  cells: Cell[],
  buildingId: string
): Cell[] {
  let changed = false;
  const next = cells.map((c) => {
    if (c.buildingId !== buildingId) return c;
    changed = true;
    return { ...c, buildingId: null };
  });
  return changed ? next : cells;
}

/**
 * Carte générée (biomes) + route d'entrée bitume jusqu'à la mairie.
 */
export function createInitialCells(seed: number = MAP_SEED): Cell[] {
  const biomes = generateBlockBiomes(seed);
  const cells: Cell[] = [];
  for (let y = 0; y < LANE_COUNT_Y; y++) {
    for (let x = 0; x < LANE_COUNT_X; x++) {
      const blockId = blockIdOfTile(x, y);
      let biome: BiomeId = "herbe";
      if (blockId) {
        const [bx, by] = blockId.split(",").map(Number) as [number, number];
        biome = biomeOfBlock(biomes, bx, by);
      }
      cells.push({
        kind: "tile",
        blockId,
        parcelId: blockId,
        biome,
        paved: false,
        permanent: false,
        buildingId: null,
        roadDir: null,
      });
    }
  }
  return applyEntryHighway(cells);
}

/**
 * Mairie : bloc départ NW. Empreinte 4×4 cases ; route d'entrée juste au sud.
 */
export function townhallOrigin(): { x: number; y: number } {
  const id = startBlockIds()[0]!;
  const [bx, by] = id.split(",").map(Number) as [number, number];
  const o = blockLaneOrigin(bx, by);
  return { x: o.x + 4, y: o.y + 4 };
}

/** Ligne Y juste sous l'empreinte mairie (CELLS_PER_TILE cases). */
export function entryRoadLaneY(): number {
  return townhallOrigin().y + CELLS_PER_TILE;
}

/** Route devant le parking mairie (pour orientation / BFS). */
export function townhallAccessRoad(): { x: number; y: number } {
  const th = townhallOrigin();
  return { x: th.x, y: entryRoadLaneY() };
}

/**
 * Route d'entrée : du bord droit jusqu'à la mairie.
 * Un run H continu (route-bitume) ; intersection seulement si branchement.
 */
function applyEntryHighway(cells: Cell[]): Cell[] {
  const roadY = entryRoadLaneY();
  const endX = townhallOrigin().x;
  const entryX = LANE_COUNT_X - 1;

  const next = cells.slice();
  const x0 = Math.min(entryX, endX);
  const x1 = Math.max(entryX, endX);
  for (let x = x0; x <= x1; x++) {
    const i = cellIndex(x, roadY);
    const c = next[i];
    if (!c) continue;
    next[i] = {
      ...c,
      paved: true,
      permanent: true,
      kind: "road",
      roadDir: "H",
    };
  }
  return next;
}

export function applyTownhallOccupation(cells: Cell[]): Cell[] {
  const o = townhallOrigin();
  return occupyFootprint(cells, o.x, o.y, 1, 1, "townhall-0");
}

/** Blocs dont au moins une tuile touche la case (pour overlay lock). */
export function neighboringBlocks(x: number, y: number): string[] {
  const id = blockIdOfTile(x, y);
  return id ? [id] : [];
}

export function isCellLockedVisual(
  cells: Cell[],
  unlockedParcels: string[],
  x: number,
  y: number
): boolean {
  const c = getCell(cells, x, y);
  if (!c) return true;
  if (c.permanent || c.paved) return false;
  return !c.blockId || !unlockedParcels.includes(c.blockId);
}

/** Alpha de grisé selon accessibilité (adjacent = plus léger). */
export function lockedOverlayAlphaForCell(
  unlockedParcels: string[],
  x: number,
  y: number
): number {
  const id = blockIdOfTile(x, y);
  if (!id) return LOCKED_OVERLAY_ALPHA_FAR;
  const [bx, by] = id.split(",").map(Number) as [number, number];
  return isAdjacentParcel(unlockedParcels, bx, by)
    ? LOCKED_OVERLAY_ALPHA
    : LOCKED_OVERLAY_ALPHA_FAR;
}

void blockOfTileLane;
void cellGeomKind;
void ownerBlockOfRoad;
