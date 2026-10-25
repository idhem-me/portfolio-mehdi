import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { RemoteLeaderboardStore } from "../server/remote-store";
import { Game } from "./game";
import { seeded, type Step } from "./replay";
function finished(seed: number) {
  const game = new Game(seeded(seed)),
    steps: Step[] = [];
  while (!game.over) {
    steps.push("hard");
    game.action("hard");
  }
  return { game, steps };
}
test("libSQL adapter derives scores, validates ownership and persists across independent connections", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lava-libsql-")),
    url = `file:${join(directory, "scores.db")}`;
  const first = createClient({ url }),
    second = createClient({ url });
  try {
    const a = new RemoteLeaderboardStore(first),
      b = new RemoteLeaderboardStore(second);
    const session = await a.session("alice"),
      { game, steps } = finished(session.seed);
    await assert.rejects(() => b.submit("bob", session.id, "Bob", steps));
    await assert.rejects(() =>
      a.submit("alice", session.id, "<script>", steps),
    );
    await assert.rejects(() =>
      b.submit("alice", session.id, "Alice", ["hard"]),
    );
    assert.equal((await a.list()).length, 0);
    assert.deepEqual(await b.submit("alice", session.id, "Alice", steps), {
      score: game.score,
      lines: game.lines,
    });
    first.close();
    assert.equal((await b.list())[0].score, game.score);
    await assert.rejects(() => b.submit("alice", session.id, "Alice", steps));
    const next = await b.session("alice");
    await b.submit("alice", next.id, "Alice", finished(next.seed).steps);
    assert.equal((await b.list()).length, 1);
  } finally {
    first.close();
    second.close();
    await rm(directory, { recursive: true, force: true });
  }
});
test("libSQL adapter expires sessions, limits starts and filters old scores", async () => {
  const client = createClient({ url: ":memory:" }),
    db = new RemoteLeaderboardStore(client);
  try {
    const s = await db.session("alice");
    await client.execute("UPDATE sessions SET created=0");
    await assert.rejects(() =>
      db.submit("alice", s.id, "Alice", finished(s.seed).steps),
    );
    for (let i = 0; i < 10; i++) await db.session("bob");
    await assert.rejects(() => db.session("bob"));
    await client.execute({
      sql: "INSERT INTO scores VALUES (?,?,?,?,?)",
      args: ["old", "Ancien", 1000, 10, 0],
    });
    assert.equal((await db.list()).length, 0);
  } finally {
    client.close();
  }
});
test("Vercel never silently falls back to an ephemeral local database", async () => {
  const original = {
    VERCEL: process.env.VERCEL,
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
  };
  try {
    process.env.VERCEL = "1";
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;
    const { store } = await import("../server/store");
    await assert.rejects(() => store(), /base distante persistante/);
    process.env.TURSO_DATABASE_URL = "libsql://example.turso.io";
    await assert.rejects(() => store(), /incomplète/);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
