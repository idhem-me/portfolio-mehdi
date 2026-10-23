import { Container } from "pixi.js";
import {
  MAP_SIZE,
  PARCEL_COUNT,
  SCENERY_RING,
  startParcelIds,
} from "@/game/core/balance";
import { parcelBlockOrigin } from "@/game/core/grid";
import { parseParcelId } from "@/game/core/balance";
import { TILE_H, TILE_W, gridToScreen } from "./iso";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;

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
  }

  setZoom(z: number, centerScreenX?: number, centerScreenY?: number): void {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
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
   * Zoom initial : parcelles débloquées + anneau forêt ~70 % de l'écran,
   * mairie bien visible.
   */
  fitStartZone(): void {
    const ids = startParcelIds();
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const id of ids) {
      const { px, py } = parseParcelId(id);
      // Parcelle + 1 anneau de forêt autour
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
      Math.max(MIN_ZOOM, target / Math.max(zoneW, zoneH))
    );
    this._zoom = z;
    this.world.scale.set(z);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    this.world.x = this.viewW / 2 - cx * z;
    this.world.y = this.viewH / 2 - cy * z;
    this.clampPan();
  }

  private clampPan(): void {
    const pad = SCENERY_RING + 2;
    const corners = [
      gridToScreen(-pad, -pad),
      gridToScreen(MAP_SIZE + pad, -pad),
      gridToScreen(-pad, MAP_SIZE + pad),
      gridToScreen(MAP_SIZE + pad, MAP_SIZE + pad),
    ];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const c of corners) {
      minX = Math.min(minX, c.x - TILE_W * 2);
      maxX = Math.max(maxX, c.x + TILE_W * 2);
      minY = Math.min(minY, c.y - TILE_H * 8);
      maxY = Math.max(maxY, c.y + TILE_H * 10);
    }
    const worldW = (maxX - minX) * this._zoom;
    const worldH = (maxY - minY) * this._zoom;
    const marginX = this.viewW * 0.15;
    const marginY = this.viewH * 0.15;

    const maxPanX = -minX * this._zoom + this.viewW - marginX;
    const minPanX = -maxX * this._zoom + marginX;
    const maxPanY = -minY * this._zoom + this.viewH - marginY;
    const minPanY = -maxY * this._zoom + marginY;

    if (worldW < this.viewW) {
      this.world.x = this.viewW / 2 - ((minX + maxX) / 2) * this._zoom;
    } else {
      this.world.x = Math.min(maxPanX, Math.max(minPanX, this.world.x));
    }
    if (worldH < this.viewH) {
      this.world.y = this.viewH / 2 - ((minY + maxY) / 2) * this._zoom;
    } else {
      this.world.y = Math.min(maxPanY, Math.max(minPanY, this.world.y));
    }
  }
}
