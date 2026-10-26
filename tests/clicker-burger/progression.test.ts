import test from "node:test";
import assert from "node:assert/strict";
import {
  initial,
  buildingLevel,
  levelMultiplier,
  clickProduction,
  act,
  D,
} from "../../src/features/clicker-burger/engine/game";
import { parseSave } from "../../src/features/clicker-burger/systems/save";
import {
  claimMission,
  visibleMissions,
} from "../../src/features/clicker-burger/data/missions";
import {
  accountSaveKey,
  validProfile,
} from "../../src/features/clicker-burger/auth/useAccount";
test("ten levels require exponential revenue and the right infrastructure", () => {
  const s = initial();
  s.research = ["recipe", "franchise", "coldchain", "global", "space", "warp"];
  s.counts.warehouse = 1;
  s.counts.megafactory = 3;
  s.markets = [
    "lyon",
    "europe",
    "asia",
    "america",
    "africa",
    "mars",
    "europa",
    "alpha",
    "multiverse",
  ];
  const thresholds = [
    "0",
    "250",
    "5000",
    "100000",
    "5000000",
    "500000000",
    "500000000000",
    "5000000000000",
    "500000000000000",
    "500000000000000000",
  ];
  thresholds.forEach((threshold, i) => {
    s.earned = threshold;
    assert.equal(buildingLevel(s), i + 1);
    assert.equal(levelMultiplier(s), 2 ** i);
  });
  s.markets = s.markets.filter((id) => id !== "mars");
  assert.equal(buildingLevel(s), 5);
});
test("level multiplier applies exactly once to each manual click", () => {
  const s = initial();
  s.earned = "1000";
  assert.equal(act(s, { type: "cook" }).stock, 2);
});
test("mission rewards are sequential and cannot be collected twice", () => {
  let s = initial();
  assert.equal(visibleMissions(s).length, 1);
  assert.equal(claimMission(s, "first-ten"), s);
  s.manual = 10;
  s = claimMission(s, "first-ten");
  assert.equal(s.money, "45");
  assert.equal(claimMission(s, "first-ten"), s);
  assert.equal(visibleMissions(s).length, 2);
  assert(D(s.earned).eq(0));
  assert.equal(claimMission(s, "world"), s);
  assert.deepEqual(parseSave(JSON.stringify(s)).missionClaims, ["first-ten"]);
});
test("old saves migrate mission rewards without losing progress", () => {
  const s = initial();
  s.money = "54321";
  const raw = JSON.parse(JSON.stringify(s));
  delete raw.missionClaims;
  const migrated = parseSave(JSON.stringify(raw));
  assert.equal(migrated.money, "54321");
  assert.deepEqual(migrated.missionClaims, []);
  assert.throws(() =>
    parseSave(JSON.stringify({ ...s, missionClaims: ["unknown"] })),
  );
});
test("profiles and guest use distinct local save keys", () => {
  const a = {
    key: "a".repeat(64),
    kind: "google" as const,
    name: "Alice",
    avatar: null,
  };
  const b = { ...a, key: "b".repeat(64) };
  assert(validProfile(a));
  assert(!validProfile({ ...a, key: "../../invalid" }));
  assert.notEqual(accountSaveKey(a), accountSaveKey(b));
  assert.notEqual(accountSaveKey(a), accountSaveKey(null));
  assert.equal(accountSaveKey(null), "food-empire.save.v1");
});
