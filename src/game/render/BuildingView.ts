import {
  Assets,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
} from "pixi.js";
import { getBuildingDef } from "@/game/core/buildings";
import { computeCity } from "@/game/core/city";
import type { GameState, PlacedBuilding } from "@/game/core/types";
import {
  allBuildingSpriteUrls,
  resolveBuildingAsset,
} from "./assets";
import { gridToScreen } from "./iso";
import { drawBuildingPlaceholder, drawGhostFootprint } from "./placeholders";

type BuildingNode = Graphics | Sprite;

type Pt = { x: number; y: number };

/** Pointes du losange au sol dans le repère de la texture (frame locale). */
type FootprintTips = {
  west: Pt; // jaune
  south: Pt; // rouge
  east: Pt; // bleu
};

type LoadedSprite = {
  texture: Texture;
  tips: FootprintTips;
  /** Masque opaque de la frame (1 = cliquable), row-major. */
  hitMask: Uint8Array;
  hitW: number;
  hitH: number;
};

export class BuildingView {
  readonly layer = new Container();
  private byId = new Map<string, BuildingNode>();
  private spriteMeta = new Map<string, LoadedSprite>();
  private ghost = new Graphics();
  private progress = new Graphics();
  private powerIcons = new Graphics();
  private textures = new Map<string, LoadedSprite>();

  constructor() {
    this.layer.sortableChildren = true;
    this.layer.addChild(this.ghost);
    this.layer.addChild(this.progress);
    this.layer.addChild(this.powerIcons);
  }

  async loadAssets(): Promise<void> {
    await Promise.all(
      allBuildingSpriteUrls().map(async (url) => {
        try {
          const raw = await Assets.load<Texture>(url);
          const loaded = await prepareBuildingSprite(raw);
          this.textures.set(url, loaded);
        } catch (err) {
          console.warn(`[BuildingView] asset failed: ${url}`, err);
        }
      })
    );
  }

  sync(state: GameState, now: number): void {
    const city = computeCity(state, now);
    const unpowered = city.powerRatio < 1;
    const seen = new Set<string>();
    for (const b of state.buildings) {
      seen.add(b.id);
      const def = getBuildingDef(b.type);
      const displayLevel = b.construction
        ? Math.max(0, b.level)
        : Math.max(1, b.level);
      const alpha = b.construction && b.level === 0 ? 0.85 : 1;
      const url = resolveBuildingAsset(b.type, displayLevel);
      const loaded = url ? this.textures.get(url) : undefined;
      const useSprite = Boolean(loaded);

      let node = this.byId.get(b.id);
      const isSprite = node instanceof Sprite;
      if (node && useSprite !== isSprite) {
        this.layer.removeChild(node);
        node.destroy();
        this.byId.delete(b.id);
        node = undefined;
      }

      if (!node) {
        node = useSprite ? new Sprite(loaded!.texture) : new Graphics();
        this.byId.set(b.id, node);
        this.layer.addChild(node);
      }

      node.alpha = alpha;
      if (node instanceof Sprite && loaded) {
        this.layoutSprite(node, loaded, b);
        this.spriteMeta.set(b.id, loaded);
      } else if (node instanceof Graphics) {
        this.spriteMeta.delete(b.id);
        node.clear();
        drawBuildingPlaceholder(
          node,
          b.type,
          Math.max(1, displayLevel),
          b.x,
          b.y,
          hashId(b.id)
        );
      }

      // Tri iso : sud-est devant (x+y), tie-break x
      const depth =
        b.x + def.width - 1 + (b.y + def.height - 1) + b.x * 0.01;
      node.zIndex = depth;
    }

    for (const [id, g] of this.byId) {
      if (!seen.has(id)) {
        this.layer.removeChild(g);
        g.destroy();
        this.byId.delete(id);
        this.spriteMeta.delete(id);
      }
    }

    this.drawProgressBars(state, now);
    this.drawPowerOffIcons(state, unpowered);
  }

