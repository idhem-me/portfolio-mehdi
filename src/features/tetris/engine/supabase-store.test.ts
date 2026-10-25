import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { SupabaseLeaderboardStore } from "../server/supabase-store";
import { Game } from "./game";
import { seeded, type Step } from "./replay";
const migration = new URL(
  "../../../../supabase/migrations/202610250001_tetris_leaderboard.sql",
  import.meta.url,
);
async function setup() {
  const db = new PGlite();
  await db.exec(
    "create role anon;create role authenticated;create role service_role with bypassrls;",
  );
  const sql = await readFile(migration, "utf8");
  await db.exec(sql);
  await db.exec(sql); // rerunning is safe
  await db.exec("set role service_role");
  const calls: {
    name: string;
    args: Record<string, unknown>;
    headers: Headers;
  }[] = [];
  const store = new SupabaseLeaderboardStore(
    "https://test.supabase.co",
    "sb_secret_test",
    async (url, init) => {
      const name = new URL(url).pathname.split("/").at(-1)!,
        args = JSON.parse(init.body as string);
      calls.push({ name, args, headers: new Headers(init.headers) });
      try {
        let rows: unknown;
        if (name === "tetris_start_session") {
          await db.query("select public.tetris_start_session($1,$2,$3)", [
            args.p_id,
            args.p_owner,
            args.p_seed,
          ]);
          rows = null;
        } else if (name === "tetris_read_session")
          rows = (
            await db.query("select * from public.tetris_read_session($1,$2)", [
              args.p_id,
              args.p_owner,
            ])
          ).rows;
        else if (name === "tetris_commit_score") {
          await db.query("select public.tetris_commit_score($1,$2,$3,$4,$5)", [
            args.p_id,
            args.p_owner,
            args.p_name,
            args.p_score,
            args.p_lines,
          ]);
          rows = null;
        } else if (name === "tetris_leaderboard")
          rows = (await db.query("select * from public.tetris_leaderboard()"))
            .rows;
        else throw Error("Unexpected RPC");
        if (rows === null) return new Response(null, { status: 204 });
        return new Response(
          JSON.stringify(rows, (_, value) =>
            typeof value === "bigint" ? Number(value) : value,
          ),
          { status: 200 },
        );
      } catch (error) {
        return Response.json(
          {
            message: error instanceof Error ? error.message : "database error",
          },
          { status: 400 },
        );
      }
    },
  );
  return { db, store, calls };
}
function finish(seed: number) {
  const game = new Game(seeded(seed)),
    steps: Step[] = [];
  while (!game.over) {
    steps.push("hard");
    game.action("hard");
  }
  return { game, steps };
}
test("Supabase RPC + PostgreSQL migration verifies scores and prevents reused sessions", async () => {
  const { db, store, calls } = await setup();
  try {
    const session = await store.session("alice"),
      { game, steps } = finish(session.seed);
    await assert.rejects(() => store.submit("bob", session.id, "Bob", steps));
    await assert.rejects(() =>
      store.submit("alice", session.id, "<script>", steps),
    );
    await assert.rejects(() =>
      store.submit("alice", session.id, "Alice", ["hard"]),
    );
    assert.equal((await store.list()).length, 0);
    assert.deepEqual(await store.submit("alice", session.id, "Alice", steps), {
      score: game.score,
      lines: game.lines,
    });
    assert.equal((await store.list())[0].score, game.score);
    await assert.rejects(() =>
      store.submit("alice", session.id, "Alice", steps),
    );
    const commit = calls.find((call) => call.name === "tetris_commit_score")!;
    assert.equal(commit.args.p_score, game.score);
    assert.notEqual(commit.args.p_id, session.id);
    assert.notEqual(commit.args.p_owner, "alice");
    assert.equal(commit.headers.get("apikey"), "sb_secret_test");
    assert.equal(commit.headers.has("authorization"), false);
    const second = await store.session("alice");
    await store.submit("alice", second.id, "Alice", finish(second.seed).steps);
    assert.equal((await store.list()).length, 1);
  } finally {
    await db.close();
  }
});
test("Supabase permissions deny browser roles and failed score upserts roll back session claims", async () => {
  const { db, store, calls } = await setup();
  try {
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(
        () => db.query("select * from public.tetris_scores"),
        /permission denied/,
      );
      await assert.rejects(
        () => db.query("select * from public.tetris_leaderboard()"),
        /permission denied/,
      );
    }
    await db.exec("set role service_role");
    const session = await store.session("alice");
    const args = calls.find((c) => c.name === "tetris_start_session")!.args;
    await assert.rejects(() =>
      db.query("select public.tetris_commit_score($1,$2,$3,$4,$5)", [
        args.p_id,
        args.p_owner,
        "Alice",
        -1,
        0,
      ]),
    );
    const read = await db.query<{ used: boolean }>(
      "select used from public.tetris_read_session($1,$2)",
      [args.p_id, args.p_owner],
    );
    assert.equal(read.rows[0].used, false);
    await store.submit(
      "alice",
      session.id,
      "Alice",
      finish(session.seed).steps,
    );
    await assert.rejects(
      () =>
        db.query("select public.tetris_commit_score($1,$2,$3,$4,$5)", [
          args.p_id,
          args.p_owner,
          "Alice",
          999999,
          0,
        ]),
      /tetris_session_used/,
    );
  } finally {
    await db.close();
  }
});
test("Supabase sessions are rate limited and expired results stay out of the leaderboard", async () => {
  const { db, store } = await setup();
  try {
    for (let i = 0; i < 10; i++) await store.session("alice");
    await assert.rejects(() => store.session("alice"), /Patientez/);
    await db.exec("update public.tetris_sessions set created=0");
    const s = await store.session("bob");
    await db.exec("update public.tetris_sessions set created=0");
    await assert.rejects(() =>
      store.submit("bob", s.id, "Bob", finish(s.seed).steps),
    );
    await db.query("insert into public.tetris_scores values($1,$2,$3,$4,$5)", [
      "old",
      "Ancien",
      1000,
      10,
      0,
    ]);
    assert.deepEqual(await store.list(), []);
  } finally {
    await db.close();
  }
});
test("Supabase rejects public keys and keeps SDK details out of API errors", async () => {
  assert.throws(
    () =>
      new SupabaseLeaderboardStore(
        "https://test.supabase.co",
        "sb_publishable_test",
      ),
    /secrète/,
  );
  const db = new SupabaseLeaderboardStore(
    "https://test.supabase.co",
    "sb_secret_test",
    async () =>
      Response.json(
        { message: "private database connection details" },
        { status: 500 },
      ),
  );
  await assert.rejects(
    () => db.list(),
    (error) =>
      error instanceof Error &&
      !error.message.includes("private") &&
      error.message.includes("indisponible"),
  );
});

