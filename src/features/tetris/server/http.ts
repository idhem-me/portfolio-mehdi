import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { reportBackendFailure } from "./diagnostics";
import { leaderboardEnabled } from "../flags";
export function gate(request: NextRequest, mutation = false) {
  if (!leaderboardEnabled)
    return new NextResponse("Not Found", { status: 404 });
  if (
    mutation &&
    request.headers.get("origin") !==
      `${request.nextUrl.protocol}//${request.headers.get("host")}`
  )
    return new NextResponse("Forbidden", { status: 403 });
}
export function player(request: NextRequest) {
  const cookie = request.cookies.get("lava-player")?.value;
  return cookie && /^[a-f0-9]{64}$/.test(cookie)
    ? cookie
    : randomBytes(32).toString("hex");
}
export function json(data: unknown) {
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
// Only domain messages may reach the client; SDK errors can contain connection details.
const publicErrors = new Set([
  "Patientez une minute avant de rejouer en classement.",
  "Pseudonyme : 2 à 20 lettres, chiffres, espaces, points ou tirets.",
  "Session expirée ou déjà envoyée.",
  "Durée de partie invalide.",
  "Score déjà envoyé.",
  "Partie trop longue ou invalide.",
  "Actions après la fin.",
  "Action invalide.",
  "Partie inachevée ou trop longue.",
  "Partie trop longue.",
  "Envoi invalide.",
]);
export function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const isPublic = publicErrors.has(message);
  if (!isPublic) reportBackendFailure(error);
  return NextResponse.json(
    {
      error: isPublic
        ? message
        : "Classement indisponible. Votre record reste enregistré sur cet appareil.",
    },
    {
      status: isPublic ? 400 : 503,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    },
  );
}
