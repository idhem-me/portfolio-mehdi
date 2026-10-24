import { describe, expect, it, beforeEach } from "vitest";
import {
  createInitialState,
  resetIdCounter,
} from "../actions";
import {
  entryRoadLaneY,
  isRoadPlayable,
  townhallAccessRoad,
  townhallOrigin,
} from "../grid";
import { LANE_COUNT_X, LANE_COUNT_Y } from "../mapLanes";
import { ROAD_COST } from "../mapConfig";
import {
  isIntersectionCell,
  isPaveableCell,
  paveCost,
  paveRoad,
  roadStrokePath,
  unpaveRoad,
} from "../roads";
import type { GameState } from "../types";
import { getCell } from "../grid";

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
  };
}

beforeEach(() => {
  resetIdCounter();
});

describe("routes payantes (grille uniforme)", () => {
  it("refuse de paver hors zone débloquée", () => {
    const state = createInitialState(0);
    const y = entryRoadLaneY();
    const res = paveRoad(state, 3, y);
    expect(res.ok).toBe(false);
  });

  it("pave une case libre débloquée, débite l'or", () => {
    let state = rich(createInitialState(0));
    let target: { x: number; y: number } | null = null;
    for (let y = 0; y < LANE_COUNT_Y && !target; y++) {
      for (let x = 0; x < LANE_COUNT_X; x++) {
        if (isPaveableCell(state.cells, state.unlockedParcels, x, y)) {
          target = { x, y };
          break;
        }
      }
    }
    expect(target).not.toBeNull();
    const cost = paveCost(state.cells, target!.x, target!.y);
    expect(cost.total).toBe(ROAD_COST);

    const goldBefore = state.resources.gold;
    const res = paveRoad(state, target!.x, target!.y);
    expect(res.ok).toBe(true);
    state = res.state;
    expect(state.resources.gold).toBe(goldBefore - cost.total);
    const cell = state.cells[target!.y * LANE_COUNT_X + target!.x];
    expect(cell?.paved).toBe(true);
  });

  it("route d'entrée permanente est jouable", () => {
    const state = createInitialState(0);
    const access = townhallAccessRoad();
    expect(
      isRoadPlayable(state.cells, state.unlockedParcels, access.x, access.y)
    ).toBe(true);
    const cell = state.cells[access.y * LANE_COUNT_X + access.x];
    expect(cell?.paved).toBe(true);
    expect(cell?.permanent).toBe(true);
  });

  it("unpave rembourse et refuse les routes permanentes", () => {
    let state = rich(createInitialState(0));
    let target: { x: number; y: number } | null = null;
    for (let y = 0; y < LANE_COUNT_Y && !target; y++) {
      for (let x = 0; x < LANE_COUNT_X; x++) {
        if (isPaveableCell(state.cells, state.unlockedParcels, x, y)) {
          target = { x, y };
          break;
        }
      }
    }
    expect(target).not.toBeNull();
    state = paveRoad(state, target!.x, target!.y).state;
    const goldBefore = state.resources.gold;
    const res = unpaveRoad(state, target!.x, target!.y);
    expect(res.ok).toBe(true);
    expect(res.state.cells[target!.y * LANE_COUNT_X + target!.x]?.paved).toBe(
      false
    );
    expect(res.state.resources.gold).toBeGreaterThan(goldBefore);

    const th = townhallOrigin();
    const access = { x: th.x, y: th.y + 1 };
    expect(unpaveRoad(state, access.x, access.y).ok).toBe(false);
  });

  it("ligne droite = segments ; croisement H+V = intersection", () => {
    let state = rich(createInitialState(0));
    let start: { x: number; y: number } | null = null;
    outer: for (let y = 1; y < LANE_COUNT_Y - 1; y++) {
      for (let x = 0; x + 4 < LANE_COUNT_X; x++) {
        let ok = true;
        for (let i = 0; i < 5; i++) {
          if (
            !isPaveableCell(state.cells, state.unlockedParcels, x + i, y)
          ) {
            ok = false;
            break;
          }
        }
        if (
          ok &&
          isPaveableCell(state.cells, state.unlockedParcels, x + 2, y - 1)
        ) {
          start = { x, y };
          break outer;
        }
      }
    }
    expect(start).not.toBeNull();
    const y = start!.y;
    for (let i = 0; i < 5; i++) {
      state = paveRoad(state, start!.x + i, y, { preferDir: "H" }).state;
    }
    const mid = getCell(state.cells, start!.x + 2, y)!;
    expect(mid.kind).toBe("road");
    expect(mid.roadDir).toBe("H");

    // Branchement vertical → intersection superposée au milieu
    state = paveRoad(state, start!.x + 2, y - 1, { preferDir: "V" }).state;
    expect(isIntersectionCell(state.cells, start!.x + 2, y)).toBe(true);
    expect(getCell(state.cells, start!.x + 2, y - 1)?.roadDir).toBe("V");
  });

  it("stroke : virage seulement si canTurn (case déjà bitumée)", () => {
    let state = rich(createInitialState(0));
    let start: { x: number; y: number } | null = null;
    outer: for (let y = 1; y < LANE_COUNT_Y - 1; y++) {
      for (let x = 0; x + 4 < LANE_COUNT_X; x++) {
        let ok = true;
        for (let i = 0; i < 5; i++) {
          if (
            !isPaveableCell(state.cells, state.unlockedParcels, x + i, y)
          ) {
            ok = false;
            break;
          }
        }
        if (
          ok &&
          isPaveableCell(state.cells, state.unlockedParcels, x + 4, y + 1)
        ) {
          start = { x, y };
          break outer;
        }
      }
    }
    expect(start).not.toBeNull();
    const y = start!.y;
    for (let i = 0; i < 5; i++) {
      state = paveRoad(state, start!.x + i, y, { preferDir: "H" }).state;
    }
    const tipX = start!.x + 4;

    // Sans canTurn : axe verrouillé
    const blocked = roadStrokePath(
      state.cells,
      tipX,
      y,
      tipX,
      y + 2,
      "H",
      { canTurn: false }
    );
    expect(blocked.axis).toBe("H");
    expect(blocked.path.every((p) => p.y === y)).toBe(true);

    // Avec canTurn (reprise depuis bitume existant) : monte en V
    const turned = roadStrokePath(
      state.cells,
      tipX,
      y,
      tipX,
      y + 2,
      "H",
      { canTurn: true }
    );
    expect(turned.axis).toBe("V");
    expect(turned.path.some((p) => p.y === y + 1)).toBe(true);
  });
});
