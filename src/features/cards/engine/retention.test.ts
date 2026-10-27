import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BOOSTER_INTERVAL_MS as HOUR,
  initialBoosterBank,
  refillBoosters,
  nextBoosterIn,
  canBypassBoosterLimit,
} from "./boosters";
import { SHINY_PROBABILITY } from "./rates";
import { drawPack, rollShiny } from "./draw";
import { createOpeningController } from "./opening";
import {
  createLocalCardsRepository,
  finalizeOpen,
  parseSave,
} from "../persistence/repository";
import { emptySave, type ActiveOpen } from "../persistence/types";

function repository() {
  const values = new Map<string, string>();
  return createLocalCardsRepository({
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } as unknown as Storage);
}

test("hourly rewards preserve partial hours, cap at ten and discard overflow", () => {
  const start = 1_000;
  const bank = { available: 2, updatedAt: start };
  assert.deepEqual(refillBoosters(bank, start + HOUR - 1), bank);
  assert.deepEqual(refillBoosters(bank, start + HOUR * 2 + 123), {
    available: 4,
    updatedAt: start + HOUR * 2,
  });
  assert.equal(nextBoosterIn(bank, start + HOUR * 2 + 123), HOUR - 123);
  const full = refillBoosters(bank, start + HOUR * 20);
  assert.deepEqual(full, { available: 10, updatedAt: start + HOUR * 20 });
  assert.equal(nextBoosterIn(full, start + HOUR * 20), null);
  assert.equal(
    refillBoosters({ ...full, available: 9 }, start + HOUR * 20 + 1).available,
    9,
  );
  assert.deepEqual(refillBoosters(bank, start - 100), bank);
});

test("ten packs exhaust reserve, rejected start does not draw, one hour grants one", () => {
  const repo = repository();
  let now = Date.now();
  repo.save({ ...emptySave(), boosters: initialBoosterBank(now) });
  const controller = createOpeningController(repo, () => now);
  for (let i = 0; i < 10; i++) {
    const open = controller.startOpen();
    assert.ok(open);
    const remaining = controller.getSave().boosters.available;
    assert.equal(controller.startOpen()?.openId, open.openId);
    assert.equal(controller.getSave().boosters.available, remaining);
    controller.revealAll();
  }
  let draws = 0;
  assert.equal(
    controller.startOpen({
      rng: () => {
        draws++;
        return 0.5;
      },
    }),
    null,
  );
  assert.equal(draws, 0);
  assert.equal(controller.startOpen(undefined, true), null); // no bypass outside local dev
  now = controller.getSave().boosters.updatedAt + HOUR;
  assert.ok(controller.startOpen());
  assert.equal(controller.getSave().boosters.available, 0);
  const resumed = createOpeningController(repo, () => now);
  const id = controller.getSave().activeOpen!.openId;
  assert.equal(resumed.startOpen()?.openId, id);
  assert.equal(resumed.getSave().boosters.available, 0);
});

test("simulations neither spend boosters nor credit Shiny copies", () => {
  const repo = repository();
  const controller = createOpeningController(repo);
  controller.startSimulation({ forceShiny: true, forceKind: "standard" });
  assert.ok(controller.getSave().activeOpen!.cards.every((card) => card.shiny));
  controller.revealAll();
  assert.equal(controller.getSave().boosters.available, 10);
  assert.deepEqual(controller.getSave().collection, {});
  assert.equal(canBypassBoosterLimit(), false);
});

test("Shiny is exactly 0.001 percent per copy, with independent boundary rolls", () => {
  assert.ok(Math.abs(SHINY_PROBABILITY - 1 / 100_000) < 1e-15);
  const cards = drawPack({ forceKind: "standard", rng: () => 0.5 }).cards;
  const values = [0, SHINY_PROBABILITY - 1e-12, SHINY_PROBABILITY, 0.5, 0.999];
  let index = 0;
  assert.deepEqual(
    rollShiny(cards, () => values[index++]!).map((c) => c.shiny),
    [true, true, false, false, false],
  );
  assert.equal(index, 5);
});

test("Shiny copies credit once, survive storage/reload, and old saves migrate safely", () => {
  const pack = drawPack({
    forceKind: "standard",
    rng: () => 0.5,
    forceShiny: true,
  });
  const open: ActiveOpen = {
    ...pack,
    openId: "shiny-test",
    phase: "summary",
    revealed: [true, true, true, true, true],
    currentIndex: 5,
    createdAt: 1,
    finalized: false,
  };
  const save = finalizeOpen(emptySave(), open);
  assert.equal(
    Object.values(save.collection).reduce((n, c) => n + (c.shinyQty ?? 0), 0),
    5,
  );
  assert.equal(
    Object.values(finalizeOpen(save, open).collection).reduce(
      (n, c) => n + (c.shinyQty ?? 0),
      0,
    ),
    5,
  );
  const repo = repository();
  repo.save(save);
  assert.deepEqual(repo.load().activeOpen!.cards, open.cards);
  assert.equal(
    Object.values(repo.load().collection).reduce(
      (n, c) => n + (c.shinyQty ?? 0),
      0,
    ),
    5,
  );
  const old = parseSave({
    collection: {
      "card-001": { qty: 3, firstAcquiredAt: 1, lastAcquiredAt: 1 },
    },
  });
  assert.equal(old.boosters.available, 10);
  assert.equal(old.collection["card-001"]!.shinyQty, 0);
  const before = JSON.stringify(repo.load().activeOpen!.cards);
  createOpeningController(repo).complete();
  assert.equal(JSON.stringify(repo.load().activeOpen!.cards), before);
});

test("resetting the collection does not refill the booster reserve", () => {
  const repo = repository();
  const controller = createOpeningController(repo);
  controller.startOpen();
  controller.revealAll();
  assert.equal(controller.getSave().boosters.available, 9);
  controller.resetLocal();
  assert.deepEqual(controller.getSave().collection, {});
  assert.equal(controller.getSave().boosters.available, 9);
  assert.equal(createOpeningController(repo).getSave().boosters.available, 9);
});
