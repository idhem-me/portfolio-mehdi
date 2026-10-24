/**
 * Conversions monde ↔ grille uniforme CELL_PX.
 */

import { CELL_PX } from "@/game/core/mapConfig";
import {
  LANE_COUNT_X,
  LANE_COUNT_Y,
  MAP_HEIGHT_PX,
  MAP_WIDTH_PX,
  cellOrigin as laneCellOrigin,
  cellSize as laneCellSize,
  worldToCell as laneWorldToCell,
} from "@/game/core/mapLanes";

/** Taille d'une case (px monde). */
export const TILE = CELL_PX;

export type Point = { x: number; y: number };

/** Coin haut-gauche de la case (ix, iy) en coordonnées monde. */
export function gridToWorld(x: number, y: number): Point {
  return laneCellOrigin(x, y);
}

export function cellSize(x: number, y: number): { w: number; h: number } {
  return laneCellSize(x, y);
}

export function worldToGrid(wx: number, wy: number): Point {
  const c = laneWorldToCell(wx, wy);
  return { x: c.x, y: c.y };
}

/** Tuile sous un point monde (hit-test). */
export function worldToTile(wx: number, wy: number): { x: number; y: number } {
  return laneWorldToCell(wx, wy);
}

/** Centre d'une case. */
export function tileCenter(gx: number, gy: number): Point {
  const o = laneCellOrigin(gx, gy);
  return { x: o.x + CELL_PX / 2, y: o.y + CELL_PX / 2 };
}

/** Rectangle monde d'une empreinte w×h en cases. */
export function footprintRect(
  gx: number,
  gy: number,
  w: number,
  h: number
): { x: number; y: number; w: number; h: number } {
  const o = laneCellOrigin(gx, gy);
  return { x: o.x, y: o.y, w: w * CELL_PX, h: h * CELL_PX };
}

export function mapPixelSize(): { w: number; h: number } {
  return { w: MAP_WIDTH_PX, h: MAP_HEIGHT_PX };
}

export { LANE_COUNT_X, LANE_COUNT_Y };
