import { describe, expect, it } from "vitest";
import {
  TILE_H,
  TILE_W,
  gridToScreen,
  screenToGrid,
  screenToTile,
  tilePolygon,
} from "../iso";

describe("iso round-trip", () => {
  it("gridToScreen ↔ screenToGrid", () => {
    for (const [gx, gy] of [
      [0, 0],
      [3, 5],
      [7.25, 2.5],
      [15, 15],
    ] as const) {
      const s = gridToScreen(gx, gy);
      const g = screenToGrid(s.x, s.y);
      expect(g.x).toBeCloseTo(gx, 10);
      expect(g.y).toBeCloseTo(gy, 10);
    }
  });

  it("coins du losange mappent vers la bonne tuile", () => {
    const gx = 4;
    const gy = 6;
    const poly = tilePolygon(gx, gy);
    // Centre du losange
    const cx = poly[0]!;
    const cy = poly[1]! + TILE_H / 2;
    const tile = screenToTile(cx, cy);
    expect(tile).toEqual({ x: gx, y: gy });

    // Légèrement à l'intérieur depuis chaque coin
    const pts = [
      [poly[0]!, poly[1]! + 1],
      [poly[2]! - 1, poly[3]!],
      [poly[4]!, poly[5]! - 1],
      [poly[6]! + 1, poly[7]!],
    ] as const;
    for (const [sx, sy] of pts) {
      expect(screenToTile(sx, sy)).toEqual({ x: gx, y: gy });
    }
  });

  it("constantes 2:1", () => {
    expect(TILE_W).toBe(128);
    expect(TILE_H).toBe(64);
  });
});
