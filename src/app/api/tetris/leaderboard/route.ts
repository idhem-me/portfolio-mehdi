import { NextRequest, connection } from "next/server";
import { gate, player, json, failure } from "@/features/tetris/server/http";
import { store } from "@/features/tetris/server/store";
export async function GET(request: NextRequest) {
  const denied = gate(request);
  if (denied) return denied;
  try {
    await connection();
    return json(await (await store()).list());
  } catch {
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
    return json(
      await (
        await store()
      ).submit(player(request), body.id, body.name, body.steps),
    );
  } catch (error) {
    return failure(error);
  }
}
