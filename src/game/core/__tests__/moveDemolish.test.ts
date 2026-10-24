import { describe, expect, it, beforeEach } from "vitest";
import {
  createInitialState,
  demolishBuilding,
  moveBuilding,
  placeBuilding,
  resetIdCounter,
  startMoveBuilding,
} from "../actions";
import { startParcelIds } from "../balance";
import { buildCost, countOwned } from "../economy";
import { BUILDING_REFUND_RATIO } from "../mapConfig";
import { getCell, parcelBlockOrigin } from "../grid";
import { scaleCost } from "../economy";
import type { GameState } from "../types";

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

function placeHouse(state: GameState) {
  const ids = startParcelIds();
  const other = ids[2]!;
  const [px, py] = other.split(",").map(Number) as [number, number];
  const o = parcelBlockOrigin(px, py);
  // Origine en cases fines (empreinte maison = 4×4)
  return placeBuilding(state, "house", o.x + 2, o.y + 2, 0);
}

beforeEach(() => {
  resetIdCounter();
});

describe("demolishBuilding", () => {
  it("refuse la démolition de la mairie", () => {
    const state = rich(createInitialState(0));
    const res = demolishBuilding(state, "townhall-0");
    expect(res.ok).toBe(false);
    expect(state.buildings.some((b) => b.type === "townhall")).toBe(true);
  });

  it("démolit une maison, libère les cellules et rembourse 50 %", () => {
    let state = rich(createInitialState(0));
    const placed = placeHouse(state);
    expect(placed.ok).toBe(true);
    state = placed.state;
    const house = state.buildings.find((b) => b.type === "house")!;
    const goldBefore = state.resources.gold;
    const expected = scaleCost(
      buildCost("house", Math.max(0, countOwned(state, "house") - 1)),
      BUILDING_REFUND_RATIO
    );

    const res = demolishBuilding(state, house.id);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.buildings.find((b) => b.id === house.id)).toBeUndefined();
    expect(getCell(state.cells, house.x, house.y)?.buildingId).toBeNull();
    expect(state.resources.gold).toBe(goldBefore + expected.gold);
  });
});

describe("moveBuilding", () => {
  it("déplace l'empreinte vers une case libre", () => {
    let state = rich(createInitialState(0));
    const placed = placeHouse(state);
    expect(placed.ok).toBe(true);
    state = placed.state;
    const house = state.buildings.find((b) => b.type === "house")!;
    const ox = house.x;
    const oy = house.y;

    state = startMoveBuilding(state, house.id);
    expect(state.movingBuildingId).toBe(house.id);

    const ids = startParcelIds();
    const other = ids[3]!;
    const [px, py] = other.split(",").map(Number) as [number, number];
    const o = parcelBlockOrigin(px, py);
    const nx = o.x + 2;
    const ny = o.y + 2;

    const res = moveBuilding(state, house.id, nx, ny);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.movingBuildingId).toBeNull();
    const moved = state.buildings.find((b) => b.id === house.id)!;
    expect(moved.x).toBe(nx);
    expect(moved.y).toBe(ny);
    expect(getCell(state.cells, ox, oy)?.buildingId).toBeNull();
    expect(getCell(state.cells, nx, ny)?.buildingId).toBe(house.id);
  });

  it("refuse un emplacement invalide", () => {
    let state = rich(createInitialState(0));
    const placed = placeHouse(state);
    state = startMoveBuilding(placed.state, placed.state.buildings.find((b) => b.type === "house")!.id);
    const house = state.buildings.find((b) => b.type === "house")!;
    const res = moveBuilding(state, house.id, 0, 0);
    expect(res.ok).toBe(false);
    expect(state.buildings.find((b) => b.id === house.id)?.x).toBe(house.x);
  });
});
