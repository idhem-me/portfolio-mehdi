import test from "node:test";
import assert from "node:assert/strict";
import * as shared from "../../src/features/account/client-store";
import * as legacy from "../../src/features/tetris/profile/client-store";
import { safeGamePath } from "../../src/features/tetris/auth/identity";
import { NextRequest } from "next/server";
test("all games share the canonical profile store, including photo and stable identity", async () => {
  assert.equal(shared.saveProfile, legacy.saveProfile);
  assert.equal(shared.identitySnapshot, legacy.identitySnapshot);
  const storageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  const cache = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => cache.get(key) ?? null,
      setItem: (key: string, v: string) => cache.set(key, v),
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { onLine: false },
  });
  try {
    const profile = await shared.saveProfile(
      "Profil commun",
      "/test-avatar.png",
    );
    assert.equal(legacy.identitySnapshot().profile?.key, profile.key);
    assert.equal(legacy.identitySnapshot().profile?.avatar, "/test-avatar.png");
    const renamed = await legacy.saveProfile("Nouveau nom", "/photo.png");
    assert.equal(shared.identitySnapshot().profile?.name, "Nouveau nom");
    assert.equal(renamed.key, profile.key);
    assert.equal(shared.identitySnapshot().profile?.avatar, "/photo.png");
  } finally {
    if (storageDescriptor)
      Object.defineProperty(globalThis, "localStorage", storageDescriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
    if (navigatorDescriptor)
      Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});
test("account APIs remain available when the Tetris game and leaderboard are disabled", async () => {
  const before = { ...process.env };
  process.env.NEXT_PUBLIC_ENABLE_TETRIS = "false";
  process.env.NEXT_PUBLIC_ENABLE_TETRIS_LEADERBOARD = "false";
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  delete process.env.SUPABASE_ANON_KEY;
  try {
    const { GET } = await import("../../src/app/api/tetris/auth/route");
    const response = await GET(
      new NextRequest("http://localhost:3000/api/tetris/auth"),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      googleAvailable: false,
      user: null,
    });
  } finally {
    for (const key of [
      "NEXT_PUBLIC_ENABLE_TETRIS",
      "NEXT_PUBLIC_ENABLE_TETRIS_LEADERBOARD",
      "SUPABASE_URL",
      "SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_ANON_KEY",
    ]) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
});
test("OAuth accepts Clicker Burger return paths without allowing external redirects", () => {
  assert.equal(safeGamePath("/jeux/clicker-burger"), "/jeux/clicker-burger");
  assert.equal(
    safeGamePath("/en/jeux/clicker-burger"),
    "/en/jeux/clicker-burger",
  );
  assert.equal(safeGamePath("//evil.test"), "/jeux/tetris");
});
