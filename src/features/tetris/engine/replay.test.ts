import { test } from "node:test";
import assert from "node:assert/strict";
import { Game } from "./game";
import { seeded, verifyReplay, type Step } from "./replay";
import { LeaderboardStore } from "../server/store";
function finished(seed: number) {
  const g = new Game(seeded(seed)),
    steps: Step[] = [];
  while (!g.over) {
    steps.push("hard");
    g.action("hard");
  }
  return { g, steps };
}
test("seeded bags and complete replay produce the exact final state", () => {
  const { g, steps } = finished(42);
  const verified = verifyReplay(42, [0, ...steps]);
  assert.equal(verified.score, g.score);
  assert.deepEqual(verified.board, g.board);
  assert.deepEqual(new Game(seeded(10)).next, new Game(seeded(10)).next);
});
test("reject unfinished, unknown, infinite and post-game replay operations", () => {
  for (const steps of [[], ["hack"], [Infinity], [51], ["hard"]])
    assert.throws(() => verifyReplay(42, steps));
  assert.throws(() => verifyReplay(42, [...finished(42).steps, "hard"]));
});
test("SQLite stores server-derived scores, rejects ownership/reuse and retains one personal best", () => {
  const db = new LeaderboardStore(":memory:");
  try {
    const session = db.session("alice");
    const { g, steps } = finished(session.seed);
    assert.throws(() => db.submit("bob", session.id, "Bob", steps));
    assert.throws(() => db.submit("alice", session.id, "<script>", steps));
    assert.throws(() => db.submit("alice", session.id, "Alice", ["hard"]));
    assert.equal(db.list().length, 0);
    assert.deepEqual(db.submit("alice", session.id, "Alice", steps), {
      score: g.score,
      lines: g.lines,
    });
    assert.equal(db.list()[0].score, g.score);
    assert.throws(() => db.submit("alice", session.id, "Alice", steps));
    const second = db.session("alice");
    db.submit("alice", second.id, "Alice", finished(second.seed).steps);
    assert.equal(db.list().length, 1);
  } finally {
    db.db.close();
  }
});
test("session expiration, ranked ties, and per-player start rate limits", () => {
  const db = new LeaderboardStore(":memory:");
  try {
    const s = db.session("alice");
    db.db.prepare("UPDATE sessions SET created=0").run();
    assert.throws(() =>
      db.submit("alice", s.id, "Alice", finished(s.seed).steps),
    );
    for (let i = 0; i < 10; i++) db.session("bob");
    assert.throws(() => db.session("bob"));
    db.db
      .prepare("INSERT INTO scores VALUES (?,?,?,?,?)")
      .run("a", "Alice", 100, 1, Date.now());
    db.db
      .prepare("INSERT INTO scores VALUES (?,?,?,?,?)")
      .run("b", "Bob", 100, 1, Date.now());
    assert.deepEqual(
      db.list().map((r) => r.rank),
      [1, 1],
    );
  } finally {
    db.db.close();
  }
});
