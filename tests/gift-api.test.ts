import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  creatorInput,
  reservationInput,
} from "../src/features/gift-lists/server/api";
import { isGiftPath, safeWebUrl } from "../src/features/gift-lists/types";
import { giftFixture } from "./helpers/gift-live";
import sharp from "sharp";
import { normalizeListImage } from "../src/features/gift-lists/server/cover-image";

test("list images are bounded, resized and re-encoded without metadata", async () => {
  const input = await sharp({
    create: { width: 1600, height: 900, channels: 3, background: "#c4b7a8" },
  })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Artist: "Private metadata" } } })
    .toBuffer();
  const result = await normalizeListImage(
    `data:image/jpeg;base64,${input.toString("base64")}`,
  );
  assert.match(result!, /^data:image\/webp;base64,/);
  const metadata = await sharp(
    Buffer.from(result!.split(",")[1], "base64"),
  ).metadata();
  assert.equal(metadata.format, "webp");
  assert.ok(metadata.width! <= 960 && metadata.height! <= 640);
  assert.equal(metadata.exif, undefined);
  assert.equal(await normalizeListImage(null), null);
  await assert.rejects(
    normalizeListImage(
      "data:image/png;base64," + Buffer.from("<svg></svg>").toString("base64"),
    ),
  );
  await assert.rejects(
    normalizeListImage("data:image/png;base64," + "a".repeat(250000)),
  );
});

test("gift API validation and privacy paths reject unsafe data", () => {
  const item = {
    title: "Vélo",
    url: null,
    image_url: null,
    price: 100,
    is_group_gift: true,
    priority: "normal",
  };
  const action = {
    action: "add_item",
    list_id: "11111111-1111-4111-8111-111111111111",
    data: item,
  };
  assert.equal(creatorInput.safeParse(action).success, true);
  for (const price of [null, 0, -1, NaN, Infinity, 10.111])
    assert.equal(
      creatorInput.safeParse({ ...action, data: { ...item, price } }).success,
      false,
    );
  assert.equal(
    creatorInput.safeParse({
      ...action,
      data: { ...item, url: "javascript:alert(1)" },
    }).success,
    false,
  );
  const reservation = {
    item_id: action.list_id,
    guest_name: "Camille Martin",
    amount: null,
    token: "a".repeat(64),
    message: "",
  };
  assert.equal(reservationInput.safeParse(reservation).success, true);
  assert.equal(
    reservationInput.safeParse({ ...reservation, guest_email: "bad-address" })
      .success,
    false,
  );
  for (const path of [
    "/l/abc",
    "/fr/l/abc",
    "/listes/annuler",
    "/en/outils/listes-cadeaux",
    "/ar/outils/listes-cadeaux/id",
  ])
    assert.equal(isGiftPath(path), true);
  for (const path of ["/", "/outils", "/en/jeux", "/listes-autres"])
    assert.equal(isGiftPath(path), false);
  assert.equal(safeWebUrl("javascript:alert(1)"), null);
});

