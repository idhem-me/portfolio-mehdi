import { Container } from "pixi.js";
import {
  MAP_SIZE,
  PARCEL_COUNT,
  SCENERY_EXTENT,
  startParcelIds,
} from "@/game/core/balance";
import { parcelBlockOrigin } from "@/game/core/grid";
import { parseParcelId } from "@/game/core/balance";
import { TILE_H, TILE_W, gridToScreen } from "./iso";

/** Zoom max (rapproché). */
const MAX_ZOOM = 2.5;

/** Surcadrage dézoom : le décor dépasse un peu l'écran. */
const COVER_MARGIN = 1.02;

/**
 * Inset monde : le pan s'arrête avant le bord en dents de scie
 * (évite le vide bleu comme sur la 2ᵉ photo).
 * ~1 demi-tuile en X / 1 tuile en Y → crop léger, bord type 1ʳᵉ photo.
 */
const EDGE_INSET_X = TILE_W * 0.5;
const EDGE_INSET_Y = TILE_H;

export class Camera {
  readonly world: Container;
  private _zoom = 1;
  private userMoved = false;
  private viewW = 1;
  private viewH = 1;

  constructor(world: Container) {
    this.world = world;
  }

  get zoom(): number {
    return this._zoom;
  }

  get hasUserMoved(): boolean {
    return this.userMoved;
  }

  markUserMoved(): void {
    this.userMoved = true;
  }

  setViewSize(w: number, h: number): void {
    this.viewW = Math.max(1, w);
    this.viewH = Math.max(1, h);
    this.setZoom(this._zoom);
  }

  /**
   * Dézoom max : le rectangle décor (avec inset) couvre tout le viewport.
   */
  minZoom(): number {
    const { minX, maxX, minY, maxY } = this.usableBounds();
    const w = Math.max(TILE_W, maxX - minX);
    const h = Math.max(TILE_H, maxY - minY);
    const z = Math.max(this.viewW / w, this.viewH / h) * COVER_MARGIN;
    return Math.min(MAX_ZOOM, Math.max(0.05, z));
  }

  setZoom(z: number, centerScreenX?: number, centerScreenY?: number): void {
    const minZ = this.minZoom();
    const next = Math.min(MAX_ZOOM, Math.max(minZ, z));
    const cx = centerScreenX ?? this.viewW / 2;
    const cy = centerScreenY ?? this.viewH / 2;
    const before = this.screenToWorld(cx, cy);
    this._zoom = next;
    this.world.scale.set(next);
    const after = this.screenToWorld(cx, cy);
    this.world.x += (after.x - before.x) * next;
    this.world.y += (after.y - before.y) * next;
    this.clampPan();
  }

  zoomBy(factor: number): void {
    this.setZoom(this._zoom * factor);
    this.userMoved = true;
  }

  recenter(): void {
    this.userMoved = false;
    this.fitStartZone();
  }

  pan(dx: number, dy: number): void {
    this.world.x += dx;
    this.world.y += dy;
    this.clampPan();
    this.userMoved = true;
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.world.x) / this._zoom,
      y: (sy - this.world.y) / this._zoom,
    };
  }

  /**
   * Zoom initial : parcelles débloquées + anneau forêt ~70 % de l'écran.
   */
  fitStartZone(): void {
    const ids = startParcelIds();
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const id of ids) {
      const { px, py } = parseParcelId(id);
      const o = parcelBlockOrigin(
        Math.max(0, px - 1),
        Math.max(0, py - 1)
      );
      const o2 = parcelBlockOrigin(
        Math.min(PARCEL_COUNT - 1, px + 1),
        Math.min(PARCEL_COUNT - 1, py + 1)
      );
      const a = gridToScreen(o.x, o.y);
      const b = gridToScreen(o2.x + 2, o2.y + 2);
      minX = Math.min(minX, a.x, b.x);
      maxX = Math.max(maxX, a.x, b.x);
      minY = Math.min(minY, a.y, b.y);
      maxY = Math.max(maxY, a.y, b.y);
    }
    const zoneW = maxX - minX + TILE_W * 2;
    const zoneH = maxY - minY + TILE_H * 2;
    const target = Math.min(this.viewW, this.viewH) * 0.7;
    const z = Math.min(
      MAX_ZOOM,
      Math.max(this.minZoom(), target / Math.max(zoneW, zoneH))
    );
    this._zoom = z;
    this.world.scale.set(z);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    this.world.x = this.viewW / 2 - cx * z;
    this.world.y = this.viewH / 2 - cy * z;
    this.clampPan();
  }

  /** Emprise réelle des tuiles décor (rectangle iso sum/diff). */
  private plateauBounds(): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    const pad = SCENERY_EXTENT;
    const mid = MAP_SIZE - 1;
    const sumMin = -2 * pad;
    const sumMax = 2 * mid + 2 * pad;
    const diffLim = mid + 2 * pad;
    return {
      minX: -diffLim * (TILE_W / 2),
      maxX: diffLim * (TILE_W / 2),
      minY: sumMin * (TILE_H / 2),
      maxY: sumMax * (TILE_H / 2) + TILE_H,
    };
  }

  /**
   * Zone « panable » : plateau réduit d'un inset pour garder
   * le bord dentelé hors écran (crop) plutôt que du vide à côté.
   */
  private usableBounds(): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    const b = this.plateauBounds();
    return {
      minX: b.minX + EDGE_INSET_X,
      maxX: b.maxX - EDGE_INSET_X,
      minY: b.minY + EDGE_INSET_Y,
      maxY: b.maxY - EDGE_INSET_Y,
    };
  }

  /**
   * Le viewport reste toujours à l'intérieur de usableBounds :
   * les tuiles dépassent l'écran, le vide bleu n'apparaît pas.
   */
  private clampPan(): void {
    const { minX, maxX, minY, maxY } = this.usableBounds();
    const z = this._zoom;
    const worldW = (maxX - minX) * z;
    const worldH = (maxY - minY) * z;

    if (worldW <= this.viewW) {
      this.world.x = this.viewW / 2 - ((minX + maxX) / 2) * z;
    } else {
      const minPanX = this.viewW - maxX * z;
      const maxPanX = -minX * z;
      this.world.x = Math.min(maxPanX, Math.max(minPanX, this.world.x));
    }

    if (worldH <= this.viewH) {
      this.world.y = this.viewH / 2 - ((minY + maxY) / 2) * z;
    } else {
      const minPanY = this.viewH - maxY * z;
      const maxPanY = -minY * z;
      this.world.y = Math.min(maxPanY, Math.max(minPanY, this.world.y));
    }
  }
}
