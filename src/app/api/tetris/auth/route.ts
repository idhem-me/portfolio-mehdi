import { NextRequest, NextResponse } from "next/server";
import { gate, json } from "@/features/tetris/server/http";
import {
  authClient,
  googleConfigured,
  verifiedGoogleUser,
} from "@/features/tetris/server/auth";
import { suggestedNickname } from "@/features/tetris/auth/identity";
export async function GET(request: NextRequest) {
  const denied = gate(request);
  if (denied) return denied;
  if (!googleConfigured()) return json({ googleAvailable: false, user: null });
  const auth = await verifiedGoogleUser(request);
  return auth.apply(
    json({
      googleAvailable: true,
      user: auth.user
        ? { displayName: suggestedNickname(auth.user.user_metadata) }
        : null,
    }),
  );
}
export async function POST(request: NextRequest) {
  const denied = gate(request, true);
  if (denied) return denied;
  if (!googleConfigured()) return json({ user: null });
  const context = authClient(request);
  const { error } = await context.client.auth.signOut({ scope: "local" });
  if (error)
    return context.apply(
      NextResponse.json(
        { error: "Déconnexion impossible. Réessaie." },
        { status: 503 },
      ),
    );
  return context.apply(json({ user: null }));
}
