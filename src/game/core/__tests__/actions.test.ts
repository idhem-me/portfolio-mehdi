import { describe, expect, it, beforeEach } from "vitest";
import {
  buyParcel,
  collectBuilding,
  createInitialState,
  placeBuilding,
  resetIdCounter,
  startUpgrade,
  tick,
} from "../actions";
import { parcelId, startParcelIds } from "../balance";
import { buildingEfficiency, computeCity } from "../city";
import { accumulatedStock, parcelCost } from "../economy";
import {
  canPlaceFootprint,
  isRoadVisible,
  parcelBlockOrigin,
  townhallOrigin,
} from "../grid";
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

beforeEach(() => {
  resetIdCounter();
});

describe("tick / construction", () => {
  it("finalise un chantier après un saut de temps", () => {
    const t0 = 1_000_000;
    let state = rich(createInitialState(t0));
    // ids[0]=mairie, ids[1]=4 maisons preview → autre parcelle
    const ids = startParcelIds();
    const free = ids.find((id) => id !== ids[0] && id !== ids[1])!;
    const [fpx, fpy] = free.split(",").map(Number) as [number, number];
    const origin = parcelBlockOrigin(fpx, fpy);
    const res = placeBuilding(state, "house", origin.x + 1, origin.y + 1, t0);
    expect(res.ok).toBe(true);
    state = tick(res.state, t0 + 10_000);
    const done = state.buildings.find((bb) => bb.type === "house");
    expect(done?.construction).toBeNull();
    expect(done?.level).toBe(1);
  });
});

describe("placement parcelles / routes", () => {
  it("refuse un placement sur la route d'entrée bitume", () => {
    const state = rich(createInitialState(0));
    const o = townhallOrigin();
    // Juste sous la mairie = route permanente
    const res = placeBuilding(
      state,
      "house",
      o.x,
      o.y + 4,
      0
    );
    expect(res.ok).toBe(false);
  });

  it("refuse un bâtiment à cheval sur deux parcelles", () => {
    const state = rich(createInitialState(0));
    const ids = startParcelIds();
    const { x, y } = parcelBlockOrigin(
      Number(ids[0]!.split(",")[0]),
      Number(ids[0]!.split(",")[1])
    );
    // Origine près du bord est → empreinte 8 cases (school 2×1) chevauche le bloc voisin
    const res = placeBuilding(state, "school", x + 12, y + 2, 0);
    expect(res.ok).toBe(false);
  });

  it("accepte un placement 1×1 sur un bloc libre", () => {
    const state = rich(createInitialState(0));
    const ids = startParcelIds();
    const other = ids[2]!;
    const [px, py] = other.split(",").map(Number) as [number, number];
    const o = parcelBlockOrigin(px, py);
    const res = placeBuilding(state, "house", o.x + 2, o.y + 2, 0);
    expect(res.ok).toBe(true);
  });
});

describe("achat de parcelle", () => {
  it("refuse une parcelle non adjacente", () => {
    const state = rich(createInitialState(0));
    const res = buyParcel(state, 0, 0);
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/adjacente/i);
  });

  it("accepte une parcelle adjacente", () => {
    const state = rich(createInitialState(0));
    const start = startParcelIds();
    const { px, py } = {
      px: Number(start[0]!.split(",")[0]),
      py: Number(start[0]!.split(",")[1]),
    };
    const nx = px - 1;
    const ny = py;
    expect(nx).toBeGreaterThanOrEqual(0);
    const res = buyParcel(state, nx, ny);
    expect(res.ok).toBe(true);
    expect(res.state.unlockedParcels).toContain(parcelId(nx, ny));
    expect(res.state.parcelsBought).toBe(1);
    const o = parcelBlockOrigin(nx, ny);
    expect(
      isRoadVisible(res.state.cells, res.state.unlockedParcels, o.x + 1, o.y + 1)
    ).toBe(true);
  });

  it("coût exponentiel", () => {
    expect(parcelCost(0)).toBe(150);
    expect(parcelCost(3)).toBe(Math.ceil(150 * 1.45 ** 3));
  });
});

