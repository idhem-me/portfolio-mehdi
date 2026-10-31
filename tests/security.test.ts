import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import sharp from "sharp";
import { normalizeListImage } from "../src/features/gift-lists/server/cover-image";
import { sanitizeSvg } from "../src/lib/sanitize-svg";
import { readText, HttpError } from "../src/lib/security/http";

const require = createRequire(import.meta.url);
test("merge patch blocks poisoned target and source, nested and null-prototype objects", () => {
  const merge = require("deepmerge");
  const poisoned = JSON.parse(
    '{"__proto__":{"admin":true},"nested":{"__proto__":{"admin":true}},"safe":1}',
  );
  for (const [target, source] of [
    [poisoned, {}],
    [{}, poisoned],
    [Object.assign(Object.create(null), poisoned), {}],
  ]) {
    const result = merge(target, source);
    assert.equal(result.admin, undefined);
    assert.equal(Object.getPrototypeOf(result), Object.prototype);
    assert.equal(result.nested.admin, undefined);
    assert.equal(result.safe, 1);
  }
  assert.deepEqual(merge.all([{ a: [1] }, { a: [2], b: { c: 3 } }]), {
    a: [1, 2],
    b: { c: 3 },
  });
  assert.equal(({} as Record<string, unknown>).admin, undefined);
});
test("patched matcher preserves callable and named APIs used by tools", () => {
  const match = require("minimatch");
  assert.equal(match("file.tsx", "**/*.tsx"), true);
  assert.equal(match.minimatch("file.ts", "**/*.tsx"), false);
  assert.equal(new match.Minimatch("**/*.ts").match("src/file.ts"), true);
});
test("SVG parser strips encoded and namespace URL payloads and all active elements", () => {
  const inputs = [
    '<svg><a href="java&#x73;cript:alert(1)"><text>test</text></a></svg>',
    '<svg><use xlink:href="&#106;avascript:alert(1)" /></svg>',
    '<svg><animate attributeName="href" values="#ok;javascript:alert(1)"/><script>alert(1)</script><foreignObject><div onclick="alert(1)">bad</div></foreignObject></svg>',
    '<svg><image href="//evil.example/image"/><path fill="url(https://evil.example/x)" d="M0 0"/></svg>',
  ];
  for (const input of inputs) {
    const result = sanitizeSvg(input);
    assert.equal(result.ok, true);
    if (result.ok)
      assert.doesNotMatch(
        result.svg,
        /href=|javascript|<script|<animate|foreignObject|onclick|evil\.example/i,
      );
  }
  assert.equal(
    sanitizeSvg(
      '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg/>',
    ).ok,
    false,
  );
  const safe = sanitizeSvg(
    '<svg viewBox="0 0 20 20"><defs><linearGradient id="g"><stop stop-color="red"/></linearGradient></defs><path fill="url(#g)" d="M1 1"/></svg>',
  );
  assert.equal(safe.ok, true);
  if (safe.ok) assert.match(safe.svg, /linearGradient|viewBox/);
});
test("image type is verified before decoding; valid photos remain bounded and lose EXIF", async () => {
  for (const bytes of [
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    Buffer.from("GIF89a"),
  ]) {
    await assert.rejects(
      normalizeListImage("data:image/png;base64," + bytes.toString("base64")),
      /invalid_image/,
    );
  }
  const bytes = await sharp({
    create: { width: 1200, height: 800, channels: 3, background: "red" },
  })
    .jpeg()
    .withMetadata()
    .toBuffer();
  const encoded = await normalizeListImage(
    "data:image/jpeg;base64," + bytes.toString("base64"),
  );
  const data = await sharp(
    Buffer.from(encoded!.split(",")[1], "base64"),
  ).metadata();
  assert.equal(data.format, "webp");
  assert.equal(data.exif, undefined);
  assert.ok(data.width! <= 960 && data.height! <= 640);
  assert.ok(Number(sharp.versions.vips.split(".")[1]) >= 18);
});
test("chunked bodies are cancelled at the byte limit, not after full allocation", async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(6));
      controller.enqueue(new Uint8Array(6));
    },
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request("http://test.invalid", {
    method: "POST",
    body: stream,
    duplex: "half",
  } as RequestInit);
  await assert.rejects(
    readText(request, 10),
    (error: unknown) => error instanceof HttpError && error.status === 413,
  );
  assert.equal(cancelled, true);
});
test("shared SQL budgets, leases and capabilities enforce limits and deny browser roles", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls; create schema cards_private;",
    );
    await db.exec(
      readFileSync("supabase/migrations/20261030122415_backoffice.sql", "utf8"),
    );
    await db.exec(`create function public.cards_import_legacy_for(uuid,jsonb) returns boolean language sql as $$select true$$;
      create function cards_private.import_legacy_for(uuid,jsonb) returns boolean language sql as $$select true$$;
      create function cards_private.offer_legacy(jsonb) returns boolean language sql as $$select true$$;
      create function public.cards_offer_legacy(jsonb) returns boolean language sql as $$select true$$;`);
    await db.exec(
      readFileSync(
        "supabase/migrations/20261031155314_security_hardening.sql",
        "utf8",
      ),
    );
    const key = "a".repeat(64);
    await db.exec("set role service_role");
    const consume = async () =>
      (
        await db.query<{ allowed: boolean }>(
          "select security_consume_budget($1,2,60) allowed",
          [key],
        )
      ).rows[0].allowed;
    assert.equal(await consume(), true);
    assert.equal(await consume(), true);
    assert.equal(await consume(), false);
    await db.query(
      "update security_budgets set expires_at=now()-interval '1 second'",
    );
    assert.equal(await consume(), true);
    for (let i = 1; i <= 5; i++) {
      const id = `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
      assert.equal(
        (
          await db.query<{ allowed: boolean }>(
            "select security_acquire_lease($1) allowed",
            [id],
          )
        ).rows[0].allowed,
        i <= 4,
      );
    }
    await db.exec(
      "update security_leases set expires_at=now()-interval '1 second'",
    );
    assert.equal(
      (
        await db.query<{ allowed: boolean }>(
          "select security_acquire_lease('00000000-0000-4000-8000-000000000009') allowed",
        )
      ).rows[0].allowed,
      true,
    );
    const visitor = "11111111-1111-4111-8111-111111111111";
    await db.query(
      "insert into security_visitors(token_hash,visitor_id,expires_at) values($1,$2,now()+interval '1 day')",
      [key, visitor],
    );
    const p = {
      visitor_id: visitor,
      session_id: "22222222-2222-4222-8222-222222222222",
      batch_id: "33333333-3333-4333-8333-333333333333",
      delta: { clicks: 2 },
      pages: { "/": 1 },
      games: [],
    };
    await db.query("select apply_session_delta($1::jsonb,null)", [
      JSON.stringify(p),
    ]);
    assert.equal(
      (
        await db.query<{ visitor_id: string }>(
          "select visitor_id from backoffice_batches",
        )
      ).rows[0].visitor_id,
      visitor,
    );
    await db.query("select security_delete_visitor($1)", ["b".repeat(64)]);
    assert.equal((await db.query("select id from visitors")).rows.length, 1);
    await db.query("select security_delete_visitor($1)", [key]);
    assert.equal((await db.query("select id from visitors")).rows.length, 0);
    assert.equal(
      (await db.query("select * from security_visitors")).rows.length,
      0,
    );
    await db.exec("reset role");
    for (const role of ["anon", "authenticated"]) {
      const rows = await db.query<{ allowed: boolean }>(
        `select has_function_privilege($1,'security_consume_budget(text,integer,integer)','execute') allowed`,
        [role],
      );
      assert.equal(rows.rows[0].allowed, false);
      const tables = await db.query<{ allowed: boolean }>(
        `select has_table_privilege($1,'security_sessions','select') allowed`,
        [role],
      );
      assert.equal(tables.rows[0].allowed, false);
    }
    assert.equal(
      (
        await db.query<{ allowed: boolean }>(
          "select has_function_privilege('service_role','cards_import_legacy_for(uuid,jsonb)','execute') allowed",
        )
      ).rows[0].allowed,
      false,
    );
  } finally {
    await db.close();
  }
});

test("Clarity receives withdrawal and unloads its already-running document", async () => {
  const { transpileModule, ModuleKind, ScriptTarget } =
    await import("typescript");
  const { runInNewContext } = await import("node:vm");
  const source = transpileModule(
    readFileSync("src/lib/analytics/clarity.tsx", "utf8"),
    {
      compilerOptions: {
        module: ModuleKind.CommonJS,
        target: ScriptTarget.ES2022,
      },
    },
  ).outputText;
  let consent = "granted";
  let listener: (status: string) => void = () => {};
  let loaded = false;
  let reloads = 0;
  const calls: unknown[][] = [];
  const exports: Record<string, () => void> = {};
  const window = {
    clarity: (...args: unknown[]) => calls.push(args),
    location: {
      reload: () => {
        reloads++;
      },
    },
  };
  runInNewContext(source, {
    exports,
    window,
    process: { env: { NEXT_PUBLIC_CLARITY_ID: "test-project-only" } },
    document: {
      getElementById: () => (loaded ? {} : null),
      createElement: () => ({}),
      getElementsByTagName: () => [
        {
          parentNode: {
            insertBefore: () => {
              loaded = true;
            },
          },
        },
      ],
    },
    require: (name: string) =>
      name === "react"
        ? { useEffect: (fn: () => void) => fn() }
        : {
            getConsent: () => consent,
            subscribeConsent: (fn: typeof listener) => {
              listener = fn;
              return () => {};
            },
          },
  });
  exports.ClarityScript();
  assert.equal(loaded, true);
  assert.equal(calls[0][0], "consentv2");
  consent = "denied";
  listener("denied");
  assert.equal(
    (calls.at(-1)?.[1] as Record<string, string>).analytics_Storage,
    "denied",
  );
  assert.equal(reloads, 1);
});
