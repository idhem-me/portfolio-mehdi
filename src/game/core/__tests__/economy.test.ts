import { describe, expect, it } from "vitest";
import {
  buildCost,
  durationSec,
  parcelCost,
  productionPerSec,
  roundCost,
  storageCap,
  upgradeCost,
} from "../economy";
import { createInitialState } from "../actions";
import type { PlacedBuilding } from "../types";

describe("roundCost / formules", () => {
  it("roundCost utilise ceil", () => {
    expect(roundCost(10.1)).toBe(11);
    expect(roundCost(10)).toBe(10);
  });

  it("buildCost = ceil(base × 1.15^n)", () => {
    expect(buildCost("house", 0).gold).toBe(20);
    expect(buildCost("house", 1).gold).toBe(Math.ceil(20 * 1.15));
  });

  it("upgradeCost = ceil(base × 1.6^lvl)", () => {
    expect(upgradeCost("house", 1).gold).toBe(Math.ceil(20 * 1.6));
  });

  it("duration et production restent valides au-delà du niv 10", () => {
    expect(durationSec("house", 0)).toBe(10);
    expect(durationSec("monument", 20)).toBe(28800);
    expect(productionPerSec("house", 15)).toBeCloseTo(
      0.1 * 15 * 1.1 ** 15,
      6
    );
  });

  it("parcelCost = ceil(150 × 1.45^k)", () => {
    expect(parcelCost(0)).toBe(150);
    expect(parcelCost(1)).toBe(Math.ceil(150 * 1.45));
    expect(parcelCost(2)).toBe(Math.ceil(150 * 1.45 ** 2));
  });
});

describe("storageCap", () => {
  it("plafonne à production × 600", () => {
    const state = createInitialState(0);
    const house: PlacedBuilding = {
      id: "house-1",
      type: "house",
      x: 0,
      y: 0,
      level: 1,
      lastCollectedAt: 0,
      construction: null,
    };
    const prod = productionPerSec("house", 1);
    expect(storageCap(state, house)).toBeCloseTo(prod * 600, 6);
  });
});
