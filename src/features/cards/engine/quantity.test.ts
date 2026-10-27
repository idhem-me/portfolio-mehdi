import { test } from "node:test";
import assert from "node:assert/strict";
import { clampQuantity } from "./quantity";
import { createOpeningController } from "./opening";
import { emptySave } from "../persistence/types";
import { parseSave } from "../persistence/repository";
test("quantity stays within available inventory", () => {
  assert.equal(clampQuantity(20, 12), 10);
  assert.equal(clampQuantity(100, 500), 10);
  assert.equal(clampQuantity(0, 12), 1);
  assert.equal(clampQuantity(NaN, 12), 1);
  assert.equal(clampQuantity(3.9, 12), 3);
  assert.equal(clampQuantity(1, 0), 0);
});
test("arbitrary multi-pack simulation and resume retain every five-card group", () => {
  let save = emptySave();
  const c = createOpeningController({
    load: () => save,
    save: (next) => {
      save = next;
    },
    clear: () => {},
  });
  c.startSimulation({ batchSize: 12 });
  assert.equal(save.activeOpen?.cards.length, 60);
  assert.equal(save.activeOpen?.batchKinds?.length, 12);
  const resumed = parseSave(save);
  assert.equal(resumed.activeOpen?.cards.length, 60);
  assert.equal(resumed.activeOpen?.batchKinds?.length, 12);
  for (let i = 0; i < 12; i++)
    assert.deepEqual(
      save.activeOpen!.cards.slice(i * 5, i * 5 + 5).map((c) => c.slot),
      [0, 1, 2, 3, 4],
    );
});
