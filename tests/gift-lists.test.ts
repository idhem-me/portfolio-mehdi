import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const token = (n: number) => n.toString(16).padStart(64, "0");

async function setup() {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
    insert into auth.users values ('${owner}'), ('${other}');
  `);
  await db.exec(readFileSync("docs/sql/gift-lists.sql", "utf8"));
  await db.exec(readFileSync("docs/sql/gift-list-occasions.sql", "utf8"));
  await db.exec(readFileSync("docs/sql/gift-list-cover.sql", "utf8"));
  await db.exec("set role service_role");
  const list = (
    await db.query<{ id: string; slug: string }>(
      "insert into gift_lists(user_id,title,is_surprise_mode) values ($1,'Anniversaire',true) returning id,slug",
      [owner],
    )
  ).rows[0];
  const item = (
    await db.query<{ id: string }>(
      "insert into gift_items(list_id,title,price) values ($1,'Livre',20) returning id",
      [list.id],
    )
  ).rows[0];
  const group = (
    await db.query<{ id: string }>(
      "insert into gift_items(list_id,title,price,is_group_gift) values ($1,'Vélo',100,true) returning id",
      [list.id],
    )
  ).rows[0];
  const reserve = async (
    id = item.id,
    amount: number | string | null = null,
    secret = token(1),
    name = "Camille Martin",
    message: string | null = null,
  ) =>
    (
      await db.query<{ id: string }>(
        "select gift_reserve($1,$2,$3,'camille@example.test',$4,$5,$6) id",
        [list.slug, id, name, message, amount, secret],
      )
    ).rows[0].id;
  return { db, list, item, group, reserve };
}

test("short random links, idempotent reservations, private data and surprise mode", async () => {
  const { db, list, reserve } = await setup();
  try {
    assert.match(list.slug, /^[0-9a-f]{20}$/);
    const id = await reserve(
      undefined,
      undefined,
      undefined,
      undefined,
      "Surprise !",
    );
    assert.equal(
      await reserve(undefined, undefined, undefined, undefined, "Surprise !"),
      id,
    );
    await assert.rejects(
      reserve(undefined, null, token(2)),
      /gift_already_reserved/,
    );
    await assert.rejects(
      reserve(undefined, null, token(1), "Autre nom"),
      /gift_retry_mismatch/,
    );
    const read = async () =>
      (
        await db.query<{ data: Record<string, unknown> }>(
          "select gift_read_public($1) data",
          [list.slug],
        )
      ).rows[0].data;
    const publicData = await read();
    assert.match(JSON.stringify(publicData), /Camille Martin/);
    for (const secret of [
      "camille@example.test",
      "Surprise !",
      "cancellation_token",
      "user_id",
    ])
      assert.ok(!JSON.stringify(publicData).includes(secret));
    assert.deepEqual(
      (
        await db.query<{ data: unknown }>(
          "select gift_read_owner_reservations($1,$2) data",
          [list.id, owner],
        )
      ).rows[0].data,
      { hidden: true },
    );
    await assert.rejects(
      db.query("select gift_read_owner_reservations($1,$2)", [list.id, other]),
      /gift_list_not_found/,
    );
    await db.query(
      "update gift_lists set reservations_revealed_at=now() where id=$1",
      [list.id],
    );
    const details = (
      await db.query<{ data: unknown }>(
        "select gift_read_owner_reservations($1,$2) data",
        [list.id, owner],
      )
    ).rows[0].data;
    assert.match(JSON.stringify(details), /Surprise !/);
    assert.match(JSON.stringify(details), /camille@example.test/);
    assert.ok(!JSON.stringify(details).includes("cancellation_token"));
    assert.equal(
      (
        await db.query<{ data: unknown }>(
          "select gift_read_public('unknown') data",
        )
      ).rows[0].data,
      null,
    );
  } finally {
    await db.close();
  }
});

test("anonymous access denied, owner isolation and protected economic fields", async () => {
  const { db, list, item, reserve } = await setup();
  try {
    await reserve();
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`reset role; set role ${role}`);
      await assert.rejects(
        db.query("select * from gift_reservations"),
        /permission denied/,
      );
      for (const call of [
        "gift_read_public('x')",
        "gift_cancel('x')",
        `gift_read_owner_reservations('${list.id}','${owner}')`,
      ])
        await assert.rejects(db.query(`select ${call}`), /permission denied/);
    }
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      other,
    ]);
    assert.equal((await db.query("select * from gift_lists")).rows.length, 0);
    assert.equal((await db.query("select * from gift_items")).rows.length, 0);
    await assert.rejects(
      db.query(
        "insert into gift_items(list_id,title) values ($1,'Intrusion')",
        [list.id],
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.query(
        "insert into gift_lists(user_id,title) values ($1,'Intrusion')",
        [owner],
      ),
      /row-level security/,
    );
    assert.equal(
      (
        await db.query("delete from gift_items where id=$1 returning id", [
          item.id,
        ])
      ).rows.length,
      0,
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      owner,
    ]);
    assert.equal((await db.query("select * from gift_lists")).rows.length, 1);
    await db.query("update gift_items set title='Nouveau livre' where id=$1", [
      item.id,
    ]);
    await assert.rejects(
      db.query("update gift_items set price=30 where id=$1", [item.id]),
      /permission denied/,
    );
    await assert.rejects(
      db.query("update gift_lists set user_id=$1 where id=$2", [
        other,
        list.id,
      ]),
      /permission denied/,
    );
    await db.exec("reset role; set role service_role");
    await assert.rejects(
      db.query("update gift_items set price=30 where id=$1", [item.id]),
      /gift_item_has_reservations/,
    );
    await assert.rejects(
      db.query("update gift_items set is_group_gift=true where id=$1", [
        item.id,
      ]),
      /gift_item_has_reservations/,
    );
  } finally {
    await db.close();
  }
});

test("group pledges are bounded, accept cents and recover capacity on cancellation", async () => {
  const { db, group, reserve } = await setup();
  try {
    for (const amount of [null, 0, -1, 0.001, "NaN", "Infinity"])
      await assert.rejects(reserve(group.id, amount), /gift_invalid_amount/);
    await reserve(group.id, 60.25);
    await reserve(group.id, 39.75, token(2));
    await assert.rejects(
      reserve(group.id, 0.01, token(3)),
      /gift_amount_exceeds_remaining/,
    );
    assert.equal(
      (await db.query<{ ok: boolean }>("select gift_cancel($1) ok", [token(2)]))
        .rows[0].ok,
      true,
    );
    await reserve(group.id, 39.75, token(3));
    assert.equal(
      Number(
        (
          await db.query<{ total: string }>(
            "select sum(amount_contributed) total from gift_reservations where cancelled_at is null",
          )
        ).rows[0].total,
      ),
      100,
    );
  } finally {
    await db.close();
  }
});

test("cancellation needs the secret, is repeatable, and stale retries cannot resurrect it", async () => {
  const { db, reserve } = await setup();
  try {
    await reserve();
    for (const secret of ["wrong", token(99), null])
      assert.equal(
        (await db.query<{ ok: boolean }>("select gift_cancel($1) ok", [secret]))
          .rows[0].ok,
        false,
      );
    for (let n = 0; n < 2; n++)
      assert.equal(
        (
          await db.query<{ ok: boolean }>("select gift_cancel($1) ok", [
            token(1),
          ])
        ).rows[0].ok,
        true,
      );
    await assert.rejects(reserve(), /gift_reservation_cancelled/);
    await reserve(undefined, null, token(2));
    const stored = (
      await db.query<{ cancellation_token_hash: string }>(
        "select cancellation_token_hash from gift_reservations",
      )
    ).rows;
    assert.ok(
      stored.every(
        (row) =>
          row.cancellation_token_hash !== token(1) &&
          row.cancellation_token_hash !== token(2),
      ),
    );
  } finally {
    await db.close();
  }
});

test("schema constraints, public link scoping and cascade cleanup", async () => {
  const { db, list, item, group, reserve } = await setup();
  try {
    await assert.rejects(reserve(item.id, 10), /gift_unexpected_amount/);
    await assert.rejects(
      reserve(item.id, null, token(1), "  "),
      /gift_invalid_name/,
    );
    await assert.rejects(
      db.query("update gift_items set price=0 where id=$1", [group.id]),
      /gift_group_requires_price/,
    );
    await assert.rejects(
      db.query("update gift_items set url='javascript:alert(1)' where id=$1", [
        item.id,
      ]),
      /check constraint/,
    );
    await assert.rejects(
      db.query("select gift_reserve('wrong',$1,'A',null,null,null,$2)", [
        item.id,
        token(1),
      ]),
      /gift_item_not_found/,
    );
    await reserve();
    await db.exec("reset role");
    await db.query("delete from auth.users where id=$1", [owner]);
    for (const table of ["gift_lists", "gift_items", "gift_reservations"])
      assert.equal((await db.query(`select * from ${table}`)).rows.length, 0);
    assert.ok(list.id);
  } finally {
    await db.close();
  }
});
