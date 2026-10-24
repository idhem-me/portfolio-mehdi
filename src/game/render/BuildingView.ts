import {
  Assets,
  Container,
  Graphics,
  Sprite,
  Texture,
} from "pixi.js";
import { getBuildingDef } from "@/game/core/buildings";
import { computeCity } from "@/game/core/city";
import { fineFootprintDims } from "@/game/core/grid";
import { TILE_PX } from "@/game/core/mapConfig";
import type {
  BuildingTypeId,
  GameState,
  PlacedBuilding,
} from "@/game/core/types";
import {
  ASSET_PX_PER_TILE,
  allBuildingSpriteUrls,
  resolveBuildingAsset,
} from "./assets";
import { TILE, footprintRect, gridToWorld, tileCenter } from "./grid";
import {
  bakeBuildingTexture,
  bakeShadowTexture,
  drawGhostFootprint,
} from "./placeholders";
import { getBuildingTexture, getSiteTexture } from "./villageAssets";

type BuildingNode = Sprite;

type LoadedSprite = {
  texture: Texture;
  hitMask: Uint8Array;
  hitW: number;
  hitH: number;
};

/**
 * Bâtiments top-down.
 * Couches fixes : ombres → bâtiments → indicateurs → fantôme.
 */
export class BuildingView {
  readonly layer = new Container();
  private shadows = new Container();
  private buildings = new Container();
  private overlays = new Container();
  private byId = new Map<string, BuildingNode>();
  private shadowById = new Map<string, Sprite>();
  private spriteMeta = new Map<string, LoadedSprite>();
  private ghost = new Graphics();
  private ghostSprite = new Sprite();
  private selection = new Graphics();
  private progress = new Graphics();
  private powerIcons = new Graphics();
  private textures = new Map<string, LoadedSprite>();

  constructor() {
    this.ghostSprite.alpha = 0;
    this.layer.addChild(this.shadows);
    this.layer.addChild(this.buildings);
    this.layer.addChild(this.overlays);
    this.layer.addChild(this.ghost);
    this.layer.addChild(this.ghostSprite);
    this.layer.addChild(this.selection);
    this.overlays.addChild(this.progress);
    this.overlays.addChild(this.powerIcons);
  }

