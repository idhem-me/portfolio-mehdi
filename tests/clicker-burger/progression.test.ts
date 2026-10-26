import test from "node:test";
import assert from "node:assert/strict";
import {
  initial,
  buildingLevel,
  levelMultiplier,
  act,
  D,
  upgradeOffer,
  burgersPerClick,
  clickProduction,
  rates,
} from "../../src/features/clicker-burger/engine/game";
import { parseSave } from "../../src/features/clicker-burger/systems/save";
import {
  claimMission,
  visibleMissions,
  missionLabel,
  MISSIONS,
} from "../../src/features/clicker-burger/data/missions";
import {
  accountSaveKey,
  validProfile,
} from "../../src/features/clicker-burger/auth/useAccount";
test("ten levels have the requested cash prices and require explicit atomic purchases", () => {
  let s = initial();
  s.money = "1e25";
  s.earned = "1e25";
  s.research = ["recipe", "franchise", "coldchain", "global", "space", "warp"];
  s.counts.cook = 8;
  s.counts.warehouse = 1;
  s.counts.megafactory = 3;
  s.markets = [
    "lyon",
    "paris",
    "newyork",
    "tokyo",
    "shanghai",
    "brasilia",
    "sydney",
    "happyvalley",
    "europa",
    "alpha",
    "multiverse",
  ];
  const prices = [
    "5000",
    "250000",
    "1000000",
    "500000000",
    "10000000000",
    "1000000000000",
    "100000000000000",
    "10000000000000000",
    "1000000000000000000",
  ];
  prices.forEach((price, i) => {
    assert.equal(buildingLevel(s), i + 1);
    assert.equal(upgradeOffer(s)?.cost, price);
    const before = D(s.money);
    s = act(s, { type: "level-up" });
    assert.equal(buildingLevel(s), i + 2);
    assert(D(s.money).eq(before.minus(price)));
    assert.equal(
      levelMultiplier(s),
      [1.15, 1.35, 1.6, 1.9, 2.4, 3.1, 4.2, 5.5, 7][i],
    );
  });
  assert.equal(upgradeOffer(s), null);
});
test("unaffordable or locked building upgrades leave money and level unchanged", () => {
  const s = initial();
  assert.equal(act(s, { type: "level-up" }), s);
  s.level = 2;
  s.money = "250000";
  assert.equal(act(s, { type: "level-up" }), s);
  s.research = ["recipe"];
  s.counts.cook = 7;
  assert.equal(act(s, { type: "level-up" }), s);
  s.counts.cook = 8;
  assert.equal(act(s, { type: "level-up" }).level, 3);
});
test("level multiplier applies exactly once to each manual click", () => {
  const s = initial();
  s.level = 2;
  assert.equal(act(s, { type: "cook" }).stock, 1.15);
});
test("manual clicks scale with automatic production", () => {
  const s = initial();
  s.counts.cook = 100;
  s.counts.grill = 20;
  s.money = "10000";
  s.ingredients = 5000;
  const perClick = burgersPerClick(s);
  assert(perClick > clickProduction(s));
  assert(perClick >= rates(s).production * 0.03 - 1e-9);
  const cooked = act(s, { type: "cook" });
  assert(cooked.stock >= perClick - 1e-9);
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
test("active late missions use teasers so they do not spoil future content", () => {
  const s = initial();
  const mars = MISSIONS.find((m) => m.id === "mars")!;
  assert.equal(missionLabel(mars, s), "Ouvrir un nouveau marché");
  assert.notEqual(missionLabel(mars, s), mars.title);
  s.missionClaims = ["mars"];
  assert.equal(missionLabel(mars, s), "Ouvrir sur Mars");
  const early = MISSIONS.find((m) => m.id === "first-ten")!;
  assert.equal(missionLabel(early, initial()), early.title);
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

test("legacy automatic levels migrate without charging for buildings already obtained", () => {
  const s = initial();
  s.earned = "5000";
  s.research = ["recipe"];
  s.counts.cook = 8;
  const raw = JSON.parse(JSON.stringify(s));
  delete raw.level;
  delete raw.eventTerms;
  delete raw.nextEventAt;
  const restored = parseSave(JSON.stringify(raw));
  assert.equal(restored.level, 3);
  assert.equal(restored.money, s.money);
  assert(restored.nextEventAt > restored.elapsed);
});

test('buying a building with the last cash includes enough starter ingredients to resume sales',()=>{const s=initial();s.money='5000';s.ingredients=0;const upgraded=act(s,{type:'level-up'});assert.equal(upgraded.money,'0');const cooked=act(upgraded,{type:'cook'});assert(cooked.stock>0);assert(cooked.ingredients>=0);});
