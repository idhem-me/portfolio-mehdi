import { NextRequest } from "next/server";
import { gate, player, json, failure } from "@/features/tetris/server/http";
import { store } from "@/features/tetris/server/store";
export async function POST(request: NextRequest) {
  const denied = gate(request, true);
  if (denied) return denied;
  try {
    const owner = player(request),
      response = json(store().session(owner));
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
