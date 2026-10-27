import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
const origin = "http://localhost:3000";
const cookies = new Map();
let user;
async function request(body, expect = 200) {
  const response = await fetch(origin + "/api/tetris/cards/account", {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
    },
    body: JSON.stringify(body),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(";");
    const index = pair.indexOf("=");
    cookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
  const data = await response.json();
  if (expect !== null) assert.equal(response.status, expect, data.error);
  Object.defineProperty(data, "httpStatus", { value: response.status });
  return data;
}
const action = (
  action,
  payload = {},
  requestId = crypto.randomUUID(),
  expect = 200,
) => request({ action, payload, requestId }, expect);
try {
  let result = await request({ action: "state" });
  user = result.user.id;
  assert.equal(result.user.anonymous, true);
  assert.equal(result.profile.credits, 0);
  const id = crypto.randomUUID();
  result = await action("grant_credits", { id: "credits-50000" }, id);
  assert.equal(result.profile.credits, 50000);
  result = await action("grant_credits", { id: "credits-50000" }, id);
  assert.equal(result.profile.credits, 50000);
  result = await action("buy_boosters", { id: "boosters-500" });
  assert.equal(result.profile.credits, 0);
  assert.equal(result.profile.boosters_to_open, 500);
  await action("buy_boosters", { id: "boosters-1" }, crypto.randomUUID(), 400);
  result = await action("consume_booster", { setId: "horizons", quantity: 10 });
  assert.equal(result.profile.free_boosters, 0);
  assert.equal(result.profile.boosters_to_open, 500);
  assert.equal(result.save.activeOpen.cards.length, 50);
  for (let i = 0; i < 10; i++) {
    const cards = result.save.activeOpen.cards.slice(i * 5, i * 5 + 5);
    if (result.save.activeOpen.batchKinds[i] === "standard") {
      assert(cards.slice(0, 4).every((c) => c.rarity === "common"));
      assert.notEqual(cards[4].rarity, "common");
    }
  }
  const openId = result.save.activeOpen.openId;
  await action("phase", { openId, phase: "revealing" });
  await action("discover", { openId, index: 0 });
  result = await action("finish", { openId });
  assert.equal(result.save.stats.boostersOpened, 10);
  assert.equal(
    Object.values(result.save.collection).reduce((n, e) => n + e.qty, 0),
    50,
  );
  result = await action("finish", { openId });
  assert.equal(result.save.stats.boostersOpened, 10);
  result = await request({ action: "state" });
  assert.equal(result.save.activeOpen.phase, "summary");
  assert(result.save.activeOpen.discovered.includes(0));
  await action("grant_credits", { id: "credits-50000" });
  result = await action("buy_cosmetic", { id: "frame-shiny" });
  await action("buy_cosmetic", { id: "frame-shiny" }, crypto.randomUUID(), 400);
  result = await action("buy_cosmetic", { id: "theme-blue" });
  await action("buy_cosmetic", { id: "custom-avatar" });
  result = await action("equip", { theme: "blue", frame: "frame-shiny" });
  assert.equal(result.profile.theme, "blue");
  const form = new FormData();
  form.set(
    "avatar",
    new Blob([await fs.readFile("public/cosmetics/frames/gold.png")], {
      type: "image/png",
    }),
    "avatar.png",
  );
  const uploaded = await fetch(origin + "/api/tetris/cards/avatar", {
    method: "POST",
    headers: {
      origin,
      cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
    },
    body: form,
  });
  const uploadText = await uploaded.text();
  if (uploaded.status !== 200) {
    await fs.writeFile("/tmp/cards-upload-error.txt", uploadText);
    console.log(uploadText.slice(0, 2000));
  }
  assert.equal(uploaded.status, 200, uploadText.slice(0, 1000));
  const image = await fetch(origin + "/api/tetris/cards/avatar", {
    headers: { cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; ") },
  });
  assert.equal(image.status, 200);
  const metadata = await sharp(
    Buffer.from(await image.arrayBuffer()),
  ).metadata();
  assert.equal(metadata.width, 512);
  assert.equal(metadata.height, 512);
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.exif, undefined);
  await action("grant_credits", { id: "credits-50000" });
  const competing = await Promise.all(
    [1, 2].map(() =>
      request(
        {
          action: "buy_boosters",
          payload: { id: "boosters-500" },
          requestId: crypto.randomUUID(),
        },
        null,
      ),
    ),
  );
  assert.deepEqual(
    competing.map((value) => value.httpStatus).sort(),
    [200, 400],
  );
  const afterRace = await request({ action: "state" });
  assert.equal(afterRace.profile.boosters_to_open, 1000);
  assert(afterRace.profile.credits >= 0);
  const outsider = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const guest = await outsider.auth.signInAnonymously();
  assert.equal(guest.error, null);
  const outsiderId = guest.data.user.id;
  try {
    const foreign = await outsider
      .from("profiles")
      .select("user_id")
      .eq("user_id", user);
    assert.deepEqual(foreign.data, []);
    const write = await outsider
      .from("profiles")
      .update({ credits: 999999 })
      .eq("user_id", user);
    assert(write.error);
    const privateImage = await outsider.storage
      .from("avatars")
      .download(`${user}/avatar.webp`);
    assert(privateImage.error);
    const imported = await outsider.rpc("cards_import_legacy_for", {
      owner_id: user,
      candidate: {},
    });
    assert(imported.error);
  } finally {
    const admin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    );
    await admin.auth.admin.deleteUser(outsiderId);
  }
  console.log(
    "OK: session invité, achats, idempotence, solde, 10 boosters ordonnés, récapitulatif, reprise, cosmétiques, thème et avatar privé WebP 512.",
  );
} finally {
  if (user) {
    const admin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    );
    await admin.storage.from("avatars").remove([`${user}/avatar.webp`]);
    const result = await admin.auth.admin.deleteUser(user);
    if (result.error) throw result.error;
  }
}
