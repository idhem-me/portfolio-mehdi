import { Container, Graphics, Sprite, TextStyle, Texture, Text } from "pixi.js";
import {
  MAP_SEED,
  MAP_SIZE,
  PARCEL_COUNT,
  parcelId,
  parseParcelId,
} from "@/game/core/balance";
import { mulberry32 } from "@/game/core/rng";
import {
  isAdjacentParcel,
  isRoadVisible,
  parcelBlockOrigin,
  roadNeighborMask,
} from "@/game/core/grid";
import { parcelCost } from "@/game/core/economy";
import type { GameState } from "@/game/core/types";
import {
  BUYABLE_OUTLINE,
  CLIFF,
  CLIFF_DARK,
  HIGHWAY,
  ROAD,
  ROAD_EDGE,
  ROAD_MARK,
  facetColors,
  hexToNum,
} from "./palette";
import { TILE_H, TILE_W, gridToScreen } from "./iso";
import { drawDecorPlaceholder } from "./placeholders";
import {
  loadGrassAndWater,
  placeTileSprite,
  type GroundTileAsset,
} from "./tileAssets";

type TexBag = {
  generateTexture: (displayObject: Graphics) => Texture;
};

/**
 * Sol jouable : herbe PNG / forêt teintée / routes auto-tile / autoroute.
 */
export class IsoMap {
  readonly ground = new Container();
  readonly props = new Container();
  private grassAsset: GroundTileAsset | null = null;
  private roadTex = new Map<number, Texture>();
  private highwayTex: Texture | null = null;
  private cliffTex: Texture | null = null;
  private priceStyle: TextStyle | null = null;
  private outlineGfx = new Graphics();
  private priceLabels = new Container();
  private forestTrees = new Container();
  private tilesLayer = new Container();
  private built = false;
  private lastKey = "";

  constructor() {
    this.props.sortableChildren = true;
    this.forestTrees.sortableChildren = true;
    this.tilesLayer.sortableChildren = true;
    this.props.addChild(this.forestTrees);
    this.ground.addChild(this.tilesLayer);
    this.ground.addChild(this.outlineGfx);
    this.ground.addChild(this.priceLabels);
  }

  async bake(renderer: TexBag): Promise<void> {
    if (this.built) return;

    const { grass } = await loadGrassAndWater();
    this.grassAsset = grass;

    // Road masks 0..15
    for (let mask = 0; mask < 16; mask++) {
      this.roadTex.set(mask, this.bakeRoad(renderer, mask, false));
    }
    this.highwayTex = this.bakeRoad(renderer, 15, true);

    const cliff = new Graphics();
    const cf = facetColors(CLIFF);
    cliff
      .poly([
        TILE_W / 2,
        TILE_H,
        TILE_W,
        TILE_H / 2,
        TILE_W,
        TILE_H / 2 + 28,
        TILE_W / 2,
        TILE_H + 28,
      ])
      .fill({ color: cf.right });
    cliff
      .poly([
        TILE_W / 2,
        TILE_H,
        0,
        TILE_H / 2,
        0,
        TILE_H / 2 + 28,
        TILE_W / 2,
        TILE_H + 28,
      ])
      .fill({ color: hexToNum(CLIFF_DARK) });
    this.cliffTex = renderer.generateTexture(cliff);
    cliff.destroy();

    this.priceStyle = new TextStyle({
      fontFamily: "system-ui, sans-serif",
      fontSize: 14,
      fontWeight: "600",
      fill: 0x3a3a3a,
    });

    this.built = true;
  }

  sync(state: GameState, hoverParcel: string | null): void {
    const key = `${state.unlockedParcels.join("|")}:${state.parcelsBought}:${hoverParcel ?? ""}`;
    if (key === this.lastKey && this.ground.children.length > 2) {
      // Still refresh buildings layer elsewhere; ground can skip
      return;
    }
    this.lastKey = key;
    this.rebuild(state, hoverParcel);
  }

  forceRebuild(state: GameState, hoverParcel: string | null): void {
    this.lastKey = "";
    this.sync(state, hoverParcel);
  }