describe("emplois / chantiers", () => {
  it("autorise la construction malgré le sous-effectif", () => {
    let state = rich(createInitialState(0));
    // slice(2) : parcelles encore libres (ids[1] = 4 maisons)
    const ids = startParcelIds().slice(2);
    const spots: { x: number; y: number }[] = [];
    for (const id of ids) {
      const [px, py] = id.split(",").map(Number) as [number, number];
      const o = parcelBlockOrigin(px, py);
      // Empreintes 4×4 : origines espacées de 4 cases
      spots.push(
        { x: o.x + 2, y: o.y + 2 },
        { x: o.x + 6, y: o.y + 2 },
        { x: o.x + 2, y: o.y + 6 },
        { x: o.x + 6, y: o.y + 6 }
      );
    }
    for (let i = 0; i < 2; i++) {
      const s = spots[i]!;
      const r = placeBuilding(state, "sawmill", s.x, s.y, i * 1000);
      expect(r.ok).toBe(true);
      state = tick(r.state, i * 1000 + 20_000);
    }
    const s = spots[2]!;
    const r3 = placeBuilding(state, "sawmill", s.x, s.y, 50_000);
    expect(r3.ok).toBe(true);
    state = tick(r3.state, 100_000);
    // Forcer pop 0 (tick a pu faire croître via les maisons preview)
    state = { ...state, population: 0 };
    const mill = state.buildings.find((b) => b.type === "sawmill")!;
    const city = computeCity(state);
    expect(city.staffingRatio).toBe(0);
    expect(buildingEfficiency(mill, city)).toBe(0);
  });

  it("refuse trop de chantiers simultanés", () => {
    let state = rich(createInitialState(0));
    const ids = startParcelIds().slice(2);
    const a = parcelBlockOrigin(
      Number(ids[0]!.split(",")[0]),
      Number(ids[0]!.split(",")[1])
    );
    const b = parcelBlockOrigin(
      Number(ids[1]!.split(",")[0]),
      Number(ids[1]!.split(",")[1])
    );
    const r1 = placeBuilding(state, "house", a.x + 2, a.y + 2, 0);
    expect(r1.ok).toBe(true);
    state = r1.state;
    const r2 = placeBuilding(state, "house", b.x + 2, b.y + 2, 0);
    expect(r2.ok).toBe(false);
    expect(r2.message).toMatch(/chantiers/i);
  });
});

describe("récolte", () => {
  it("stock plafonné ; lastCollectedAt reset", () => {
    // Centrale + pop pour efficiency > 0 (sinon prod nulle)
    let state = rich(createInitialState(0));
    const ids = startParcelIds().slice(2);
    const o = parcelBlockOrigin(
      Number(ids[0]!.split(",")[0]),
      Number(ids[0]!.split(",")[1])
    );
    const placed = placeBuilding(state, "coal_plant", o.x + 2, o.y + 2, 0);
    expect(placed.ok).toBe(true);
    state = tick(placed.state, 100_000);
    state = { ...state, population: 50, populationUpdatedAt: 100_000 };
    const th = state.buildings[0]!;
    const far = 1_000_000_000;
    const stock = accumulatedStock(state, th, far);
    expect(stock).toBeGreaterThan(0);
    const res = collectBuilding(state, th.id, far);
    expect(res.ok).toBe(true);
    expect(res.state.buildings[0]!.lastCollectedAt).toBe(far);
    expect(res.state.resources.gold).toBeCloseTo(
      state.resources.gold + stock,
      5
    );
  });
});

describe("upgrade", () => {
  it("peut améliorer la mairie", () => {
    let state = rich(createInitialState(0));
    const th = state.buildings[0]!;
    const res = startUpgrade(state, th.id, 0);
    expect(res.ok).toBe(true);
    state = tick(res.state, 60_000);
    expect(state.buildings[0]!.level).toBe(2);
  });
});

describe("monument 2×2", () => {
  it("empreinte 2×2 uniquement", async () => {
    const { getBuildingDef } = await import("../buildings");
    const def = getBuildingDef("monument");
    expect(def.width).toBe(2);
    expect(def.height).toBe(2);
  });
});
