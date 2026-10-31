import { lookup } from "node:dns/promises";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { addAbortSignal, type Readable } from "node:stream";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";

export const MAX_PRODUCT_HTML_BYTES = 1_048_576;
const TIMEOUT_MS = 8_000;
const REDIRECTS = new Set([301, 302, 303, 307, 308]);

export class ProductMetadataError extends Error {
  constructor(
    public readonly code: "invalid_url" | "blocked_url" | "unavailable",
  ) {
    super(code);
  }
}

export type ProductMetadata = {
  title: string | null;
  image_url: string | null;
  price: number | null;
  currency: string | null;
};
type Address = { address: string; family: number };
type Resolver = (hostname: string) => Promise<Address[]>;

export function productUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ProductMetadataError("invalid_url");
  }
  if (
    value.length > 4096 ||
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port ||
    isIP(url.hostname.replace(/^\[|\]$/g, "")) ||
    !url.hostname.includes(".") ||
    url.hostname.endsWith(".") ||
    /(?:^|\.)(?:localhost|local|internal|test|invalid|example|onion)$/.test(
      url.hostname,
    )
  ) {
    throw new ProductMetadataError("blocked_url");
  }
  url.hash = "";
  return url;
}

/** Conservative allow-list of global address space; no mapped IPv4 or tunnel IPv6. */
export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168 || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (isIP(address) === 6) {
    const first = Number.parseInt(address.split(":")[0], 16);
    // Reject special-purpose 2001::, 6to4 and documentation networks as well.
    return (
      first >= 0x2000 &&
      first <= 0x3fff &&
      first !== 0x2001 &&
      first !== 0x2002 &&
      first !== 0x3fff
    );
  }
  return false;
}

export async function resolveProductAddress(
  url: URL,
  resolve: Resolver = (hostname) =>
    lookup(hostname, { all: true, verbatim: true }),
): Promise<Address> {
  const addresses = await resolve(url.hostname);
  if (
    !addresses.length ||
    addresses.some((entry) => !isPublicAddress(entry.address))
  )
    throw new ProductMetadataError("blocked_url");
  return addresses[0];
}

/** Socket uses the checked address without a second DNS lookup. Host and TLS SNI stay intact. */
export function productRequestOptions(address: Address, signal: AbortSignal) {
  return {
    method: "GET",
    agent: false as const,
    autoSelectFamily: false,
    family: address.family,
    signal,
    maxHeaderSize: 16_384,
    lookup: ((_hostname, _options, callback) => {
      callback(null, address.address, address.family);
    }) satisfies NonNullable<import("node:http").RequestOptions["lookup"]>,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; GiftListPreview/1.0)",
      Accept: "text/html,application/xhtml+xml;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
    },
  };
}

function requestPage(
  url: URL,
  address: Address,
  signal: AbortSignal,
): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      productRequestOptions(address, signal),
      resolve,
    );
    request.on("error", reject);
    request.end();
  });
}

export async function readProductHtml(
  response: IncomingMessage,
  signal: AbortSignal,
): Promise<string> {
  const contentType = response.headers["content-type"] ?? "";
  if (!/^(?:text\/html|application\/xhtml\+xml)(?:\s*;|$)/i.test(contentType)) {
    response.destroy();
    throw new ProductMetadataError("unavailable");
  }
  if (Number(response.headers["content-length"]) > MAX_PRODUCT_HTML_BYTES) {
    response.destroy();
    throw new ProductMetadataError("unavailable");
  }
  const encoding = response.headers["content-encoding"]?.trim().toLowerCase();
  let stream: Readable = response;
  if (encoding && encoding !== "identity") {
    const decompress =
      encoding === "gzip"
        ? createGunzip()
        : encoding === "br"
          ? createBrotliDecompress()
          : encoding === "deflate"
            ? createInflate()
            : null;
    if (!decompress) {
      response.destroy();
      throw new ProductMetadataError("unavailable");
    }
    response.on("error", (error) => decompress.destroy(error));
    stream = response.pipe(decompress);
  }
  addAbortSignal(signal, stream);
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > MAX_PRODUCT_HTML_BYTES)
        throw new ProductMetadataError("unavailable");
      chunks.push(buffer);
    }
    const charset =
      /charset\s*=\s*["']?([^\s;"']+)/i.exec(contentType)?.[1] ?? "utf-8";
    let decoder: TextDecoder;
    try {
      decoder = new TextDecoder(charset);
    } catch {
      decoder = new TextDecoder();
    }
    return decoder.decode(Buffer.concat(chunks));
  } finally {
    stream.destroy();
    response.destroy();
  }
}