  async loadAssets(): Promise<void> {
    await Promise.all(
      allBuildingSpriteUrls().map(async (url) => {
        try {
          if (url.startsWith("village://")) {
            const key = url.replace("village://", "");
            const entry = getBuildingTexture(
              key.replace("bld-", "") as BuildingTypeId,
              1
            );
            // coal_plant assemblé
            const fromVillage =
              key === "bld-coal_plant"
                ? getBuildingTexture("coal_plant", 1)
                : entry;
            if (fromVillage) {
              const loaded = await prepareBuildingSprite(fromVillage.texture);
              this.textures.set(url, loaded);
            }
            return;
          }
          const raw = await Assets.load<Texture>(url);
          const loaded = await prepareBuildingSprite(raw);
          this.textures.set(url, loaded);
        } catch (err) {
          console.warn(`[BuildingView] asset failed: ${url}`, err);
        }
      })
    );
    // Garantir la centrale assemblée même sans URL catalogue
    const coal = getBuildingTexture("coal_plant", 1);
    if (coal) {
      const loaded = await prepareBuildingSprite(coal.texture);
      this.textures.set("village://bld-coal_plant", loaded);
    }
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
      const baseAlpha = b.construction && b.level === 0 ? 0.85 : 1;
      const alpha =
        state.movingBuildingId === b.id ? baseAlpha * 0.35 : baseAlpha;
      const evolving =
        typeof b.evolvingUntil === "number" && now < b.evolvingUntil;
      const url = resolveBuildingAsset(b.type, displayLevel);
      const siteUp = evolving ? getSiteTexture("upgrade") : null;
      const loaded = url ? this.textures.get(url) : undefined;
      const usePng = Boolean(loaded) || Boolean(siteUp?.texture && !siteUp.placeholder);

      let node = this.byId.get(b.id);
      let shadow = this.shadowById.get(b.id);

      if (!node) {
        node = new Sprite();
        this.byId.set(b.id, node);
        this.buildings.addChild(node);
      }
      if (!shadow) {
        shadow = new Sprite();
        this.shadowById.set(b.id, shadow);
        this.shadows.addChild(shadow);
      }

      node.alpha = alpha;
      shadow.alpha = alpha;

      const { w: fw, h: fh } = fineFootprintDims(
        def.width,
        def.height,
        b.rotation ?? "H"
      );
      const rect = footprintRect(b.x, b.y, fw, fh);
      // Art = TILE_PX par unité (1254), réservation grille = CELLS_PER_TILE × 320.
      const artW = def.width * TILE_PX;
      const artH = def.height * TILE_PX;
      const rot =
        b.type === "townhall"
          ? 0
          : b.rotation === "V"
            ? Math.PI / 2
            : 0;

      if (usePng && (siteUp?.texture || loaded)) {
        const tex = siteUp && !siteUp.placeholder ? siteUp.texture : loaded!.texture;
        if (loaded && !(siteUp && !siteUp.placeholder)) {
          this.spriteMeta.set(b.id, loaded);
        } else {
          this.spriteMeta.delete(b.id);
        }
        node.texture = tex;
        node.anchor.set(0.5, 0.5);
        node.scale.set(1);
        node.rotation = rot;
        // Art 1254 ancré HG de la réservation grille (4×320 = 1280)
        node.x = rect.x + artW / 2;
        node.y = rect.y + artH / 2;
        node.width = artW;
        node.height = artH;
        // DA inclut le socle : pas d'ombre code
        shadow.alpha = 0;
      } else {
        this.spriteMeta.delete(b.id);
        const level = Math.max(1, displayLevel);
        const seed = hashId(b.id);
        node.texture = bakeBuildingTexture(b.type, level, seed);
        node.anchor.set(0.5, 0.5);
        node.rotation = rot;
        node.scale.set(1);
        node.x = rect.x + rect.w / 2;
        node.y = rect.y + rect.h / 2;
        node.width = rect.w;
        node.height = rect.h;
        shadow.alpha = alpha;
        shadow.texture = bakeShadowTexture(b.type, level);
        shadow.anchor.set(0.5, 0.5);
        shadow.rotation = rot;
        shadow.x = node.x;
        shadow.y = node.y;
        shadow.width = rect.w;
        shadow.height = rect.h;
      }

      void ASSET_PX_PER_TILE;
      void TILE;
    }

    this.drawSelection(state);

    for (const [id, g] of this.byId) {
      if (!seen.has(id)) {
        this.buildings.removeChild(g);
        g.destroy();
        this.byId.delete(id);
        this.spriteMeta.delete(id);
        const sh = this.shadowById.get(id);
        if (sh) {
          this.shadows.removeChild(sh);
          sh.destroy();
          this.shadowById.delete(id);
        }
      }
    }

