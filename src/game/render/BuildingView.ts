import { Container, Graphics } from "pixi.js";
import { getBuildingDef } from "@/game/core/buildings";
import type { GameState, PlacedBuilding } from "@/game/core/types";
import { gridToScreen } from "./iso";
import { drawBuildingPlaceholder, drawGhostFootprint } from "./placeholders";

export class BuildingView {
  readonly layer = new Container();
  private byId = new Map<string, Graphics>();
  private ghost = new Graphics();
  private progress = new Graphics();

  constructor() {
    this.layer.sortableChildren = true;
    this.layer.addChild(this.ghost);
    this.layer.addChild(this.progress);
  }

  sync(state: GameState, now: number): void {
    const seen = new Set<string>();
    for (const b of state.buildings) {
      seen.add(b.id);
      let g = this.byId.get(b.id);
      if (!g) {
        g = new Graphics();
        this.byId.set(b.id, g);
        this.layer.addChild(g);
      }
      g.clear();
      const def = getBuildingDef(b.type);
      const displayLevel = b.construction
        ? Math.max(1, b.level || 1)
        : Math.max(1, b.level);
      // Scaffold feel: lower alpha while constructing first level
      if (b.construction && b.level === 0) {
        g.alpha = 0.55;
      } else {
        g.alpha = 1;
      }
      drawBuildingPlaceholder(
        g,
        b.type,
        displayLevel,
        b.x,
        b.y,
        hashId(b.id)
      );
      g.zIndex = b.x + def.width - 1 + (b.y + def.height - 1);
      // Tie-break by x
      g.zIndex += b.x * 0.01;
    }

    for (const [id, g] of this.byId) {
      if (!seen.has(id)) {
        this.layer.removeChild(g);
        g.destroy();
        this.byId.delete(id);
      }
    }

    this.drawProgressBars(state, now);
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
    const t = Math.min(1, Math.max(0, (now - b.construction!.startedAt) / total));
    const w = 40 * def.width;
    this.progress
      .rect(cx - w / 2, cy, w, 6)
      .fill({ color: 0x222222, alpha: 0.5 });
    this.progress
      .rect(cx - w / 2, cy, w * t, 6)
      .fill({ color: 0x4ade80 });
    this.progress.zIndex = 9999;
  }
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}
