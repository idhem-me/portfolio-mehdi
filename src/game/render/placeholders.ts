/**
 * Placeholders top-down (Mini Motorways / Pocket City).
 * Textures canvas générées une fois ; ombre portée incluse ou séparée.
 */
import { Graphics, Texture } from "pixi.js";
import type { BuildingTypeId } from "@/game/core/types";
import { TILE, footprintRect, gridToWorld, tileCenter } from "./grid";
import { ROOF, WALL, hexToNum, shade } from "./palette";
import { visualTier } from "./assets";

type Footprint = { w: number; h: number };

const FOOTPRINT: Record<BuildingTypeId, Footprint> = {
  townhall: { w: 1, h: 1 },
  house: { w: 1, h: 1 },
  apartment: { w: 1, h: 1 },
  shop: { w: 1, h: 1 },
  sawmill: { w: 1, h: 1 },
  quarry: { w: 1, h: 1 },
  factory: { w: 2, h: 1 },
  school: { w: 2, h: 1 },
  market: { w: 2, h: 2 },
  warehouse: { w: 1, h: 1 },
  library: { w: 2, h: 2 },
  fountain: { w: 1, h: 1 },
  coal_plant: { w: 2, h: 1 },
  solar_plant: { w: 2, h: 1 },
  nuclear_plant: { w: 2, h: 2 },
  monument: { w: 2, h: 2 },
};

const MARGIN = 0.08;
const SHADOW_ALPHA = 0.18;
/** Décalage ombre ≈ 6 % de la tuile. */
const SHADOW_FRAC = 0.06;

const textureCache = new Map<string, Texture>();
const shadowCache = new Map<string, Texture>();

function roofColor(type: BuildingTypeId, seed: number): number {
  if (type === "house") {
    const key = `house_${seed % 3}` as keyof typeof ROOF;
    return hexToNum(ROOF[key] ?? ROOF.house_0);
  }
  return hexToNum(ROOF[type] ?? WALL);
}

function hexCss(n: number): string {
  return `#${n.toString(16).padStart(6, "0")}`;
}

function cacheKey(
  type: BuildingTypeId,
  tier: number,
  seed: number,
  kind: "b" | "s"
): string {
  return `${kind}:${type}:${tier}:${seed % 3}`;
}

/** Ombre portée rectangle arrondi, décalage bas-droite. */
function drawShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tier: number
): void {
  const off = TILE * SHADOW_FRAC * (0.85 + tier * 0.2);
  ctx.fillStyle = `rgba(0,0,0,${SHADOW_ALPHA})`;
  roundRect(ctx, x + off, y + off, w, h, Math.min(w, h) * 0.12);
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawRoofBody(
  ctx: CanvasRenderingContext2D,
  type: BuildingTypeId,
  tier: number,
  seed: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): void {
  const roof = roofColor(type, seed);
  const roofLight = shade(roof, 1.12);
  const roofDark = shade(roof, 0.82);
  const wall = hexToNum(WALL);
  const wallBand = Math.max(3, Math.round(bh * 0.1));

  // Liseré mural bas
  ctx.fillStyle = hexCss(shade(wall, 0.92));
  roundRect(ctx, bx, by + bh - wallBand, bw, wallBand, 2);
  ctx.fill();

  // Toit principal
  const roofH = bh - wallBand;
  ctx.fillStyle = hexCss(roof);
  roundRect(ctx, bx, by, bw, roofH, Math.min(bw, roofH) * 0.1);
  ctx.fill();

  // Pans / faîtage
  if (type !== "fountain" && type !== "solar_plant" && type !== "quarry") {
    ctx.fillStyle = hexCss(roofLight);
    ctx.beginPath();
    ctx.moveTo(bx, by + roofH * 0.15);
    ctx.lineTo(bx + bw * 0.5, by);
    ctx.lineTo(bx + bw, by + roofH * 0.15);
    ctx.lineTo(bx + bw * 0.5, by + roofH * 0.28);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = hexCss(roofDark);
    ctx.lineWidth = 1.5 + tier * 0.5;
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.5, by + 2);
    ctx.lineTo(bx + bw * 0.5, by + roofH - 2);
    ctx.stroke();
  }

  // Détails distinctifs
  drawDistinctive(ctx, type, tier, bx, by, bw, roofH);
}

