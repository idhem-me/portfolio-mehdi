/**
 * Routes bitume : segments route-bitume (1254×320) enchaînés.
 * Virage = intersection 320² superposée au bitume, puis segment perpendiculaire.
 */

import { ROAD_COST, ROAD_REFUND_RATIO } from "./mapConfig";
import { getCell, cellIndex, inBounds } from "./grid";
import type { ActionResult, Cell, GameState, RoadDir } from "./types";
import { canAfford, pay } from "./economy";

const ORTHO: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function isPaveableCell(
  cells: Cell[],
  unlockedParcels: string[],
  x: number,
  y: number
): boolean {
  const c = getCell(cells, x, y);
  if (!c) return false;
  if (c.paved || c.permanent) return false;
  if (c.buildingId) return false;
  if (c.biome === "eau") return false;
  return Boolean(c.blockId && unlockedParcels.includes(c.blockId));
}

export function isIntersectionCell(cells: Cell[], x: number, y: number): boolean {
  const c = getCell(cells, x, y);
  return Boolean(c?.paved && c.kind === "intersection");
}

function countPavedOrtho(
  cells: Cell[],
  x: number,
  y: number,
  axis: RoadDir
): number {
  let n = 0;
  for (const [dx, dy] of ORTHO) {
    if (axis === "H" && dy !== 0) continue;
    if (axis === "V" && dx !== 0) continue;
    const c = getCell(cells, x + dx, y + dy);
    if (c?.paved) n += 1;
  }
  return n;
}

/**
 * Recalcule kind / roadDir :
 * - H et V → intersection (bloc gris superposé au croisement)
 * - un seul axe → segment (fait partie du run route-bitume)
 * - isolé → intersection (amorce)
 */
export function recomputeRoadCell(cells: Cell[], x: number, y: number): Cell[] {
  const c = getCell(cells, x, y);
  if (!c?.paved) return cells;
  const h = countPavedOrtho(cells, x, y, "H");
  const v = countPavedOrtho(cells, x, y, "V");
  let kind: Cell["kind"] = "intersection";
  let roadDir: RoadDir | null = null;
  if (h > 0 && v > 0) {
    kind = "intersection";
  } else if (h > 0 && v === 0) {
    kind = "road";
    roadDir = "H";
  } else if (v > 0 && h === 0) {
    kind = "road";
    roadDir = "V";
  } else {
    kind = "intersection";
  }
  if (c.kind === kind && (c.roadDir ?? null) === roadDir) return cells;
  const next = cells.slice();
  next[cellIndex(x, y)] = { ...c, kind, roadDir };
  return next;
}

export function recomputeRoadAround(
  cells: Cell[],
  x: number,
  y: number
): Cell[] {
  let next = recomputeRoadCell(cells, x, y);
  for (const [dx, dy] of ORTHO) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(nx, ny)) continue;
    next = recomputeRoadCell(next, nx, ny);
  }
  return next;
}

export function paveCost(
  _cells: Cell[],
  _x: number,
  _y: number
): { total: number; road: number; intersections: number } {
  return { total: ROAD_COST, road: ROAD_COST, intersections: 0 };
}

export function paveRoad(
  state: GameState,
  x: number,
  y: number,
  opts?: { preferDir?: RoadDir | null }
): ActionResult {
  if (!isPaveableCell(state.cells, state.unlockedParcels, x, y)) {
    const c = getCell(state.cells, x, y);
    if (c?.paved) {
      return { ok: false, state, message: "Route déjà construite." };
    }
    if (c?.buildingId) {
      return { ok: false, state, message: "Case occupée par un bâtiment." };
    }
    if (c?.biome === "eau") {
      return { ok: false, state, message: "Pas de route sur l'eau." };
    }
    return {
      ok: false,
      state,
      message: "Bloc verrouillé — impossible de construire cette route.",
    };
  }

  const cost = paveCost(state.cells, x, y);
  if (!canAfford(state.resources, { gold: cost.total })) {
    return {
      ok: false,
      state,
      message: `Or insuffisant (besoin ${cost.total}🪙).`,
    };
  }

  let cells = state.cells.slice();
  const i = cellIndex(x, y);
  const cur = cells[i]!;
  cells[i] = {
    ...cur,
    paved: true,
    kind: opts?.preferDir ? "road" : "intersection",
    roadDir: opts?.preferDir ?? null,
  };
  cells = recomputeRoadAround(cells, x, y);

  return {
    ok: true,
    state: {
      ...state,
      cells,
      resources: pay(state.resources, { gold: cost.total }),
    },
    message: `Route construite −${cost.total}🪙`,
  };
}

export function unpaveRefundGold(cells: Cell[], x: number, y: number): number {
  const c = getCell(cells, x, y);
  if (!c?.paved || c.permanent) return 0;
  return Math.floor(ROAD_COST * ROAD_REFUND_RATIO);
}

export function canUnpaveCell(cells: Cell[], x: number, y: number): boolean {
  const c = getCell(cells, x, y);
  return Boolean(c?.paved && !c.permanent);
}

export function unpaveRoad(
  state: GameState,
  x: number,
  y: number
): ActionResult {
  const c = getCell(state.cells, x, y);
  if (!c?.paved) {
    return { ok: false, state, message: "Pas de route ici." };
  }
  if (c.permanent) {
    return {
      ok: false,
      state,
      message: "Route d'entrée indémolissable.",
    };
  }
  const refund = unpaveRefundGold(state.cells, x, y);
  let cells = state.cells.slice();
  const i = cellIndex(x, y);
  cells[i] = {
    ...c,
    paved: false,
    kind: "tile",
    roadDir: null,
  };
  cells = recomputeRoadAround(cells, x, y);

  return {
    ok: true,
    state: {
      ...state,
      cells,
      resources: {
        ...state.resources,
        gold: state.resources.gold + refund,
      },
    },
    message: `Route détruite — +${refund}🪙`,
  };
}

/**
 * Virage autorisé seulement depuis une case déjà bitumée
 * (avant ce trait) → l'intersection se superpose, puis la route part en perpendiculaire.
 * Pendant l'extension sur du neuf, l'axe reste verrouillé.
 */
export function roadStrokePath(
  cells: Cell[],
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  axis: RoadDir | null,
  opts?: { canTurn?: boolean }
): { path: { x: number; y: number }[]; axis: RoadDir } {
  if (fromX === toX && fromY === toY) {
    return { path: [{ x: toX, y: toY }], axis: axis ?? "H" };
  }

  let locked = axis;
  if (!locked) {
    locked =
      Math.abs(toX - fromX) >= Math.abs(toY - fromY) ? "H" : "V";
  }

  const canTurn = Boolean(opts?.canTurn);
  if (locked === "H" && toY !== fromY) {
    if (canTurn) {
      locked = "V";
    } else {
      toY = fromY;
    }
  } else if (locked === "V" && toX !== fromX) {
    if (canTurn) {
      locked = "H";
    } else {
      toX = fromX;
    }
  }

  const path: { x: number; y: number }[] = [];
  if (locked === "H") {
    const step = toX >= fromX ? 1 : -1;
    for (let x = fromX; x !== toX + step; x += step) {
      path.push({ x, y: fromY });
    }
  } else {
    const step = toY >= fromY ? 1 : -1;
    for (let y = fromY; y !== toY + step; y += step) {
      path.push({ x: fromX, y });
    }
  }
  return { path, axis: locked };
}