  private rebuild(state: GameState, hoverParcel: string | null): void {
    this.tilesLayer.removeChildren();
    this.forestTrees.removeChildren();
    this.outlineGfx.clear();
    this.priceLabels.removeChildren();

    const rand = mulberry32(MAP_SEED ^ 0xf07e);
    const grass = this.grassAsset;

    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const cell = state.cells[y * MAP_SIZE + x]!;
        const top = gridToScreen(x, y);

        if (cell.kind === "block" && cell.parcelId) {
          const unlocked = state.unlockedParcels.includes(cell.parcelId);
          if (grass) {
            const spr = placeTileSprite(grass, x, y, {
              tint: unlocked ? 0xffffff : 0x6a8a55,
              alpha: unlocked ? 1 : 0.92,
            });
            this.tilesLayer.addChild(spr);
          }

          if (!unlocked) {
            const n = 1 + Math.floor(rand() * 3);
            for (let i = 0; i < n; i++) {
              const g = new Graphics();
              const ox = (rand() - 0.5) * TILE_W * 0.35;
              const oy = (rand() - 0.5) * TILE_H * 0.25;
              drawPine(g, top.x + ox, top.y + TILE_H / 2 + oy);
              g.zIndex = x + y + 0.01 * i;
              this.forestTrees.addChild(g);
            }
          }
        } else if (cell.kind === "road" || cell.kind === "highway") {
          if (
            !isRoadVisible(state.cells, state.unlockedParcels, x, y)
          ) {
            continue;
          }
          const mask = roadNeighborMask(
            state.cells,
            state.unlockedParcels,
            x,
            y
          );
          const tex =
            cell.kind === "highway"
              ? this.highwayTex!
              : this.roadTex.get(mask)!;
          const spr = new Sprite(tex);
          spr.x = top.x - TILE_W / 2;
          spr.y = top.y;
          spr.zIndex = x + y;
          this.tilesLayer.addChild(spr);

          if (
            this.cliffTex &&
            (x === MAP_SIZE - 1 || y === MAP_SIZE - 1)
          ) {
            const c = new Sprite(this.cliffTex);
            c.x = top.x - TILE_W / 2;
            c.y = top.y;
            c.zIndex = x + y + 0.05;
            this.tilesLayer.addChild(c);
          }
        }
      }
    }

    // Contours + prix des parcelles achetable
    for (let py = 0; py < PARCEL_COUNT; py++) {
      for (let px = 0; px < PARCEL_COUNT; px++) {
        const id = parcelId(px, py);
        if (state.unlockedParcels.includes(id)) continue;
        if (!isAdjacentParcel(state.unlockedParcels, px, py)) continue;
        this.drawBuyableOutline(px, py, id === hoverParcel);
        if (this.priceStyle) {
          const o = parcelBlockOrigin(px, py);
          const c = gridToScreen(o.x + 0.5, o.y + 0.5);
          const label = new Text({
            text: `${parcelCost(state.parcelsBought)} or`,
            style: this.priceStyle,
          });
          label.anchor.set(0.5);
          label.x = c.x;
          label.y = c.y + TILE_H * 0.35;
          label.visible = id === hoverParcel;
          label.zIndex = 9000;
          this.priceLabels.addChild(label);
        }
      }
    }
  }

  private drawBuyableOutline(px: number, py: number, highlight: boolean): void {
    const o = parcelBlockOrigin(px, py);
    const pN = gridToScreen(o.x, o.y);
    const pE = gridToScreen(o.x + 2, o.y);
    const pS = gridToScreen(o.x + 2, o.y + 2);
    const pW = gridToScreen(o.x, o.y + 2);
    this.outlineGfx
      .poly([pN.x, pN.y, pE.x, pE.y, pS.x, pS.y, pW.x, pW.y])
      .stroke({
        width: highlight ? 3 : 2,
        color: hexToNum(BUYABLE_OUTLINE),
        alpha: highlight ? 1 : 0.7,
      });
  }

  private bakeRoad(
    renderer: TexBag,
    mask: number,
    highway: boolean
  ): Texture {
    const g = new Graphics();
    const fill = hexToNum(highway ? HIGHWAY : ROAD);
    const edge = hexToNum(ROAD_EDGE);
    g.poly([
      TILE_W / 2,
      0,
      TILE_W,
      TILE_H / 2,
      TILE_W / 2,
      TILE_H,
      0,
      TILE_H / 2,
    ])
      .fill({ color: fill })
      .stroke({ width: 2, color: edge, alpha: 0.85 });

    // Marquage selon connexions (simplifié : ligne centrale si N-S ou E-W)
    const mark = hexToNum(ROAD_MARK);
    const n = (mask & 1) !== 0;
    const e = (mask & 2) !== 0;
    const s = (mask & 4) !== 0;
    const w = (mask & 8) !== 0;
    if ((n || s) && !(e && w && !n && !s)) {
      g.moveTo(TILE_W / 2, TILE_H * 0.2)
        .lineTo(TILE_W / 2, TILE_H * 0.8)
        .stroke({ width: highway ? 2.5 : 1.5, color: mark, alpha: 0.9 });
    }
    if ((e || w) && !(n && s && !e && !w)) {
      g.moveTo(TILE_W * 0.25, TILE_H / 2)
        .lineTo(TILE_W * 0.75, TILE_H / 2)
        .stroke({ width: highway ? 2.5 : 1.5, color: mark, alpha: 0.9 });
    }
    void parseParcelId;
    const tex = renderer.generateTexture(g);
    g.destroy();
    return tex;
  }
}

/** Sapin low-poly ≈ 0,6 bloc de haut. */
function drawPine(g: Graphics, cx: number, cy: number): void {
  const h = TILE_H * 0.95; // ~0.6 block visual height
  const trunk = facetColors("#6B4A2E");
  const leaf = facetColors("#3D6B3A");
  g.poly([
    cx - 3,
    cy,
    cx + 3,
    cy,
    cx + 2,
    cy - h * 0.25,
    cx - 2,
    cy - h * 0.25,
  ]).fill({ color: trunk.left });
  g.poly([cx, cy - h, cx + 14, cy - h * 0.35, cx - 14, cy - h * 0.35]).fill({
    color: leaf.top,
  });
  g.poly([
    cx,
    cy - h * 0.7,
    cx + 11,
    cy - h * 0.2,
    cx - 11,
    cy - h * 0.2,
  ]).fill({ color: leaf.left });
}

export { drawDecorPlaceholder };
