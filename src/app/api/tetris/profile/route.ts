import { NextRequest, NextResponse } from "next/server";
import { tetrisEnabled } from "@/features/tetris/flags";
import { player, json, failure } from "@/features/tetris/server/http";
import { activePlayer } from "@/features/tetris/server/player";
import { store } from "@/features/tetris/server/store";
function gate(request: NextRequest) {
  if (!tetrisEnabled) return new NextResponse("Not Found", { status: 404 });
  if (
    request.headers.get("origin") !==
    request.nextUrl.protocol + "//" + request.headers.get("host")
  )
    return new NextResponse("Forbidden", { status: 403 });
}
export async function GET(request: NextRequest) {
  if (!tetrisEnabled) return new NextResponse("Not Found", { status: 404 });
  try {
    const active = await activePlayer(request);
    return active.auth.apply(json(active.profile));
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: NextRequest) {
  const denied = gate(request);
  if (denied) return denied;
  try {
    const raw = await request.text();
    if (raw.length > 300000) throw Error("Profil invalide.");
    const body = JSON.parse(raw);
    if (
      typeof body.name !== "string" ||
      (body.avatar !== null && typeof body.avatar !== "string")
    )
      throw Error("Profil invalide.");
    const active = await activePlayer(request);
    if (active.profile?.kind === "google")
      return NextResponse.json(
        { error: "Ton profil est géré par ton compte Google." },
        { status: 403 },
      );
    if (
      body.recipient !== undefined &&
      body.recipient !== (active.profile?.key ?? null)
    )
      return NextResponse.json(
        {
          error:
            "Le profil actif a changé. Rouvre le panneau avant de réessayer.",
        },
        { status: 409 },
      );
    const owner =
      active.profile?.kind === "google" ? active.owner : player(request);
    const response = json({
      ...(await (await store()).saveProfile(owner, body.name, body.avatar)),
      kind: active.profile?.kind ?? "local",
      key: (await import("node:crypto"))
        .createHash("sha256")
        .update(owner)
        .digest("hex"),
    });
    if (active.profile?.kind !== "google")
      response.cookies.set("lava-player", owner, {
        httpOnly: true,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
        path: "/api/tetris",
        maxAge: 90 * 86400,
      });
    return active.auth.apply(response);
  } catch (error) {
    return failure(error);
  }
}
