/**
 * Évolution / régression automatique des logements (timestamps).
 * Au plus un palier (ou une régression) par tick et par bâtiment.
 */

import {
  APARTMENT_EVOLVE_PLANKS,
  DEVOLVE_DELAY_SEC,
  EVOLVE_DELAY_SEC,
  EVOLVE_VISUAL_MS,
  HOUSE_T4_PLANKS,
} from "./balance";
import { getBuildingDef } from "./buildings";
import type { CitySnapshot, NeedLevel } from "./city";
import { computeCity, housingAtLevel } from "./city";
import { getTownhallLevel } from "./economy";
import type {
  BuildingTypeId,
  GameState,
  PlacedBuilding,
  Resources,
} from "./types";

const RESIDENTIAL: ReadonlySet<BuildingTypeId> = new Set([
  "house",
  "apartment",
  "skyscraper",
]);

export function isAutoEvolveResidential(type: BuildingTypeId): boolean {
  return RESIDENTIAL.has(type);
}

/** Niveau de besoin local (couverture par rayon), fallback global. */
export function housingNeedLevel(
  building: PlacedBuilding,
  city: CitySnapshot
): NeedLevel {
  return city.housingNeeds.get(building.id)?.needLevel ?? city.needLevel;
}

export function hasHealthCoverage(
  building: PlacedBuilding,
  city: CitySnapshot
): boolean {
  const local = city.housingNeeds.get(building.id)?.covered.health;
  if (local !== undefined) return local;
  return city.coverage.health >= 1;
}

export function hasSafetyCoverage(
  building: PlacedBuilding,
  city: CitySnapshot
): boolean {
  const local = city.housingNeeds.get(building.id)?.covered.safety;
  if (local !== undefined) return local;
  return city.coverage.safety >= 1;
}

export type EvolveTarget =
  | { kind: "level"; level: number; planks: number }
  | { kind: "type"; type: BuildingTypeId; level: number; planks: number };

/** Prochain palier + coût planches, ou null si plafond. */
export function nextEvolveTarget(
  building: PlacedBuilding,
  state: GameState,
  city: CitySnapshot
): EvolveTarget | null {
  const need = housingNeedLevel(building, city);
  const th = getTownhallLevel(state);

  if (building.type === "house") {
    if (building.level === 1 && need >= 1) {
      return { kind: "level", level: 2, planks: 0 };
    }
    if (building.level === 2 && need >= 2) {
      return { kind: "level", level: 3, planks: 0 };
    }
    if (
      building.level === 3 &&
      need >= 2 &&
      hasHealthCoverage(building, city)
    ) {
      return { kind: "level", level: 4, planks: HOUSE_T4_PLANKS };
    }
    if (
      building.level >= 4 &&
      need >= 3 &&
      hasSafetyCoverage(building, city)
    ) {
      return {
        kind: "type",
        type: "apartment",
        level: 1,
        planks: APARTMENT_EVOLVE_PLANKS,
      };
    }
    return null;
  }

  if (building.type === "apartment") {
    const max = getBuildingDef("apartment").housingLevels?.length ?? 3;
    if (
      building.level < max &&
      need >= 3 &&
      hasSafetyCoverage(building, city)
    ) {
      return {
        kind: "level",
        level: building.level + 1,
        planks: APARTMENT_EVOLVE_PLANKS,
      };
    }
    if (
      building.level >= max &&
      need >= 3 &&
      th >= 5
    ) {
      return {
        kind: "type",
        type: "skyscraper",
        level: 1,
        planks: APARTMENT_EVOLVE_PLANKS * 2,
      };
    }
    return null;
  }

  return null;
}

/** Le palier actuel est-il encore justifié ? */
export function currentTierJustified(
  building: PlacedBuilding,
  state: GameState,
  city: CitySnapshot
): boolean {
  const need = housingNeedLevel(building, city);
  const th = getTownhallLevel(state);

  if (building.type === "skyscraper") {
    return need >= 3 && th >= 5;
  }
  if (building.type === "apartment") {
    return need >= 3 && hasSafetyCoverage(building, city);
  }
  if (building.type === "house") {
    if (building.level <= 1) return true;
    if (building.level === 2) return need >= 1;
    if (building.level === 3) return need >= 2;
    if (building.level >= 4) {
      return need >= 2 && hasHealthCoverage(building, city);
    }
  }
  return true;
}

