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
  housingAtLevel,
} from "../city";
import {
  effectiveProductionPerSec,
  taxIncomePerSec,
} from "../economy";
import {
  blockTiles,
  canPlaceFootprint,
  fineFootprintDims,
} from "../grid";
import type { GameState, PlacedBuilding } from "../types";

function rich(state: GameState): GameState {
  return {
    ...state,
    resources: {
      gold: 1_000_000,
      wood: 1_000_000,
      stone: 1_000_000,
      knowledge: 1_000_000,
      planks: 1_000_000,
    },
    knowledgeEarned: 1_000_000,
  };
}

/** Origines valides pour un type donné (blocs départ hors mairie). */
function freeSpots(
  state: GameState,
  type: PlacedBuilding["type"] = "house"
): { x: number; y: number }[] {
  const def = getBuildingDef(type);
  const spots: { x: number; y: number }[] = [];
  for (const id of startParcelIds().slice(1)) {
    const [px, py] = id.split(",").map(Number) as [number, number];
    for (const s of blockTiles(px, py)) {
      if (
        canPlaceFootprint(
          state.cells,
          state.unlockedParcels,
          s.x,
          s.y,
          def.width,
          def.height,
          "H"
        )
      ) {
        spots.push(s);
      }
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

void fineFootprintDims;

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

describe("housingAtLevel", () => {
  it("maison 2/4/6/8 selon le stade", () => {
    const def = getBuildingDef("house");
    expect(housingAtLevel(def, 1)).toBe(2);
    expect(housingAtLevel(def, 2)).toBe(4);
    expect(housingAtLevel(def, 3)).toBe(6);
    expect(housingAtLevel(def, 4)).toBe(8);
  });

  it("immeuble 6/12/18 selon le stade", () => {
    const def = getBuildingDef("apartment");
    expect(housingAtLevel(def, 1)).toBe(6);
    expect(housingAtLevel(def, 2)).toBe(12);
    expect(housingAtLevel(def, 3)).toBe(18);
  });
});

describe("nouveaux bâtiments", () => {
  it("défs et empreintes", () => {
    expect(getBuildingDef("apartment").category).toBe("residential");
    expect(getBuildingDef("apartment").housingLevels).toEqual([6, 12, 18]);
    expect(getBuildingDef("shop").width).toBe(1);
    expect(getBuildingDef("factory").width).toBe(1);
    expect(getBuildingDef("factory").height).toBe(1);
    expect(getBuildingDef("school").width).toBe(1);
    expect(getBuildingDef("solar_plant").width).toBe(1);
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
    // mairie seule −2 (plus de maisons preview)
    expect(city.powerDemand).toBe(2);
    expect(city.powerSupply).toBe(0);
    expect(city.powerRatio).toBe(0);

    const spots = freeSpots(state, "coal_plant");
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
    expect(city.powerDemand).toBe(2);
    expect(city.powerRatio).toBe(1);
  });
});

describe("efficiency", () => {
  it("centrale : staffing seul ; consommateur : power × staffing", () => {
    let state = rich(createInitialState(0));
    state = complete(
      state,
      "coal_plant",
      freeSpots(state, "coal_plant")[0]!,
      0
    );
    state = complete(
      state,
      "sawmill",
      freeSpots(state, "sawmill")[0]!,
      10_000
    );
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

  it("atteint au moins N1 avec énergie, logement et boutique à portée", () => {
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
      ...rich(base),
      population: 12,
      buildings: [
        { ...th, level: 2 },
        mk("coal-1", "coal_plant", th.x + 8, th.y),
        mk("house-1", "house", th.x + 1, th.y),
        mk("house-2", "house", th.x + 2, th.y),
        mk("house-3", "house", th.x + 3, th.y),
        mk("shop-1", "shop", th.x + 1, th.y + 1),
      ],
    };
    const city = computeCity(state);
    expect(city.powerRatio).toBeGreaterThanOrEqual(1);
    expect(city.unemployment).toBeLessThanOrEqual(0.1);
    expect(city.coverage.commerce).toBeGreaterThanOrEqual(1);
    expect(city.needLevel).toBeGreaterThanOrEqual(1);
  });

  it("N2 avec école, N3 avec fontaine (à portée)", () => {
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
    const hx = th.x + 1;
    const hy = th.y;
    const state: GameState = {
      ...base,
      population: 15,
      buildings: [
        { ...th, level: 2 },
        mk("coal-1", "coal_plant", hx + 8, hy),
        mk("house-1", "house", hx, hy),
        mk("house-2", "house", hx + 1, hy),
        mk("house-3", "house", hx + 2, hy),
        mk("shop-1", "shop", hx, hy + 1),
        mk("school-1", "school", hx + 1, hy + 1),
      ],
    };
    let city = computeCity(state);
    expect(city.needLevel).toBeGreaterThanOrEqual(2);

    state.buildings.push(mk("fount-1", "fountain", hx + 2, hy + 1));
    city = computeCity(state);
    expect(city.needLevel).toBe(3);
  });
});

describe("convergence population", () => {
  it("formule fermée sur un grand saut de temps", () => {
    let state = rich(createInitialState(0));
    state = complete(
      state,
      "coal_plant",
      freeSpots(state, "coal_plant")[0]!,
      0
    );
    state = complete(state, "house", freeSpots(state, "house")[0]!, 1000);
    state = complete(state, "house", freeSpots(state, "house")[0]!, 2000);
    state = complete(state, "shop", freeSpots(state, "shop")[0]!, 3000);
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
    let powered = complete(
      boot,
      "coal_plant",
      freeSpots(boot, "coal_plant")[0]!,
      0
    );
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

describe("migrate version < 4 → reset", () => {
  it("ignore l'ancien état et recrée v5", () => {
    const v1 = {
      version: 1 as const,
      resources: { ...START_RESOURCES, gold: 1 },
      buildings: [],
    };
    const v5 = migrate(v1);
    expect(v5.version).toBe(5);
    expect(v5.resources.gold).toBe(START_RESOURCES.gold);
    expect(v5.buildings.some((b) => b.type === "townhall")).toBe(true);
  });
});

describe("départ", () => {
  it("300 or, 80 bois, pop 0, version 5", () => {
    const s = createInitialState(42);
    expect(s.resources.gold).toBe(300);
    expect(s.resources.wood).toBe(80);
    expect(s.resources.planks).toBe(0);
    expect(s.population).toBe(0);
    expect(s.version).toBe(5);
    expect(s.mapSeed).toBeDefined();
  });
});
