import { describe, expect, it, beforeEach } from "vitest";
import {
  createInitialState,
  migrate,
  placeBuilding,
  resetIdCounter,
  tick,
} from "../actions";
import {
  START_RESOURCES,
  TAX_MULT_BY_NEED,
  TAX_PER_HAB,
  startParcelIds,
} from "../balance";
import { getBuildingDef } from "../buildings";
import {
  buildingEfficiency,
  capacityAtLevel,
  computeCity,
} from "../city";
import {
  effectiveProductionPerSec,
  taxIncomePerSec,
} from "../economy";
import { parcelBlockOrigin } from "../grid";
import type { GameState, PlacedBuilding } from "../types";

function rich(state: GameState): GameState {
  return {
    ...state,
    resources: {
      gold: 1_000_000,
      wood: 1_000_000,
      stone: 1_000_000,
      knowledge: 1_000_000,
    },
    knowledgeEarned: 1_000_000,
  };
}

/** Blocs libres des 3 parcelles centrales hors mairie (ignore déjà occupés). */
function freeSpots(state?: GameState): { x: number; y: number }[] {
  const occupied = new Set(
    (state?.buildings ?? []).flatMap((b) => {
      const d = getBuildingDef(b.type);
      const cells: string[] = [];
      for (let dx = 0; dx < d.width; dx++) {
        for (let dy = 0; dy < d.height; dy++) {
          cells.push(`${b.x + dx},${b.y + dy}`);
        }
      }
      return cells;
    })
  );
  const spots: { x: number; y: number }[] = [];
  for (const id of startParcelIds().slice(1)) {
    const [px, py] = id.split(",").map(Number) as [number, number];
    const o = parcelBlockOrigin(px, py);
    for (const s of [
      { x: o.x, y: o.y },
      { x: o.x + 1, y: o.y },
      { x: o.x, y: o.y + 1 },
      { x: o.x + 1, y: o.y + 1 },
    ]) {
      if (!occupied.has(`${s.x},${s.y}`)) spots.push(s);
    }
  }
  return spots;
}

function complete(
  state: GameState,
  type: PlacedBuilding["type"],
  spot: { x: number; y: number },
  now: number
): GameState {
  const res = placeBuilding(state, type, spot.x, spot.y, now);
  expect(res.ok).toBe(true);
  return tick(res.state, now + 1_000_000);
}

beforeEach(() => {
  resetIdCounter();
});

describe("capacityAtLevel", () => {
  it("× (1 + 0.5 × (lvl-1))", () => {
    expect(capacityAtLevel(4, 1)).toBe(4);
    expect(capacityAtLevel(4, 2)).toBe(6);
    expect(capacityAtLevel(4, 3)).toBe(8);
  });
});

describe("nouveaux bâtiments", () => {
  it("défs et empreintes", () => {
    expect(getBuildingDef("shop").width).toBe(1);
    expect(getBuildingDef("factory").width).toBe(2);
    expect(getBuildingDef("factory").height).toBe(1);
    expect(getBuildingDef("coal_plant").power).toBe(20);
    expect(getBuildingDef("solar_plant").power).toBe(12);
    expect(getBuildingDef("nuclear_plant").width).toBe(2);
    expect(getBuildingDef("nuclear_plant").height).toBe(2);
    expect(getBuildingDef("nuclear_plant").power).toBe(150);
  });
});

describe("bilan électrique", () => {
  it("offre vs demande et powerRatio", () => {
    let state = rich(createInitialState(0));
    let city = computeCity(state);
    // mairie −2 + 4 maisons preview −1 chacune
    expect(city.powerDemand).toBe(6);
    expect(city.powerSupply).toBe(0);
    expect(city.powerRatio).toBe(0);

    const spots = freeSpots(state);
    state = complete(state, "coal_plant", spots[0]!, 1000);
    state = { ...state, population: 0, populationUpdatedAt: state.populationUpdatedAt };
    city = computeCity(state);
    expect(city.jobs).toBe(7); // mairie 3 + coal 4
    expect(city.staffingRatio).toBe(0);
    expect(city.powerSupply).toBe(0);

    state = { ...state, population: 20 };
    city = computeCity(state);
    expect(city.activeWorkers).toBe(12);
    expect(city.staffingRatio).toBe(1);
    expect(city.powerSupply).toBe(20);
    expect(city.powerDemand).toBe(6);
    expect(city.powerRatio).toBe(1);
  });
});

describe("efficiency", () => {
  it("centrale : staffing seul ; consommateur : power × staffing", () => {
    let state = rich(createInitialState(0));
    const spots = freeSpots(state);
    state = complete(state, "coal_plant", spots[0]!, 0);
    state = complete(state, "sawmill", spots[1]!, 10_000);
    state = { ...state, population: 20 };
    const city = computeCity(state);
    const coal = state.buildings.find((b) => b.type === "coal_plant")!;
    const mill = state.buildings.find((b) => b.type === "sawmill")!;
    expect(buildingEfficiency(coal, city)).toBeCloseTo(city.staffingRatio);
    expect(buildingEfficiency(mill, city)).toBeCloseTo(
      city.powerRatio * city.staffingRatio
    );
  });
});

