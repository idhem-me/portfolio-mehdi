import { HttpError } from "@/lib/security/http";
import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin } from "@/lib/backoffice/request-origin";
import {
  extractProductMetadata,
  productTitleFromUrl,
  ProductMetadataError,
  type ProductMetadata,
} from "./product-metadata";

type Auth = {
  user: { id: string } | null;
  apply: (response: NextResponse) => NextResponse;
};

/** Per-instance budget, not a distributed Vercel rate limit. Authentication is mandatory. */
export class ExtractionBudget {
  private readonly users = new Map<
    string,
    { resetAt: number; count: number; active: boolean }
  >();
  private active = 0;

  acquire(userId: string, now = Date.now()): (() => void) | null {
    for (const [id, entry] of this.users) {
      if (!entry.active && entry.resetAt <= now) this.users.delete(id);
    }
    const previous = this.users.get(userId);
    if (
      this.active >= 4 ||
      previous?.active ||
      (previous && previous.count >= 10) ||
      (!previous && this.users.size >= 1000)
    )
      return null;
    const entry = previous ?? {
      resetAt: now + 60_000,
      count: 0,
      active: false,
    };
    entry.count++;
    entry.active = true;
    this.users.set(userId, entry);
    this.active++;
    return () => {
      if (entry.active) {
        entry.active = false;
        this.active--;
      }
    };
  }
}

async function readInput(request: Request): Promise<string> {
  if (Number(request.headers.get("content-length")) > 8192)
    throw new Error("large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 8192) {
        await reader.cancel();
        throw new Error("large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const input: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (
    !input ||
    typeof input !== "object" ||
    !("url" in input) ||
    typeof input.url !== "string" ||
    !input.url.trim() ||
    input.url.length > 4096
  )
    throw new Error("invalid");
  return input.url.trim();
}

export function createExtractionHandler(dependencies: {
  authenticate: (request: NextRequest) => Promise<Auth>;
  extract?: (url: string) => Promise<ProductMetadata>;
  budget?: ExtractionBudget;
  acquireShared?: () => Promise<() => Promise<void>>;
}) {
  const budget = dependencies.budget ?? new ExtractionBudget();
  return async (request: NextRequest): Promise<NextResponse> => {
    let apply = (response: NextResponse) => response;
    const reply = (
      body: unknown,
      status = 200,
      headers: Record<string, string> = {},
    ) =>
      apply(
        NextResponse.json(body, {
          status,
          headers: {
            "Cache-Control": "private, no-store",
            "X-Robots-Tag": "noindex",
            ...headers,
          },
        }),
      );
    if (
      !request.headers.get("origin") ||
      !isSameOrigin(request) ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return reply(
        { error: "Cette action doit être lancée depuis le site." },
        403,
      );
    if (
      !/^application\/json(?:\s*;|$)/i.test(
        request.headers.get("content-type") ?? "",
      )
    )
      return reply({ error: "Un contenu JSON est attendu." }, 415);
    try {
      const auth = await dependencies.authenticate(request);
      apply = auth.apply;
      if (!auth.user)
        return reply(
          {
            error:
              "Connecte-toi avec Google ou Apple pour remplir un cadeau automatiquement.",
          },
          401,
        );
      let url: string;
      try {
        url = await readInput(request);
      } catch (error) {
        const large = error instanceof Error && error.message === "large";
        return reply(
          {
            error: large
              ? "La requête est trop volumineuse."
              : "Indique une URL de produit valide.",
          },
          large ? 413 : 400,
        );
      }
      const release = budget.acquire(auth.user.id);
      if (!release)
        return reply(
          {
            error:
              "Patiente quelques instants avant de réessayer. Tu peux remplir les champs manuellement.",
            manual_entry: true,
          },
          429,
          { "Retry-After": "60" },
        );
      let releaseShared: (() => Promise<void>) | undefined;
      try {
        releaseShared = await dependencies.acquireShared?.();
        const data = await (dependencies.extract ?? extractProductMetadata)(
          url,
        );
        const values = [data.title, data.image_url, data.price];
        const status = values.every((value) => value !== null)
          ? "success"
          : values.some((value) => value !== null)
            ? "partial"
            : "manual";
        return reply({
          status,
          ...data,
          manual_entry: status !== "success",
          message:
            status === "success"
              ? null
              : "Complète ou corrige les informations manuellement.",
        });
      } catch (error) {
        if (error instanceof HttpError)
          return reply(
            { error: error.message },
            error.status,
            error.status === 429 ? { "Retry-After": "60" } : {},
          );
        if (
          error instanceof ProductMetadataError &&
          error.code !== "unavailable"
        )
          return reply(
            {
              status: "manual",
              manual_entry: true,
              error:
                "Utilise un lien HTTP ou HTTPS vers une boutique publique.",
            },
            400,
          );
        return reply({
          status: "manual",
          title: productTitleFromUrl(url),
          image_url: null,
          price: null,
          currency: null,
          manual_entry: true,
          message:
            "Remplis les champs manuellement : les informations de cette boutique ne sont pas accessibles.",
        });
      } finally {
        release();
        await releaseShared?.();
      }
    } catch (error) {
      if (error instanceof HttpError)
        return reply(
          { error: error.message },
          error.status,
          error.status === 429 ? { "Retry-After": "60" } : {},
        );
      return reply(
        {
          error:
            "Le service est momentanément indisponible. Tu peux remplir les champs manuellement.",
          manual_entry: true,
        },
        503,
      );
    }
  };
}
