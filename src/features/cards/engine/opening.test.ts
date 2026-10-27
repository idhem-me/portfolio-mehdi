import assert from "node:assert/strict";
import { test } from "node:test";
import { createSeededRng } from "@/lib/games/rng";
import { createLocalCardsRepository } from "../persistence/repository";
import { normalizeActiveOpenPhase } from "../persistence/types";
import { createOpeningController } from "./opening";

function memoryRepo() {
  const mem = new Map<string, string>();
  const storage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
  } as Storage;
  return { repo: createLocalCardsRepository(storage), mem };
}

test("resume does not redraw pack", () => {
  const { repo } = memoryRepo();
  const c1 = createOpeningController(repo);
  const open = c1.startOpen({
    rng: createSeededRng(99),
    forceKind: "standard",
  });
  assert.ok(open);
  const cardIds = open!.cards.map((c) => c.cardId);
  c1.setPhase("revealing");
  c1.advanceCard();

  const c2 = createOpeningController(repo);
  const resumed = c2.getSave().activeOpen;
  assert.ok(resumed);
  assert.deepEqual(
    resumed!.cards.map((c) => c.cardId),
    cardIds,
  );
  assert.equal(resumed!.revealed[0], true);
  assert.equal(resumed!.currentIndex, 1);
  assert.equal(c2.startOpen()?.openId, resumed!.openId);
});

test("complete credits once across controller reload", () => {
  const { repo } = memoryRepo();
  const c1 = createOpeningController(repo);
  c1.startOpen({ rng: createSeededRng(3), forceKind: "standard" });
  c1.setPhase("revealing");
  c1.revealAll();
  const qty = Object.values(c1.getSave().collection).reduce(
    (n, e) => n + e.qty,
    0,
  );
  assert.equal(qty, 5);
  assert.equal(c1.getSave().stats.boostersOpened, 1);

  const c2 = createOpeningController(repo);
  c2.complete();
  assert.equal(c2.getSave().stats.boostersOpened, 1);
});

test("advanceCard walks five cards then finalizes once", () => {
  const { repo } = memoryRepo();
  const c = createOpeningController(repo);
  c.startOpen({ rng: createSeededRng(11), forceKind: "standard" });
  c.setPhase("revealing");
  for (let i = 0; i < 5; i++) c.advanceCard();
  const save = c.getSave();
  assert.equal(save.activeOpen?.phase, "summary");
  assert.equal(save.activeOpen?.finalized, true);
  assert.equal(save.stats.boostersOpened, 1);
  c.advanceCard();
  assert.equal(c.getSave().stats.boostersOpened, 1);
});

test("normalizeActiveOpenPhase migrates legacy and mid-cut to revealing", () => {
  const base = {
    openId: "o1",
    kind: "standard" as const,
    cards: Array.from({ length: 5 }, (_, slot) => ({
      cardId: "card-001",
      rarity: "common" as const,
      slot,
    })),
    revealed: [false, false, false, false, false],
    currentIndex: 0,
    createdAt: 1,
    finalized: false,
  };
  const fromTear = normalizeActiveOpenPhase({
    ...base,
    phase: "tearing",
  });
  assert.equal(fromTear.phase, "revealing");

  const fromWrapper = normalizeActiveOpenPhase({
    ...base,
    phase: "wrapperExit",
  });
  assert.equal(fromWrapper.phase, "revealing");

  const fromIdle = normalizeActiveOpenPhase({
    ...base,
    phase: "idle",
  });
  assert.equal(fromIdle.phase, "closed");
});

test("load resumes cutting as revealing without new draw", () => {
  const { repo, mem } = memoryRepo();
  const c1 = createOpeningController(repo);
  const open = c1.startOpen({
    rng: createSeededRng(5),
    forceKind: "gold_pack",
  });
  assert.equal(open?.phase, "cutting");
  const ids = open!.cards.map((c) => c.cardId);

  // Force mid-cut into storage as legacy tearing
  const raw = JSON.parse(mem.get("cards.save.v1")!);
  raw.activeOpen.phase = "tearing";
  mem.set("cards.save.v1", JSON.stringify(raw));

  const c2 = createOpeningController(repo);
  const resumed = c2.getSave().activeOpen;
  assert.equal(resumed?.phase, "revealing");
  assert.deepEqual(
    resumed?.cards.map((c) => c.cardId),
    ids,
  );
});
