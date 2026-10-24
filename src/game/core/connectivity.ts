/**
 * Graphe des routes bitume + BFS depuis l'entrée (bord droit).
 */

import { LANE_COUNT_X, LANE_COUNT_Y } from "./mapLanes";
import { getCell, inBounds } from "./grid";
import type { Cell, FootprintRotation, PlacedBuilding } from "./types";
import { getBuildingDef } from "./buildings";
import { fineFootprintDims } from "./grid";

const ORTHO: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Toute case bitumée compte pour le réseau (lanes ou tuiles libres). */
export function isPavedRoadCell(c: Cell | null): boolean {
  return Boolean(c?.paved);
}

/** Cases bitume du bord droit (entrée de la carte). */
export function entryRoadCells(cells: Cell[]): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const x = LANE_COUNT_X - 1;
  for (let y = 0; y < LANE_COUNT_Y; y++) {
    const c = getCell(cells, x, y);
    if (isPavedRoadCell(c)) out.push({ x, y });
  }
  return out;
}

/** Ensemble des cases bitume connectées à l'entrée (BFS). */
export function connectedPavedSet(cells: Cell[]): Set<string> {
  const start = entryRoadCells(cells);
  const seen = new Set<string>();
  const q = [...start];
  for (const s of q) seen.add(`${s.x},${s.y}`);
  let qi = 0;
  while (qi < q.length) {
    const cur = q[qi++]!;
    for (const [dx, dy] of ORTHO) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (!inBounds(nx, ny)) continue;
      const key = `${nx},${ny}`;
      if (seen.has(key)) continue;
      if (!isPavedRoadCell(getCell(cells, nx, ny))) continue;
      seen.add(key);
      q.push({ x: nx, y: ny });
    }
  }
  return seen;
}

export function isRoadNetworkConnected(
  cells: Cell[],
  x: number,
  y: number
): boolean {
  return connectedPavedSet(cells).has(`${x},${y}`);
}

/** Tuile adjacente ortho à au moins une case bitume du réseau d'entrée. */
export function tileTouchesConnectedRoad(
  cells: Cell[],
  tx: number,
  ty: number
): boolean {
  const net = connectedPavedSet(cells);
  for (const [dx, dy] of ORTHO) {
    const nx = tx + dx;
    const ny = ty + dy;
    if (net.has(`${nx},${ny}`)) return true;
  }
  return false;
}

/**
 * Bâtiment connecté ssi chaque case de son empreinte touche le réseau,
 * ou au moins une (règle souple : au moins une tuile de l'empreinte).
 */
export function isBuildingConnected(
  cells: Cell[],
  b: PlacedBuilding
): boolean {
  const def = getBuildingDef(b.type);
  const { w, h } = fineFootprintDims(
    def.width,
    def.height,
    b.rotation ?? "H"
  );
  for (let ty = b.y; ty < b.y + h; ty++) {
    for (let tx = b.x; tx < b.x + w; tx++) {
      if (tileTouchesConnectedRoad(cells, tx, ty)) return true;
    }
  }
  return false;
}

export function facingFromRoadDelta(
  dx: number,
  dy: number
): FootprintRotation {
  // Pour 1×1 : on stocke la direction d'accès via rotation H/V
  // H = parking face sud/nord (route horizontale), V = face est/ouest
  if (Math.abs(dx) > Math.abs(dy)) return "V";
  return "H";
}

/** Angle sprite (radians) pour que le "bas" du PNG (parking) fasse face à la route. */
export function townhallSpriteRotation(
  tileX: number,
  tileY: number,
  roadX: number,
  roadY: number
): number {
  const dx = roadX - tileX;
  const dy = roadY - tileY;
  // PNG mairie : parking en bas → 0 = face sud
  if (dy > 0) return 0; // route au sud
  if (dy < 0) return Math.PI; // route au nord
  if (dx > 0) return -Math.PI / 2; // route à l'est
  if (dx < 0) return Math.PI / 2; // route à l'ouest
  return 0;
}