const entities: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
  euro: "€",
  pound: "£",
  copy: "©",
  reg: "®",
  ndash: "–",
  mdash: "—",
  eacute: "é",
  egrave: "è",
  ecirc: "ê",
  agrave: "à",
  acirc: "â",
  ccedil: "ç",
  ouml: "ö",
  uuml: "ü",
};
function decode(value: string): string {
  return value
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, key: string) => {
      if (!key.startsWith("#")) return entities[key] ?? match;
      const code =
        key[1].toLowerCase() === "x"
          ? Number.parseInt(key.slice(2), 16)
          : Number(key.slice(1));
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : "";
    })
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function productPrice(value: string | undefined): number | null {
  if (!value) return null;
  let raw = decode(value).replace(/[\s\u202f]/g, "");
  if (/^\d{1,3}(?:,\d{3})+\.\d{1,2}$/.test(raw)) raw = raw.replaceAll(",", "");
  else if (/^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(raw))
    raw = raw.replaceAll(".", "").replace(",", ".");
  else if (/^\d+,\d{1,2}$/.test(raw)) raw = raw.replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  const price = Number(raw);
  return Number.isFinite(price) && price >= 0 && price < 1_000_000_000
    ? price
    : null;
}

/** Small metadata scanner only; it never executes scripts or returns merchant HTML. */
export function parseProductMetadata(
  html: string,
  pageUrl: URL,
): ProductMetadata {
  const metadata = new Map<string, string>();
  let title: string | undefined;
  // Consume script/style/comment bodies before considering tags inside them.
  const tags =
    /<!--[\s\S]*?(?:-->|$)|<(script|style)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)|<title\b[^>]*>[\s\S]*?<\/title\s*>|<meta\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi;
  for (const match of html.matchAll(tags)) {
    const tag = match[0];
    if (/^<title\b/i.test(tag)) {
      title ??= decode(tag.replace(/^<title\b[^>]*>|<\/title\s*>$/gi, ""));
      continue;
    }
    if (!/^<meta\b/i.test(tag)) continue;
    const attributes = new Map<string, string>();
    const pattern = /([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
    for (const attribute of tag.slice(5, -1).matchAll(pattern)) {
      const key = attribute[1].toLowerCase();
      if (!attributes.has(key))
        attributes.set(
          key,
          decode(attribute[2] ?? attribute[3] ?? attribute[4]),
        );
    }
    const key = (
      attributes.get("property") ??
      attributes.get("name") ??
      attributes.get("itemprop")
    )?.toLowerCase();
    const value = attributes.get("content");
    if (key && value && !metadata.has(key)) metadata.set(key, value);
  }
  const first = (...keys: string[]) =>
    keys.map((key) => metadata.get(key)).find(Boolean);
  const currency =
    first(
      "product:price:currency",
      "og:price:currency",
      "pricecurrency",
    )?.toUpperCase() ?? null;
  let image: string | null = null;
  try {
    const value = first(
      "og:image:secure_url",
      "og:image",
      "twitter:image",
      "image",
    );
    if (value) image = productUrl(new URL(value, pageUrl).href).href;
  } catch {
    /* Unsupported images are left for manual input. Images are never fetched here. */
  }
  return {
    title: (first("og:title", "twitter:title") ?? title)?.slice(0, 200) || null,
    image_url: image,
    // This tool stores EUR; never silently interpret a dollar amount as euros.
    price:
      currency && currency !== "EUR"
        ? null
        : productPrice(
            first("product:price:amount", "og:price:amount", "price"),
          ),
    currency,
  };
}

type Dependencies = {
  resolve?: Resolver;
  request?: typeof requestPage;
  timeoutMs?: number;
};

export async function extractProductMetadata(
  value: string,
  dependencies: Dependencies = {},
): Promise<ProductMetadata> {
  let url = productUrl(value);
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    dependencies.timeoutMs ?? TIMEOUT_MS,
  );
  const aborted = new Promise<never>((_resolve, reject) => {
    controller.signal.addEventListener(
      "abort",
      () => reject(new ProductMetadataError("unavailable")),
      { once: true },
    );
  });
  try {
    for (let hop = 0; hop <= 3; hop++) {
      const address = await Promise.race([
        resolveProductAddress(url, dependencies.resolve),
        aborted,
      ]);
      const response = await Promise.race([
        (dependencies.request ?? requestPage)(url, address, controller.signal),
        aborted,
      ]);
      const status = response.statusCode ?? 0;
      if (REDIRECTS.has(status)) {
        const location = response.headers.location;
        response.destroy();
        if (!location || hop === 3)
          throw new ProductMetadataError("unavailable");
        const next = productUrl(new URL(location, url).href);
        if (url.protocol === "https:" && next.protocol !== "https:")
          throw new ProductMetadataError("blocked_url");
        url = next;
        continue;
      }
      if (status < 200 || status >= 300) {
        response.destroy();
        throw new ProductMetadataError("unavailable");
      }
      const html = await Promise.race([
        readProductHtml(response, controller.signal),
        aborted,
      ]);
      return parseProductMetadata(html, url);
    }
    throw new ProductMetadataError("unavailable");
  } catch (error) {
    if (error instanceof ProductMetadataError) throw error;
    throw new ProductMetadataError("unavailable");
  } finally {
    clearTimeout(timer);
  }
}