function drawDistinctive(
  ctx: CanvasRenderingContext2D,
  type: BuildingTypeId,
  tier: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): void {
  const cx = bx + bw / 2;
  const cy = by + bh / 2;

  switch (type) {
    case "coal_plant": {
      ctx.fillStyle = "#6a6a68";
      ctx.beginPath();
      ctx.arc(cx + bw * 0.15, cy - bh * 0.1, 5 + tier, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "solar_plant": {
      const cols = 2 + tier;
      const rows = 1 + Math.min(1, tier - 1);
      const cellW = (bw * 0.8) / cols;
      const cellH = (bh * 0.7) / rows;
      const ox = bx + bw * 0.1;
      const oy = by + bh * 0.15;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = (r + c) % 2 === 0 ? "#3A7AB8" : "#2a5a88";
          ctx.fillRect(ox + c * cellW, oy + r * cellH, cellW - 1, cellH - 1);
        }
      }
      break;
    }
    case "nuclear_plant": {
      ctx.strokeStyle = "#8ab0a0";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(bw, bh) * 0.28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(200,220,210,0.35)";
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(bw, bh) * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "market": {
      const stripeH = 4;
      for (let i = 0; i < 4 + tier; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#E3C25B" : "#F5F0E0";
        ctx.fillRect(
          bx + bw * 0.12,
          by + bh * 0.25 + i * stripeH,
          bw * 0.76,
          stripeH
        );
      }
      break;
    }
    case "school": {
      // Cour
      ctx.fillStyle = "#A8D48A";
      roundRect(ctx, bx + bw * 0.55, by + bh * 0.35, bw * 0.35, bh * 0.45, 3);
      ctx.fill();
      // Petit arbre
      ctx.fillStyle = "#5B8F3C";
      ctx.beginPath();
      ctx.arc(bx + bw * 0.72, by + bh * 0.52, 5 + tier, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "fountain": {
      ctx.fillStyle = "#7EC4CF";
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(bw, bh) * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#E8F7FA";
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(bw, bh) * 0.14, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "townhall": {
      // Petit drapeau / clocher
      ctx.fillStyle = "#F2E6D0";
      ctx.fillRect(cx - 3, by + 4, 6, 10 + tier * 2);
      ctx.fillStyle = "#D9785B";
      ctx.beginPath();
      ctx.moveTo(cx + 3, by + 4);
      ctx.lineTo(cx + 12, by + 8);
      ctx.lineTo(cx + 3, by + 12);
      ctx.fill();
      break;
    }
    case "library": {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(bx + bw * 0.2 + i * 10, by + bh * 0.35, 6, bh * 0.35);
      }
      break;
    }
    case "monument": {
      ctx.fillStyle = hexCss(shade(hexToNum(ROOF.monument), 1.15));
      ctx.beginPath();
      ctx.moveTo(cx, by + 6);
      ctx.lineTo(cx + bw * 0.22, by + bh * 0.7);
      ctx.lineTo(cx - bw * 0.22, by + bh * 0.7);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "sawmill": {
      ctx.fillStyle = "#6B4A2E";
      ctx.fillRect(bx + bw * 0.2, cy - 2, bw * 0.6, 4);
      break;
    }
    case "quarry": {
      ctx.fillStyle = "#8A8A82";
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(
          bx + bw * (0.3 + i * 0.2),
          cy + (i % 2) * 4,
          4 + (i % 2),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      break;
    }
    case "factory":
    case "warehouse": {
      ctx.fillStyle = "#6a5a4a";
      ctx.fillRect(bx + bw * 0.7, by + 4, 5, bh * 0.35);
      break;
    }
    case "shop": {
      ctx.fillStyle = "#c45c3a";
      ctx.fillRect(bx + 2, by + bh * 0.55, bw - 4, 5);
      break;
    }
    default:
      break;
  }

  // Détails supplémentaires par palier
  if (tier >= 2 && type === "house") {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(bx + bw * 0.25, by + bh * 0.4, 5, 5);
    ctx.fillRect(bx + bw * 0.55, by + bh * 0.4, 5, 5);
  }
  if (tier >= 3) {
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(bx + bw * 0.15, by + bh * 0.15, bw * 0.2, 3);
  }
}

/**
 * Bake texture bâtiment (sans ombre — l'ombre est une texture séparée).
 * Taille canvas = empreinte monde (w*TILE × h*TILE).
 */
export function bakeBuildingTexture(
  type: BuildingTypeId,
  level: number,
  variantSeed = 0
): Texture {
  const tier = visualTier(Math.max(1, level));
  const key = cacheKey(type, tier, variantSeed, "b");
  const hit = textureCache.get(key);
  if (hit) return hit;

  const fp = FOOTPRINT[type];
  const grow = 1 + (tier - 1) * 0.06;
  const cw = Math.round(fp.w * TILE);
  const ch = Math.round(fp.h * TILE);
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;

  const mx = cw * MARGIN;
  const my = ch * MARGIN;
  const bw = (cw - mx * 2) * grow;
  const bh = (ch - my * 2) * grow;
  const bx = (cw - bw) / 2;
  const by = (ch - bh) / 2;

  drawRoofBody(ctx, type, tier, variantSeed, bx, by, bw, bh);

  const tex = Texture.from(canvas);
  textureCache.set(key, tex);
  return tex;
}

/** Texture ombre seule (même taille que le bâtiment). */
export function bakeShadowTexture(
  type: BuildingTypeId,
  level: number
): Texture {
  const tier = visualTier(Math.max(1, level));
  const key = cacheKey(type, tier, 0, "s");
  const hit = shadowCache.get(key);
  if (hit) return hit;

  const fp = FOOTPRINT[type];
  const grow = 1 + (tier - 1) * 0.06;
  const cw = Math.round(fp.w * TILE);
  const ch = Math.round(fp.h * TILE);
  const canvas = document.createElement("canvas");
  // Padding pour l'ombre décalée
  const pad = Math.ceil(TILE * SHADOW_FRAC * (0.85 + tier * 0.2) + 2);
  canvas.width = cw + pad;
  canvas.height = ch + pad;
  const ctx = canvas.getContext("2d")!;

  const mx = cw * MARGIN;
  const my = ch * MARGIN;
  const bw = (cw - mx * 2) * grow;
  const bh = (ch - my * 2) * grow;
  const bx = (cw - bw) / 2;
  const by = (ch - bh) / 2;
  drawShadow(ctx, bx, by, bw, bh, tier);

  const tex = Texture.from(canvas);
  shadowCache.set(key, tex);
  return tex;
}

/** Dessine un placeholder directement dans un Graphics (fallback sync). */
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
  const rect = footprintRect(gx, gy, fp.w, fp.h);
  const grow = 1 + (tier - 1) * 0.06;
  const mx = rect.w * MARGIN;
  const my = rect.h * MARGIN;
  const bw = (rect.w - mx * 2) * grow;
  const bh = (rect.h - my * 2) * grow;
  const bx = rect.x + (rect.w - bw) / 2;
  const by = rect.y + (rect.h - bh) / 2;
  const off = TILE * SHADOW_FRAC * (0.85 + tier * 0.2);

  g.roundRect(bx + off, by + off, bw, bh, 4).fill({
    color: 0x000000,
    alpha: SHADOW_ALPHA,
  });

  const roof = roofColor(type, variantSeed);
  g.roundRect(bx, by + bh * 0.9, bw, bh * 0.1, 2).fill({
    color: shade(hexToNum(WALL), 0.92),
  });
  g.roundRect(bx, by, bw, bh * 0.9, 4).fill({ color: roof });

  // Faîtage
  g.moveTo(bx + bw / 2, by + 2)
    .lineTo(bx + bw / 2, by + bh * 0.85)
    .stroke({ width: 1.5, color: shade(roof, 0.75), alpha: 0.8 });

  drawDistinctiveGfx(g, type, tier, bx, by, bw, bh * 0.9);
}

function drawDistinctiveGfx(
  g: Graphics,
  type: BuildingTypeId,
  tier: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): void {
  const cx = bx + bw / 2;
  const cy = by + bh / 2;
  if (type === "coal_plant") {
    g.circle(cx + bw * 0.15, cy, 5 + tier).fill({ color: 0x6a6a68 });
  } else if (type === "solar_plant") {
    const cols = 2 + tier;
    const cellW = (bw * 0.8) / cols;
    for (let c = 0; c < cols; c++) {
      g.rect(bx + bw * 0.1 + c * cellW, by + bh * 0.2, cellW - 1, bh * 0.55).fill({
        color: c % 2 === 0 ? 0x3a7ab8 : 0x2a5a88,
      });
    }
  } else if (type === "nuclear_plant") {
    g.circle(cx, cy, Math.min(bw, bh) * 0.28).stroke({
      width: 3,
      color: 0x8ab0a0,
    });
  } else if (type === "market") {
    for (let i = 0; i < 4; i++) {
      g.rect(bx + bw * 0.12, by + bh * 0.25 + i * 4, bw * 0.76, 4).fill({
        color: i % 2 === 0 ? 0xe3c25b : 0xf5f0e0,
      });
    }
  } else if (type === "school") {
    g.roundRect(bx + bw * 0.55, by + bh * 0.35, bw * 0.35, bh * 0.45, 3).fill({
      color: 0xa8d48a,
    });
    g.circle(bx + bw * 0.72, by + bh * 0.52, 5 + tier).fill({
      color: 0x5b8f3c,
    });
  } else if (type === "fountain") {
    g.circle(cx, cy, Math.min(bw, bh) * 0.32).fill({ color: 0x7ec4cf });
  }
}

/** Arbre rond vu du dessus (2–3 tons) + ombre. */
export function drawRoundTree(
  g: Graphics,
  cx: number,
  cy: number,
  scale = 1
): void {
  const r = 11 * scale;
  const off = TILE * SHADOW_FRAC;
  g.ellipse(cx + off, cy + off, r * 1.05, r * 0.85).fill({
    color: 0x000000,
    alpha: SHADOW_ALPHA,
  });
  g.circle(cx - 2, cy + 1, r * 0.85).fill({ color: 0x4a7a32 });
  g.circle(cx + 3, cy - 2, r * 0.7).fill({ color: 0x5b8f3c });
  g.circle(cx, cy - 1, r * 0.45).fill({ color: 0x6fa04a });
}

/** Sapin : octogone / étoile vert foncé + ombre. */
export function drawPineTopDown(
  g: Graphics,
  cx: number,
  cy: number,
  scale = 1
): void {
  const r = 10 * scale;
  const off = TILE * SHADOW_FRAC;
  g.ellipse(cx + off, cy + off, r * 0.95, r * 0.75).fill({
    color: 0x000000,
    alpha: SHADOW_ALPHA,
  });
  const pts: number[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.65;
    pts.push(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  g.poly(pts).fill({ color: 0x3d6b3a });
  g.circle(cx, cy, r * 0.28).fill({ color: 0x2d5028 });
}

export function drawDecorPlaceholder(
  g: Graphics,
  kind: "tree" | "rock" | "pine",
  gx: number,
  gy: number
): void {
  const c = tileCenter(gx, gy);
  if (kind === "rock") {
    const off = TILE * SHADOW_FRAC;
    g.ellipse(c.x + off, c.y + off, 10, 7).fill({
      color: 0x000000,
      alpha: SHADOW_ALPHA,
    });
    g.ellipse(c.x, c.y, 11, 8).fill({ color: hexToNum(ROOF.rock) });
    g.ellipse(c.x - 2, c.y - 2, 5, 4).fill({
      color: shade(hexToNum(ROOF.rock), 1.15),
    });
  } else if (kind === "pine") {
    drawPineTopDown(g, c.x, c.y);
  } else {
    drawRoundTree(g, c.x, c.y);
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
  const pos = gridToWorld(gx, gy);
  g.rect(pos.x, pos.y, w * TILE, h * TILE)
    .fill({ color, alpha: 0.35 })
    .stroke({ width: 2, color, alpha: 0.9 });
}

export function clearPlaceholderCaches(): void {
  for (const t of textureCache.values()) t.destroy(true);
  for (const t of shadowCache.values()) t.destroy(true);
  textureCache.clear();
  shadowCache.clear();
}

export { FOOTPRINT };
