import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { authClient, googleConfigured } from "@/features/tetris/server/auth";
import { json } from "@/features/tetris/server/http";
import { accountGate as gate } from "@/features/account/server/http";
const cookie = "lava-google-nonce";
export async function GET(request: NextRequest) {
  const denied = gate(request);
  if (denied) return denied;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleConfigured() || !clientId) return json({ available: false });
  const nonce = randomBytes(32).toString("hex");
  const response = json({
    available: true,
    clientId,
    nonce: createHash("sha256").update(nonce).digest("hex"),
  });
  response.cookies.set(cookie, nonce, {
    httpOnly: true,
    sameSite: "strict",
    secure: request.nextUrl.protocol === "https:",
    path: "/api/tetris/auth/credential",
    maxAge: 600,
  });
  return response;
}
export async function POST(request: NextRequest) {
  const denied = gate(request, true);
  if (denied) return denied;
  if (!googleConfigured())
    return json({ error: "Connexion Google indisponible." });
  const raw = await request.text();
  if (raw.length > 20000)
    return NextResponse.json(
      { error: "Connexion Google invalide. Réessaie ou choisis un pseudo." },
      { status: 400 },
    );
  try {
    const { credential, nonce } = JSON.parse(raw);
    const saved = request.cookies.get(cookie)?.value;
    if (
      typeof credential !== "string" ||
      typeof nonce !== "string" ||
      !saved ||
      nonce.length !== 64 ||
      !timingSafeEqual(
        Buffer.from(createHash("sha256").update(saved).digest("hex")),
        Buffer.from(nonce),
      )
    )
      return NextResponse.json(
        { error: "Connexion Google expirée. Réessaie ou choisis un pseudo." },
        { status: 403 },
      );
    const context = authClient(request);
    const { error } = await context.client.auth.signInWithIdToken({
      provider: "google",
      token: credential,
      nonce: saved,
    });
    const response = error
      ? json({
          error: "Connexion Google impossible. Réessaie ou choisis un pseudo.",
        })
      : json({ ok: true });
    if (error)
      return context.apply(
        NextResponse.json(
          {
            error:
              "Connexion Google impossible. Réessaie ou choisis un pseudo.",
          },
          { status: 401 },
        ) as typeof response,
      );
    response.cookies.set(cookie, "", {
      path: "/api/tetris/auth/credential",
      maxAge: 0,
    });
    return context.apply(response);
  } catch {
    return NextResponse.json(
      { error: "Connexion Google invalide. Réessaie ou choisis un pseudo." },
      { status: 400 },
    );
  }
}
