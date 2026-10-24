import { describe, expect, it } from "vitest";
import {
  BLOCK_PX,
  CELL_PX,
  CELLS_PER_TILE,
  MAP_BLOCKS_H,
  MAP_BLOCKS_W,
  PARCEL_CELLS,
  TILE_PX,
} from "../mapConfig";
import {
  LANE_COUNT_X,
  LANE_COUNT_Y,
  MAP_HEIGHT_PX,
  MAP_WIDTH_PX,
  blockIdOfTile,
  blockWorldOrigin,
  cellOrigin,
  cellSize,
  laneCount,
  startBlockIds,
  worldToCell,
} from "../mapLanes";
import {
  createInitialCells,
  fineFootprintDims,
  townhallOrigin,
} from "../grid";

describe("grille pose 320 + tuiles bâtiment 1254", () => {
  it("constantes", () => {
    expect(CELL_PX).toBe(320);
    expect(TILE_PX).toBe(1254);
    expect(CELLS_PER_TILE).toBe(4);
    expect(PARCEL_CELLS).toBe(16);
    expect(laneCount(MAP_BLOCKS_W)).toBe(MAP_BLOCKS_W * PARCEL_CELLS);
    expect(LANE_COUNT_X).toBe(MAP_BLOCKS_W * PARCEL_CELLS);
    expect(LANE_COUNT_Y).toBe(MAP_BLOCKS_H * PARCEL_CELLS);
  });

  it("cases de grille = 320×320", () => {
    expect(cellSize(0, 0)).toEqual({ w: CELL_PX, h: CELL_PX });
    expect(MAP_WIDTH_PX).toBe(MAP_BLOCKS_W * BLOCK_PX);
    expect(MAP_HEIGHT_PX).toBe(MAP_BLOCKS_H * BLOCK_PX);
  });

  it("1×1 bâtiment = 4×4 cases ; 2×1 = 8×4", () => {
    expect(fineFootprintDims(1, 1, "H")).toEqual({ w: 4, h: 4 });
    expect(fineFootprintDims(2, 1, "H")).toEqual({ w: 8, h: 4 });
    expect(fineFootprintDims(2, 1, "V")).toEqual({ w: 4, h: 8 });
  });

  it("worldToCell round-trip", () => {
    const o = cellOrigin(10, 10);
    const c = worldToCell(o.x + CELL_PX / 2, o.y + CELL_PX / 2);
    expect(c).toEqual({ x: 10, y: 10 });
  });

  it("blocs départ + mairie + route d'entrée", () => {
    expect(startBlockIds()).toEqual(["4,3", "5,3", "4,4", "5,4"]);
    expect(blockWorldOrigin(4, 3)).toEqual({
      x: 4 * BLOCK_PX,
      y: 3 * BLOCK_PX,
    });
    const cells = createInitialCells(0);
    const th = townhallOrigin();
    expect(blockIdOfTile(th.x, th.y)).toBe("4,3");
    const accessY = th.y + CELLS_PER_TILE;
    const access = cells[accessY * LANE_COUNT_X + th.x];
    expect(access?.paved).toBe(true);
    expect(access?.permanent).toBe(true);
  });
});
