import { NextRequest, NextResponse } from "next/server";
import { json } from "@/features/tetris/server/http";
import { accountGate as gate } from "@/features/account/server/http";
import {
  authClient,
  appleConfigured,
  supabaseConfigured,
  verifiedAccountUser,
} from "@/features/tetris/server/auth";
import {
  accountDisplayName,
  accountProvider,
  suggestedNickname,
} from "@/features/tetris/auth/identity";
export async function GET(request: NextRequest) {
  const denied = gate(request);
  if (denied) return denied;
  if (!supabaseConfigured())
    return json({ googleAvailable: false, appleAvailable: false, user: null });
  const auth = await verifiedAccountUser(request);
  const provider = auth.user ? accountProvider(auth.user) : null;
  return auth.apply(
    json({
      googleAvailable: true,
      appleAvailable: appleConfigured(),
      user: auth.user
        ? {
            provider,
            displayName: provider
              ? accountDisplayName(provider, auth.user.user_metadata)
              : suggestedNickname(auth.user.user_metadata),
          }
        : null,
    }),
  );
}
export async function POST(request: NextRequest) {
  const denied = gate(request, true);
  if (denied) return denied;
  if (!supabaseConfigured()) return json({ user: null });
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