test("legacy service_role keys use Bearer while public JWTs are rejected", async () => {
  const key = (role: string) =>
    "eyJhbGciOiJIUzI1NiJ9." +
    Buffer.from(JSON.stringify({ role })).toString("base64url") +
    ".test";
  assert.throws(
    () => new SupabaseLeaderboardStore("https://test.supabase.co", key("anon")),
    /secrète/,
  );
  const legacy = key("service_role");
  const store = new SupabaseLeaderboardStore(
    "https://test.supabase.co",
    legacy,
    async (_url, init) => {
      assert.equal(
        new Headers(init.headers).get("Authorization"),
        `Bearer ${legacy}`,
      );
      return Response.json([]);
    },
  );
  assert.deepEqual(await store.list(), []);
});
test("configured Supabase is preferred over Turso and incomplete configuration is refused", async () => {
  const names = [
    "SUPABASE_URL",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "TURSO_DATABASE_URL",
  ] as const;
  const original = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );
  const cache = globalThis as typeof globalThis & { lavaStore?: unknown };
  try {
    delete cache.lavaStore;
    process.env.SUPABASE_URL = "https://test.supabase.co";
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.TURSO_DATABASE_URL = "libsql://unused";
    const { store } = await import("../server/store");
    await assert.rejects(() => store(), /Supabase incomplète/);
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
    assert.ok((await store()) instanceof SupabaseLeaderboardStore);
  } finally {
    delete cache.lavaStore;
    for (const name of names) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
  }
});
