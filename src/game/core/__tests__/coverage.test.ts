import { describe, expect, it, beforeEach } from "vitest";
import { createInitialState, resetIdCounter } from "../actions";
import { SERVICE_RADIUS_BASE } from "../balance";
import { computeCity } from "../city";
import {
  cellsInManhattanRadius,
  computeCoverage,
  serviceRadius,
} from "../coverage";
import type { GameState, PlacedBuilding } from "../types";

beforeEach(() => {
  resetIdCounter();
});

describe("coverage radius", () => {
  it("Manhattan ≤ radius", () => {
    const cells = cellsInManhattanRadius(10, 10, 2);
    expect(cells.some((c) => c.x === 10 && c.y === 10)).toBe(true);
    expect(cells.some((c) => c.x === 12 && c.y === 10)).toBe(true);
    expect(cells.some((c) => c.x === 12 && c.y === 12)).toBe(false);
  });

  it("rayon augmente avec le niveau", () => {
    expect(serviceRadius({ serviceRadius: SERVICE_RADIUS_BASE }, 1)).toBe(
      SERVICE_RADIUS_BASE
    );
    expect(
      serviceRadius({ serviceRadius: SERVICE_RADIUS_BASE }, 3)
    ).toBeGreaterThan(SERVICE_RADIUS_BASE);
  });

  it("logement hors rayon non servi ; capacité limitée", () => {
    const t0 = 0;
    let state = createInitialState(t0);
    const th = state.buildings[0]!;
    const houseNear: PlacedBuilding = {
      id: "h-near",
      type: "house",
      x: th.x + 4,
      y: th.y,
      level: 1,
      lastCollectedAt: t0,
      construction: null,
    };
    const houseFar: PlacedBuilding = {
      id: "h-far",
      type: "house",
      x: th.x + 80,
      y: th.y + 80,
      level: 1,
      lastCollectedAt: t0,
      construction: null,
    };
    const shop: PlacedBuilding = {
      id: "shop-1",
      type: "shop",
      x: th.x + 5,
      y: th.y,
      level: 1,
      lastCollectedAt: t0,
      construction: null,
    };
    state = {
      ...state,
      population: 4,
      buildings: [...state.buildings, houseNear, houseFar, shop],
    };

    const cov = computeCoverage(state, { powerOk: true, jobsOk: true });
    expect(cov.byHousing.get("h-near")?.covered.commerce).toBe(true);
    expect(cov.byHousing.get("h-far")?.covered.commerce).toBe(false);
  });

  it("computeCity expose la répartition N", () => {
    const state = createInitialState(0) as GameState;
    const city = computeCity(state);
    expect(city.needDistributionPct).toBeDefined();
    expect(city.housingNeeds).toBeInstanceOf(Map);
    expect(city.coverageDetail).toBeDefined();
  });
});
