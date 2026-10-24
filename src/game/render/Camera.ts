import { Container } from "pixi.js";
import {
  CAMERA_FIT_START_RATIO,
  CAMERA_MAX_ZOOM,
  CAMERA_MIN_ZOOM_ABS,
  BLOCK_PX,
  CELL_PX,
} from "@/game/core/mapConfig";
import {
  MAP_HEIGHT_PX,
  MAP_WIDTH_PX,
  blockWorldOrigin,
  startBlockIds,
} from "@/game/core/mapLanes";
import { parseParcelId } from "@/game/core/balance";

/** Surcadrage dézoom : la carte dépasse un peu l'écran. */
const COVER_MARGIN = 1.02;

/** Inset monde pour le clamp pan. */
const EDGE_INSET = CELL_PX;

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
   * Dézoom max : couvrir la carte, borné par CAMERA_MIN_ZOOM_ABS
   * (évite un dézoom extrême sur une grande carte).
   */
  minZoom(): number {
    const { minX, maxX, minY, maxY } = this.usableBounds();
    const w = Math.max(CELL_PX, maxX - minX);
    const h = Math.max(CELL_PX, maxY - minY);
    const cover = Math.max(this.viewW / w, this.viewH / h) * COVER_MARGIN;
    return Math.min(
      CAMERA_MAX_ZOOM,
      Math.max(CAMERA_MIN_ZOOM_ABS, cover)
    );
  }

  setZoom(z: number, centerScreenX?: number, centerScreenY?: number): void {
    const minZ = this.minZoom();
    const next = Math.min(CAMERA_MAX_ZOOM, Math.max(minZ, z));
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

  /** Client (page) → coords écran du buffer caméra (corrige stretch CSS). */
  clientToScreen(
    clientX: number,
    clientY: number,
    canvas: HTMLCanvasElement
  ): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / Math.max(1, rect.width)) * this.viewW,
      y: ((clientY - rect.top) / Math.max(1, rect.height)) * this.viewH,
    };
  }

  /**
   * Clic client → monde, en corrigeant le décalage si le canvas CSS
   * n'a pas la même taille que le buffer Pixi (évite de rater les routes fines).
   */
  clientToWorld(
    clientX: number,
    clientY: number,
    canvas: HTMLCanvasElement
  ): { x: number; y: number } {
    const s = this.clientToScreen(clientX, clientY, canvas);
    return this.screenToWorld(s.x, s.y);
  }

  /** Viewport monde actuel (pour culling IsoMap). */
  viewBounds(): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } {
    const tl = this.screenToWorld(0, 0);
    const br = this.screenToWorld(this.viewW, this.viewH);
    return {
      minX: Math.min(tl.x, br.x),
      minY: Math.min(tl.y, br.y),
      maxX: Math.max(tl.x, br.x),
      maxY: Math.max(tl.y, br.y),
    };
  }

  /** Centre caméra sur les 4 blocs de départ. */
  fitStartZone(): void {
    const ids = startBlockIds();
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const id of ids) {
      const { px, py } = parseParcelId(id);
      const o = blockWorldOrigin(px, py);
      minX = Math.min(minX, o.x);
      minY = Math.min(minY, o.y);
      maxX = Math.max(maxX, o.x + BLOCK_PX);
      maxY = Math.max(maxY, o.y + BLOCK_PX);
    }
    const zoneW = maxX - minX;
    const zoneH = maxY - minY;
    const target = Math.min(this.viewW, this.viewH) * CAMERA_FIT_START_RATIO;
    const z = Math.min(
      CAMERA_MAX_ZOOM,
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

  private plateauBounds(): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    return {
      minX: 0,
      maxX: MAP_WIDTH_PX,
      minY: 0,
      maxY: MAP_HEIGHT_PX,
    };
  }

  private usableBounds(): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    const b = this.plateauBounds();
    return {
      minX: b.minX + EDGE_INSET,
      maxX: b.maxX - EDGE_INSET,
      minY: b.minY + EDGE_INSET,
      maxY: b.maxY - EDGE_INSET,
    };
  }

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