    this.drawProgressBars(state, now);
    this.drawPowerOffIcons(state, unpowered);
  }

  /**
   * Hit-test monde : pixels opaques du sprite, ou AABB empreinte placeholder.
   */
  hitTest(worldX: number, worldY: number, state: GameState): string | null {
    // Du plus récent au plus ancien (pas de z-sort iso)
    const ids = [...this.byId.keys()].reverse();
    for (const id of ids) {
      const node = this.byId.get(id)!;
      const meta = this.spriteMeta.get(id);
      if (meta) {
        if (spriteHitsOpaque(node, meta, worldX, worldY)) return id;
        continue;
      }
      const b = state.buildings.find((x) => x.id === id);
      if (b && placeholderHits(b, worldX, worldY)) return id;
    }
    return null;
  }

  /**
   * Ghost : `w`/`h` en cases de grille (déjà × CELLS_PER_TILE).
   * Sprite art reste en TILE_PX.
   */
  setGhost(
    gx: number,
    gy: number,
    w: number,
    h: number,
    valid: boolean,
    visible: boolean,
    type?: BuildingTypeId | null,
    rotation: "H" | "V" = "H"
  ): void {
    this.ghost.clear();
    this.ghostSprite.alpha = 0;
    if (!visible) return;
    drawGhostFootprint(this.ghost, gx, gy, w, h, valid);
    if (type) {
      const url = resolveBuildingAsset(type, 1);
      const loaded = url ? this.textures.get(url) : undefined;
      const def = getBuildingDef(type);
      const rect = footprintRect(gx, gy, w, h);
      if (loaded) {
        this.ghostSprite.texture = loaded.texture;
        this.ghostSprite.anchor.set(0.5, 0.5);
        this.ghostSprite.rotation = rotation === "V" ? Math.PI / 2 : 0;
        // Ancré en haut-gauche de la réservation grille (art 1254 dans 1280)
        this.ghostSprite.x = rect.x + (def.width * TILE_PX) / 2;
        this.ghostSprite.y = rect.y + (def.height * TILE_PX) / 2;
        this.ghostSprite.width = def.width * TILE_PX;
        this.ghostSprite.height = def.height * TILE_PX;
        this.ghostSprite.alpha = valid ? 0.6 : 0.45;
        this.ghostSprite.tint = valid ? 0xffffff : 0xe85a5a;
      }
    }
  }

  private drawSelection(state: GameState): void {
    this.selection.clear();
    const id = state.selectedBuildingId;
    if (!id) return;
    const b = state.buildings.find((x) => x.id === id);
    if (!b) return;
    const def = getBuildingDef(b.type);
    const { w, h } = fineFootprintDims(
      def.width,
      def.height,
      b.rotation ?? "H"
    );
    const rect = footprintRect(b.x, b.y, w, h);
    this.selection
      .rect(rect.x, rect.y, rect.w, rect.h)
      .stroke({ width: 20, color: 0xf5f5f4, alpha: 0.95 });
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
    const c = tileCenter(b.x + def.width / 2 - 0.5, b.y - 0.15);
    const total = b.construction!.endsAt - b.construction!.startedAt;
    const t = Math.min(
      1,
      Math.max(0, (now - b.construction!.startedAt) / total)
    );
    const w = 36 * def.width;
    this.progress
      .rect(c.x - w / 2, c.y, w, 6)
      .fill({ color: 0x222222, alpha: 0.5 });
    this.progress
      .rect(c.x - w / 2, c.y, w * t, 6)
      .fill({ color: 0x4ade80 });
  }

  private drawPowerOffIcons(state: GameState, unpowered: boolean): void {
    this.powerIcons.clear();
    if (!unpowered) return;
    for (const b of state.buildings) {
      if (b.construction || b.level <= 0) continue;
      const def = getBuildingDef(b.type);
      if (def.power >= 0) continue;
      const c = tileCenter(b.x + def.width / 2 - 0.5, b.y);
      const cx = c.x;
      const cy = c.y - TILE * 0.35;
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
  }
}

async function prepareBuildingSprite(raw: Texture): Promise<LoadedSprite> {
  const hitW = Math.max(1, Math.round(raw.width));
  const hitH = Math.max(1, Math.round(raw.height));
  const hitMask = await buildHitMask(raw, hitW, hitH);
  return { texture: raw, hitMask, hitW, hitH };
}

async function buildHitMask(
  tex: Texture,
  w: number,
  h: number
): Promise<Uint8Array> {
  const mask = new Uint8Array(w * h);
  const source = tex.source;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    mask.fill(1);
    return mask;
  }
  const res = source.resource as CanvasImageSource | undefined;
  if (!res) {
    mask.fill(1);
    return mask;
  }
  try {
    ctx.drawImage(res as CanvasImageSource, 0, 0, w, h);
  } catch {
    mask.fill(1);
    return mask;
  }
  const { data } = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < w * h; i++) {
    mask[i] = data[i * 4 + 3]! > 12 ? 1 : 0;
  }
  return mask;
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

function placeholderHits(
  b: PlacedBuilding,
  worldX: number,
  worldY: number
): boolean {
  const def = getBuildingDef(b.type);
  const { w, h } = fineFootprintDims(
    def.width,
    def.height,
    b.rotation ?? "H"
  );
  const r = footprintRect(b.x, b.y, w, h);
  return (
    worldX >= r.x &&
    worldX < r.x + r.w &&
    worldY >= r.y &&
    worldY < r.y + r.h
  );
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}
