import test from "node:test";
import assert from "node:assert/strict";
import {
  initial,
  act,
  tick,
  D,
  rates,
  marketUnlocked,
} from "../../src/features/clicker-burger/engine/game";
import { parseSave } from "../../src/features/clicker-burger/systems/save";
import { discoveries } from "../../src/features/clicker-burger/systems/discovery";

function franchiseBase() {
  const s = initial();
  s.earned = "50000";
  s.money = "80000";
  s.research = ["recipe", "franchise", "ipo"];
  s.counts.warehouse = 1;
  s.counts.farm = 2;
  s.counts.factory = 1;
  s.counts.cook = 10;
  s.stock = 200;
  s.ingredients = 500;
  s.level = 4;
  s.markets = ["suburb", "center", "lyon", "paris"];
  return s;
}

test("acquisitions add restaurants to the network and hire their crew", () => {
  const s = franchiseBase();
  s.money = "600000";
  s.counts.cook = 10;
  const before = s.counts.cook;
  const n = act(s, { type: "acquire", id: "bigbun" });
  assert.deepEqual(n.rivals, ["bigbun"]);
  assert.equal(n.counts.cook, before + 40);
});

test("ipo unlocks the stock market panel and fund tracking", () => {
  const s = franchiseBase();
  assert.equal(marketUnlocked(s), true);
  assert.equal(discoveries(s).market, true);
  let n = act(s, { type: "stock-buy", fraction: 0.5 });
  assert(D(n.money).lt(s.money));
  assert(D(n.marketFund).gt(0));
  const invested = n.marketFund;
  n = tick(n, 120);
  assert.equal(D(n.marketFund).eq(invested), false);
  n = act(n, { type: "stock-sell", fraction: 1 });
  assert.equal(n.marketFund, "0");
  assert(D(n.money).gt(0));
});

test("multi-resource projects spend cash stock and ingredients", () => {
  let s = franchiseBase();
  s.research = ["recipe", "franchise"];
  assert(discoveries(s).projects.some((p) => p.id === "test-kitchen"));
  s = act(s, { type: "project", id: "test-kitchen" });
  assert.deepEqual(s.projects, ["test-kitchen"]);
  assert.equal(s.stock, 50);
  assert.equal(s.ingredients, 420);
  assert(D(s.money).eq(68000));
  const before = rates({ ...s, projects: [] }).demand;
  assert(rates(s).demand > before);
  assert.equal(act(s, { type: "project", id: "test-kitchen" }), s);
});

test("legacy saves migrate market and projects fields", () => {
  const s = initial();
  const raw = JSON.parse(JSON.stringify(s));
  delete raw.marketFund;
  delete raw.marketIndex;
  delete raw.projects;
  const migrated = parseSave(JSON.stringify(raw));
  assert.equal(migrated.marketFund, "0");
  assert.equal(migrated.marketIndex, 100);
  assert.deepEqual(migrated.projects, []);
});

test("legacy market ids migrate to renamed cities", () => {
  const s = initial();
  s.markets = ["suburb", "lyon", "bordeaux", "europe", "moon", "mars"];
  const raw = JSON.parse(JSON.stringify(s));
  raw.markets = ["suburb", "lyon", "bordeaux", "europe", "moon", "mars"];
  const migrated = parseSave(JSON.stringify(raw));
  assert.deepEqual(migrated.markets, [
    "suburb",
    "lyon",
    "berlin",
    "newyork",
    "jamestown",
    "happyvalley",
  ]);
});

test("docs bourse save file imports cleanly", async () => {
  const { readFileSync } = await import("fs");
  const s = parseSave(
    readFileSync("docs/clicker-burger/save-bourse-test.json", "utf8"),
  );
  assert.equal(s.level, 4);
  assert.equal(marketUnlocked(s), true);
  assert.equal(discoveries(s).market, true);
  assert(discoveries(s).projects.some((p) => p.id === "test-kitchen"));
  assert.equal(s.marketFund, "12000");
});
