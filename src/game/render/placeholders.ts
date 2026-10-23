import { Graphics } from "pixi.js";
import type { BuildingTypeId } from "@/game/core/types";
import { TILE_H, TILE_W, gridToScreen } from "./iso";
import { ROOF, WALL, facetColors, hexToNum } from "./palette";
import { visualTier } from "./assets";

type Footprint = { w: number; h: number };

const FOOTPRINT: Record<BuildingTypeId, Footprint> = {
  townhall: { w: 2, h: 2 },
  house: { w: 1, h: 1 },
  sawmill: { w: 1, h: 1 },
  quarry: { w: 1, h: 1 },
  school: { w: 2, h: 1 },
  market: { w: 2, h: 2 },
  warehouse: { w: 1, h: 1 },
  library: { w: 2, h: 2 },
  fountain: { w: 1, h: 1 },
  monument: { w: 2, h: 2 },
};

function roofColor(type: BuildingTypeId, seed: number): number {
  if (type === "house") {
    const key = `house_${seed % 3}` as keyof typeof ROOF;
    return hexToNum(ROOF[key] ?? ROOF.house_0);
  }
  return hexToNum(ROOF[type] ?? WALL);
}

function bodyHeight(type: BuildingTypeId, tier: number): number {
  const base: Record<BuildingTypeId, number> = {
    townhall: 36,
    house: 22,
    sawmill: 20,
    quarry: 14,
    school: 28,
    market: 24,
    warehouse: 26,
    library: 32,
    fountain: 10,
    monument: 48,
  };
  return (base[type] ?? 20) * (0.85 + tier * 0.25);
}

function roofHeight(type: BuildingTypeId, tier: number): number {
  if (type === "fountain") return 6;
  if (type === "quarry") return 4;
  return (12 + tier * 4) * (type === "monument" ? 1.4 : 1);
}

/**
 * Dessine un prisme isométrique facetté (corps + toit) dans un Graphics.
 * Origine = coin haut de la tuile (gx, gy).
 */
export function drawBuildingPlaceholder(
  g: Graphics,
  type: BuildingTypeId,
  level: number,
  gx: number,
  gy: number,
  variantSeed = 0
): void {
  const fp = FOOTPRINT[type];
  const tier = visualTier(Math.max(1, level));
  const top = gridToScreen(gx, gy);
  // Centre de l'empreinte
  const cx =
    top.x + ((fp.w - fp.h) * TILE_W) / 4;
  const cy =
    top.y + ((fp.w + fp.h) * TILE_H) / 4;

  const halfW = (fp.w * TILE_W) / 2;
  const halfH = (fp.h * TILE_H) / 2;
  const bh = bodyHeight(type, tier);
  const rh = roofHeight(type, tier);

  const wall = facetColors(WALL);
  const roof = facetColors(
    `#${roofColor(type, variantSeed).toString(16).padStart(6, "0")}`
  );

  // Base diamond (sol sous le bâtiment)
  const basePts = [
    cx,
    cy - halfH / fp.h + (fp.h > 1 ? 0 : 0),
    cx + halfW / 2,
    cy,
    cx,
    cy + halfH / 2,
    cx - halfW / 2,
    cy,
  ];
  // Simplify: use footprint corners in iso
  const pN = gridToScreen(gx, gy);
  const pE = gridToScreen(gx + fp.w, gy);
  const pS = gridToScreen(gx + fp.w, gy + fp.h);
  const pW = gridToScreen(gx, gy + fp.h);
  const midY = (pN.y + pS.y) / 2;

  void basePts;
  void midY;

  // Body faces
  const elev = bh;
  // Left face (N-W-S elevated)
  g.poly([
    pN.x,
    pN.y - elev,
    pW.x,
    pW.y - elev,
    pW.x,
    pW.y,
    pN.x,
    pN.y,
  ])
    .fill({ color: wall.left })
    .stroke({ width: 1, color: wall.right, alpha: 0.35 });

  // Right face
  g.poly([
    pN.x,
    pN.y - elev,
    pE.x,
    pE.y - elev,
    pE.x,
    pE.y,
    pN.x,
    pN.y,
  ])
    .fill({ color: wall.right })
    .stroke({ width: 1, color: wall.right, alpha: 0.25 });

  // Top of body
  g.poly([
    pN.x,
    pN.y - elev,
    pE.x,
    pE.y - elev,
    pS.x,
    pS.y - elev,
    pW.x,
    pW.y - elev,
  ]).fill({ color: wall.top });

  // Roof pyramid / prism
  const apexY = pN.y - elev - rh;
  const apexX = (pN.x + pS.x) / 2;

  if (type === "fountain") {
    g.circle(apexX, pN.y - elev / 2, Math.min(halfW, halfH) * 0.35).fill({
      color: roof.top,
    });
    return;
  }

  // Triangular roof: apex + E/W or N/S ridge
  g.poly([
    apexX,
    apexY,
    pE.x,
    pE.y - elev,
    pS.x,
    pS.y - elev,
  ]).fill({ color: roof.right });

  g.poly([
    apexX,
    apexY,
    pW.x,
    pW.y - elev,
    pS.x,
    pS.y - elev,
  ]).fill({ color: roof.left });

  g.poly([
    apexX,
    apexY,
    pN.x,
    pN.y - elev,
    pE.x,
    pE.y - elev,
  ]).fill({ color: roof.top });

  g.poly([
    apexX,
    apexY,
    pN.x,
    pN.y - elev,
    pW.x,
    pW.y - elev,
  ]).fill({ color: shadeRoof(roof.top) });
}

