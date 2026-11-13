import test from "node:test";
import assert from "node:assert/strict";
import {
  savePendingScore, listPendingScores, removePendingScore,
  saveDraft, recoverDraft, clearDraft, pendingScoreLimit, type ScoreDraft,
} from "../auth/draft";
function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}
function draft(index = 1): ScoreDraft {
  return {
    run: { id: index.toString(16).padStart(64, "0"), seed: 42, steps: ["hard", 16] },
    name: "Mehdi", recipient: "a".repeat(64),
    summary: { score: 50, lines: 0, level: 1, pieces: 1, elapsed: 16, best: 50 },
  };
}
test("acknowledging the auth/display draft preserves several requested publications", () => {
  const port = storage();
  saveDraft(draft(), port);
  assert.equal(savePendingScore(draft(), port), true);
  assert.equal(savePendingScore(draft(2), port), true);
  clearDraft(port);
  assert.equal(recoverDraft(port), null);
  assert.deepEqual(listPendingScores(port), [draft(), draft(2)]);
  assert.equal(removePendingScore(draft().run.id, port), true);
  assert.deepEqual(listPendingScores(port), [draft(2)]);
});
test("bounded pending storage refuses new runs without discarding existing requests", () => {
  const port = storage();
  for (let i = 1; i <= pendingScoreLimit; i++) assert.equal(savePendingScore(draft(i), port), true);
  assert.equal(savePendingScore(draft(6), port), false);
  assert.equal(listPendingScores(port).length, pendingScoreLimit);
  assert.equal(savePendingScore(draft(1), port), true);
});
test("a pending score retains its original recipient after an account change", () => {
  const port = storage();
  savePendingScore(draft(), port);
  savePendingScore({ ...draft(), recipient: "b".repeat(64) }, port);
  assert.equal(listPendingScores(port)[0].recipient, draft().recipient);
});
test("expired or invalid pending data never becomes an actionable score", () => {
  const port = storage();
  port.setItem("tetris.pending-scores.v1", JSON.stringify([
    { created: 0, draft: draft() },
    { created: Date.now(), draft: { ...draft(2), run: { ...draft(2).run, steps: ["invalid"] } } },
  ]));
  assert.deepEqual(listPendingScores(port), []);
  assert.equal(savePendingScore(draft(3), port), true);
});
test("blocked storage reports failure and corrupt storage is not silently overwritten", () => {
  const port = storage();
  assert.equal(savePendingScore(draft(), { ...port, setItem: () => { throw Error("quota"); } }), false);
  port.setItem("tetris.pending-scores.v1", "corrupt");
  assert.equal(savePendingScore(draft(), port), false);
  assert.equal(port.getItem("tetris.pending-scores.v1"), "corrupt");
});

test("device persistence works for connected accounts and blocked storage never claims success", async () => {
  const { loadProfile, saveDeviceScore, submitLocalScore, identitySnapshot } = await import("../profile/client-store");
  const originalFetch = globalThis.fetch;
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const port = storage();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: port });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { onLine: true } });
  globalThis.fetch = async (url) => Response.json(String(url).endsWith("/auth")
    ? { googleAvailable: true }
    : { name: "Mehdi", avatar: null, kind: "google", key: "a".repeat(64) });
  try {
    await loadProfile(true);
    const run = { ...draft().run, summary: draft().summary, recipient: draft().recipient, identity: "google" as const };
    await saveDeviceScore(run);
    await saveDeviceScore(run);
    assert.equal(identitySnapshot().scores.length, 1);
    assert.equal(identitySnapshot().scores[0].kind, "google");
    globalThis.fetch = async () => { throw Error("offline"); };
    assert.deepEqual(await submitLocalScore(run), { ok: false, reason: "network" });
    assert.deepEqual(await submitLocalScore({ ...run, recipient: "b".repeat(64) }), { ok: false, reason: "identity" });
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { ...port, setItem: () => { throw Error("quota"); } } });
    const other = { ...run, id: draft(2).run.id };
    await assert.rejects(saveDeviceScore(other));
    assert.deepEqual(await submitLocalScore(other), { ok: false, reason: "storage" });
  } finally {
    globalThis.fetch = originalFetch;
    if (oldStorage) Object.defineProperty(globalThis, "localStorage", oldStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
    if (oldNavigator) Object.defineProperty(globalThis, "navigator", oldNavigator);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});
