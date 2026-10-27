import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GOLD_PACK_PERCENT,
  GOLD_PACK_PROBABILITY,
  FIFTH_CARD_PERCENT,
  FIFTH_CARD_ORDER,
  fifthCardPercentSum,
  buildFifthCardIntervals,
} from "./rates";

test("fifth-card percents sum to 100", () => {
  assert.equal(Number(fifthCardPercentSum().toFixed(6)), 100);
});

test("0.005% gold pack converts to 0.00005", () => {
  assert.equal(GOLD_PACK_PERCENT, 0.005);
  assert.equal(GOLD_PACK_PROBABILITY, 0.00005);
  assert.equal(GOLD_PACK_PERCENT / 100, GOLD_PACK_PROBABILITY);
});

test("fifth-card intervals cover [0, 1) without gaps or overlaps", () => {
  const intervals = buildFifthCardIntervals();
  assert.equal(intervals.length, FIFTH_CARD_ORDER.length);
  assert.equal(intervals[0]!.start, 0);
  assert.ok(Math.abs(intervals[intervals.length - 1]!.end - 1) < 1e-12);
  for (let i = 0; i < intervals.length - 1; i++) {
    assert.equal(intervals[i]!.end, intervals[i + 1]!.start);
  }
});

test("interval boundaries map to declared rarities", () => {
  const intervals = buildFifthCardIntervals();
  for (const rarity of FIFTH_CARD_ORDER) {
    const expected = FIFTH_CARD_PERCENT[rarity] / 100;
    const found = intervals.find((i) => i.rarity === rarity)!;
    assert.ok(Math.abs(found.end - found.start - expected) < 1e-12);
  }
});
