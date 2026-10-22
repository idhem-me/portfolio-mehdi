import { NextResponse } from "next/server";
import {
  DASHBOARD_COOKIE,
  expectedDashboardToken,
} from "@/lib/dashboard-auth";

export async function POST(request: Request) {
  const expected = await expectedDashboardToken();
  if (!expected) {
    return NextResponse.json(
      { error: "DASHBOARD_PASSWORD non configuré." },
      { status: 503 },
    );
  }

  let password = "";
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { password?: string };
    password = body.password ?? "";
  } else {
    const form = await request.formData();
    password = String(form.get("password") ?? "");
  }

  const { hashToken } = await import("@/lib/dashboard-auth");
  const submitted = await hashToken(password);

  if (submitted !== expected) {
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(DASHBOARD_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
