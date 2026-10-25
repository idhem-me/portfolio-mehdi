import { NextRequest, NextResponse } from "next/server";
import { gate } from "@/features/tetris/server/http";
import { authClient, googleConfigured } from "@/features/tetris/server/auth";
import { safeGamePath } from "@/features/tetris/auth/identity";
import { popupResult } from "@/features/tetris/server/oauth-popup";
export async function GET(request: NextRequest) {
  const denied = gate(request);
  if (denied) return denied;
  const path = safeGamePath(request.nextUrl.searchParams.get("returnTo"));
  const popup = request.nextUrl.searchParams.get("popup") === "1";
  const origin = request.nextUrl.protocol + "//" + request.headers.get("host");
  const fallback = () =>
    popup
      ? popupResult(false)
      : NextResponse.redirect(new URL(path + "?auth=error", origin), 303);
  if (!googleConfigured()) return fallback();
  const context = authClient(request);
  const { data, error } = await context.client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: origin + "/api/tetris/auth/callback",
      skipBrowserRedirect: true,
    },
  });
  if (error || !data.url) return context.apply(fallback());
  const response = context.apply(NextResponse.redirect(data.url, 303));
  response.cookies.set("lava-auth-popup", popup ? "1" : "0", {
    path: "/api/tetris",
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    maxAge: 600,
  });
  response.cookies.set("lava-auth-return", path, {
    path: "/api/tetris",
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    maxAge: 600,
  });
  return response;
}