export function devolveTarget(
  building: PlacedBuilding
): EvolveTarget | null {
  if (building.type === "skyscraper") {
    return { kind: "type", type: "apartment", level: 3, planks: 0 };
  }
  if (building.type === "apartment") {
    if (building.level <= 1) {
      return { kind: "type", type: "house", level: 4, planks: 0 };
    }
    return { kind: "level", level: building.level - 1, planks: 0 };
  }
  if (building.type === "house" && building.level > 1) {
    return { kind: "level", level: building.level - 1, planks: 0 };
  }
  return null;
}

export function planksNeededForNext(
  building: PlacedBuilding,
  state: GameState,
  city?: CitySnapshot
): number {
  const snap = city ?? computeCity(state);
  const target = nextEvolveTarget(building, state, snap);
  return target?.planks ?? 0;
}

export function waitingForPlanks(
  building: PlacedBuilding,
  state: GameState,
  now: number,
  city?: CitySnapshot
): number | null {
  const snap = city ?? computeCity(state);
  const target = nextEvolveTarget(building, state, snap);
  if (!target || target.planks <= 0) return null;
  const have = state.resources.planks ?? 0;
  if (have >= target.planks) return null;
  // En attente seulement si le délai d'évolution est déjà atteint
  if (
    building.needsSince != null &&
    (now - building.needsSince) / 1000 >= EVOLVE_DELAY_SEC
  ) {
    return Math.ceil(target.planks - have);
  }
  return null;
}

function applyTarget(
  b: PlacedBuilding,
  target: EvolveTarget,
  now: number
): PlacedBuilding {
  if (target.kind === "level") {
    return {
      ...b,
      level: target.level,
      needsSince: null,
      unmetSince: null,
      evolvingUntil: now + EVOLVE_VISUAL_MS,
    };
  }
  return {
    ...b,
    type: target.type,
    level: target.level,
    needsSince: null,
    unmetSince: null,
    evolvingUntil: now + EVOLVE_VISUAL_MS,
  };
}

/**
 * Un tick d'évolution : met à jour timestamps et applique au plus
 * une évolution ou une régression par bâtiment.
 */
export function tickHousingEvolution(
  state: GameState,
  now: number
): GameState {
  const city = computeCity(state, now);
  let resources: Resources = { ...state.resources };
  let changed = false;
  const buildings = state.buildings.map((b) => {
    if (!isAutoEvolveResidential(b.type)) return b;
    if (b.construction || b.level <= 0) return b;

    const justified = currentTierJustified(b, state, city);
    const target = nextEvolveTarget(b, state, city);

    let next = b;

    if (target) {
      // Conditions du prochain palier OK → chrono evolve
      const since = b.needsSince ?? now;
      next = {
        ...next,
        needsSince: since,
        unmetSince: null,
      };
      const heldSec = (now - since) / 1000;
      if (heldSec >= EVOLVE_DELAY_SEC) {
        const have = resources.planks ?? 0;
        if (target.planks > 0 && have < target.planks) {
          // Attend les planches — pas de régression
          changed = true;
          return next;
        }
        if (target.planks > 0) {
          resources = {
            ...resources,
            planks: Math.max(0, have - target.planks),
          };
        }
        changed = true;
        return applyTarget(next, target, now);
      }
      if (next !== b) changed = true;
      return next;
    }

    // Pas de cible : reset needsSince
    if (b.needsSince != null) {
      next = { ...next, needsSince: null };
      changed = true;
    }

    if (!justified) {
      const unmet = b.unmetSince ?? now;
      next = { ...next, unmetSince: unmet, needsSince: null };
      const unmetSec = (now - unmet) / 1000;
      if (unmetSec >= DEVOLVE_DELAY_SEC) {
        const down = devolveTarget(b);
        if (down) {
          changed = true;
          return applyTarget(next, down, now);
        }
      }
      if (next !== b) changed = true;
      return next;
    }

    if (b.unmetSince != null) {
      next = { ...next, unmetSince: null };
      changed = true;
    }
    return next;
  });

  if (!changed && resources.planks === state.resources.planks) return state;
  return { ...state, buildings, resources };
}

/** Habitants d'un logement (pour répartition N). */
export function housingPopShare(building: PlacedBuilding): number {
  const def = getBuildingDef(building.type);
  return housingAtLevel(def, building.level);
}
