import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
import { gzipSync, brotliCompressSync } from "node:zlib";
import { NextRequest, NextResponse } from "next/server";
import {
  extractProductMetadata,
  isPublicAddress,
  MAX_PRODUCT_HTML_BYTES,
  parseProductMetadata,
  productPrice,
  productRequestOptions,
  productUrl,
  ProductMetadataError,
  readProductHtml,
  resolveProductAddress,
} from "../src/features/gift-lists/server/product-metadata";
import {
  createExtractionHandler,
  ExtractionBudget,
} from "../src/features/gift-lists/server/extraction-handler";

const page = new URL("https://shop.public-domain.com/product/123");
const resolve = async () => [{ address: "93.184.215.14", family: 4 }];
function response(
  body: string | Buffer = "",
  status = 200,
  headers: Record<string, string> = {},
) {
  return Object.assign(Readable.from([Buffer.from(body)]), {
    statusCode: status,
    headers: { "content-type": "text/html; charset=utf-8", ...headers },
  }) as unknown as IncomingMessage;
}

test("OpenGraph, attribute order, entities, relative images and decimal prices", () => {
  assert.deepEqual(
    parseProductMetadata(
      `
    <!-- <meta property="og:title" content="comment"> -->
    <script>const html = '<meta property="og:title" content="script">';</script>
    <style>/* <meta property="og:title" content="style"> */</style>
    <title>Fallback</title>
    <META CONTENT='Vélo &amp; accessoires &#x1F6B2;' PROPERTY='og:title'>
    <meta property=og:image content="/images/bike.jpg?a=1&amp;b=2">
    <meta content='1.299,95' property='product:price:amount'>
    <meta content='EUR' property='product:price:currency'>
  `,
      page,
    ),
    {
      title: "Vélo & accessoires 🚲",
      image_url: "https://shop.public-domain.com/images/bike.jpg?a=1&b=2",
      price: 1299.95,
      currency: "EUR",
    },
  );
  assert.equal(
    parseProductMetadata("<title>Un cadeau &eacute;patant</title>", page).title,
    "Un cadeau épatant",
  );
  assert.equal(
    parseProductMetadata('<meta itemprop="price" content="12,50">', page).price,
    12.5,
  );
  assert.equal(
    parseProductMetadata(
      '<meta property="og:image" content="javascript:alert(1)">',
      page,
    ).image_url,
    null,
  );
  const usd = parseProductMetadata(
    '<meta property="product:price:amount" content="10"><meta property="product:price:currency" content="USD">',
    page,
  );
  assert.equal(usd.price, null);
  assert.equal(usd.currency, "USD");
  for (const value of [
    "NaN",
    "Infinity",
    "-10",
    "12e3",
    "12,345",
    "12.345",
    "1000000000",
    "12€",
  ])
    assert.equal(productPrice(value), null, value);
  assert.equal(productPrice("1,299.95"), 1299.95);
  assert.equal(productPrice("1 299,95"), 1299.95);
  assert.equal(productPrice("0"), 0);
});

test("private, reserved, mapped and non-HTTP targets are blocked", async () => {
  for (const url of [
    "file:///etc/passwd",
    "ftp://shop.com/file",
    "http://127.1",
    "http://2130706433",
    "http://0x7f000001",
    "http://[::1]",
    "http://[::ffff:127.0.0.1]",
    "http://localhost",
    "http://metadata.google.internal",
    "https://shop.local",
    "http://shop.com:8080",
    "https://user:pass@shop.com",
  ])
    assert.throws(() => productUrl(url), ProductMetadataError, url);
  for (const address of [
    "0.0.0.0",
    "10.1.2.3",
    "127.0.0.1",
    "100.100.100.200",
    "169.254.169.254",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.0.1",
    "192.0.2.5",
    "198.18.0.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "::ffff:8.8.8.8",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
    "2002:7f00:1::",
    "3fff::1",
    "not-an-ip",
  ])
    assert.equal(isPublicAddress(address), false, address);
  for (const address of ["8.8.8.8", "93.184.215.14", "2606:4700:4700::1111"])
    assert.equal(isPublicAddress(address), true, address);
  await assert.rejects(
    resolveProductAddress(page, async () => [
      { address: "93.184.215.14", family: 4 },
      { address: "10.0.0.1", family: 4 },
    ]),
    /blocked_url/,
  );
  await assert.rejects(
    resolveProductAddress(page, async () => []),
    /blocked_url/,
  );
});

