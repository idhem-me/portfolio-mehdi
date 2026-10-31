import { NextResponse } from "next/server";
import { DASHBOARD_COOKIE, revokeDashboardSession } from "@/lib/dashboard-auth";
import { isSameOrigin } from "@/lib/backoffice/request-origin";
import { securityFailure } from "@/lib/security/budget";
export async function POST(request: Request) {
  if (!request.headers.get("origin") || !isSameOrigin(request))
    return new Response(null, { status: 403 });
  try {
    await revokeDashboardSession(request);
  } catch (error) {
    return securityFailure(error);
  }
  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  response.cookies.set(DASHBOARD_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
