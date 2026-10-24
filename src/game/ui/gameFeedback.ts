import { getBuildingDef } from "@/game/core/buildings";
import { isBuildingConnected } from "@/game/core/connectivity";
import { buildCost, canAfford, parcelCost } from "@/game/core/economy";
import {
  canPlaceFootprint,
  isAdjacentParcel,
  isParcelUnlocked,
  parcelOfBlock,
} from "@/game/core/grid";
import {
  LANE_COUNT_X,
  LANE_COUNT_Y,
  blockLaneOrigin,
} from "@/game/core/mapLanes";
import { PARCEL_CELLS } from "@/game/core/mapConfig";
import {
  canUnpaveCell,
  isPaveableCell,
  paveCost,
  unpaveRefundGold,
} from "@/game/core/roads";
import {
  cellsInManhattanRadius,
  radiusForPlacingType,
} from "@/game/core/coverage";
import { computeCity } from "@/game/core/city";
import type { GameState, NeedId } from "@/game/core/types";
import type { ViewBounds } from "@/game/render/IsoMap";

export function tooltipForHover(
  state: GameState,
  tile: { x: number; y: number } | null,
  hitBuildingId: string | null
): string | null {
  if (hitBuildingId) {
    const b = state.buildings.find((x) => x.id === hitBuildingId);
    if (!b) return null;
    const def = getBuildingDef(b.type);
    if (state.bulldozeMode) {
      if (b.type === "townhall") {
        return `${def.nameFr} — Indémolissable`;
      }
      return `${def.nameFr} — Cliquer pour démolir`;
    }
    const connected = isBuildingConnected(state.cells, b);
    const alert = connected ? "" : " — ⚠ Non relié à la route";
    return `${def.nameFr}${alert}`;
  }
  if (!tile) return null;

  if (state.bulldozeMode) {
    if (canUnpaveCell(state.cells, tile.x, tile.y)) {
      const gold = unpaveRefundGold(state.cells, tile.x, tile.y);
      return `Route — Cliquer pour détruire (+${gold}🪙)`;
    }
    const c = state.cells[tile.y * LANE_COUNT_X + tile.x];
    if (c?.paved && c.permanent) return "Route d'entrée — Indémolissable";
    return "Bulldozer — Choisir un bâtiment ou une route";
  }

  const moving = state.movingBuildingId
    ? state.buildings.find((b) => b.id === state.movingBuildingId)
    : null;
  if (moving || state.placingType) {
    const type = moving?.type ?? state.placingType!;
    const def = getBuildingDef(type);
    const rot = moving
      ? (moving.rotation ?? "H")
      : (state.placingRotation ?? "H");
    const ignoreId = moving?.id ?? null;
    const cost = moving ? null : buildCost(type, 0);
    const costStr = cost ? `Or ${cost.gold ?? 0}` : "Déplacer";
    const rotHint =
      !moving && def.width !== def.height ? " · [R] pivoter" : "";
    if (
      !canPlaceFootprint(
        state.cells,
        state.unlockedParcels,
        tile.x,
        tile.y,
        def.width,
        def.height,
        rot,
        ignoreId
      )
    ) {
      const c = state.cells[tile.y * LANE_COUNT_X + tile.x];
      if (!c || c.kind !== "tile") return `${def.nameFr} — Case invalide`;
      if (c.buildingId && c.buildingId !== ignoreId) {
        return `${def.nameFr} — Case occupée`;
      }
      if (c.blockId && !isParcelUnlocked(state.unlockedParcels, c.blockId)) {
        return `${def.nameFr} — Bloc verrouillé`;
      }
      if (cost && !canAfford(state.resources, cost)) {
        return `${def.nameFr} — Or insuffisant`;
      }
      return `${def.nameFr} — Emplacement invalide${rotHint}`;
    }
    if (cost && !canAfford(state.resources, cost)) {
      return `${def.nameFr} (${costStr}) — Or insuffisant${rotHint}`;
    }
    return moving
      ? `${def.nameFr} — Cliquer pour déposer`
      : `${def.nameFr} — ${costStr}${rotHint}`;
  }

  // Survol route — construction via l'outil Route (lanes ou tuiles libres)
  {
    const c = state.cells[tile.y * LANE_COUNT_X + tile.x];
    if (c && !c.paved && isPaveableCell(state.cells, state.unlockedParcels, tile.x, tile.y)) {
      if (!state.placingRoad) {
        return "Route — Outil Construire → Route";
      }
      const cost = paveCost(state.cells, tile.x, tile.y);
      if (!canAfford(state.resources, { gold: cost.total })) {
        return `Route : ${cost.total}🪙 — Or insuffisant`;
      }
      return `Route : ${cost.total}🪙 — Glisser pour tracer`;
    }
    if (c?.paved) return "Route bitume";
  }

  const pid = parcelOfBlock(tile.x, tile.y);
  if (pid && !state.unlockedParcels.includes(pid)) {
    const [px, py] = pid.split(",").map(Number) as [number, number];
    const cost = parcelCost(state.parcelsBought);
    if (isAdjacentParcel(state.unlockedParcels, px, py)) {
      return `Bloc verrouillé — Débloquer : ${cost}🪙`;
    }
    return "Non accessible : débloquez un bloc adjacent";
  }

  return null;
}