test("checked address is pinned on the socket without cookies or authorization", () => {
  const options = productRequestOptions(
    { address: "93.184.215.14", family: 4 },
    new AbortController().signal,
  );
  let called = false;
  options.lookup("shop.public-domain.com", {}, (error, address, family) => {
    assert.equal(error, null);
    assert.equal(address, "93.184.215.14");
    assert.equal(family, 4);
    called = true;
  });
  assert.equal(called, true);
  assert.equal(options.agent, false);
  assert.equal(options.autoSelectFamily, false);
  assert.ok(!("Cookie" in options.headers));
  assert.ok(!("Authorization" in options.headers));
});

test("redirects are checked before a connection, and loops and downgrades stop", async () => {
  const hosts: string[] = [];
  let calls = 0;
  const metadata = await extractProductMetadata(page.href, {
    resolve: async (host) => {
      hosts.push(host);
      return resolve();
    },
    request: async () => {
      calls++;
      return calls === 1
        ? response("", 302, {
            location: "https://other.public-domain.com/next",
          })
        : response(
            '<meta property="og:title" content="Found"><meta property="og:image" content="cover.jpg">',
          );
    },
  });
  assert.equal(metadata.title, "Found");
  assert.equal(metadata.image_url, "https://other.public-domain.com/cover.jpg");
  assert.deepEqual(hosts, [page.hostname, "other.public-domain.com"]);
  calls = 0;
  await assert.rejects(
    extractProductMetadata(page.href, {
      resolve: async (host) =>
        host.startsWith("private.")
          ? [{ address: "10.0.0.1", family: 4 }]
          : resolve(),
      request: async () => {
        calls++;
        return response("", 302, {
          location: "https://private.public-domain.com",
        });
      },
    }),
    /blocked_url/,
  );
  assert.equal(calls, 1);
  await assert.rejects(
    extractProductMetadata(page.href, {
      resolve,
      request: async () =>
        response("", 302, { location: "http://other.public-domain.com" }),
    }),
    /blocked_url/,
  );
  calls = 0;
  await assert.rejects(
    extractProductMetadata(page.href, {
      resolve,
      request: async () => {
        calls++;
        return response("", 302, { location: "/loop" });
      },
    }),
    /unavailable/,
  );
  assert.equal(calls, 4);
});

test("blocked merchants, network failures and DNS timeouts become controlled errors", async () => {
  for (const status of [403, 404, 429, 500])
    await assert.rejects(
      extractProductMetadata(page.href, {
        resolve,
        request: async () => response("", status),
      }),
      /unavailable/,
    );
  await assert.rejects(
    extractProductMetadata(page.href, {
      resolve,
      request: async () => {
        throw new Error("TLS secret details");
      },
    }),
    /unavailable/,
  );
  await assert.rejects(
    extractProductMetadata(page.href, {
      resolve: () => new Promise(() => {}),
      timeoutMs: 10,
    }),
    /unavailable/,
  );
});

test("streaming byte cap also applies after decompression; invalid formats are rejected", async () => {
  const signal = new AbortController().signal;
  for (const encoding of ["gzip", "br"]) {
    const compress = encoding === "gzip" ? gzipSync : brotliCompressSync;
    assert.match(
      await readProductHtml(
        response(compress(Buffer.from("<title>Cadeau</title>")), 200, {
          "content-encoding": encoding,
        }),
        signal,
      ),
      /Cadeau/,
    );
    await assert.rejects(
      readProductHtml(
        response(compress(Buffer.alloc(MAX_PRODUCT_HTML_BYTES + 1, 65)), 200, {
          "content-encoding": encoding,
        }),
        signal,
      ),
      /unavailable/,
    );
  }
  await assert.rejects(
    readProductHtml(response(Buffer.alloc(MAX_PRODUCT_HTML_BYTES + 1)), signal),
    /unavailable/,
  );
  await assert.rejects(
    readProductHtml(
      response("", 200, { "content-type": "application/pdf" }),
      signal,
    ),
    /unavailable/,
  );
  await assert.rejects(
    readProductHtml(
      response("", 200, { "content-encoding": "unknown" }),
      signal,
    ),
    /unavailable/,
  );
  await assert.rejects(
    readProductHtml(
      response("", 200, {
        "content-length": String(MAX_PRODUCT_HTML_BYTES + 1),
      }),
      signal,
    ),
    /unavailable/,
  );
});

