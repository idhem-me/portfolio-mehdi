import { test } from "node:test";
import assert from "node:assert/strict";
import { createOpeningController } from "./opening";
import { emptySave } from "../persistence/types";
test("discovery survives resume and is recorded once per card", () => {
  let save = emptySave();
  const repository = {
    load: () => save,
    save: (next: typeof save) => {
      save = next;
    },
    clear: () => {
      save = emptySave();
    },
  };
  const controller = createOpeningController(repository);
  controller.startSimulation({ forceFifthRarity: "legendary" });
  controller.setPhase("revealing");
  controller.discover(1);
  assert.equal(save.activeOpen?.discovered, undefined);
  controller.discover(0);
  controller.discover(0);
  assert.deepEqual(save.activeOpen?.discovered, [0]);
  const resumed = createOpeningController(repository);
  assert.deepEqual(resumed.getSave().activeOpen?.discovered, [0]);
  resumed.advanceCard(0);
  resumed.discover(1);
  assert.deepEqual(save.activeOpen?.discovered, [0, 1]);
});
