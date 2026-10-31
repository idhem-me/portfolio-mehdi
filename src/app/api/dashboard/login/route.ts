import { NextResponse } from "next/server";
import {
  DASHBOARD_COOKIE,
  DASHBOARD_SESSION_SECONDS,
  dashboardConfigured,
  validPassword,
  createDashboardSession,
} from "@/lib/dashboard-auth";
import { budget, securityFailure } from "@/lib/security/budget";
import { readText, HttpError } from "@/lib/security/http";
import { isSameOrigin } from "@/lib/backoffice/request-origin";
export async function POST(request: Request) {
  if (!request.headers.get("origin") || !isSameOrigin(request))
    return new Response(null, { status: 403 });
  if (!dashboardConfigured())
    return NextResponse.json(
      { error: "Connexion momentanément indisponible." },
      { status: 503 },
    );
  try {
    await budget(request, "dashboard-login", {
      global: 60,
      network: 5,
      seconds: 600,
    });
    const raw = await readText(request, 2048);
    let value: unknown;
    try {
      if (
        /^application\/json(?:;|$)/i.test(
          request.headers.get("content-type") ?? "",
        )
      )
        value = JSON.parse(raw)?.password;
      else if (
        /^application\/x-www-form-urlencoded(?:;|$)/i.test(
          request.headers.get("content-type") ?? "",
        )
      )
        value = new URLSearchParams(raw).get("password");
      else throw new HttpError(415);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(400);
    }
    if (typeof value !== "string" || value.length > 1024)
      throw new HttpError(400);
    if (!validPassword(value))
      throw new HttpError(401, "Identifiants incorrects.");
    const token = await createDashboardSession();
    const response = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
    response.cookies.set(DASHBOARD_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: DASHBOARD_SESSION_SECONDS,
    });
    return response;
  } catch (error) {
    return securityFailure(error);
  }
}
