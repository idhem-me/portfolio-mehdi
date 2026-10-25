import { activePlayer } from "@/features/tetris/server/player";
import { NextRequest } from "next/server";
import { tetrisEnabled } from "@/features/tetris/flags";
import { json, failure } from "@/features/tetris/server/http";
import { store } from "@/features/tetris/server/store";
export async function POST(request: NextRequest) {
  if (!tetrisEnabled) return new Response("Not Found", { status: 404 });
  if (
    request.headers.get("origin") !==
    request.nextUrl.protocol + "//" + request.headers.get("host")
  )
    return new Response("Forbidden", { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 2_000_000) throw Error("Partie trop longue.");
    const body = JSON.parse(raw);
    if (
      typeof body.id !== "string" ||
      !Array.isArray(body.steps) ||
      (body.opening !== undefined && typeof body.opening !== "boolean")
    )
      throw Error("Envoi invalide.");
    const owner = request.cookies.get("lava-player")?.value;
    if (!owner) throw Error("Profil joueur introuvable.");
    if (body.recipient !== undefined) {
      const active = await activePlayer(request);
      if (!active.profile || active.profile.kind !== "local" || active.profile.key !== body.recipient)
        return Response.json(
          { error: "Identité modifiée. Le score reste en attente." },
          { status: 401 },
        );
    }
    const backend = await store();
    if (!(await backend.profile(owner)))
      throw Error("Profil joueur introuvable.");
    return json(
      await backend.submitLocal(
        owner,
        body.id,
        body.steps,
        body.opening === true,
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
