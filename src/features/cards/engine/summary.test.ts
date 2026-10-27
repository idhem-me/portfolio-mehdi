import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyOpeningPulls } from "./summary";

const pull = (cardId: string, rarity: "common" | "rare" = "common") => ({
  cardId,
  rarity,
  shiny: false,
  slot: 0,
});

test("marks first unowned pull as new and later copies as duplicates", () => {
  const items = classifyOpeningPulls(
    [pull("a"), pull("a"), pull("b", "rare")],
    { a: { qty: 2 }, b: { qty: 1 } },
  );
  assert.deepEqual(
    items.map((item) => item.isNew),
    [true, false, true],
  );
  assert.equal(items.filter((item) => item.isNew).length, 2);
  assert.equal(items.filter((item) => !item.isNew).length, 1);
});

test("owned cards stay duplicates after finalize quantities", () => {
  const items = classifyOpeningPulls([pull("a"), pull("b")], {
    a: { qty: 4 },
    b: { qty: 2 },
  });
  assert.deepEqual(
    items.map((item) => item.isNew),
    [false, false],
  );
});

test("simulations still classify against the current collection", () => {
  const items = classifyOpeningPulls([pull("a"), pull("b")], { a: { qty: 1 } }, {
    simulation: true,
  });
  assert.deepEqual(
    items.map((item) => item.isNew),
    [false, true],
  );
});
