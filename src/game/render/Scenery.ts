import { Container, Graphics } from "pixi.js";
import {
  MAP_SEED,
  MAP_SIZE,
  SCENERY_EXTENT,
  SCENERY_RING,
} from "@/game/core/balance";
import { mulberry32 } from "@/game/core/rng";
import {
  CLIFF,
  MOUNTAIN,
  MOUNTAIN_SNOW,
  facetColors,
  hexToNum,
} from "./palette";
import { TILE_H, TILE_W, gridToScreen } from "./iso";
import {
  loadGrassAndWater,
  placeTileSprite,
  type GroundTileAsset,
} from "./tileAssets";

/**
 * Décor hors-jeu : eau / herbe PNG, montagnes, îlots.
 */
export class Scenery {
  readonly root = new Container();
  private waterLayer = new Container();
  private landLayer = new Container();
  private drawn = false;
  private grass: GroundTileAsset | null = null;
  private water: GroundTileAsset | null = null;

  async loadAssets(): Promise<void> {
    const assets = await loadGrassAndWater();
    this.grass = assets.grass;
    this.water = assets.water;
  }

  build(): void {
    if (this.drawn) return;
    this.drawn = true;
    this.waterLayer.sortableChildren = true;
    this.landLayer.sortableChildren = true;
    this.root.addChild(this.waterLayer);
    this.root.addChild(this.drawMountains());
    this.root.addChild(this.landLayer);
    this.drawWaterAndLand();
    this.root.addChild(this.drawIslets());
  }

  private drawWaterAndLand(): void {
    const grass = this.grass;
    const water = this.water;
    const r = mulberry32(MAP_SEED ^ 0x151a);
    const pad = SCENERY_EXTENT;
    const mid = MAP_SIZE - 1;

    /**
     * Remplissage « rectangle écran » (contraintes sum/diff en grille) :
     * un carré grille → losange écran (coins AABB vides).
     * Une boîte |diff|×sum → rectangle écran (plus de vide bleu aux coins).
     */
    const sumMin = -2 * pad;
    const sumMax = 2 * mid + 2 * pad;
    const diffLim = mid + 2 * pad;
    const lo = -2 * pad - 1;
    const hi = MAP_SIZE + 2 * pad + 1;

    for (let y = lo; y < hi; y++) {
      for (let x = lo; x < hi; x++) {
        if (x >= 0 && x < MAP_SIZE && y >= 0 && y < MAP_SIZE) continue;

        const sum = x + y;
        const diff = x - y;
        if (sum < sumMin || sum > sumMax) continue;
        if (Math.abs(diff) > diffLim) continue;

        const depth = sum - mid; // <0 nord, >0 sud

        if (grass && depth <= 0) {
          this.landLayer.addChild(placeTileSprite(grass, x, y, { alpha: 1 }));
        }

        if (water && depth > 0) {
          this.waterLayer.addChild(
            placeTileSprite(water, x, y, {
              alpha: 0.97 + r() * 0.03,
              tint: r() > 0.75 ? 0xd8eeff : 0xffffff,
            })
          );
        }

        // Falaises sud près de la côte uniquement
        const distOut = Math.min(
          x < 0 ? -x : x >= MAP_SIZE ? x - MAP_SIZE + 1 : 99,
          y < 0 ? -y : y >= MAP_SIZE ? y - MAP_SIZE + 1 : 99
        );
        if (
          grass &&
          depth > 0 &&
          distOut > 0 &&
          distOut <= SCENERY_RING &&
          (x >= MAP_SIZE - 1 || y >= MAP_SIZE - 1) &&
          r() > 0.55
        ) {
          const top = gridToScreen(x, y);
          const cliff = new Graphics();
          const cf = facetColors(CLIFF);
          cliff
            .poly([
              top.x,
              top.y + TILE_H,
              top.x + TILE_W / 2,
              top.y + TILE_H / 2,
              top.x + TILE_W / 2,
              top.y + TILE_H / 2 + 22,
              top.x,
              top.y + TILE_H + 22,
            ])
            .fill({ color: cf.right, alpha: 0.95 });
          cliff.zIndex = x + y + 0.1;
          this.landLayer.addChild(cliff);
        }
      }
    }
  }

  private drawMountains(): Container {
    const layer = new Container();
    const g = new Graphics();
    const r = mulberry32(MAP_SEED ^ 0x60a11);
    const far = gridToScreen(0, 0);
    const farL = gridToScreen(0, MAP_SIZE);
    const farR = gridToScreen(MAP_SIZE, 0);
    const baseY = Math.min(far.y, farL.y, farR.y) - TILE_H * 0.8;
    const spanL = Math.min(farL.x, far.x) - TILE_W * 4;
    const spanR = Math.max(farR.x, far.x) + TILE_W * 4;

    const peaks: { x: number; h: number; w: number }[] = [];
    let x = spanL;
    const count = 5 + Math.floor(r() * 4);
    for (let i = 0; i < count; i++) {
      const w = 100 + r() * 160;
      peaks.push({ x, h: 80 + r() * 140, w });
      x += w * (0.4 + r() * 0.3);
      if (x > spanR) break;
    }

    for (const peak of peaks) {
      const colors = facetColors(MOUNTAIN[Math.floor(r() * MOUNTAIN.length)]!);
      const apexX = peak.x + peak.w * 0.5;
      const apexY = baseY - peak.h;
      const leftX = peak.x;
      const rightX = peak.x + peak.w;
      const footY = baseY + 24;
      g.poly([apexX, apexY, rightX, footY, apexX + 6, footY]).fill({
        color: colors.right,
      });
      g.poly([apexX, apexY, leftX, footY, apexX - 6, footY]).fill({
        color: colors.left,
      });
      if (peak.h > 110) {
        g.poly([
          apexX,
          apexY,
          apexX + peak.w * 0.14,
          apexY + peak.h * 0.2,
          apexX - peak.w * 0.14,
          apexY + peak.h * 0.2,
        ]).fill({ color: hexToNum(MOUNTAIN_SNOW), alpha: 0.92 });
      }
    }
    layer.addChild(g);
    return layer;
  }

  private drawIslets(): Container {
    const layer = new Container();
    layer.sortableChildren = true;
    const r = mulberry32(MAP_SEED ^ 0x151e7);
    const grass = this.grass;
    const spots = [
      [MAP_SIZE + 4, MAP_SIZE + 2],
      [MAP_SIZE + 3, MAP_SIZE + 5],
      [MAP_SIZE + 6, MAP_SIZE + 3],
      [MAP_SIZE + 5, MAP_SIZE + 6],
    ];
    for (const [gx, gy] of spots) {
      if (r() > 0.85) continue;
      if (grass) {
        layer.addChild(placeTileSprite(grass, gx, gy));
      }
      const top = gridToScreen(gx, gy);
      const pine = new Graphics();
      const cx = top.x;
      const cy = top.y + TILE_H * 0.2;
      const leaf = facetColors("#3D6B3A");
      pine.poly([cx, cy - 36, cx + 12, cy - 8, cx - 12, cy - 8]).fill({
        color: leaf.top,
      });
      pine.zIndex = gx + gy + 0.2;
      layer.addChild(pine);
    }
    return layer;
  }
}
