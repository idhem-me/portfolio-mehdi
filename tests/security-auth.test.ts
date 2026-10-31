import { NextRequest } from "next/server";
import { POST as cardsAccount } from "../src/app/api/tetris/cards/account/route";
import { test } from "node:test";
import assert from "node:assert/strict";
import { POST as login } from "../src/app/api/dashboard/login/route";
import { POST as logout } from "../src/app/api/dashboard/logout/route";
import { GET as stats } from "../src/app/api/backoffice/stats/route";
import { GET as sessions } from "../src/app/api/backoffice/sessions/route";
import { GET as detail } from "../src/app/api/backoffice/sessions/[id]/route";
import { GET as summary } from "../src/app/api/analytics/summary/route";
import { isValidDashboardToken, hashToken } from "../src/lib/dashboard-auth";
import {
  POST as visitorInit,
  DELETE as visitorDelete,
} from "../src/app/api/backoffice/me/route";
import { POST as track } from "../src/app/api/track/route";

const origin = "https://portfolio.example";
const req = (path: string, body?: unknown, cookie?: string) =>
  new Request(origin + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      origin,
      host: "portfolio.example",
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

test("handlers reject fabricated consent; admin sessions expire and logout revokes copied cookies", async () => {
  const env = { ...process.env };
  const originalFetch = global.fetch;
  process.env.SUPABASE_URL = "https://security-test.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_test_only";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_only";
  process.env.DASHBOARD_PASSWORD = "test-password-only-strong";
  process.env.SECURITY_HASH_KEY = "test-only-hmac-key-with-at-least-32-chars";
  const records = new Map<
    string,
    { token_hash: string; credential_version: string; expires_at: string }
  >();
  const budgets = new Map<string, number>();
  const visitors = new Map<string, string>();
  let trackWrites = 0;
  let databaseRequests = 0;
  let deletedId: string | null = null;
  global.fetch = async (input, init) => {
    databaseRequests++;
    const url = new URL(String(input));
    assert.equal(
      url.origin,
      "https://security-test.supabase.co",
      "tests must not contact any real project",
    );
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    const response = (value: unknown, status = 200) =>
      new Response(JSON.stringify(value), {
        status,
        headers: { "content-type": "application/json" },
      });
    if (url.pathname.endsWith("/rpc/security_consume_budget")) {
      const count = (budgets.get(body.p_key) || 0) + 1;
      budgets.set(body.p_key, count);
      return response(count <= body.p_max);
    }
    if (url.pathname.endsWith("/security_sessions")) {
      if (init?.method === "POST") {
        records.set(body.token_hash, body);
        return response(null, 201);
      }
      const key = url.searchParams.get("token_hash")?.slice(3) ?? "";
      if (init?.method === "DELETE") {
        records.delete(key);
        return response(null);
      }
      const row = records.get(key);
      return response(
        row &&
          row.credential_version ===
            url.searchParams.get("credential_version")?.slice(3) &&
          row.expires_at > new Date().toISOString()
          ? [row]
          : [],
      );
    }
    if (url.pathname.endsWith("/security_visitors")) {
      if (init?.method === "POST") {
        const id = "11111111-1111-4111-8111-111111111111";
        visitors.set(body.token_hash, id);
        return response({ visitor_id: id }, 201);
      }
      const id = visitors.get(
        url.searchParams.get("token_hash")?.slice(3) ?? "",
      );
      return response(id ? [{ visitor_id: id }] : []);
    }
    if (url.pathname.endsWith("/rpc/security_delete_visitor")) {
      deletedId = visitors.get(body.p_hash) ?? null;
      visitors.delete(body.p_hash);
      return response(null);
    }
    if (url.pathname.endsWith("/rpc/apply_session_delta")) {
      trackWrites++;
      return response(null);
    }
    throw new Error("Unexpected test request: " + url.pathname);
  };
  try {
    const initialRequests = databaseRequests;
    assert.equal(
      await isValidDashboardToken("a".repeat(64) + "." + "b".repeat(64)),
      false,
    );
    assert.equal(
      databaseRequests,
      initialRequests,
      "forged signatures must not query the database",
    );
    const consent = "analytics_consent=granted";
    const legacy = await cardsAccount(
      new NextRequest(
        req("/api/tetris/cards/account", {
          action: "state",
          legacySave: { collection: {} },
        }),
      ),
    );
    assert.equal(legacy.status, 410);
    assert.match(await legacy.text(), /fermé/);
    assert.equal(
      (await stats(req("/api/backoffice/stats", undefined, consent)))!.status,
      401,
    );
    assert.equal(
      (await sessions(req("/api/backoffice/sessions", undefined, consent)))!
        .status,
      401,
    );
    assert.equal(
      (await detail(req("/api/backoffice/sessions/x", undefined, consent), {
        params: Promise.resolve({ id: "x" }),
      }))!.status,
      401,
    );
    assert.equal(
      (await summary(req("/api/analytics/summary", undefined, consent)))!
        .status,
      401,
    );
    const success = await login(
      req("/api/dashboard/login", { password: process.env.DASHBOARD_PASSWORD }),
    );
    assert.equal(success.status, 200);
    const cookie = success.headers.get("set-cookie")!.split(";")[0];
    const token = cookie.split("=")[1];
    assert.notEqual(token, hashToken(process.env.DASHBOARD_PASSWORD!));
    assert.equal(await isValidDashboardToken(token), true);
    const row = records.get(hashToken(token))!;
    row.expires_at = new Date(Date.now() - 1000).toISOString();
    assert.equal(await isValidDashboardToken(token), false);
    row.expires_at = new Date(Date.now() + 60000).toISOString();
    const oldPassword = process.env.DASHBOARD_PASSWORD;
    process.env.DASHBOARD_PASSWORD = "different-test-password-strong";
    assert.equal(await isValidDashboardToken(token), false);
    process.env.DASHBOARD_PASSWORD = oldPassword;
    assert.equal(
      (await logout(req("/api/dashboard/logout", {}, cookie))).status,
      200,
    );
    assert.equal(await isValidDashboardToken(token), false);
    assert.equal(
      await isValidDashboardToken(hashToken(process.env.DASHBOARD_PASSWORD!)),
      false,
    );
    const crossSite = new Request(origin + "/api/dashboard/login", {
      method: "POST",
      headers: {
        origin: "https://attacker.example",
        host: "portfolio.example",
      },
      body: "{}",
    });
    assert.equal((await login(crossSite)).status, 403);
    for (let i = 0; i < 4; i++)
      await login(req("/api/dashboard/login", { password: "wrong" }));
    assert.equal(
      (await login(req("/api/dashboard/login", { password: "wrong" }))).status,
      429,
    );
    const init = await visitorInit(req("/api/backoffice/me", {}, consent));
    assert.equal(init.status, 200);
    const privateCookie = init.headers.get("set-cookie")!.split(";")[0];
    assert.match(init.headers.get("set-cookie")!, /HttpOnly/);
    const batch = {
      visitor_id: "22222222-2222-4222-8222-222222222222",
      session_id: "33333333-3333-4333-8333-333333333333",
      batch_id: "44444444-4444-4444-8444-444444444444",
      delta: { clicks: 1 },
      pages: { "/": 1 },
      games: [],
    };
    assert.equal((await track(req("/api/track", batch, consent))).status, 401);
    assert.equal(
      (await track(req("/api/track", batch, consent + ";" + privateCookie)))
        .status,
      403,
    );
    assert.equal(trackWrites, 0);
    batch.visitor_id = "11111111-1111-4111-8111-111111111111";
    assert.equal(
      (await track(req("/api/track", batch, consent + ";" + privateCookie)))
        .status,
      200,
    );
    assert.equal(trackWrites, 1);
    const deletion = new Request(origin + "/api/backoffice/me", {
      method: "DELETE",
      headers: {
        origin,
        host: "portfolio.example",
        cookie: privateCookie,
        "x-visitor-id": "22222222-2222-4222-8222-222222222222",
      },
    });
    assert.equal((await visitorDelete(deletion)).status, 204);
    assert.equal(deletedId, "11111111-1111-4111-8111-111111111111");
    global.fetch = async () => {
      throw new Error("outage-with-sensitive-details");
    };
    const failure = await login(
      req("/api/dashboard/login", { password: "wrong" }),
    );
    assert.equal(failure.status, 503);
    assert.doesNotMatch(await failure.text(), /outage|sensitive|supabase/);
  } finally {
    global.fetch = originalFetch;
    for (const key of Object.keys(process.env))
      if (!(key in env)) delete process.env[key];
    Object.assign(process.env, env);
  }
});
