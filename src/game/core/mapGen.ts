/**
 * Génération procédurale de biomes (seed déterministe).
 *
 * - Eau : bords haut / bas / gauche, profondeur 1–2 blocs, côte irrégulière
 *   à l'échelle des îlots (jamais demi-case).
 * - Centre / départ : herbe uniquement (pas de forêt).
 * - Les 4 blocs de départ ne sont jamais de l'eau.
 */

import { MAP_BLOCKS_H, MAP_BLOCKS_W, type BiomeId } from "./mapConfig";
import { mulberry32 } from "./rng";
import { makeBlockId, startBlockIds } from "./mapLanes";

export type BlockBiomeGrid = BiomeId[][]; // [by][bx]

function valueNoise2d(
  rand: () => number,
  w: number,
  h: number,
  cell = 2
): number[][] {
  const gw = Math.ceil(w / cell) + 2;
  const gh = Math.ceil(h / cell) + 2;
  const grid: number[][] = [];
  for (let y = 0; y < gh; y++) {
    const row: number[] = [];
    for (let x = 0; x < gw; x++) row.push(rand());
    grid.push(row);
  }
  const out: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    const gy = y / cell;
    const y0 = Math.floor(gy);
    const fy = gy - y0;
    for (let x = 0; x < w; x++) {
      const gx = x / cell;
      const x0 = Math.floor(gx);
      const fx = gx - x0;
      const v00 = grid[y0]![x0]!;
      const v10 = grid[y0]![x0 + 1]!;
      const v01 = grid[y0 + 1]![x0]!;
      const v11 = grid[y0 + 1]![x0 + 1]!;
      const a = v00 * (1 - fx) + v10 * fx;
      const b = v01 * (1 - fx) + v11 * fx;
      row.push(a * (1 - fy) + b * fy);
    }
    out.push(row);
  }
  return out;
}

export function generateBlockBiomes(seed: number): BlockBiomeGrid {
  const rand = mulberry32(seed);
  const noise = valueNoise2d(rand, MAP_BLOCKS_W, MAP_BLOCKS_H, 2);
  const start = new Set(startBlockIds());

  const grid: BlockBiomeGrid = [];
  for (let by = 0; by < MAP_BLOCKS_H; by++) {
    const row: BiomeId[] = [];
    for (let bx = 0; bx < MAP_BLOCKS_W; bx++) {
      const id = makeBlockId(bx, by);
      if (start.has(id)) {
        row.push("herbe");
        continue;
      }

      // Côte : bords N/S/O — profondeur 1–2 selon bruit
      const distN = by;
      const distS = MAP_BLOCKS_H - 1 - by;
      const distW = bx;
      const edge = Math.min(distN, distS, distW);
      // Bord droit (entrée) : pas d'eau forcée
      const onRight = bx >= MAP_BLOCKS_W - 1;
      if (!onRight && edge <= 1) {
        const coastNoise = noise[by]![bx]!;
        const depth = coastNoise > 0.45 ? 2 : 1;
        if (edge < depth || (edge === 0 && coastNoise > 0.2)) {
          row.push("eau");
          continue;
        }
        // Découpe îlot : parfois eau un cran plus loin sur le bord
        if (edge === 1 && coastNoise > 0.72) {
          row.push("eau");
          continue;
        }
      }

      row.push("herbe");
    }
    grid.push(row);
  }

  // Garantie : aucun start en eau
  for (const id of start) {
    const [bx, by] = id.split(",").map(Number) as [number, number];
    if (grid[by]![bx] === "eau") grid[by]![bx] = "herbe";
  }

  return grid;
}

export function biomeOfBlock(
  grid: BlockBiomeGrid,
  bx: number,
  by: number
): BiomeId {
  return grid[by]?.[bx] ?? "herbe";
}
