import test from "node:test";
import assert from "node:assert/strict";
import { simulate } from "../../scripts/clicker-burger/balance";
import {
  D,
  buildingLevel,
} from "../../src/features/clicker-burger/engine/game";
for (const active of [true, false])
  test(`all ten levels remain reachable (${active ? "active start" : "idle after first hire"})`, () => {
    const result = simulate(active, 36);
    assert.equal(buildingLevel(result.state), 10);
    assert(Object.keys(result.reached).length === 10);
    assert(D(result.state.money).gte(0));
    assert(result.hours > 5 && result.hours < 36);
    for (let i = 2; i <= 10; i++)
      assert(result.reached[i] > result.reached[i - 1]);
  });
