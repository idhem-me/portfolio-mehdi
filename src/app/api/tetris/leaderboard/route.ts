import { NextRequest, NextResponse, connection } from "next/server";
import { gate, player, json, failure } from "@/features/tetris/server/http";
import { reportBackendFailure } from "@/features/tetris/server/diagnostics";
import { verifiedGoogleUser } from "@/features/tetris/server/auth";
import { googleIdentity } from "@/features/tetris/auth/identity";
import { store } from "@/features/tetris/server/store";
export async function GET(request: NextRequest) {
  const denied = gate(request);
  if (denied) return denied;
  try {
    await connection();
    return json(await (await store()).list());
  } catch (error) {
    reportBackendFailure(error);
    return new Response("Classement indisponible", { status: 503 });
  }
}
export async function POST(request: NextRequest) {
  const denied = gate(request, true);
  if (denied) return denied;
  try {
    const raw = await request.text();
    if (raw.length > 2000000) throw Error("Partie trop longue.");
    const body = JSON.parse(raw);
    if (typeof body.id !== "string" || typeof body.name !== "string")
      throw Error("Envoi invalide.");
    if (
      body.identity !== undefined &&
      body.identity !== "guest" &&
      body.identity !== "google"
    )
      throw Error("Envoi invalide.");
    const guest = player(request);
    const auth =
      body.identity === "google" ? await verifiedGoogleUser(request) : null;
    const account = auth?.user ? googleIdentity(auth.user) : null;
    if (body.identity === "google" && !account) {
      const response = NextResponse.json(
        { error: "Reconnectez-vous à Google ou choisissez un pseudo." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
      return auth ? auth.apply(response) : response;
    }
    const backend = await store();
    const result = await backend.submit(
      guest,
      body.id,
      body.name,
      body.steps,
      account || guest,
    );
    // Saving succeeded even if a subsequent rank lookup is temporarily unavailable.
    let rank: number | null | undefined;
    try {
      rank = await backend.rank(account || guest);
    } catch (error) {
      reportBackendFailure(error);
    }
    const response = json({
      ...result,
      ...(rank === undefined ? {} : { rank }),
    });
    return auth ? auth.apply(response) : response;
  } catch (error) {
    return failure(error);
  }
}
