import { describe, expect, it } from "vitest";
import { createInitialState } from "../actions";
import {
  connectedPavedSet,
  isBuildingConnected,
  isRoadNetworkConnected,
} from "../connectivity";
import { getCell, townhallAccessRoad, townhallOrigin } from "../grid";
import { LANE_COUNT_X } from "../mapLanes";

describe("route d'entrée + mairie", () => {
  it("route bitume continue jusqu'à l'accès mairie", () => {
    const state = createInitialState(0);
    const access = townhallAccessRoad();
    expect(getCell(state.cells, access.x, access.y)?.paved).toBe(true);
    expect(isRoadNetworkConnected(state.cells, access.x, access.y)).toBe(true);
    const net = connectedPavedSet(state.cells);
    expect(net.size).toBeGreaterThan(5);
    const hasRight = [...net].some((k) => {
      const x = Number(k.split(",")[0]);
      return x === LANE_COUNT_X - 1;
    });
    expect(hasRight).toBe(true);
  });

  it("mairie connected au démarrage (BFS depuis l'entrée)", () => {
    const state = createInitialState(0);
    const th = state.buildings.find((b) => b.type === "townhall")!;
    expect(th).toBeTruthy();
    expect(isBuildingConnected(state.cells, th)).toBe(true);
    const o = townhallOrigin();
    expect(th.x).toBe(o.x);
    expect(th.y).toBe(o.y);
  });
});