export function buildHighlightCells(
  state: GameState,
  hoverTile: { x: number; y: number } | null,
  view?: ViewBounds,
  coverageNeed: NeedId | null = null
): {
  key: string;
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
  }[];
} {
  const cells: {
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
  }[] = [];

  const inView = (x: number, y: number) => {
    if (!view) return true;
    // Approximation coarse via block
    void x;
    void y;
    return true;
  };

  const movingB = state.movingBuildingId
    ? state.buildings.find((b) => b.id === state.movingBuildingId)
    : null;
  if (state.placingType || movingB) {
    const type = movingB?.type ?? state.placingType!;
    const def = getBuildingDef(type);
    const rot = movingB
      ? (movingB.rotation ?? "H")
      : (state.placingRotation ?? "H");
    const ignoreId = movingB?.id ?? null;
    for (const id of state.unlockedParcels) {
      const [bx, by] = id.split(",").map(Number) as [number, number];
      const o = blockLaneOrigin(bx, by);
      for (let dy = 0; dy < PARCEL_CELLS; dy++) {
        for (let dx = 0; dx < PARCEL_CELLS; dx++) {
          const tx = o.x + dx;
          const ty = o.y + dy;
          if (!inView(tx, ty)) continue;
          const valid = canPlaceFootprint(
            state.cells,
            state.unlockedParcels,
            tx,
            ty,
            def.width,
            def.height,
            rot,
            ignoreId
          );
          const thick =
            hoverTile?.x === tx && hoverTile?.y === ty ? true : false;
          if (valid || thick) {
            cells.push({
              x: tx,
              y: ty,
              kind: valid ? "buildValid" : "buildInvalid",
              thick,
            });
          }
        }
      }
    }
  } else if (state.placingRoad) {
    // Survol seulement — évite de peindre toute la parcelle en jaune
    if (
      hoverTile &&
      isPaveableCell(
        state.cells,
        state.unlockedParcels,
        hoverTile.x,
        hoverTile.y
      )
    ) {
      cells.push({
        x: hoverTile.x,
        y: hoverTile.y,
        kind: "roadValid",
        thick: true,
      });
    }
  }
  // Pas de cadres « unlock » sur la carte — les badges UnlockOverlay suffisent.

  // Fantôme placement service : rayon
  const placeType = state.placingType;
  if (placeType && hoverTile) {
    const r = radiusForPlacingType(placeType, 1);
    if (r != null) {
      for (const c of cellsInManhattanRadius(hoverTile.x, hoverTile.y, r)) {
        if (c.x < 0 || c.y < 0 || c.x >= LANE_COUNT_X || c.y >= LANE_COUNT_Y) {
          continue;
        }
        cells.push({ x: c.x, y: c.y, kind: "coverOk" });
      }
    }
  }

  // Vue Couverture HUD (parcelles débloquées seulement)
  if (coverageNeed) {
    const city = computeCity(state);
    const covered = city.coverageDetail.cellsInRadius.get(coverageNeed);
    for (const id of state.unlockedParcels) {
      const [bx, by] = id.split(",").map(Number) as [number, number];
      const o = blockLaneOrigin(bx, by);
      for (let dy = 0; dy < PARCEL_CELLS; dy++) {
        for (let dx = 0; dx < PARCEL_CELLS; dx++) {
          const x = o.x + dx;
          const y = o.y + dy;
          const ok = covered?.has(`${x},${y}`) ?? false;
          cells.push({ x, y, kind: ok ? "coverOk" : "coverMiss" });
        }
      }
    }
  }

  const key = `${state.placingType}:${state.movingBuildingId}:${state.placingRoad}:${state.bulldozeMode}:${coverageNeed}:${state.resources.gold}:${state.unlockedParcels.join(",")}:${hoverTile?.x},${hoverTile?.y}:${cells.length}`;
  return { key, cells };
}
