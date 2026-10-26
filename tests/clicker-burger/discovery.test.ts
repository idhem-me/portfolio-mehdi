import test from "node:test";
import assert from "node:assert/strict";
import { initial, act } from "../../src/features/clicker-burger/engine/game";
import { discoveries } from "../../src/features/clicker-burger/systems/discovery";
test("new game exposes only the restaurant, with no future content", () => {
  const v = discoveries(initial());
  assert.equal(v.generators.length, 0);
  assert.equal(v.research.length, 0);
  assert.equal(v.markets.length, 0);
  assert.equal(v.rivals.length, 0);
  assert.equal(v.map, false);
  assert.equal(v.bulk, false);
  assert.equal(v.prestige, false);
});
test("first employee appears after ten sales, other equipment stays hidden", () => {
  const s = initial();
  s.sold = 10;
  s.earned = "40";
  const v = discoveries(s);
  assert.deepEqual(
    v.generators.map((g) => g.id),
    ["cook"],
  );
  assert.equal(v.research.length, 0);
});
test("discoveries are retained after spending money", () => {
  const s = initial();
  s.sold = 40;
  s.earned = "160";
  s.money = "160";
  const before = discoveries(s);
  const bought = act(s, { type: "buy", id: "cook", quantity: 1 });
  bought.money = "0";
  const after = discoveries(bought);
  assert(before.generators.some((g) => g.id === "cook"));
  assert(after.generators.some((g) => g.id === "cook"));
  assert(after.generators.some((g) => g.id === "grill"));
  assert.deepEqual(
    after.research.map((r) => r.id),
    ["recipe"],
  );
  assert.equal(after.map, false);
});
test("only the next eligible market is revealed", () => {
  const s = initial();
  s.earned = "1000";
  assert.deepEqual(
    discoveries(s).markets.map((m) => m.id),
    ["suburb"],
  );
  s.markets = ["suburb"];
  assert.deepEqual(
    discoveries(s).markets.map((m) => m.id),
    ["suburb", "center"],
  );
  assert(!discoveries(s).markets.some((m) => m.id === "moon"));
});
test("industrial chain appears step by step, owned legacy assets remain accessible", () => {
  const s = initial();
  s.earned = "10000";
  s.research = ["recipe", "franchise"];
  assert(discoveries(s).generators.some((g) => g.id === "farm"));
  assert(!discoveries(s).generators.some((g) => g.id === "factory"));
  s.counts.farm = 1;
  assert(discoveries(s).generators.some((g) => g.id === "factory"));
  assert(!discoveries(s).generators.some((g) => g.id === "warehouse"));
  s.counts.factory = 1;
  assert(discoveries(s).generators.some((g) => g.id === "warehouse"));
});
