import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  normalizePublicSvgPath,
  sanitizeSvg,
  SVG_CONTENT_SECURITY_POLICY,
} from "@/lib/sanitize-svg";

const PUBLIC_DIR = path.join(process.cwd(), "public");

function svgResponse(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Security-Policy": SVG_CONTENT_SECURITY_POLICY,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, context: RouteParams) {
  const { path: segments } = await context.params;

  // Empêche une réécriture récursive si l’URL cible déjà l’API
  if (segments[0] === "api" || segments[0] === "_next") {
    return new NextResponse("Chemin SVG invalide", { status: 400 });
  }

  const normalized = normalizePublicSvgPath(segments);

  if (!normalized) {
    return new NextResponse("Chemin SVG invalide", { status: 400 });
  }

  const absolutePath = path.resolve(PUBLIC_DIR, ...normalized);

  if (
    absolutePath !== PUBLIC_DIR &&
    !absolutePath.startsWith(`${PUBLIC_DIR}${path.sep}`)
  ) {
    return new NextResponse("Accès refusé", { status: 403 });
  }

  let raw: string;
  try {
    raw = await readFile(absolutePath, "utf8");
  } catch {
    return new NextResponse("SVG introuvable", { status: 404 });
  }

  const sanitized = sanitizeSvg(raw);
  if (!sanitized.ok) {
    return new NextResponse(`SVG refusé : ${sanitized.reason}`, {
      status: 422,
    });
  }

  return svgResponse(sanitized.svg);
}
