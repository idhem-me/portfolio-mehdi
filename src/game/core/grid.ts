import {
  MAP_SIZE,
  PARCEL_COUNT,
  parcelId,
  parseParcelId,
  startParcelIds,
} from "./balance";
import type { Cell, CellKind } from "./types";

const ORTHO: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function cellIndex(x: number, y: number): number {
  return y * MAP_SIZE + x;
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < MAP_SIZE && y < MAP_SIZE;
}

export function getCell(cells: Cell[], x: number, y: number): Cell | null {
  if (!inBounds(x, y)) return null;
  return cells[cellIndex(x, y)] ?? null;
}

/** Case route (normale ou autoroute) si x%3===2 ou y%3===2. */
export function isRoadCoord(x: number, y: number): boolean {
  return x % 3 === 2 || y % 3 === 2;
}

export function parcelOfBlock(x: number, y: number): string | null {
  if (isRoadCoord(x, y)) return null;
  const px = Math.floor(x / 3);
  const py = Math.floor(y / 3);
  if (px < 0 || py < 0 || px >= PARCEL_COUNT || py >= PARCEL_COUNT) {
    return null;
  }
  return parcelId(px, py);
}

/** Origine (coin HG) des 2×2 blocs d'une parcelle. */
export function parcelBlockOrigin(px: number, py: number): { x: number; y: number } {
  return { x: px * 3, y: py * 3 };
}

export function parcelBlocks(px: number, py: number): { x: number; y: number }[] {
  const o = parcelBlockOrigin(px, py);
  return [
    { x: o.x, y: o.y },
    { x: o.x + 1, y: o.y },
    { x: o.x, y: o.y + 1 },
    { x: o.x + 1, y: o.y + 1 },
  ];
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
    const nid = parcelId(px + dx, py + dy);
    if (unlockedParcels.includes(nid)) return true;
  }
  return false;
}

/**
 * Route visible si elle borde une parcelle débloquée, ou si c'est l'autoroute.
 */
export function isRoadVisible(
  cells: Cell[],
  unlockedParcels: string[],
  x: number,
  y: number
): boolean {
  const c = getCell(cells, x, y);
  if (!c || (c.kind !== "road" && c.kind !== "highway")) return false;
  if (c.kind === "highway") return true;
  for (const [dx, dy] of ORTHO) {
    const n = getCell(cells, x + dx, y + dy);
    if (n?.kind === "block" && n.parcelId && unlockedParcels.includes(n.parcelId)) {
      return true;
    }
  }
  return false;
}

/**
 * Masque de voisines routes visibles (N=1, E=2, S=4, W=8) pour auto-tiling.
 */
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
    if (isRoadVisible(cells, unlockedParcels, nx, ny)) mask |= bit;
  }
  return mask;
}

/**
 * Empreinte constructible : uniquement sur des blocks d'une même parcelle
 * débloquée, sans bâtiment, sans chevauchement de route.
 */
export function canPlaceFootprint(
  cells: Cell[],
  unlockedParcels: string[],
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  if (!inBounds(x, y) || !inBounds(x + width - 1, y + height - 1)) {
    return false;
  }
  let parcel: string | null = null;
  for (let ty = y; ty < y + height; ty++) {
    for (let tx = x; tx < x + width; tx++) {
      const c = getCell(cells, tx, ty);
      if (!c || c.kind !== "block" || !c.parcelId || c.buildingId) {
        return false;
      }
      if (!unlockedParcels.includes(c.parcelId)) return false;
      if (parcel === null) parcel = c.parcelId;
      else if (parcel !== c.parcelId) return false;
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
  buildingId: string
): Cell[] {
  const next = cells.slice();
  for (let ty = y; ty < y + height; ty++) {
    for (let tx = x; tx < x + width; tx++) {
      const i = cellIndex(tx, ty);
      const c = next[i];
      if (!c) continue;
      next[i] = { ...c, buildingId };
    }
  }
  return next;
}

/**
 * Autoroute : depuis le bord NO jusqu'au réseau des parcelles de départ.
 * Chemin en L le long des routes jusqu'à (origin road near start parcels).
 */
function highwayCells(): Set<string> {
  const start = startParcelIds();
  const { px, py } = parseParcelId(start[0]!);
  // Point d'entrée : route juste au nord-ouest de la première parcelle
  const targetX = px * 3 + 2; // route est de la parcelle
  const targetY = py * 3 - 1; // route nord — peut être <0
  const entryX = Math.max(2, px * 3 - 1);
  const entryY = Math.max(2, py * 3 - 1);

  const set = new Set<string>();
  // Depuis (0,2) bord nord le long y=2 (première route horizontale) puis down
  // Path: NW corner along top road row (y=2) to entryX, then down to entryY, then to network
  const topRoadY = 2;
  for (let x = 0; x <= Math.max(entryX, targetX); x++) {
    if (isRoadCoord(x, topRoadY)) set.add(`${x},${topRoadY}`);
  }
  // Descente verticale sur une colonne route
  const vertX = entryX % 3 === 2 ? entryX : entryX + (2 - (entryX % 3));
  for (let y = topRoadY; y <= Math.max(entryY, py * 3 + 2); y++) {
    if (inBounds(vertX, y) && isRoadCoord(vertX, y)) {
      set.add(`${vertX},${y}`);
    }
  }
  // Connexion horizontale vers le carrefour des parcelles centrales
  const midY = py * 3 + 2;
  for (let x = Math.min(vertX, px * 3); x <= Math.max(vertX, (px + 1) * 3 + 2); x++) {
    if (inBounds(x, midY) && isRoadCoord(x, midY)) set.add(`${x},${midY}`);
  }
  void targetY;
  return set;
}

export function createInitialCells(): Cell[] {
  const hwy = highwayCells();
  const cells: Cell[] = [];
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      let kind: CellKind;
      let pid: string | null = null;
      if (isRoadCoord(x, y)) {
        kind = hwy.has(`${x},${y}`) ? "highway" : "road";
      } else {
        kind = "block";
        pid = parcelOfBlock(x, y);
      }
      cells.push({
        kind,
        parcelId: pid,
        buildingId: null,
      });
    }
  }
  return cells;
}

/** Origine blocs de la parcelle mairie (une des 4 centrales). */
export function townhallOrigin(): { x: number; y: number } {
  const id = startParcelIds()[0]!;
  const { px, py } = parseParcelId(id);
  return parcelBlockOrigin(px, py);
}

export function applyTownhallOccupation(cells: Cell[]): Cell[] {
  const o = townhallOrigin();
  return occupyFootprint(cells, o.x, o.y, 2, 2, "townhall-0");
}
