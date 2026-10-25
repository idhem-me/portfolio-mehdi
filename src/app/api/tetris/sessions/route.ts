import { NextRequest } from "next/server";
import { player, json, failure } from "@/features/tetris/server/http";
import { store } from "@/features/tetris/server/store";
import { tetrisEnabled } from "@/features/tetris/flags";
export async function POST(request: NextRequest) {
  if (!tetrisEnabled) return new Response("Not Found", { status: 404 });
  if (
    request.headers.get("origin") !==
    request.nextUrl.protocol + "//" + request.headers.get("host")
  )
    return new Response("Forbidden", { status: 403 });
  try {
    const owner = player(request),
      response = json(await (await store()).session(owner));
    response.cookies.set("lava-player", owner, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/api/tetris",
      maxAge: 90 * 86400,
    });
    return response;
  } catch (error) {
    return failure(error);
  }
}
