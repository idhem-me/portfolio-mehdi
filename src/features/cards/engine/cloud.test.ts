import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LocalProgressStore,
  ProgressConflict,
  SupabaseProgressStore,
} from "../server/progress-store";
import { validateCloudSave } from "../server/validation";
import { emptySave } from "../persistence/types";
import { progressSignature, cloudSnapshot } from "../persistence/cloud-client";
import { safeGamePath } from "../../tetris/auth/identity";

test("cloud saves are private per owner and writes use optimistic revisions", async () => {
  const store = new LocalProgressStore(":memory:");
  try {
    assert.equal(await store.read("google:alice"), null);
    const save = emptySave();
    save.collection["card-001"] = {
      qty: 2,
      shinyQty: 1,
      firstAcquiredAt: 1,
      lastAcquiredAt: 1,
    };
    assert.equal((await store.write("google:alice", 0, save)).revision, 1);
    assert.equal(await store.read("google:bob"), null);
    await assert.rejects(
      () => store.write("google:alice", 0, emptySave()),
      ProgressConflict,
    );
    await assert.rejects(
      () => store.write("google:alice", 5, emptySave()),
      ProgressConflict,
    );
    const loaded = (await store.read("google:alice"))!;
    assert.equal(loaded.save.collection["card-001"]!.shinyQty, 1);
    assert.equal((await store.write("google:alice", 1, save)).revision, 2);
    await assert.rejects(
      () => store.write("google:alice", 1, emptySave()),
      ProgressConflict,
    );
  } finally {
    store.close();
  }
});
test("cloud validation rejects malformed counts, unknown cards and simulations", () => {
  const save = emptySave();
  assert.deepEqual(validateCloudSave(save).collection, {});
  assert.throws(() =>
    validateCloudSave({ ...save, boosters: { available: 11, updatedAt: 1 } }),
  );
  assert.throws(() =>
    validateCloudSave({
      ...save,
      collection: {
        unknown: { qty: 1, firstAcquiredAt: 1, lastAcquiredAt: 1 },
      },
    }),
  );
  assert.throws(() =>
    validateCloudSave({
      ...save,
      collection: {
        "card-001": {
          qty: 1,
          shinyQty: 2,
          firstAcquiredAt: 1,
          lastAcquiredAt: 1,
        },
      },
    }),
  );
  assert.throws(() =>
    validateCloudSave({
      ...save,
      stats: { ...save.stats, boostersOpened: -1 },
    }),
  );
  assert.throws(() =>
    validateCloudSave({ ...save, activeOpen: { simulation: true } }),
  );
});
test("stable signatures ignore key order and a full reserve timestamp", () => {
  const save = emptySave();
  const later = {
    ...save,
    boosters: { ...save.boosters, updatedAt: save.boosters.updatedAt + 10000 },
  };
  assert.equal(progressSignature(save), progressSignature(later));
  assert.equal(
    progressSignature(save),
    progressSignature({ ...save, collection: {}, stats: { ...save.stats } }),
  );
  assert.equal(cloudSnapshot(save).activeOpen, null);
});
test("Google returns to Cards but never to an external origin", () => {
  assert.equal(safeGamePath("/en/jeux/cards"), "/en/jeux/cards");
  assert.equal(safeGamePath("/jeux/cards"), "/jeux/cards");
  assert.equal(safeGamePath("//evil.test/jeux/cards"), "/jeux/tetris");
  assert.equal(
    safeGamePath("/jeux/cards?next=https://evil.test"),
    "/jeux/tetris",
  );
});
test("cloud adapter refuses public Supabase keys and non-HTTPS endpoints", () => {
  assert.throws(
    () =>
      new SupabaseProgressStore(
        "https://example.supabase.co",
        "sb_publishable_invalid",
      ),
  );
  assert.throws(
    () =>
      new SupabaseProgressStore(
        "http://example.supabase.co",
        "sb_secret_invalid",
      ),
  );
});

test("cloud migration denies browser roles and permits only server-side progress access", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { readFile } = await import("node:fs/promises");
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls;",
    );
    await db.exec(
      await readFile(
        "supabase/migrations/202610270001_cards_progress.sql",
        "utf8",
      ),
    );
    await db.exec("set role anon");
    await assert.rejects(() => db.query("select * from public.cards_progress"));
    await db.exec("reset role; set role authenticated");
    await assert.rejects(() => db.query("select * from public.cards_progress"));
    await db.exec("reset role; set role service_role");
    await db.query(
      "insert into public.cards_progress(owner,revision,data) values($1,1,$2)",
      ["a".repeat(64), JSON.stringify(emptySave())],
    );
    const result = await db.query<{ revision: number }>(
      "select revision from public.cards_progress",
    );
    assert.equal(Number(result.rows[0]!.revision), 1);
  } finally {
    await db.close();
  }
});