  /**
   * Hit-test monde : pixels opaques du sprite, du plus devant au plus derrière.
   * (Les maisons du fond restent sélectionnables malgré le chevauchement iso.)
   */
  hitTest(worldX: number, worldY: number, state: GameState): string | null {
    const ordered = [...this.byId.entries()].sort(
      (a, b) => b[1].zIndex - a[1].zIndex
    );
    for (const [id, node] of ordered) {
      if (node instanceof Sprite) {
        const meta = this.spriteMeta.get(id);
        if (meta && spriteHitsOpaque(node, meta, worldX, worldY)) {
          return id;
        }
        continue;
      }
      const b = state.buildings.find((x) => x.id === id);
      if (b && placeholderHits(b, worldX, worldY)) return id;
    }
    return null;
  }

  /**
   * Aligne jaune→Ouest, rouge→Sud, bleu→Est de la tuile.
   */
  private layoutSprite(
    spr: Sprite,
    loaded: LoadedSprite,
    b: PlacedBuilding
  ): void {
    const def = getBuildingDef(b.type);
    const { tips, texture } = loaded;
    const gx = b.x;
    const gy = b.y;
    const fw = def.width;
    const fh = def.height;

    // Coins tuile : Ouest (jaune), Sud (rouge), Est (bleu)
    const tileW = gridToScreen(gx, gy + fh);
    const tileS = gridToScreen(gx + fw, gy + fh);
    const tileE = gridToScreen(gx + fw, gy);

    const diamondW = Math.max(1, tips.east.x - tips.west.x);
    const diamondHalfH = Math.max(1, tips.south.y - tips.west.y);

    const scaleX = (tileE.x - tileW.x) / diamondW;
    const scaleY = (tileS.y - tileW.y) / diamondHalfH;

    spr.texture = texture;
    spr.anchor.set(0, 0);
    spr.scale.set(scaleX, scaleY);
    // Colle le point Ouest (jaune) de l'asset sur l'Ouest de la tuile
    spr.x = tileW.x - tips.west.x * scaleX;
    spr.y = tileW.y - tips.west.y * scaleY;
  }

  setGhost(
    gx: number,
    gy: number,
    w: number,
    h: number,
    valid: boolean,
    visible: boolean
  ): void {
    this.ghost.clear();
    if (!visible) return;
    drawGhostFootprint(this.ghost, gx, gy, w, h, valid);
    this.ghost.zIndex = 10_000;
  }

  private drawProgressBars(state: GameState, now: number): void {
    this.progress.clear();
    for (const b of state.buildings) {
      if (!b.construction) continue;
      this.drawBar(b, now);
    }
  }

  private drawBar(b: PlacedBuilding, now: number): void {
    const def = getBuildingDef(b.type);
    const top = gridToScreen(b.x, b.y);
    const cx = top.x + ((def.width - def.height) * 64) / 2;
    const cy = top.y - 8;
    const total = b.construction!.endsAt - b.construction!.startedAt;
    const t = Math.min(
      1,
      Math.max(0, (now - b.construction!.startedAt) / total)
    );
    const w = 40 * def.width;
    this.progress
      .rect(cx - w / 2, cy, w, 6)
      .fill({ color: 0x222222, alpha: 0.5 });
    this.progress
      .rect(cx - w / 2, cy, w * t, 6)
      .fill({ color: 0x4ade80 });
    this.progress.zIndex = 9999;
  }

  private drawPowerOffIcons(state: GameState, unpowered: boolean): void {
    this.powerIcons.clear();
    if (!unpowered) return;
    for (const b of state.buildings) {
      if (b.construction || b.level <= 0) continue;
      const def = getBuildingDef(b.type);
      if (def.power >= 0) continue;
      const top = gridToScreen(b.x, b.y);
      const cx = top.x + ((def.width - def.height) * 64) / 2;
      const cy = top.y - 18;
      this.powerIcons
        .circle(cx, cy, 8)
        .fill({ color: 0x1c1917, alpha: 0.75 });
      this.powerIcons
        .poly([
          cx - 2,
          cy - 5,
          cx + 3,
          cy - 5,
          cx + 0,
          cy - 1,
          cx + 4,
          cy - 1,
          cx - 3,
          cy + 6,
          cx - 1,
          cy + 1,
          cx - 4,
          cy + 1,
        ])
        .fill({ color: 0xfbbf24 });
      this.powerIcons
        .moveTo(cx - 7, cy + 6)
        .lineTo(cx + 7, cy - 6)
        .stroke({ width: 2.5, color: 0xef4444, alpha: 0.95 });
    }
    this.powerIcons.zIndex = 9998;
  }
}

