import { describe, expect, it } from "vitest";
import { CELL_PX, TILE_PX } from "@/game/core/mapConfig";
import {
  TILE,
  gridToWorld,
  worldToTile,
  tileCenter,
  footprintRect,
  cellSize,
} from "../grid";

describe("render grid pose 320", () => {
  it("TILE (pas grille) = CELL_PX", () => {
    expect(TILE).toBe(CELL_PX);
    expect(TILE_PX).toBe(1254);
  });

  it("gridToWorld / cellSize 320", () => {
    expect(gridToWorld(0, 0)).toEqual({ x: 0, y: 0 });
    expect(cellSize(0, 0)).toEqual({ w: CELL_PX, h: CELL_PX });
    expect(cellSize(1, 1)).toEqual({ w: CELL_PX, h: CELL_PX });
  });

  it("worldToTile hit-test", () => {
    const o = gridToWorld(1, 1);
    expect(worldToTile(o.x + 1, o.y + 1)).toEqual({ x: 1, y: 1 });
  });

  it("footprintRect en cases grille ; art bâtiment reste TILE_PX", () => {
    const c = tileCenter(1, 1);
    expect(c.x).toBeCloseTo(CELL_PX + CELL_PX / 2);
    const fp = footprintRect(1, 1, 8, 4); // 2×1 bâtiment en cases fines
    expect(fp.w).toBe(CELL_PX * 8);
    expect(fp.h).toBe(CELL_PX * 4);
    expect(TILE_PX * 2).toBe(2508);
  });
});
