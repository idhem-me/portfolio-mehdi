import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { leaderboardEnabled } from "../flags";
export function gate(request: NextRequest, mutation = false) {
  if (!leaderboardEnabled)
    return new NextResponse("Not Found", { status: 404 });
  if (
    mutation &&
    request.headers.get("origin") !==
      `${request.nextUrl.protocol}//${request.headers.get("host")}`
  )
    return new NextResponse("Forbidden", { status: 403 });
}
export function player(request: NextRequest) {
  const cookie = request.cookies.get("lava-player")?.value;
  return cookie && /^[a-f0-9]{64}$/.test(cookie)
    ? cookie
    : randomBytes(32).toString("hex");
}
export function json(data: unknown) {
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
export function failure(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof Error ? error.message : "Classement indisponible.",
    },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}
