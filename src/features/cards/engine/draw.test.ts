import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CATALOG,
  ORIGINAL_CATALOG,
  HORIZONS_CATALOG,
  EXPECTED_RARITY_COUNTS,
  cardsByRarity,
} from "../catalog/cards";
import { RARITIES, type Rarity } from "../catalog/types";
import { createSeededRng } from "@/lib/games/rng";
import { drawPack } from "./draw";
import { buildFifthCardIntervals, GOLD_PACK_PROBABILITY } from "./rates";
import {
  createLocalCardsRepository,
  finalizeOpen,
  parseSave,
} from "../persistence/repository";
import { emptySave, type ActiveOpen } from "../persistence/types";

test("catalog has exactly 40 cards with required rarity counts", () => {
  assert.equal(ORIGINAL_CATALOG.length, 40);
  assert.equal(CATALOG.length, 100);
  for (const rarity of RARITIES) {
    assert.equal(
      cardsByRarity(rarity).length,
      EXPECTED_RARITY_COUNTS[rarity],
      rarity,
    );
  }
});

test("standard pack has 5 cards: 4 commons + rare-min fifth", () => {
  const rng = createSeededRng(42);
  for (let i = 0; i < 200; i++) {
    const pack = drawPack({
      rng,
      forceKind: "standard",
    });
    assert.equal(pack.cards.length, 5);
    assert.equal(pack.kind, "standard");
    for (let s = 0; s < 4; s++) {
      assert.equal(pack.cards[s]!.rarity, "common");
      assert.equal(
        cardsByRarity("common").some((c) => c.id === pack.cards[s]!.cardId),
        true,
      );
    }
    assert.notEqual(pack.cards[4]!.rarity, "common");
    const fifth = pack.cards[4]!;
    assert.equal(
      cardsByRarity(fifth.rarity).some((c) => c.id === fifth.cardId),
      true,
    );
  }
});

test("gold pack contains 5 legendaries", () => {
  const pack = drawPack({
    rng: createSeededRng(1),
    forceKind: "gold_pack",
  });
  assert.equal(pack.kind, "gold_pack");
  assert.equal(pack.cards.length, 5);
  for (const c of pack.cards) {
    assert.equal(c.rarity, "legendary");
  }
});

test("forced fifth rarities pick from that pool only", () => {
  const rarities = ["rare", "epic", "legendary", "gold", "diamond"] as const;
  for (const rarity of rarities) {
    const pack = drawPack({
      rng: createSeededRng(7),
      forceKind: "standard",
      forceFifthRarity: rarity,
    });
    assert.equal(pack.cards[4]!.rarity, rarity);
  }
});

test("fifth-card interval edges select expected rarities", () => {
  const intervals = buildFifthCardIntervals();
  for (const interval of intervals) {
    const mid = (interval.start + interval.end) / 2;
    let called = 0;
    const rng = () => {
      called += 1;
      // forceKind=standard skips gold-pack roll: 4 commons then fifth rarity
      if (called <= 4) return 0.1;
      return mid;
    };
    const pack = drawPack({ rng, forceKind: "standard" });
    assert.equal(pack.cards[4]!.rarity, interval.rarity);
  }
});

test("duplicates allowed within a pack", () => {
  // Always pick first common / first legendary via rng=0
  const pack = drawPack({
    forceKind: "gold_pack",
    rng: () => 0,
  });
  const ids = pack.cards.map((c) => c.cardId);
  assert.equal(new Set(ids).size, 1);
});

test("finalizeOpen is idempotent and credits once", () => {
  const open: ActiveOpen = {
    openId: "test-open-1",
    kind: "standard",
    cards: [
      { cardId: "card-001", rarity: "common", slot: 0 },
      { cardId: "card-002", rarity: "common", slot: 1 },
      { cardId: "card-001", rarity: "common", slot: 2 },
      { cardId: "card-003", rarity: "common", slot: 3 },
      { cardId: "card-021", rarity: "rare", slot: 4 },
    ],
    phase: "summary",
    revealed: [true, true, true, true, true],
    currentIndex: 5,
    createdAt: 1,
    finalized: false,
  };
  let save = emptySave();
  save = finalizeOpen(save, open, 1000);
  assert.equal(save.collection["card-001"]?.qty, 2);
  assert.equal(save.stats.boostersOpened, 1);
  assert.equal(save.finalizedOpenIds.includes("test-open-1"), true);

  const again = finalizeOpen(save, { ...open, finalized: false }, 2000);
  assert.equal(again.collection["card-001"]?.qty, 2);
  assert.equal(again.stats.boostersOpened, 1);
});

test("simulation finalize does not credit collection", () => {
  const open: ActiveOpen = {
    openId: "sim-1",
    kind: "gold_pack",
    cards: Array.from({ length: 5 }, (_, slot) => ({
      cardId: "card-037",
      rarity: "legendary" as Rarity,
      slot,
    })),
    phase: "summary",
    revealed: [true, true, true, true, true],
    currentIndex: 5,
    createdAt: 1,
    finalized: false,
    simulation: true,
  };
  const save = finalizeOpen(emptySave(), open);
  assert.deepEqual(save.collection, {});
  assert.equal(save.stats.boostersOpened, 0);
});

test("parseSave recovers from invalid data", () => {
  assert.equal(parseSave(null).schemaVersion, 1);
  assert.equal(
    parseSave({ collection: { bad: true } }).collection["bad"],
    undefined,
  );
});

test("local repository round-trip", () => {
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
  const repo = createLocalCardsRepository(storage);
  const save = emptySave();
  save.collection["card-001"] = {
    qty: 3,
    firstAcquiredAt: 1,
    lastAcquiredAt: 2,
  };
  repo.save(save);
  assert.equal(repo.load().collection["card-001"]?.qty, 3);
  repo.clear();
  assert.equal(Object.keys(repo.load().collection).length, 0);
});

test("gold pack probability constant matches 1/20000 scale", () => {
  assert.ok(Math.abs(GOLD_PACK_PROBABILITY - 1 / 20000) < 1e-12);
});

test("Horizons has 60 distinct cards and the same draw rarity rules", () => {
  assert.equal(HORIZONS_CATALOG.length, 60);
  assert.equal(new Set(CATALOG.map((card) => card.id)).size, 100);
  const counts = [30, 15, 9, 3, 2, 1];
  RARITIES.forEach((rarity, index) =>
    assert.equal(cardsByRarity(rarity, "horizons").length, counts[index]),
  );
  for (const rarity of [
    "rare",
    "epic",
    "legendary",
    "gold",
    "diamond",
  ] as const) {
    const pack = drawPack({
      setId: "horizons",
      rng: createSeededRng(17),
      forceKind: "standard",
      forceFifthRarity: rarity,
    });
    assert.ok(
      pack.cards.every((card) =>
        HORIZONS_CATALOG.some((entry) => entry.id === card.cardId),
      ),
    );
    assert.deepEqual(
      pack.cards.map((card) => card.rarity),
      ["common", "common", "common", "common", rarity],
    );
  }
});
