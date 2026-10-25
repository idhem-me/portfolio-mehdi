import { test } from "node:test";
import assert from "node:assert/strict";
import {
  safeGamePath,
  googleIdentity,
  suggestedNickname,
} from "../auth/identity";
import {
  saveDraft,
  recoverDraft,
  clearDraft,
  type ScoreDraft,
} from "../auth/draft";
function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}
test("OAuth return paths cannot escape the game or change origin", () => {
  for (const path of [
    "https://evil.test",
    "//evil.test",
    "/api/tetris",
    "/jeux/tetris?next=https://evil.test",
  ])
    assert.equal(safeGamePath(path), "/jeux/tetris");
  assert.equal(safeGamePath("/en/jeux/tetris"), "/en/jeux/tetris");
});
test("only verified Google identities choose account records; public suggestions never contain email addresses", () => {
  assert.equal(googleIdentity(null), null);
  assert.equal(
    googleIdentity({ id: "u", app_metadata: { provider: "email" } }),
    null,
  );
  assert.equal(
    googleIdentity({ id: "u", app_metadata: { provider: "google" } }),
    "google:u",
  );
  assert.equal(suggestedNickname({ full_name: "Mehdi Designer" }), "Mehdi");
  assert.equal(suggestedNickname({}), "Joueur");
});
test("an ended game survives retries until acknowledged, with no trusted score data", () => {
  const port = storage(),
    draft: ScoreDraft = {
      run: { id: "a".repeat(64), seed: 42, steps: ["hard", 16] },
      name: "Mehdi",
      summary: {
        score: 50,
        lines: 0,
        level: 1,
        pieces: 1,
        elapsed: 16,
        best: 50,
      },
    };
  assert.equal(saveDraft(draft, port), true);
  assert.deepEqual(recoverDraft(port), draft);
  assert.deepEqual(recoverDraft(port), draft);
  saveDraft(draft, port);
  clearDraft(port);
  assert.equal(recoverDraft(port), null);
  port.setItem("lava-pending-score-v1", JSON.stringify({ created: 0, draft }));
  assert.equal(recoverDraft(port), null);
});
test("blocked storage never redirects away from an unsaved game", () => {
  assert.equal(
    saveDraft({} as ScoreDraft, {
      getItem: () => null,
      setItem: () => {
        throw Error();
      },
      removeItem: () => {},
    }),
    false,
  );
});

test("draft retries cannot erase or replace an already selected recipient", () => {
  const port = storage();
  const draft: ScoreDraft = {
    run: { id: "a".repeat(64), seed: 1, steps: ["hard"] },
    name: "Alice",
    summary: { score: 1, lines: 0, level: 1, pieces: 1, elapsed: 0, best: 1 },
    recipient: "b".repeat(64),
  };
  assert.equal(saveDraft(draft, port), true);
  saveDraft({ ...draft, recipient: undefined }, port);
  assert.equal(recoverDraft(port)?.recipient, draft.recipient);
  saveDraft({ ...draft, recipient: "c".repeat(64) }, port);
  assert.equal(recoverDraft(port)?.recipient, draft.recipient);
});

test("a late acknowledgement cannot delete a newer pending game", () => {
  const port = storage();
  const draft: ScoreDraft = {
    run: { id: "b".repeat(64), seed: 1, steps: ["hard"] },
    name: "Alice",
    summary: { score: 1, lines: 0, level: 1, pieces: 1, elapsed: 0, best: 1 },
  };
  saveDraft(draft, port);
  clearDraft(port, "a".repeat(64));
  assert.deepEqual(recoverDraft(port), draft);
  clearDraft(port, draft.run.id);
  assert.equal(recoverDraft(port), null);
});
