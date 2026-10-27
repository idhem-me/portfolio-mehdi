import assert from "node:assert/strict";
import { test } from "node:test";
import { createSeededRng } from "@/lib/games/rng";
import { createLocalCardsRepository } from "../persistence/repository";
import { normalizeActiveOpenPhase } from "../persistence/types";
import { validateCloudSave } from "../server/validation";
import type { DrawOptions } from "./draw";
import type { OpeningController } from "./opening";
import type { ActiveOpen } from "../persistence/types";
import { drawPack } from "./draw";
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

/** Canonical server fixture: payment is covered by RPC integration tests. */
function serverBatch(controller: OpeningController, options: DrawOptions) {
  const packs = Array.from({ length: 10 }, () => drawPack(options));
  const open: ActiveOpen = {
    openId: "server-batch",
    kind: packs[0].kind,
    cards: packs.flatMap((p) => p.cards),
    batchKinds: packs.map((p) => p.kind),
    phase: "cutting",
    revealed: Array(50).fill(false),
    currentIndex: 0,
    createdAt: Date.now(),
    finalized: false,
  };
  const save = controller.getSave();
  controller.replaceSave({
    ...save,
    boosters: { ...save.boosters, available: 0 },
    activeOpen: open,
  });
  return open;
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

test("stale interaction index cannot skip the next card", () => {
  const { repo } = memoryRepo();
  const c = createOpeningController(repo);
  c.startOpen();
  c.advanceCard(0); // cutting is not interactive
  assert.equal(c.getSave().activeOpen?.currentIndex, 0);
  c.setPhase("revealing");
  c.advanceCard(0);
  c.advanceCard(0);
  assert.equal(c.getSave().activeOpen?.currentIndex, 1);
});

test("rapid starts draw once; successive boosters retain five credits each", () => {
  const { repo } = memoryRepo();
  const c = createOpeningController(repo);
  let calls = 0;
  const rng = () => {
    calls++;
    return 0.5;
  };
  const first = c.startOpen({ rng });
  const count = calls;
  assert.equal(c.startOpen({ rng })?.openId, first?.openId);
  assert.equal(calls, count);
  c.dismissSummary(); // a live pack must not be discarded
  assert.equal(c.getSave().activeOpen?.openId, first?.openId);
  c.setPhase("revealing");
  for (let i = 0; i < 5; i++) c.advanceCard(i);
  const second = c.startOpen({ rng });
  assert.notEqual(second?.openId, first?.openId);
  assert.equal(second?.currentIndex, 0);
  assert.equal(second?.phase, "cutting");
  c.setPhase("revealing");
  for (let i = 0; i < 5; i++) c.advanceCard(i);
  assert.equal(c.getSave().stats.boostersOpened, 2);
  assert.equal(
    Object.values(c.getSave().collection).reduce((n, e) => n + e.qty, 0),
    10,
  );
});

test("an interrupted legacy summary credits on load once", () => {
  const { repo } = memoryRepo();
  const c = createOpeningController(repo);
  c.startOpen();
  c.setPhase("summary");
  assert.equal(c.getSave().stats.boostersOpened, 0);
  const recovered = createOpeningController(repo);
  assert.equal(recovered.getSave().stats.boostersOpened, 1);
  assert.equal(createOpeningController(repo).getSave().stats.boostersOpened, 1);
});

test("ten boosters persist ordered draws, resume at any card, and credit once after card 50", () => {
  const { repo } = memoryRepo();
  const controller = createOpeningController(repo);
  const result = serverBatch(controller, {
    setId: "horizons",
    rng: createSeededRng(42),
  })!;
  assert.equal(result.cards.length, 50);
  assert.equal(result.batchKinds?.length, 10);
  assert.equal(result.phase, "cutting");
  assert.equal(controller.getSave().boosters.available, 0);
  assert.equal(controller.getSave().stats.boostersOpened, 0);
  const expectedRng = createSeededRng(42);
  const expected = Array.from({ length: 10 }, () =>
    drawPack({ setId: "horizons", rng: expectedRng }),
  );
  assert.deepEqual(
    result.cards,
    expected.flatMap((pack) => pack.cards),
  );
  assert.deepEqual(
    result.batchKinds,
    expected.map((pack) => pack.kind),
  );
  const resumed = createOpeningController(repo);
  assert.deepEqual(resumed.getSave().activeOpen?.cards, result.cards);
  assert.equal(resumed.getSave().activeOpen?.phase, "revealing");
  for (let index = 0; index < 7; index++) resumed.advanceCard(index);
  const afterReload = createOpeningController(repo);
  assert.equal(afterReload.getSave().activeOpen?.currentIndex, 7);
  afterReload.advanceCard(6); // stale events cannot skip cards
  assert.equal(afterReload.getSave().activeOpen?.currentIndex, 7);
  for (let index = 7; index < 49; index++) afterReload.advanceCard(index);
  assert.equal(afterReload.getSave().activeOpen?.phase, "revealing");
  assert.equal(afterReload.getSave().stats.boostersOpened, 0);
  afterReload.advanceCard(49);
  const save = afterReload.getSave();
  assert.equal(save.activeOpen?.phase, "summary");
  assert.equal(save.stats.boostersOpened, 10);
  assert.equal(
    Object.values(save.collection).reduce((sum, card) => sum + card.qty, 0),
    50,
  );
  assert.ok(
    Object.keys(save.collection).every((id) => Number(id.slice(5)) > 40),
  );
  afterReload.complete();
  assert.equal(
    createOpeningController(repo).getSave().stats.boostersOpened,
    10,
  );
  assert.equal(afterReload.openTen(), null);
});

test("gold batch preserves ten gold packs and credits 50 legendary cards", () => {
  const { repo } = memoryRepo();
  const controller = createOpeningController(repo);
  const batch = serverBatch(controller, { rng: () => 0 })!;
  assert.ok(batch.cards.every((card) => card.rarity === "legendary"));
  controller.revealAll();
  assert.equal(controller.getSave().stats.boostersOpened, 10);
  assert.equal(controller.getSave().stats.goldPacksOpened, 10);
  assert.equal(controller.getSave().stats.copiesByRarity.legendary, 50);
});

test("ten boosters cannot replace an unfinished single opening", () => {
  const { repo } = memoryRepo();
  const controller = createOpeningController(repo);
  controller.startOpen({ rng: createSeededRng(7) });
  assert.equal(controller.openTen(), null);
  assert.equal(controller.getSave().boosters.available, 3);
});

test("batch progress round-trips through cloud validation and simulation never spends or credits", () => {
  const { repo } = memoryRepo();
  const controller = createOpeningController(repo);
  const batch = serverBatch(controller, { rng: createSeededRng(84) })!;
  const validated = validateCloudSave(controller.getSave());
  assert.equal(validated.activeOpen?.cards.length, 50);
  assert.equal(validated.activeOpen?.batchKinds?.length, 10);
  assert.deepEqual(validated.activeOpen?.cards, batch.cards);
  const malformed = {
    ...controller.getSave(),
    activeOpen: { ...batch, batchKinds: undefined },
  };
  assert.throws(() => validateCloudSave(malformed));
  const simulation = createOpeningController(memoryRepo().repo);
  simulation.startSimulation({
    batchSize: 10,
    rng: createSeededRng(84),
    forceKind: "standard",
  });
  assert.equal(simulation.getSave().activeOpen?.cards.length, 50);
  simulation.revealAll();
  assert.equal(simulation.getSave().boosters.available, 4);
  assert.equal(simulation.getSave().stats.boostersOpened, 0);
  assert.deepEqual(simulation.getSave().collection, {});
});

for (const phase of [
  "cutting",
  "wrapperExit",
  "cameraZoom",
  "revealing",
] as const) {
  test(`leaving a ten-pack opening during ${phase} credits all cards once and shows summary`, () => {
    const { repo } = memoryRepo();
    const controller = createOpeningController(repo);
    const drawn = serverBatch(controller, { rng: createSeededRng(44) })!.cards;
    controller.setPhase(phase);
    controller.revealAll();
    const save = controller.getSave();
    assert.equal(save.activeOpen?.phase, "summary");
    assert.equal(save.activeOpen?.currentIndex, 50);
    assert.equal(save.activeOpen?.revealed.every(Boolean), true);
    assert.deepEqual(save.activeOpen?.cards, drawn);
    assert.equal(save.stats.boostersOpened, 10);
    assert.equal(
      Object.values(save.collection).reduce((sum, entry) => sum + entry.qty, 0),
      50,
    );
    controller.revealAll();
    assert.equal(controller.getSave().stats.boostersOpened, 10);
    assert.equal(
      createOpeningController(repo).getSave().stats.boostersOpened,
      10,
    );
    assert.equal(save.boosters.available, 0);
  });
}
