import { NextRequest } from "next/server";
import { startOAuth } from "@/features/tetris/server/oauth-route";

export async function GET(request: NextRequest) {
  return startOAuth(request, "apple");
}
