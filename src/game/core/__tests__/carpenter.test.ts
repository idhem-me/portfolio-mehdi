import { describe, expect, it } from "vitest";
import {
  collectBuilding,
  createInitialState,
  migrate,
  placeBuilding,
  resetIdCounter,
} from "../actions";
import { WOOD_PER_PLANK } from "../balance";
import { getBuildingDef } from "../buildings";
import { carpenterPlanksFromDt } from "../economy";
import { getCell, occupyFootprint } from "../grid";
import type { GameState, PlacedBuilding } from "../types";

function withCarpenter(state: GameState, now: number): GameState {
  const th = state.buildings[0]!;
  const x = th.x + 4;
  const y = th.y;
  const leveled: GameState = {
    ...state,
    buildings: state.buildings.map((b) =>
      b.type === "townhall" ? { ...b, level: 2 } : b
    ),
    resources: {
      ...state.resources,
      gold: 9999,
      wood: 9999,
      stone: 9999,
      planks: 0,
    },
  };
  const res = placeBuilding(leveled, "carpenter", x, y, now, "H");
  expect(res.ok).toBe(true);
  // Centrale + pop pour efficiency > 0 (sinon prod théorique = 0).
  const coal: PlacedBuilding = {
    id: "coal-test",
    type: "coal_plant",
    x: th.x + 12,
    y: th.y,
    level: 1,
    lastCollectedAt: now,
    construction: null,
    rotation: "H",
  };
  const buildings = res.state.buildings.map((b) =>
    b.type === "carpenter"
      ? { ...b, level: 1, construction: null, lastCollectedAt: now }
      : b
  );
  return {
    ...res.state,
    buildings: [...buildings, coal],
    population: 20,
  };
}

describe("carpenter + planks", () => {
  it("plafonne par le bois disponible", () => {
    expect(carpenterPlanksFromDt(100, 5)).toEqual({
      planks: Math.floor(5 / WOOD_PER_PLANK),
      woodSpent: Math.floor(5 / WOOD_PER_PLANK) * WOOD_PER_PLANK,
    });
    expect(carpenterPlanksFromDt(100, 0).planks).toBe(0);
  });

  it("sans bois → 0 planches à la récolte", () => {
    resetIdCounter();
    const t0 = 1_000_000;
    let state = withCarpenter(createInitialState(t0), t0);
    state = {
      ...state,
      resources: { ...state.resources, wood: 0, planks: 0 },
    };
    const carpenter = state.buildings.find((b) => b.type === "carpenter")!;
    const res = collectBuilding(state, carpenter.id, t0 + 3_600_000);
    expect(res.ok).toBe(false);
  });

  it("saut 1 h avec peu de bois → planches plafonnées, bois ≥ 0", () => {
    resetIdCounter();
    const t0 = 1_000_000;
    let state = withCarpenter(createInitialState(t0), t0);
    state = {
      ...state,
      resources: { ...state.resources, wood: 5, planks: 0 },
    };
    const carpenter = state.buildings.find((b) => b.type === "carpenter")!;
    const res = collectBuilding(state, carpenter.id, t0 + 3_600_000);
    expect(res.ok).toBe(true);
    const maxFromWood = Math.floor(5 / WOOD_PER_PLANK);
    expect(res.state.resources.planks).toBeLessThanOrEqual(maxFromWood);
    expect(res.state.resources.planks).toBeGreaterThan(0);
    expect(res.state.resources.wood).toBeGreaterThanOrEqual(0);
    expect(res.state.resources.wood).toBe(
      5 - res.state.resources.planks * WOOD_PER_PLANK
    );
  });
});

describe("migration v4 → v5 tailles", () => {
  it("school garde l'origine et passe en 1×1", () => {
    resetIdCounter();
    const now = 0;
    const base = createInitialState(now);
    const school: PlacedBuilding = {
      id: "school-1",
      type: "school",
      x: base.buildings[0]!.x + 8,
      y: base.buildings[0]!.y,
      level: 1,
      lastCollectedAt: now,
      construction: null,
      rotation: "H",
    };
    const cells = occupyFootprint(
      base.cells,
      school.x,
      school.y,
      2,
      1,
      school.id,
      "H"
    );

    const v4 = {
      ...base,
      version: 4 as const,
      buildings: [...base.buildings, school],
      cells,
      resources: {
        gold: 10,
        wood: 10,
        stone: 10,
        knowledge: 0,
      },
    };

    const v5 = migrate(v4);
    expect(v5.version).toBe(5);
    expect(v5.resources.planks).toBe(0);
    expect(getBuildingDef("school").width).toBe(1);
    expect(getBuildingDef("solar_plant").width).toBe(1);
    expect(getBuildingDef("factory").width).toBe(1);

    const migrated = v5.buildings.find((b) => b.id === "school-1")!;
    expect(migrated.x).toBe(school.x);
    expect(migrated.y).toBe(school.y);
    expect(getCell(v5.cells, school.x, school.y)?.buildingId).toBe(school.id);
  });
});