function shadeRoof(c: number): number {
  const r = Math.min(255, ((c >> 16) & 0xff) + 20);
  const g = Math.min(255, ((c >> 8) & 0xff) + 15);
  const b = Math.min(255, (c & 0xff) + 10);
  return (r << 16) | (g << 8) | b;
}

export function drawDecorPlaceholder(
  g: Graphics,
  kind: "tree" | "rock",
  gx: number,
  gy: number
): void {
  const top = gridToScreen(gx, gy);
  const cx = top.x;
  const cy = top.y + TILE_H / 2;
  if (kind === "tree") {
    const trunk = facetColors("#6B4A2E");
    g.poly([
      cx - 4,
      cy,
      cx + 4,
      cy,
      cx + 3,
      cy - 14,
      cx - 3,
      cy - 14,
    ]).fill({ color: trunk.left });
    const leaf = facetColors(ROOF.tree);
    g.poly([cx, cy - 40, cx + 18, cy - 14, cx - 18, cy - 14]).fill({
      color: leaf.top,
    });
    g.poly([cx, cy - 40, cx + 18, cy - 14, cx + 6, cy - 8]).fill({
      color: leaf.right,
    });
    g.poly([cx, cy - 40, cx - 18, cy - 14, cx - 6, cy - 8]).fill({
      color: leaf.left,
    });
  } else {
    const rock = facetColors(ROOF.rock);
    g.poly([
      cx,
      cy - 18,
      cx + 16,
      cy - 6,
      cx + 10,
      cy + 4,
      cx - 12,
      cy + 2,
      cx - 14,
      cy - 8,
    ]).fill({ color: rock.left });
    g.poly([cx, cy - 18, cx + 16, cy - 6, cx + 4, cy - 4]).fill({
      color: rock.top,
    });
  }
}

export function drawGhostFootprint(
  g: Graphics,
  gx: number,
  gy: number,
  w: number,
  h: number,
  valid: boolean
): void {
  const color = valid ? 0x3ecf6a : 0xe85a5a;
  const pN = gridToScreen(gx, gy);
  const pE = gridToScreen(gx + w, gy);
  const pS = gridToScreen(gx + w, gy + h);
  const pW = gridToScreen(gx, gy + h);
  g.poly([pN.x, pN.y, pE.x, pE.y, pS.x, pS.y, pW.x, pW.y])
    .fill({ color, alpha: 0.35 })
    .stroke({ width: 2, color, alpha: 0.9 });
}
