export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message = "Requête invalide.",
  ) {
    super(message);
  }
}

/** Bound bytes while reading, including chunked requests without Content-Length. */
export async function readBytes(
  request: Request,
  maxBytes: number,
): Promise<Buffer> {
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new HttpError(413, "Requête trop volumineuse.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "Requête trop volumineuse.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

export function requestCookie(request: Request, name: string): string | null {
  const matches = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((v) => v.trim())
    .filter((v) => v.startsWith(name + "="));
  // Duplicate cookies must not select an ambiguous credential.
  return matches.length === 1 ? matches[0].slice(name.length + 1) : null;
}

export function privateJson(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

export async function readText(
  request: Request,
  maxBytes: number,
): Promise<string> {
  return (await readBytes(request, maxBytes)).toString("utf8");
}
