/**
 * Tuiles sol PNG (herbe / eau) — calage losange comme les bâtiments.
 */
import { Assets, Rectangle, Sprite, Texture } from "pixi.js";
import { gridToScreen } from "./iso";

export type Pt = { x: number; y: number };

export type TileFootprint = {
  west: Pt;
  south: Pt;
  east: Pt;
};

export type GroundTileAsset = {
  texture: Texture;
  tips: TileFootprint;
};

export const GROUND_TILE_URLS = {
  grass: "/game/asset/herbe.png",
  water: "/game/asset/eau.png",
} as const;

const cache = new Map<string, GroundTileAsset>();

export async function loadGroundTile(url: string): Promise<GroundTileAsset> {
  const hit = cache.get(url);
  if (hit) return hit;

  const raw = await Assets.load<Texture>(url);
  const prepared = await prepareTile(raw);
  cache.set(url, prepared);
  return prepared;
}

export async function loadGrassAndWater(): Promise<{
  grass: GroundTileAsset;
  water: GroundTileAsset;
}> {
  const [grass, water] = await Promise.all([
    loadGroundTile(GROUND_TILE_URLS.grass),
    loadGroundTile(GROUND_TILE_URLS.water),
  ]);
  return { grass, water };
}

/** Place un sprite tuile sur la case (gx,gy) — O/S/E collés au losange. */
export function placeTileSprite(
  asset: GroundTileAsset,
  gx: number,
  gy: number,
  opts?: { tint?: number; alpha?: number }
): Sprite {
  const spr = new Sprite(asset.texture);
  layoutTileSprite(spr, asset, gx, gy);
  if (opts?.tint != null) spr.tint = opts.tint;
  if (opts?.alpha != null) spr.alpha = opts.alpha;
  spr.zIndex = gx + gy;
  return spr;
}

export function layoutTileSprite(
  spr: Sprite,
  asset: GroundTileAsset,
  gx: number,
  gy: number
): void {
  const { tips, texture } = asset;
  const tileW = gridToScreen(gx, gy + 1);
  const tileS = gridToScreen(gx + 1, gy + 1);
  const tileE = gridToScreen(gx + 1, gy);

  const diamondW = Math.max(1, tips.east.x - tips.west.x);
  const diamondHalfH = Math.max(1, tips.south.y - tips.west.y);
  const scaleX = (tileE.x - tileW.x) / diamondW;
  const scaleY = (tileS.y - tileW.y) / diamondHalfH;

  spr.texture = texture;
  spr.anchor.set(0, 0);
  spr.scale.set(scaleX, scaleY);
  spr.x = tileW.x - tips.west.x * scaleX;
  spr.y = tileW.y - tips.west.y * scaleY;
}

async function prepareTile(raw: Texture): Promise<GroundTileAsset> {
  const analysis = await analyzeDiamond(raw);
  if (!analysis) {
    return {
      texture: raw,
      tips: {
        west: { x: 0, y: raw.height * 0.75 },
        south: { x: raw.width / 2, y: raw.height },
        east: { x: raw.width, y: raw.height * 0.75 },
      },
    };
  }
  const { frame, tips } = analysis;
  const texture = new Texture({
    source: raw.source,
    frame: new Rectangle(frame.x, frame.y, frame.w, frame.h),
  });
  return {
    texture,
    tips: {
      west: { x: tips.west.x - frame.x, y: tips.west.y - frame.y },
      south: { x: tips.south.x - frame.x, y: tips.south.y - frame.y },
      east: { x: tips.east.x - frame.x, y: tips.east.y - frame.y },
    },
  };
}

async function analyzeDiamond(tex: Texture): Promise<{
  frame: { x: number; y: number; w: number; h: number };
  tips: TileFootprint;
} | null> {
  const source = tex.source;
  const w = Math.round(source.width);
  const h = Math.round(source.height);
  if (w <= 0 || h <= 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const res = source.resource as CanvasImageSource | undefined;
  if (!res) return null;
  try {
    ctx.drawImage(res as CanvasImageSource, 0, 0);
  } catch {
    return null;
  }

  const { data } = ctx.getImageData(0, 0, w, h);
  const opaque = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return data[i + 3]! > 12 && data[i]! + data[i + 1]! + data[i + 2]! > 24;
  };

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!opaque(x, y)) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX) return null;

  let south: Pt | null = null;
  for (let y = maxY; y >= minY; y--) {
    const xs: number[] = [];
    for (let x = minX; x <= maxX; x++) {
      if (opaque(x, y)) xs.push(x);
    }
    if (xs.length) {
      south = { x: xs[Math.floor(xs.length / 2)]!, y };
      break;
    }
  }
  if (!south) return null;

  let prevW = 0;
  let equator: { y: number; L: number; R: number } | null = null;
  for (let y = south.y; y >= minY; y--) {
    let L = -1;
    let R = -1;
    for (let x = minX; x <= maxX; x++) {
      if (!opaque(x, y)) continue;
      if (L < 0) L = x;
      R = x;
    }
    if (L < 0) continue;
    const ww = R - L;
    if (ww >= prevW) {
      prevW = ww;
      equator = { y, L, R };
    } else if (south.y - y > 24) {
      break;
    }
  }
  if (!equator) {
    equator = { y: Math.round((south.y + minY) / 2), L: minX, R: maxX };
  }

  const tips: TileFootprint = {
    west: { x: equator.L, y: equator.y },
    south,
    east: { x: equator.R, y: equator.y },
  };

  const pad = 1;
  const fx = Math.max(0, minX - pad);
  const fy = Math.max(0, minY - pad);
  const fw = Math.min(w - fx, maxX - minX + 1 + pad * 2);
  const fh = Math.min(h - fy, maxY - minY + 1 + pad * 2);
  return { frame: { x: fx, y: fy, w: fw, h: fh }, tips };
}
