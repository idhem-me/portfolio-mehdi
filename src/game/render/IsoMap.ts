/**
 * Sol jouable — vue de dessus (top-down).
 * Couches : soil → roads → highlights (externe).
 * Badges de déblocage / tooltips = UI React (screen-space).
 */

import { Container, Graphics, Sprite } from "pixi.js";
import {
  CELL_PX,
  HL_BUILD_FILL_ALPHA,
  HL_BUILD_INVALID,
  HL_BUILD_VALID,
  HL_ROAD_PREVIEW_ALPHA,
  HL_ROAD_VALID,
  HL_UNLOCK_GOLD,
  ROAD_SEGMENT_CELLS,
} from "@/game/core/mapConfig";
import {
  LANE_COUNT_X,
  LANE_COUNT_Y,
  MAP_HEIGHT_PX,
  MAP_WIDTH_PX,
  cellOrigin,
  cellSize,
} from "@/game/core/mapLanes";
import type { GameState, RoadDir } from "@/game/core/types";
import {
  getIntersectionTexture,
  getRoadTexture,
  getTileTexture,
  loadVillageAssets,
} from "./villageAssets";

export type ViewBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export class IsoMap {
  readonly ground = new Container();
  readonly props = new Container();

  private soilLayer = new Container();
  private roadsLayer = new Container();
  private highlightLayer = new Graphics();
  private built = false;
  private lastKey = "";
  private lastCullKey = "";
  private lastHlKey = "";

  constructor() {
    this.ground.addChild(this.soilLayer);
    this.ground.addChild(this.roadsLayer);
    this.ground.addChild(this.highlightLayer);
  }

  async bake(_renderer?: unknown): Promise<void> {
    if (this.built) return;
    await loadVillageAssets();
    this.built = true;
  }

  sync(
    state: GameState,
    hoverParcel: string | null,
    view?: ViewBounds
  ): void {
    const key = `${state.unlockedParcels.join("|")}:${state.parcelsBought}:${hoverParcel ?? ""}`;
    const cullKey = view
      ? `${view.minX | 0},${view.minY | 0},${view.maxX | 0},${view.maxY | 0}`
      : "full";

    if (
      key === this.lastKey &&
      cullKey === this.lastCullKey &&
      this.soilLayer.children.length > 0
    ) {
      return;
    }
    this.lastKey = key;
    this.lastCullKey = cullKey;
    this.rebuild(state, view);
  }

  forceRebuild(
    state: GameState,
    hoverParcel: string | null,
    view?: ViewBounds
  ): void {
    this.lastKey = "";
    this.lastCullKey = "";
    this.sync(state, hoverParcel, view);
  }

  destroy(): void {
    this.soilLayer.removeChildren();
    this.roadsLayer.removeChildren();
    this.highlightLayer.clear();
    this.built = false;
  }

  /**
   * Highlights tool (recalculés seulement si la clé change).
   */
  setHighlights(
    key: string,
    cells: {
      x: number;
      y: number;
      kind:
        | "buildValid"
        | "buildInvalid"
        | "roadValid"
        | "unlock"
        | "coverOk"
        | "coverMiss";
      thick?: boolean;
    }[],
    view?: ViewBounds
  ): void {
    if (key === this.lastHlKey) return;
    this.lastHlKey = key;
    this.highlightLayer.clear();
    const bounds = view ?? {
      minX: 0,
      minY: 0,
      maxX: MAP_WIDTH_PX,
      maxY: MAP_HEIGHT_PX,
    };
    for (const c of cells) {
      const o = cellOrigin(c.x, c.y);
      const s = cellSize(c.x, c.y);
      if (
        o.x + s.w < bounds.minX ||
        o.y + s.h < bounds.minY ||
        o.x > bounds.maxX ||
        o.y > bounds.maxY
      ) {
        continue;
      }
      if (c.kind === "buildValid") {
        this.highlightLayer
          .rect(o.x, o.y, s.w, s.h)
          .fill({ color: HL_BUILD_VALID, alpha: HL_BUILD_FILL_ALPHA })
          .stroke({
            width: c.thick ? 36 : 18,
            color: HL_BUILD_VALID,
            alpha: 0.9,
          });
      } else if (c.kind === "buildInvalid") {
        this.highlightLayer
          .rect(o.x, o.y, s.w, s.h)
          .fill({ color: HL_BUILD_INVALID, alpha: HL_BUILD_FILL_ALPHA * 0.6 })
          .stroke({
            width: c.thick ? 36 : 14,
            color: HL_BUILD_INVALID,
            alpha: 0.85,
          });
      } else if (c.kind === "roadValid") {
        this.highlightLayer.rect(o.x, o.y, s.w, s.h).stroke({
          width: 14,
          color: HL_ROAD_VALID,
          alpha: 0.7,
        });
      } else if (c.kind === "unlock") {
        this.highlightLayer.rect(o.x, o.y, s.w, s.h).stroke({
          width: 20,
          color: HL_UNLOCK_GOLD,
          alpha: 0.85,
        });
      } else if (c.kind === "coverOk") {
        this.highlightLayer
          .rect(o.x, o.y, s.w, s.h)
          .fill({ color: 0x22c55e, alpha: 0.28 });
      } else if (c.kind === "coverMiss") {
        this.highlightLayer
          .rect(o.x, o.y, s.w, s.h)
          .fill({ color: 0xef4444, alpha: 0.22 });
      }
    }
  }

  clearHighlights(): void {
    this.lastHlKey = "";
    this.highlightLayer.clear();
  }

  private rebuild(state: GameState, view?: ViewBounds): void {
    this.soilLayer.removeChildren();
    this.roadsLayer.removeChildren();

    const bounds = view ?? {
      minX: 0,
      minY: 0,
      maxX: MAP_WIDTH_PX,
      maxY: MAP_HEIGHT_PX,
    };
    const pad = CELL_PX * 4;
    const minX = bounds.minX - pad;
    const minY = bounds.minY - pad;
    const maxX = bounds.maxX + pad;
    const maxY = bounds.maxY + pad;

    for (let iy = 0; iy < LANE_COUNT_Y; iy++) {
      for (let ix = 0; ix < LANE_COUNT_X; ix++) {
        const o = cellOrigin(ix, iy);
        const s = cellSize(ix, iy);
        if (
          o.x + s.w < minX ||
          o.y + s.h < minY ||
          o.x > maxX ||
          o.y > maxY
        ) {
          continue;
        }

        const cell = state.cells[iy * LANE_COUNT_X + ix];
        if (!cell) continue;

        const spr = new Sprite(getTileTexture(cell.biome));
        spr.x = o.x;
        spr.y = o.y;
        spr.width = s.w;
        spr.height = s.h;
        this.soilLayer.addChild(spr);
      }
    }

    this.paintRoads(state, minX, minY, maxX, maxY);
  }

  /**
   * 1) Runs H/V continus de route-bitume (y compris sous les carrefours)
   * 2) Intersection 320² superposée aux croisements (masque les tirets)
   */
  private paintRoads(
    state: GameState,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): void {
    const cellAt = (x: number, y: number) =>
      state.cells[y * LANE_COUNT_X + x];

    const addSegment = (
      sx: number,
      sy: number,
      dir: RoadDir,
      len: number
    ) => {
      const o = cellOrigin(sx, sy);
      const lenPx = len * CELL_PX;
      if (
        dir === "H" &&
        (o.x + lenPx < minX || o.x > maxX || o.y + CELL_PX < minY || o.y > maxY)
      ) {
        return;
      }
      if (
        dir === "V" &&
        (o.x + CELL_PX < minX ||
          o.x > maxX ||
          o.y + lenPx < minY ||
          o.y > maxY)
      ) {
        return;
      }
      const entry = getRoadTexture("bitume");
      const road = new Sprite(entry.texture);
      if (dir === "H") {
        road.x = o.x;
        road.y = o.y;
        road.width = lenPx;
        road.height = CELL_PX;
      } else {
        road.rotation = Math.PI / 2;
        road.x = o.x + CELL_PX;
        road.y = o.y;
        road.width = lenPx;
        road.height = CELL_PX;
      }
      this.roadsLayer.addChild(road);
    };

    /** Enchaîne des sections ~1254×320 (ROAD_SEGMENT_CELLS). */
    const addRunChunks = (
      sx: number,
      sy: number,
      dir: RoadDir,
      len: number
    ) => {
      let offset = 0;
      while (offset < len) {
        const chunk = Math.min(ROAD_SEGMENT_CELLS, len - offset);
        if (dir === "H") {
          addSegment(sx + offset, sy, "H", chunk);
        } else {
          addSegment(sx, sy + offset, "V", chunk);
        }
        offset += chunk;
      }
    };

    // —— Runs horizontaux (toute case bitumée, carrefours inclus)
    for (let iy = 0; iy < LANE_COUNT_Y; iy++) {
      let ix = 0;
      while (ix < LANE_COUNT_X) {
        if (!cellAt(ix, iy)?.paved) {
          ix += 1;
          continue;
        }
        const start = ix;
        while (ix < LANE_COUNT_X && cellAt(ix, iy)?.paved) ix += 1;
        addRunChunks(start, iy, "H", ix - start);
      }
    }

    // —— Runs verticaux
    for (let ix = 0; ix < LANE_COUNT_X; ix++) {
      let iy = 0;
      while (iy < LANE_COUNT_Y) {
        if (!cellAt(ix, iy)?.paved) {
          iy += 1;
          continue;
        }
        const start = iy;
        while (iy < LANE_COUNT_Y && cellAt(ix, iy)?.paved) iy += 1;
        // Éviter de redessiner un seul plot déjà couvert par un H isolé
        // (longueur 1 sans voisin V utile) : on dessine quand même si
        // la case a un voisin V ou est un carrefour — sinon le H suffit.
        const len = iy - start;
        if (len === 1) {
          const c = cellAt(ix, start);
          const up = start > 0 && cellAt(ix, start - 1)?.paved;
          const down =
            start + 1 < LANE_COUNT_Y && cellAt(ix, start + 1)?.paved;
          if (!up && !down && c?.kind !== "intersection") {
            continue;
          }
          // carrefour seul sans V : H suffit + overlay plus bas
          if (!up && !down) continue;
        }
        addRunChunks(ix, start, "V", len);
      }
    }

    // —— Overlay intersection (bloc gris sans tirets)
    for (let iy = 0; iy < LANE_COUNT_Y; iy++) {
      for (let ix = 0; ix < LANE_COUNT_X; ix++) {
        const c = cellAt(ix, iy);
        if (!c?.paved || c.kind !== "intersection") continue;
        const o = cellOrigin(ix, iy);
        if (
          o.x + CELL_PX < minX ||
          o.x > maxX ||
          o.y + CELL_PX < minY ||
          o.y > maxY
        ) {
          continue;
        }
        const cross = new Sprite(getIntersectionTexture("bitume"));
        cross.x = o.x;
        cross.y = o.y;
        cross.width = CELL_PX;
        cross.height = CELL_PX;
        this.roadsLayer.addChild(cross);
      }
    }
  }
}

void HL_ROAD_PREVIEW_ALPHA;
void HL_UNLOCK_GOLD;