const result = { title: "Cadeau", image_url: null, price: 12, currency: "EUR" };
const auth = async () => ({
  user: { id: "google-account" },
  apply: (response: NextResponse) => {
    response.headers.set("x-session-refreshed", "true");
    return response;
  },
});
function input(
  body: string = JSON.stringify({ url: page.href }),
  headers: Record<string, string> = {},
) {
  return new NextRequest(
    "https://portfolio.public-domain.com/api/tetris/gifts/extract",
    {
      method: "POST",
      body,
      headers: {
        origin: "https://portfolio.public-domain.com",
        "content-type": "application/json",
        ...headers,
      },
    },
  );
}

test("route requires a same-origin Google session and bounded JSON before scraping", async () => {
  let calls = 0;
  const extract = async () => {
    calls++;
    return result;
  };
  const handle = createExtractionHandler({ authenticate: auth, extract });
  assert.equal(
    (await handle(input(undefined, { origin: "https://attacker.com" }))).status,
    403,
  );
  assert.equal((await handle(input(undefined, { origin: "" }))).status, 403);
  assert.equal(
    (await handle(input(undefined, { "content-type": "text/plain" }))).status,
    415,
  );
  assert.equal(
    (
      await createExtractionHandler({
        authenticate: async () => ({ user: null, apply: (r) => r }),
        extract,
      })(input())
    ).status,
    401,
  );
  assert.equal((await handle(input("{"))).status, 400);
  assert.equal((await handle(input('{"url": 123}'))).status, 400);
  assert.equal((await handle(input("x".repeat(8193)))).status, 413);
  assert.equal(calls, 0);
  const response = await handle(input());
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control")!, /no-store/);
  assert.equal(response.headers.get("x-session-refreshed"), "true");
  assert.equal((await response.json()).status, "partial");
  assert.equal(calls, 1);
});

test("route gracefully falls back to manual entry without exposing merchant errors", async () => {
  const handle = createExtractionHandler({
    authenticate: auth,
    extract: async () => {
      throw new Error("private TLS error");
    },
  });
  const response = await handle(input());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "manual");
  assert.equal(body.manual_entry, true);
  assert.ok(!JSON.stringify(body).includes("TLS"));
  const blocked = createExtractionHandler({
    authenticate: auth,
    extract: async () => {
      throw new ProductMetadataError("blocked_url");
    },
  });
  assert.equal((await blocked(input())).status, 400);
});

test("budgets bound per-account retries and concurrent work, then recover", async () => {
  const budget = new ExtractionBudget();
  const first = budget.acquire("one", 0)!;
  assert.equal(budget.acquire("one", 0), null);
  first();
  first(); // Releasing twice cannot lower the global count twice.
  for (let n = 0; n < 9; n++) budget.acquire("one", 0)!();
  assert.equal(budget.acquire("one", 0), null);
  budget.acquire("one", 60_001)!();
  const releases = ["a", "b", "c", "d"].map((id) =>
    budget.acquire(id, 60_001)!,
  );
  assert.equal(budget.acquire("e", 60_001), null);
  releases.forEach((release) => release());
  const exhausted = new ExtractionBudget();
  for (let n = 0; n < 10; n++)
    exhausted.acquire("google-account", Date.now())!();
  const response = await createExtractionHandler({
    authenticate: auth,
    budget: exhausted,
  })(input());
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
});