async function prepareBuildingSprite(raw: Texture): Promise<LoadedSprite> {
  const analysis = await analyzeFootprint(raw);
  if (!analysis) {
    const tips = fallbackTips(raw);
    const hitW = Math.max(1, Math.round(raw.width));
    const hitH = Math.max(1, Math.round(raw.height));
    return {
      texture: raw,
      tips,
      hitMask: new Uint8Array(hitW * hitH).fill(1),
      hitW,
      hitH,
    };
  }

  const { frame, tips, hitMask } = analysis;
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
    hitMask,
    hitW: frame.w,
    hitH: frame.h,
  };
}

function fallbackTips(tex: Texture): FootprintTips {
  const w = tex.width;
  const h = tex.height;
  return {
    west: { x: 0, y: h * 0.75 },
    south: { x: w / 2, y: h },
    east: { x: w, y: h * 0.75 },
  };
}

function spriteHitsOpaque(
  spr: Sprite,
  meta: LoadedSprite,
  worldX: number,
  worldY: number
): boolean {
  const local = spr.toLocal({ x: worldX, y: worldY });
  const px = Math.floor(local.x);
  const py = Math.floor(local.y);
  if (px < 0 || py < 0 || px >= meta.hitW || py >= meta.hitH) return false;
  return meta.hitMask[py * meta.hitW + px]! > 0;
}

/** Volume de clic approx. pour placeholders (losange sol + hauteur). */
function placeholderHits(b: PlacedBuilding, worldX: number, worldY: number): boolean {
  const def = getBuildingDef(b.type);
  const top = gridToScreen(b.x, b.y);
  const south = gridToScreen(b.x + def.width, b.y + def.height);
  const left = gridToScreen(b.x, b.y + def.height);
  const right = gridToScreen(b.x + def.width, b.y);
  const minX = Math.min(top.x, south.x, left.x, right.x) - 8;
  const maxX = Math.max(top.x, south.x, left.x, right.x) + 8;
  const minY = top.y - 80;
  const maxY = south.y + 4;
  return worldX >= minX && worldX <= maxX && worldY >= minY && worldY <= maxY;
}

/**
 * Détecte le losange au sol : pointe S (bas), puis O/E à l'équateur
 * (première largeur max en remontant depuis le sud).
 */
async function analyzeFootprint(tex: Texture): Promise<{
  frame: { x: number; y: number; w: number; h: number };
  tips: FootprintTips;
  hitMask: Uint8Array;
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
    const a = data[i + 3]!;
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    return a > 12 && r + g + b > 24;
  };

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!opaque(x, y)) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) return null;

  // Pointe sud (rouge)
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

  // Équateur du losange : remonter depuis le sud jusqu'à largeur max locale
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

  const tips: FootprintTips = {
    west: { x: equator.L, y: equator.y },
    south,
    east: { x: equator.R, y: equator.y },
  };

  const pad = 1;
  const fx = Math.max(0, minX - pad);
  const fy = Math.max(0, minY - pad);
  const fw = Math.min(w - fx, maxX - minX + 1 + pad * 2);
  const fh = Math.min(h - fy, maxY - minY + 1 + pad * 2);

  const hitMask = new Uint8Array(fw * fh);
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      hitMask[y * fw + x] = opaque(fx + x, fy + y) ? 1 : 0;
    }
  }

  return { frame: { x: fx, y: fy, w: fw, h: fh }, tips, hitMask };
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}
