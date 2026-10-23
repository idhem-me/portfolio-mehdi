import { Container, Graphics } from "pixi.js";
import { MAP_SEED, MAP_SIZE, SCENERY_RING } from "@/game/core/balance";
import { mulberry32 } from "@/game/core/rng";
import {
  BEACH,
  CLIFF,
  GRASS,
  MOUNTAIN,
  MOUNTAIN_SNOW,
  WATER_FOAM,
  facetColors,
  hexToNum,
} from "./palette";
import { TILE_H, TILE_W, gridToScreen } from "./iso";

/**
 * Décor hors-jeu, entièrement positionné via gridToScreen :
 * montagnes (nord), anneau île irrégulier, écume, îlots, nuages.
 */
export class Scenery {
  readonly root = new Container();
  readonly clouds = new Container();
  private drawn = false;
  private cloudOffsets: { g: Graphics; baseX: number; speed: number }[] = [];

  build(): void {
    if (this.drawn) return;
    this.drawn = true;
    this.root.addChild(this.drawMountains());
    this.root.addChild(this.drawIslandRing());
    this.root.addChild(this.drawFoam());
    this.root.addChild(this.drawIslets());
    this.root.addChild(this.clouds);
    this.buildClouds();
  }

  tickClouds(dtMs: number, reducedMotion: boolean): void {
    if (reducedMotion) return;
    for (const c of this.cloudOffsets) {
      c.g.x = c.baseX + ((performance.now() * c.speed) % (TILE_W * 20));
    }
    void dtMs;
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
    // Voile bleuté
    g.rect(spanL, baseY - 40, spanR - spanL, 70).fill({
      color: 0xb8d4e8,
      alpha: 0.28,
    });
    layer.addChild(g);
    return layer;
  }

  private drawIslandRing(): Container {
    const layer = new Container();
    const g = new Graphics();
    const r = mulberry32(MAP_SEED ^ 0x151a);
    const ring = SCENERY_RING;

    for (let y = -ring; y < MAP_SIZE + ring; y++) {
      for (let x = -ring; x < MAP_SIZE + ring; x++) {
        if (x >= 0 && x < MAP_SIZE && y >= 0 && y < MAP_SIZE) continue;
        // Irrégulier : skip aléatoire pour contour organique
        const dist = Math.min(
          x < 0 ? -x : x >= MAP_SIZE ? x - MAP_SIZE + 1 : ring,
          y < 0 ? -y : y >= MAP_SIZE ? y - MAP_SIZE + 1 : ring
        );
        if (dist > ring) continue;
        if (r() > 0.72 + dist * 0.08) continue;

        const top = gridToScreen(x, y);
        const southEast = x >= MAP_SIZE - 1 || y >= MAP_SIZE - 1 || x < 0 && y > MAP_SIZE / 2;
        const isBeach =
          (x >= MAP_SIZE || y >= MAP_SIZE) && r() > 0.35;
        const color = isBeach
          ? hexToNum(BEACH)
          : hexToNum(GRASS[Math.floor(r() * 3)]!);

        g.poly([
          top.x,
          top.y,
          top.x + TILE_W / 2,
          top.y + TILE_H / 2,
          top.x,
          top.y + TILE_H,
          top.x - TILE_W / 2,
          top.y + TILE_H / 2,
        ]).fill({ color, alpha: 0.9 });

        // Falaises sud / est
        if (southEast && (x >= MAP_SIZE - 1 || y >= MAP_SIZE - 1) && r() > 0.4) {
          const cf = facetColors(CLIFF);
          g.poly([
            top.x,
            top.y + TILE_H,
            top.x + TILE_W / 2,
            top.y + TILE_H / 2,
            top.x + TILE_W / 2,
            top.y + TILE_H / 2 + 22,
            top.x,
            top.y + TILE_H + 22,
          ]).fill({ color: cf.right, alpha: 0.95 });
        }
      }
    }
    layer.addChild(g);
    return layer;
  }

  private drawFoam(): Container {
    const layer = new Container();
    const g = new Graphics();
    const r = mulberry32(MAP_SEED ^ 0xf0a);
    const foam = hexToNum(WATER_FOAM);
    // Écume facettée autour du bord SE de l'île
    for (let i = -2; i < MAP_SIZE + 3; i++) {
      for (const [x, y] of [
        [MAP_SIZE + 1, i],
        [i, MAP_SIZE + 1],
        [MAP_SIZE + 2, i],
        [i, MAP_SIZE + 2],
      ] as const) {
        if (r() > 0.55) continue;
        const top = gridToScreen(x, y);
        g.poly([
          top.x,
          top.y + 4,
          top.x + TILE_W * 0.35,
          top.y + TILE_H * 0.35,
          top.x,
          top.y + TILE_H * 0.55,
          top.x - TILE_W * 0.35,
          top.y + TILE_H * 0.35,
        ]).fill({ color: foam, alpha: 0.55 + r() * 0.3 });
      }
    }
    layer.addChild(g);
    return layer;
  }

  private drawIslets(): Container {
    const layer = new Container();
    const g = new Graphics();
    const r = mulberry32(MAP_SEED ^ 0x151e7);
    const spots = [
      [MAP_SIZE + 4, MAP_SIZE + 2],
      [MAP_SIZE + 3, MAP_SIZE + 5],
      [MAP_SIZE + 6, MAP_SIZE + 3],
      [MAP_SIZE + 5, MAP_SIZE + 6],
    ];
    for (const [gx, gy] of spots) {
      if (r() > 0.85) continue;
      const top = gridToScreen(gx, gy);
      const rock = facetColors("#8A8A82");
      g.poly([
        top.x,
        top.y,
        top.x + TILE_W * 0.4,
        top.y + TILE_H * 0.35,
        top.x,
        top.y + TILE_H * 0.7,
        top.x - TILE_W * 0.4,
        top.y + TILE_H * 0.35,
      ]).fill({ color: rock.left });
      // Sapin
      const cx = top.x;
      const cy = top.y + TILE_H * 0.2;
      const leaf = facetColors("#3D6B3A");
      g.poly([cx, cy - 36, cx + 12, cy - 8, cx - 12, cy - 8]).fill({
        color: leaf.top,
      });
    }
    layer.addChild(g);
    return layer;
  }

  private buildClouds(): void {
    const r = mulberry32(MAP_SEED ^ 0xc10d);
    const far = gridToScreen(MAP_SIZE / 2, 0);
    for (let i = 0; i < 3; i++) {
      const g = new Graphics();
      const cx = far.x + (r() - 0.5) * TILE_W * 12;
      const cy = far.y - 80 - r() * 60;
      drawCloud(g, 0, 0);
      g.x = cx;
      g.y = cy;
      g.alpha = 0.55;
      this.clouds.addChild(g);
      this.cloudOffsets.push({
        g,
        baseX: cx - TILE_W * 10,
        speed: 0.004 + r() * 0.006,
      });
    }
  }
}

function drawCloud(g: Graphics, x: number, y: number): void {
  const c = 0xf4f8fb;
  g.ellipse(x, y, 40, 16).fill({ color: c });
  g.ellipse(x - 28, y + 4, 22, 12).fill({ color: c });
  g.ellipse(x + 30, y + 2, 24, 13).fill({ color: c });
}
