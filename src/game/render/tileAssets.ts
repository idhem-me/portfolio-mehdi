/**
 * Tuiles sol procédurales top-down (carrés TILE×TILE).
 * Les PNG iso historiques ne sont plus calés ; le sol est généré une fois.
 */
import { Sprite, Texture } from "pixi.js";
import { TILE, gridToWorld } from "./grid";
import { BEACH, GRASS, GRASS_DARK, WATER_FOAM, hexToNum, shade } from "./palette";

export type GroundKind = "grass" | "grassDark" | "beach" | "shallow" | "foam";

export type GroundTileAsset = {
  texture: Texture;
  kind: GroundKind;
};

const cache = new Map<GroundKind, GroundTileAsset>();

function bakeSquare(color: number, variant = 0): Texture {
  const c = document.createElement("canvas");
  c.width = TILE;
  c.height = TILE;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, TILE, TILE);
  // Léger bruit pastel (pas de contour)
  const r = ((variant * 17) % 7) - 3;
  ctx.fillStyle = `rgba(255,255,255,${0.04 + (variant % 3) * 0.01})`;
  ctx.beginPath();
  ctx.ellipse(
    TILE * 0.35 + r,
    TILE * 0.4,
    TILE * 0.22,
    TILE * 0.18,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  return Texture.from(c);
}

export function getGroundTexture(kind: GroundKind, variant = 0): GroundTileAsset {
  const key = kind;
  const hit = cache.get(key);
  if (hit && variant === 0) return hit;

  let color: number;
  switch (kind) {
    case "grass":
      color = hexToNum(GRASS[variant % GRASS.length]!);
      break;
    case "grassDark":
      color = hexToNum(GRASS_DARK[variant % GRASS_DARK.length]!);
      break;
    case "beach":
      color = hexToNum(BEACH);
      break;
    case "shallow":
      color = shade(hexToNum("#5EC4D4"), 1.15);
      break;
    case "foam":
      color = hexToNum(WATER_FOAM);
      break;
    default:
      color = hexToNum(GRASS[0]!);
  }

  const asset: GroundTileAsset = {
    texture: bakeSquare(color, variant),
    kind,
  };
  if (variant === 0) cache.set(key, asset);
  return asset;
}

/** Précharge les textures sol de base. */
export async function loadGrassAndWater(): Promise<{
  grass: GroundTileAsset;
  water: GroundTileAsset;
}> {
  return {
    grass: getGroundTexture("grass"),
    water: getGroundTexture("shallow"),
  };
}

/** Place un sprite tuile carré ancré haut-gauche. */
export function placeTileSprite(
  asset: GroundTileAsset,
  gx: number,
  gy: number,
  opts?: { tint?: number; alpha?: number }
): Sprite {
  const spr = new Sprite(asset.texture);
  const pos = gridToWorld(gx, gy);
  spr.anchor.set(0, 0);
  spr.x = pos.x;
  spr.y = pos.y;
  spr.width = TILE;
  spr.height = TILE;
  if (opts?.tint != null) spr.tint = opts.tint;
  if (opts?.alpha != null) spr.alpha = opts.alpha;
  return spr;
}

export function clearGroundTextureCache(): void {
  for (const a of cache.values()) {
    a.texture.destroy(true);
  }
  cache.clear();
}
