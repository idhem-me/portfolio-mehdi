import { activePlayer } from "@/features/tetris/server/player";
import { NextRequest, NextResponse, connection } from "next/server";
import { gate, player, json, failure } from "@/features/tetris/server/http";
import { reportBackendFailure } from "@/features/tetris/server/diagnostics";
import { verifiedAccountUser } from "@/features/tetris/server/auth";
import { accountIdentity, accountProvider } from "@/features/tetris/auth/identity";
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
      body.identity !== "google" &&
      body.identity !== "apple"
    )
      throw Error("Envoi invalide.");
    const guest = player(request);
    const auth =
      body.identity === "google" || body.identity === "apple"
        ? await verifiedAccountUser(request)
        : null;
    const provider = auth?.user ? accountProvider(auth.user) : null;
    const account = auth?.user ? accountIdentity(auth.user) : null;
    const metadata = auth?.user?.user_metadata ?? {};
    const rawAvatar =
      typeof metadata.picture === "string"
        ? metadata.picture
        : typeof metadata.avatar_url === "string"
          ? metadata.avatar_url
          : "";
    let googleAvatar: string | null = null;
    let publicName = body.name;
    try {
      const url = new URL(rawAvatar);
      if (
        url.protocol === "https:" &&
        (url.hostname === "googleusercontent.com" ||
          url.hostname.endsWith(".googleusercontent.com"))
      )
        googleAvatar = url.toString();
    } catch {}
    if (body.identity && body.identity !== "guest" &&
      (!account || provider !== body.identity)) {
      const response = NextResponse.json(
        { error: "Reconnecte-toi à ton compte ou choisis un pseudo." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
      return auth ? auth.apply(response) : response;
    }
    if (body.recipient !== undefined) {
      const active = await activePlayer(request);
      if (
        !active.profile ||
        active.profile.kind === "local" ||
        active.profile.key !== body.recipient
      )
        return Response.json(
          { error: "Identité modifiée. Le score reste en attente." },
          { status: 401 },
        );
    }
    if (body.identity && body.identity !== "guest" && body.recipient) {
      const active = await activePlayer(request);
      if (active.profile) {
        publicName = active.profile.name;
        googleAvatar = active.profile.avatar;
      }
    }
    const backend = await store();
    const result = await backend.submit(
      guest,
      body.id,
      publicName,
      body.steps,
      account || guest,
      googleAvatar,
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