test(
  "live HTTP → Supabase: ownership, concurrent reservations, surprise, cancellation and cleanup",
  { skip: process.env.GIFT_LISTS_LIVE_TEST !== "1", timeout: 120000 },
  async () => {
    const fixture = await giftFixture(
      process.env.TETRIS_TEST_BASE_URL || "http://localhost:3000",
    );
    try {
      const create = await fixture.request("/api/tetris/gifts", {
        action: "create_list",
        data: {
          title: "Liste temporaire de vérification",
          description: null,
          occasion_type: "birthday",
          is_surprise_mode: true,
          payment_info: "Instructions de test",
        },
      });
      assert.equal(create.status, 201, await create.clone().text());
      const { list } = await create.json();
      const added = await fixture.request("/api/tetris/gifts", {
        action: "add_item",
        list_id: list.id,
        data: {
          title: "Cadeau test",
          price: 100,
          is_group_gift: false,
          priority: "normal",
          url: null,
          image_url: null,
        },
      });
      assert.equal(added.status, 201);
      const { item } = await added.json();
      const input = (token: string) => ({
        item_id: item.id,
        guest_name: "Invité de test",
        guest_email: "private@example.test",
        message: "Message privé de test",
        amount: null,
        token,
      });
      const secrets = [
        randomBytes(32).toString("hex"),
        randomBytes(32).toString("hex"),
      ];
      const concurrent = await Promise.all(
        secrets.map((token) =>
          fixture.request(`/api/gifts/${list.slug}`, input(token), false),
        ),
      );
      assert.deepEqual(
        concurrent.map((response) => response.status).sort(),
        [200, 409],
      );
      const winning =
        secrets[concurrent.findIndex((response) => response.status === 200)];
      assert.equal(
        (
          await fixture.request(
            `/api/gifts/${list.slug}`,
            input(winning),
            false,
          )
        ).status,
        200,
      );
      const publicResult = await (
        await fixture.request(`/api/gifts/${list.slug}`, undefined, false)
      ).json();
      assert.deepEqual(publicResult.items[0].guest_names, ["Invité de test"]);
      assert.ok(!JSON.stringify(publicResult).includes("private@example.test"));
      assert.ok(!JSON.stringify(publicResult).includes("Message privé"));
      const detail = await (
        await fixture.request(`/api/tetris/gifts?id=${list.id}`)
      ).json();
      assert.deepEqual(detail.activity, { hidden: true });
      assert.equal(
        (
          await fixture.request("/api/tetris/gifts", {
            action: "reveal",
            list_id: list.id,
          })
        ).status,
        200,
      );
      const revealed = await (
        await fixture.request(`/api/tetris/gifts?id=${list.id}`)
      ).json();
      assert.equal(
        revealed.activity.reservations[0].message,
        "Message privé de test",
      );
      assert.equal(
        (await fixture.request("/api/gifts/cancel", { token: winning }, false))
          .status,
        200,
      );
      assert.equal(
        (await fixture.request("/api/gifts/cancel", { token: winning }, false))
          .status,
        200,
      );
      const cancelled = await (
        await fixture.request(`/api/gifts/${list.slug}`, undefined, false)
      ).json();
      assert.equal(cancelled.items[0].reserved, false);
      const groupResponse = await fixture.request("/api/tetris/gifts", {
        action: "add_item",
        list_id: list.id,
        data: {
          title: "Cadeau groupé test",
          price: 100,
          is_group_gift: true,
          priority: "normal",
          url: null,
          image_url: null,
        },
      });
      const group = (await groupResponse.json()).item;
      const pledges = await Promise.all(
        [1, 2].map(() =>
          fixture.request(
            `/api/gifts/${list.slug}`,
            {
              ...input(randomBytes(32).toString("hex")),
              item_id: group.id,
              amount: 70,
            },
            false,
          ),
        ),
      );
      assert.deepEqual(
        pledges.map((response) => response.status).sort(),
        [200, 409],
      );
      assert.equal(
        (
          await fixture.request(
            "/api/tetris/gifts",
            { action: "delete_list", list_id: list.id },
            false,
          )
        ).status,
        401,
      );
      const second = await giftFixture(
        process.env.TETRIS_TEST_BASE_URL || "http://localhost:3000",
      );
      try {
        assert.equal(
          (await second.request(`/api/tetris/gifts?id=${list.id}`)).status,
          404,
        );
        assert.equal(
          (
            await second.request("/api/tetris/gifts", {
              action: "delete_list",
              list_id: list.id,
            })
          ).status,
          404,
        );
      } finally {
        await second.cleanup();
      }
      assert.equal(
        (
          await fixture.request("/api/tetris/gifts", {
            action: "delete_list",
            list_id: list.id,
          })
        ).status,
        200,
      );
      assert.equal(
        (await fixture.request(`/api/gifts/${list.slug}`, undefined, false))
          .status,
        404,
      );
    } finally {
      await fixture.cleanup();
    }
  },
);
