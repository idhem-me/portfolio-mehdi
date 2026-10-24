/**
 * Couverture des services par rayon Manhattan + capacité.
 */

import {
  SERVICE_RADIUS_BASE,
  SERVICE_RADIUS_PER_LEVEL,
} from "./balance";
import { getBuildingDef } from "./buildings";
import { capacityAtLevel, housingAtLevel } from "./city";
import { fineFootprintDims } from "./grid";
import type {
  BuildingTypeId,
  GameState,
  NeedId,
  PlacedBuilding,
} from "./types";
import { activeBuildings } from "./city";

export type NeedLevel = 0 | 1 | 2 | 3;

export type HousingNeedInfo = {
  buildingId: string;
  needLevel: NeedLevel;
  covered: Record<NeedId, boolean>;
  housing: number;
};

export type CoverageSnapshot = {
  byHousing: Map<string, HousingNeedInfo>;
  /** Cases (clé "x,y") couvertes pour un besoin (capacité restante ignorée : rayon seul). */
  cellsInRadius: Map<NeedId, Set<string>>;
  distribution: Record<NeedLevel, number>;
  /** % pop par niveau (0–100). */
  distributionPct: Record<NeedLevel, number>;
};

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

/** Centre approximatif d'une empreinte (cases grille). */
export function buildingCenter(b: PlacedBuilding): { x: number; y: number } {
  const def = getBuildingDef(b.type);
  const { w, h } = fineFootprintDims(def.width, def.height, b.rotation ?? "H");
  return { x: b.x + (w - 1) / 2, y: b.y + (h - 1) / 2 };
}

export function serviceRadius(def: {
  serviceRadius?: number;
}, level: number): number {
  const base = def.serviceRadius ?? SERVICE_RADIUS_BASE;
  return Math.floor(base + SERVICE_RADIUS_PER_LEVEL * Math.max(0, level - 1));
}

/** Cases dans le rayon autour d'un centre (pour overlay / fantôme). */
export function cellsInManhattanRadius(
  cx: number,
  cy: number,
  radius: number
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const r = Math.max(0, Math.floor(radius));
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) + Math.abs(dy) <= r) {
        out.push({ x: Math.round(cx + dx), y: Math.round(cy + dy) });
      }
    }
  }
  return out;
}

/**
 * Attribue la capacité de chaque service aux logements dans le rayon
 * (tri distance puis id). Calcule N0–N3 par logement.
 * Électricité / emploi restent globaux (passés en paramètres).
 */
export function computeCoverage(
  state: GameState,
  globals: { powerOk: boolean; jobsOk: boolean }
): CoverageSnapshot {
  const buildings = activeBuildings(state);
  const residentials = buildings.filter((b) => {
    const d = getBuildingDef(b.type);
    return d.housing > 0 || Boolean(d.housingLevels);
  });

  const coveredCap: Map<string, Record<NeedId, number>> = new Map();
  for (const h of residentials) {
    coveredCap.set(h.id, {
      commerce: 0,
      education: 0,
      culture: 0,
      leisure: 0,
      health: 0,
      safety: 0,
    });
  }

  const cellsInRadius = new Map<NeedId, Set<string>>();
  const needs: NeedId[] = [
    "commerce",
    "education",
    "culture",
    "leisure",
    "health",
    "safety",
  ];
  for (const n of needs) cellsInRadius.set(n, new Set());

  const services = buildings.filter((b) => getBuildingDef(b.type).serves);

  for (const svc of services) {
    const def = getBuildingDef(svc.type);
    if (!def.serves) continue;
    const need = def.serves.need;
    const radius = serviceRadius(def, svc.level);
    const cap = capacityAtLevel(def.serves.capacity, svc.level);
    const center = buildingCenter(svc);

    for (const c of cellsInManhattanRadius(center.x, center.y, radius)) {
      cellsInRadius.get(need)!.add(cellKey(c.x, c.y));
    }

    const candidates = residentials
      .map((h) => {
        const hc = buildingCenter(h);
        return {
          h,
          dist: manhattan(center.x, center.y, hc.x, hc.y),
        };
      })
      .filter((x) => x.dist <= radius)
      .sort((a, b) => a.dist - b.dist || a.h.id.localeCompare(b.h.id));

    let remaining = cap;
    for (const { h } of candidates) {
      if (remaining <= 0) break;
      const housing = housingAtLevel(getBuildingDef(h.type), h.level);
      const give = Math.min(remaining, housing);
      const bag = coveredCap.get(h.id)!;
      bag[need] += give;
      remaining -= give;
    }
  }

  const byHousing = new Map<string, HousingNeedInfo>();
  const distribution: Record<NeedLevel, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  let totalPop = 0;

  for (const h of residentials) {
    const def = getBuildingDef(h.type);
    const housing = housingAtLevel(def, h.level);
    const bag = coveredCap.get(h.id)!;
    const covered: Record<NeedId, boolean> = {
      commerce: bag.commerce >= housing && housing > 0,
      education: bag.education >= housing && housing > 0,
      culture: bag.culture >= housing && housing > 0,
      leisure: bag.leisure >= housing && housing > 0,
      health: bag.health >= housing && housing > 0,
      safety: bag.safety >= housing && housing > 0,
    };
    // Logement vide : considérer couvert si capacité > 0 allouée
    if (housing <= 0) {
      for (const n of needs) covered[n] = bag[n] > 0;
    }

    let needLevel: NeedLevel = 0;
    if (globals.powerOk && globals.jobsOk && covered.commerce) {
      needLevel = 1;
      if (covered.education) {
        needLevel = 2;
        if (covered.culture || covered.leisure) needLevel = 3;
      }
    }

    byHousing.set(h.id, {
      buildingId: h.id,
      needLevel,
      covered,
      housing,
    });
    distribution[needLevel] += housing;
    totalPop += housing;
  }

  const distributionPct: Record<NeedLevel, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const n of [0, 1, 2, 3] as NeedLevel[]) {
    distributionPct[n] =
      totalPop <= 0 ? 0 : Math.round((100 * distribution[n]) / totalPop);
  }

  return { byHousing, cellsInRadius, distribution, distributionPct };
}

export function radiusForPlacingType(
  type: BuildingTypeId,
  level = 1
): number | null {
  const def = getBuildingDef(type);
  if (!def.serves) return null;
  return serviceRadius(def, level);
}
