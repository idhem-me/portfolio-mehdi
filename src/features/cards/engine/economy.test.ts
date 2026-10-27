import { test } from "node:test";
import assert from "node:assert/strict";
import { openingCost, affordableBoosters, boosterCountdown } from "./economy";
import {
  BOOSTER_CAPACITY,
  BOOSTER_INTERVAL_MS,
  refillBoosters,
  nextBoosterIn,
} from "./boosters";
test("four free boosters refill every six hours and stop at the cap", () => {
  assert.equal(BOOSTER_CAPACITY, 4);
  assert.equal(BOOSTER_INTERVAL_MS, 21600000);
  const bank = { available: 0, updatedAt: 1000 };
  assert.equal(refillBoosters(bank, 1000 + 21599999).available, 0);
  assert.equal(refillBoosters(bank, 1000 + 21600000).available, 1);
  assert.equal(refillBoosters(bank, 1000 + 86400000).available, 4);
  assert.equal(refillBoosters(bank, 1000 + 86400000 * 9).available, 4);
  const full = refillBoosters(bank, 1000 + 86400000);
  assert.equal(nextBoosterIn(full, 1000 + 86400000), null);
  assert.equal(
    nextBoosterIn({ ...full, available: 3 }, 1001 + 86400000),
    21599999,
  );
});
test("free boosters are used before gems; affordability and maximum opening are bounded", () => {
  assert.deepEqual(openingCost(3, 4), { freeUsed: 3, gems: 0 });
  assert.deepEqual(openingCost(7, 2), { freeUsed: 2, gems: 500 });
  assert.deepEqual(openingCost(10, 0), { freeUsed: 0, gems: 1000 });
  assert.equal(affordableBoosters(2, 399), 5);
  assert.equal(affordableBoosters(0, 99), 0);
  assert.equal(affordableBoosters(4, 50000), 10);
  assert.equal(boosterCountdown(21600000), "06:00:00");
  assert.equal(boosterCountdown(1), "00:00:01");
});
