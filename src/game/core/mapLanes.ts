/**
 * Grille uniforme CELL_PX × CELL_PX.
 * Bloc = PARCEL_CELLS × PARCEL_CELLS cases (pas de lanes route structurelles).
 */

import {
  BLOCK_PX,
  CELL_PX,
  MAP_BLOCKS_H,
  MAP_BLOCKS_W,
  PARCEL_CELLS,
} from "./mapConfig";

/** @deprecated géométrie fixe abandonnée — toujours "tile". */
export type LaneKind = "road" | "tile";
/** @deprecated — rendu route via cell.paved + voisins. */
export type CellGeomKind = "tile" | "roadH" | "roadV" | "intersection";

/** Cases sur un axe pour `blocks` blocs. */
export function laneCount(blocks: number): number {
  return blocks * PARCEL_CELLS;
}

export const LANE_COUNT_X = laneCount(MAP_BLOCKS_W);
export const LANE_COUNT_Y = laneCount(MAP_BLOCKS_H);

/** Alias clairs. */
export const MAP_W = LANE_COUNT_X;
export const MAP_H = LANE_COUNT_Y;

export const MAP_SIZE_X = LANE_COUNT_X;
export const MAP_SIZE_Y = LANE_COUNT_Y;

export const MAP_WIDTH_PX = LANE_COUNT_X * CELL_PX;
export const MAP_HEIGHT_PX = LANE_COUNT_Y * CELL_PX;

/** @deprecated plus de lanes route. */
export function isRoadLane(_lane: number): boolean {
  return false;
}

export function laneKind(_lane: number): LaneKind {
  return "tile";
}

export function laneWidth(_lane: number): number {
  return CELL_PX;
}

export function laneOriginX(lx: number): number {
  return lx * CELL_PX;
}

export function laneOriginY(ly: number): number {
  return ly * CELL_PX;
}

export function cellOrigin(ix: number, iy: number): { x: number; y: number } {
  return { x: ix * CELL_PX, y: iy * CELL_PX };
}

export function cellSize(_ix: number, _iy: number): { w: number; h: number } {
  return { w: CELL_PX, h: CELL_PX };
}

/** Toujours tile — les routes sont `cell.paved`. */
export function cellGeomKind(_ix: number, _iy: number): CellGeomKind {
  return "tile";
}

export function inLaneBounds(ix: number, iy: number): boolean {
  return ix >= 0 && iy >= 0 && ix < LANE_COUNT_X && iy < LANE_COUNT_Y;
}

export function cellIndex(ix: number, iy: number): number {
  return iy * LANE_COUNT_X + ix;
}

export function worldToCell(wx: number, wy: number): { x: number; y: number } {
  if (wx < 0 || wy < 0) return { x: -1, y: -1 };
  const x = Math.floor(wx / CELL_PX);
  const y = Math.floor(wy / CELL_PX);
  return { x, y };
}

export function blockOfTileLane(lane: number): number | null {
  if (lane < 0) return null;
  const b = Math.floor(lane / PARCEL_CELLS);
  if (b < 0 || b >= Math.max(MAP_BLOCKS_W, MAP_BLOCKS_H)) return null;
  return b;
}

export function blockIdOfTile(ix: number, iy: number): string | null {
  if (!inLaneBounds(ix, iy)) return null;
  const bx = Math.floor(ix / PARCEL_CELLS);
  const by = Math.floor(iy / PARCEL_CELLS);
  if (bx < 0 || by < 0 || bx >= MAP_BLOCKS_W || by >= MAP_BLOCKS_H) {
    return null;
  }
  return `${bx},${by}`;
}

/** @deprecated ownership route — désormais = blockIdOfTile. */
export function ownerBlockOfRoad(ix: number, iy: number): string | null {
  return blockIdOfTile(ix, iy);
}

export function blockWorldOrigin(
  bx: number,
  by: number
): { x: number; y: number } {
  return { x: bx * BLOCK_PX, y: by * BLOCK_PX };
}

export function blockLaneOrigin(
  bx: number,
  by: number
): { x: number; y: number } {
  return { x: bx * PARCEL_CELLS, y: by * PARCEL_CELLS };
}

/** Toutes les cases d'un bloc. */
export function blockTiles(
  bx: number,
  by: number
): { x: number; y: number }[] {
  const o = blockLaneOrigin(bx, by);
  const out: { x: number; y: number }[] = [];
  for (let dy = 0; dy < PARCEL_CELLS; dy++) {
    for (let dx = 0; dx < PARCEL_CELLS; dx++) {
      out.push({ x: o.x + dx, y: o.y + dy });
    }
  }
  return out;
}

/** @deprecated îlots 2×2 — origines de placement libres dans le bloc. */
export function blockIsletOrigins(
  bx: number,
  by: number
): { x: number; y: number }[] {
  return blockTiles(bx, by);
}

export function parseBlockId(id: string): { bx: number; by: number } {
  const [a, b] = id.split(",");
  return { bx: Number(a), by: Number(b) };
}

export function makeBlockId(bx: number, by: number): string {
  return `${bx},${by}`;
}

/** 4 blocs de départ centrés (carte 10×8 → bx 4–5, by 3–4). */
export function startBlockIds(): string[] {
  const cx = MAP_BLOCKS_W / 2 - 1; // 4
  const cy = MAP_BLOCKS_H / 2 - 1; // 3
  return [
    makeBlockId(cx, cy),
    makeBlockId(cx + 1, cy),
    makeBlockId(cx, cy + 1),
    makeBlockId(cx + 1, cy + 1),
  ];
}
