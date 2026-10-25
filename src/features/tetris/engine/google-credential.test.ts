import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";

test("official Google credentials reuse Supabase SSR, validate nonce and keep session tokens HttpOnly", async () => {
  const before = { ...process.env };
  const originalFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_ENABLE_TETRIS = "true";
  process.env.NEXT_PUBLIC_ENABLE_TETRIS_LEADERBOARD = "true";
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  process.env.GOOGLE_CLIENT_ID = "existing.apps.googleusercontent.com";
  const calls: Array<Record<string, unknown>> = [];
  try {
    const { GET, POST } =
      await import("../../../app/api/tetris/auth/credential/route");
    const config = await GET(
      new NextRequest("http://localhost:3000/api/tetris/auth/credential"),
    );
    const data = await config.json();
    assert.equal(data.clientId, process.env.GOOGLE_CLIENT_ID);
    const cookie = config.cookies.get("lava-google-nonce")!;
    assert.equal(
      data.nonce,
      createHash("sha256").update(cookie.value).digest("hex"),
    );
    assert.match(config.headers.get("set-cookie")!, /HttpOnly/i);
    const request = (nonce: string, origin = "http://localhost:3000") =>
      new NextRequest("http://localhost:3000/api/tetris/auth/credential", {
        method: "POST",
        headers: {
          host: "localhost:3000",
          origin,
          cookie: `lava-google-nonce=${cookie.value}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ credential: "google-id-token", nonce }),
      });
    globalThis.fetch = async (_url, init) => {
      calls.push(JSON.parse(init!.body as string));
      const token = `e30.${Buffer.from(JSON.stringify({ sub: "account", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`;
      return Response.json({
        access_token: token,
        refresh_token: "private-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
        user: {
          id: "account",
          app_metadata: { provider: "google" },
          user_metadata: { name: "Alice" },
          aud: "authenticated",
          created_at: new Date().toISOString(),
        },
      });
    };
    assert.equal(
      (await POST(request(data.nonce, "https://evil.test"))).status,
      403,
    );
    assert.equal((await POST(request("f".repeat(64)))).status, 403);
    assert.equal(calls.length, 0);
    const response = await POST(request(data.nonce));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(calls[0].provider, "google");
    assert.equal(calls[0].id_token, "google-id-token");
    assert.equal(calls[0].nonce, cookie.value);
    assert.match(response.headers.get("set-cookie")!, /lava-auth/);
    assert.match(response.headers.get("set-cookie")!, /HttpOnly/i);
    assert.match(response.headers.get("set-cookie")!, /Path=\/api\/tetris/);
    const missing = new NextRequest(
      "http://localhost:3000/api/tetris/auth/credential",
      {
        method: "POST",
        headers: { host: "localhost:3000", origin: "http://localhost:3000" },
        body: JSON.stringify({
          credential: "google-id-token",
          nonce: data.nonce,
        }),
      },
    );
    assert.equal((await POST(missing)).status, 403);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of [
      "NEXT_PUBLIC_ENABLE_TETRIS",
      "NEXT_PUBLIC_ENABLE_TETRIS_LEADERBOARD",
      "SUPABASE_URL",
      "SUPABASE_PUBLISHABLE_KEY",
      "GOOGLE_CLIENT_ID",
    ]) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
});
