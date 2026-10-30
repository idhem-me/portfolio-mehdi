import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
test("atomic deltas, idempotency, privacy permissions and revocation", async () => {
  const db = new PGlite();
  await db.exec(
    "create role anon;create role authenticated;create role service_role;",
  );
  await db.exec(
    readFileSync("supabase/migrations/20261030122415_backoffice.sql", "utf8"),
  );
  const visitor = "11111111-1111-4111-8111-111111111111",
    session = "22222222-2222-4222-8222-222222222222";
  const p = {
    visitor_id: visitor,
    session_id: session,
    batch_id: "33333333-3333-4333-8333-333333333333",
    delta: { clicks: 3 },
    pages: { "/": 2 },
    games: [],
  };
  await db.query("select apply_session_delta($1::jsonb,'FR')", [
    JSON.stringify(p),
  ]);
  await db.query("select apply_session_delta($1::jsonb,'FR')", [
    JSON.stringify(p),
  ]);
  let result = await db.query<{
    clicks: number;
    pages: Record<string, number>;
  }>("select clicks,pages from sessions");
  assert.equal(Number(result.rows[0].clicks), 3);
  assert.deepEqual(result.rows[0].pages, { "/": 2 });
  p.batch_id = "44444444-4444-4444-8444-444444444444";
  await db.query("select apply_session_delta($1::jsonb,'FR')", [
    JSON.stringify(p),
  ]);
  result = await db.query("select clicks,pages from sessions");
  assert.equal(Number(result.rows[0].clicks), 6);
  assert.deepEqual(result.rows[0].pages, { "/": 4 });
  await db.query("select backoffice_stats(now()-interval '7 days',now())");
  await db.query("select delete_backoffice_visitor($1::uuid)", [visitor]);
  p.batch_id = "55555555-5555-4555-8555-555555555555";
  await db.query("select apply_session_delta($1::jsonb,'FR')", [
    JSON.stringify(p),
  ]);
  assert.equal((await db.query("select * from sessions")).rows.length, 0);
  assert.equal(
    (
      await db.query<{ allowed: boolean }>(
        "select has_function_privilege('anon','apply_session_delta(jsonb,text)','execute') allowed",
      )
    ).rows[0].allowed,
    false,
  );
  await db.close();
});

test("distance thresholds and tracking stays inert without consent", async () => {
  const { distance } = await import("../src/components/backoffice/data");
  const { track } = await import("../src/lib/tracking/client");
  assert.match(distance(0, "fr"), /^0 cm$/);
  assert.match(distance(3780, "en"), /^1 m$/);
  assert.match(distance(378000, "en"), /100 m$/);
  assert.match(distance(3780000, "en"), /1 km$/);
  track.increment("clicks");
  track.game("tetris", 50);
  track.page("/");
  assert.deepEqual(track.snapshot().total, {});
});

test("origin checks use the public Host and preserve scheme and port boundaries", async () => {
  const { isSameOrigin } = await import("../src/lib/backoffice/request-origin");
  const request = (origin: string, host = "localhost:3000") =>
    new Request("http://0.0.0.0:3000/api/track", { headers: { origin, host } });
  assert.equal(isSameOrigin(request("http://localhost:3000")), true);
  assert.equal(
    isSameOrigin(request("http://127.0.0.1:3000", "127.0.0.1:3000")),
    true,
  );
  assert.equal(isSameOrigin(request("http://evil.example")), false);
  assert.equal(isSameOrigin(request("http://localhost:3001")), false);
  assert.equal(isSameOrigin(request("https://localhost:3000")), false);
  assert.equal(isSameOrigin(request("null")), false);
});

test("tracking accepts sparse deltas but rejects unknown and oversized counters", async () => {
  const { payload } = await import("../src/lib/backoffice/payload");
  const base = {
    visitor_id: "11111111-1111-4111-8111-111111111111",
    session_id: "22222222-2222-4222-8222-222222222222",
    batch_id: "33333333-3333-4333-8333-333333333333",
    pages: { "/backoffice/sessions": 1 },
    games: [],
  };
  assert.equal(
    payload.safeParse({ ...base, delta: { active_ms: 30000 } }).success,
    true,
  );
  assert.equal(payload.safeParse({ ...base, delta: {} }).success, true);
  assert.equal(
    payload.safeParse({ ...base, delta: { unknown: 1 } }).success,
    false,
  );
  assert.equal(
    payload.safeParse({ ...base, delta: { active_ms: 60001 } }).success,
    false,
  );
  assert.equal(
    payload.safeParse({ ...base, delta: { clicks: -1 } }).success,
    false,
  );
});
