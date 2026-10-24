import { describe, expect, it, beforeEach } from "vitest";
import {
  createInitialState,
  resetIdCounter,
  startUpgrade,
  tick,
} from "../actions";
import {
  APARTMENT_EVOLVE_PLANKS,
  DEVOLVE_DELAY_SEC,
  EVOLVE_DELAY_SEC,
  HOUSE_T4_PLANKS,
} from "../balance";
import {
  tickHousingEvolution,
  waitingForPlanks,
} from "../housingEvolution";
import type { CitySnapshot } from "../city";
import type { GameState, PlacedBuilding } from "../types";

function baseCity(over: Partial<CitySnapshot> = {}): CitySnapshot {
  return {
    powerSupply: 100,
    powerDemand: 10,
    powerRatio: 1,
    jobs: 20,
    activeWorkers: 10,
    unemployment: 0,
    staffingRatio: 1,
    housing: 20,
    population: 10,
    coverage: {
      commerce: 1,
      education: 1,
      cultureLeisure: 1,
      health: 1,
      safety: 1,
    },
    needLevel: 3,
    attractiveness: 1,
    targetPopulation: 20,
    demandRCI: { R: 0, C: 0, I: 0 },
    pollution: 0,
    leisurePoints: 0,
    advice: [],
    ...over,
  };
}

function houseAt(
  state: GameState,
  level: number,
  extra: Partial<PlacedBuilding> = {}
): GameState {
  const th = state.buildings[0]!;
  const house: PlacedBuilding = {
    id: "house-evo",
    type: "house",
    x: th.x + 4,
    y: th.y,
    level,
    lastCollectedAt: 0,
    construction: null,
    needsSince: null,
    unmetSince: null,
    ...extra,
  };
  return { ...state, buildings: [...state.buildings, house] };
}

/** Services + pop pour atteindre un needLevel (à portée Manhattan du logement). */
function enrichForNeeds(
  state: GameState,
  now: number,
  opts: { need: 1 | 2 | 3; health?: boolean; safety?: boolean }
): GameState {
  const house = state.buildings.find((b) => b.id === "house-evo")!;
  const hx = house.x;
  const hy = house.y;
  // Cases adjacentes (rayon base = 4) — espacement 1 case
  const extras: PlacedBuilding[] = [
    {
      id: "coal-1",
      type: "coal_plant",
      x: hx + 8,
      y: hy,
      level: 3,
      lastCollectedAt: now,
      construction: null,
    },
    {
      id: "shop-1",
      type: "shop",
      x: hx + 1,
      y: hy,
      level: 3,
      lastCollectedAt: now,
      construction: null,
    },
  ];
  if (opts.need >= 2) {
    extras.push({
      id: "school-1",
      type: "school",
      x: hx,
      y: hy + 1,
      level: 3,
      lastCollectedAt: now,
      construction: null,
    });
  }
  if (opts.need >= 3) {
    extras.push({
      id: "park-1",
      type: "park",
      x: hx + 1,
      y: hy + 1,
      level: 3,
      lastCollectedAt: now,
      construction: null,
    });
  }
  if (opts.health) {
    extras.push({
      id: "pharm-1",
      type: "pharmacy",
      x: hx - 1,
      y: hy,
      level: 3,
      lastCollectedAt: now,
      construction: null,
    });
  }
  if (opts.safety) {
    extras.push({
      id: "police-1",
      type: "police",
      x: hx,
      y: hy - 1,
      level: 3,
      lastCollectedAt: now,
      construction: null,
    });
  }
  return {
    ...state,
    population: 40,
    buildings: [
      ...state.buildings.map((b) =>
        b.type === "townhall" ? { ...b, level: Math.max(b.level, 5) } : b
      ),
      ...extras,
    ],
  };
}

beforeEach(() => {
  resetIdCounter();
});

describe("housing evolution", () => {
  it("refuse l'upgrade manuel résidentiel", () => {
    const t0 = 0;
    let state = houseAt(createInitialState(t0), 1);
    const res = startUpgrade(state, "house-evo", t0);
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/automatiquement/i);
  });

  it("évolue t1→t2 après EVOLVE_DELAY si N1", () => {
    const t0 = 1_000_000;
    // Mock via tickHousingEvolution avec city forcée : on injecte needsSince
    // et on stub computeCity en construisant un état N1 (power+jobs+shop).
    let state = houseAt(createInitialState(t0), 1, {
      needsSince: t0,
    });
    // Ajoute shop + coal + pop pour N1
    state = enrichForNeeds(state, t0, { need: 1 });

    const before = tickHousingEvolution(state, t0 + (EVOLVE_DELAY_SEC - 1) * 1000);
    expect(before.buildings.find((b) => b.id === "house-evo")!.level).toBe(1);

    const after = tickHousingEvolution(state, t0 + EVOLVE_DELAY_SEC * 1000);
    expect(after.buildings.find((b) => b.id === "house-evo")!.level).toBe(2);
  });

  it("attend les planches pour t4 sans régresser", () => {
    const t0 = 1_000_000;
    let state = houseAt(createInitialState(t0), 3, {
      needsSince: t0 - EVOLVE_DELAY_SEC * 1000,
    });
    state = enrichForNeeds(state, t0, { need: 2, health: true });
    state = { ...state, resources: { ...state.resources, planks: 0 } };

    const after = tickHousingEvolution(state, t0);
    const h = after.buildings.find((b) => b.id === "house-evo")!;
    expect(h.level).toBe(3);
    expect(h.type).toBe("house");
    const wait = waitingForPlanks(h, after, t0);
    expect(wait).toBe(HOUSE_T4_PLANKS);

    const funded = tickHousingEvolution(
      { ...after, resources: { ...after.resources, planks: HOUSE_T4_PLANKS } },
      t0 + 1
    );
    const h2 = funded.buildings.find((b) => b.id === "house-evo")!;
    expect(h2.level).toBe(4);
    expect(funded.resources.planks).toBe(0);
  });

  it("immeuble bloqué sans planches", () => {
    const t0 = 0;
    let state = houseAt(createInitialState(t0), 4, {
      needsSince: t0 - EVOLVE_DELAY_SEC * 1000,
    });
    state = enrichForNeeds(state, t0, {
      need: 3,
      health: true,
      safety: true,
    });
    state = { ...state, resources: { ...state.resources, planks: 0 } };

    const after = tickHousingEvolution(state, t0);
    expect(after.buildings.find((b) => b.id === "house-evo")!.type).toBe(
      "house"
    );
    expect(
      waitingForPlanks(
        after.buildings.find((b) => b.id === "house-evo")!,
        after,
        t0
      )
    ).toBe(APARTMENT_EVOLVE_PLANKS);
  });

  it("régresse après DEVOLVE_DELAY", () => {
    const t0 = 1_000_000;
    // Maison t2 sans N1 (pas de shop / power) → unjustified
    let state = houseAt(createInitialState(t0), 2, {
      unmetSince: t0 - DEVOLVE_DELAY_SEC * 1000,
    });
    const after = tickHousingEvolution(state, t0);
    expect(after.buildings.find((b) => b.id === "house-evo")!.level).toBe(1);
  });

  it("saut de temps large : au plus un palier", () => {
    const t0 = 0;
    let state = houseAt(createInitialState(t0), 1, { needsSince: t0 });
    state = enrichForNeeds(state, t0, { need: 1 });
    const after = tick(state, t0 + 10_000_000);
    expect(after.buildings.find((b) => b.id === "house-evo")!.level).toBe(2);
  });
});

void baseCity;