describe("chômage et N0–N3", () => {
  it("N0 sans services", () => {
    const state = createInitialState(0);
    expect(computeCity(state).needLevel).toBe(0);
  });

  it("atteint au moins N1 avec énergie, logement et boutique", () => {
    let state = rich(createInitialState(0));
    let spots = freeSpots(state);
    state = complete(state, "coal_plant", spots[0]!, 0);
    spots = freeSpots(state);
    state = complete(state, "house", spots[0]!, 1000);
    spots = freeSpots(state);
    state = complete(state, "house", spots[0]!, 2000);
    spots = freeSpots(state);
    state = complete(state, "house", spots[0]!, 3000);
    spots = freeSpots(state);
    state = complete(state, "shop", spots[0]!, 4000);
    state = { ...state, population: 12 };
    const city = computeCity(state);
    expect(city.powerRatio).toBeGreaterThanOrEqual(1);
    expect(city.unemployment).toBeLessThanOrEqual(0.1);
    expect(city.coverage.commerce).toBeGreaterThanOrEqual(1);
    expect(city.needLevel).toBeGreaterThanOrEqual(1);
  });

  it("N2 avec école, N3 avec fontaine", () => {
    // Snapshot artificiel : bâtiments déjà actifs, pop calibrée
    const base = createInitialState(0);
    const th = base.buildings[0]!;
    const mk = (
      id: string,
      type: PlacedBuilding["type"],
      x: number,
      y: number
    ): PlacedBuilding => ({
      id,
      type,
      x,
      y,
      level: 1,
      lastCollectedAt: 0,
      construction: null,
    });
    const state: GameState = {
      ...base,
      population: 15,
      buildings: [
        th,
        mk("coal-1", "coal_plant", 0, 0),
        mk("house-1", "house", 1, 0),
        mk("house-2", "house", 2, 0),
        mk("house-3", "house", 3, 0),
        mk("shop-1", "shop", 4, 0),
        mk("school-1", "school", 5, 0),
      ],
    };
    let city = computeCity(state);
    expect(city.needLevel).toBeGreaterThanOrEqual(2);

    state.buildings.push(mk("fount-1", "fountain", 7, 0));
    city = computeCity(state);
    expect(city.needLevel).toBe(3);
  });
});

describe("convergence population", () => {
  it("formule fermée sur un grand saut de temps", () => {
    let state = rich(createInitialState(0));
    let spots = freeSpots(state);
    state = complete(state, "coal_plant", spots[0]!, 0);
    spots = freeSpots(state);
    state = complete(state, "house", spots[0]!, 1000);
    spots = freeSpots(state);
    state = complete(state, "house", spots[0]!, 2000);
    spots = freeSpots(state);
    state = complete(state, "shop", spots[0]!, 3000);
    state = { ...state, population: 0, populationUpdatedAt: 0 };
    const target = computeCity(state).targetPopulation;
    expect(target).toBeGreaterThan(0);
    state = tick(state, 600_000);
    expect(state.population).toBeCloseTo(target, 0);
  });
});

describe("impôts", () => {
  it("or mairie inclut population × TAX × mult", () => {
    const state = { ...rich(createInitialState(0)), population: 100 };
    const city = computeCity(state);
    const expectedTax =
      100 * TAX_PER_HAB * TAX_MULT_BY_NEED[city.needLevel];
    expect(taxIncomePerSec(state)).toBeCloseTo(expectedTax, 6);
    const th = state.buildings[0]!;
    const rate = effectiveProductionPerSec(state, th);
    // déficit élec → efficiency 0
    expect(rate).toBe(0);

    // avec centrale + pop pour staffing
    const boot = rich(createInitialState(0));
    let powered = complete(boot, "coal_plant", freeSpots(boot)[0]!, 0);
    powered = { ...powered, population: 100 };
    const city2 = computeCity(powered);
    const tax2 =
      100 * TAX_PER_HAB * TAX_MULT_BY_NEED[city2.needLevel];
    const rate2 = effectiveProductionPerSec(
      powered,
      powered.buildings[0]!
    );
    expect(rate2).toBeGreaterThan(0);
    expect(rate2).toBeCloseTo(
      (0.2 * 1 * 1.1 + tax2) * buildingEfficiency(powered.buildings[0]!, city2),
      5
    );
  });
});

describe("migrate v1 → v2", () => {
  it("ajoute population et bump version", () => {
    const fresh = createInitialState(0);
    const v1 = {
      version: 1 as const,
      resources: { ...START_RESOURCES },
      knowledgeEarned: 0,
      buildings: fresh.buildings,
      cells: fresh.cells,
      unlockedParcels: fresh.unlockedParcels,
      parcelsBought: 0,
      placingType: null as null,
      selectedBuildingId: null as null,
      timeScale: 1,
    };
    const v2 = migrate(v1);
    expect(v2.version).toBe(2);
    expect(v2.population).toBe(0);
    expect(typeof v2.populationUpdatedAt).toBe("number");
  });
});

describe("départ", () => {
  it("300 or, 80 bois, pop 0", () => {
    const s = createInitialState(42);
    expect(s.resources.gold).toBe(300);
    expect(s.resources.wood).toBe(80);
    expect(s.population).toBe(0);
    expect(s.version).toBe(2);
  });
});
