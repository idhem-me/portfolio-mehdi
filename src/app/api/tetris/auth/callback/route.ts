import { NextRequest, NextResponse } from "next/server";
import { accountGate as gate } from "@/features/account/server/http";
import {
  authClient,
  supabaseConfigured,
} from "@/features/tetris/server/auth";
import type { OAuthProvider } from "@/features/tetris/auth/identity";
import { accountProvider } from "@/features/tetris/auth/identity";
import { safeGamePath } from "@/features/tetris/auth/identity";
import { resolveCardsChoice } from "@/features/cards/server/save-choice";
import { popupResult } from "@/features/tetris/server/oauth-popup";
export async function GET(request: NextRequest) {
  const denied = gate(request);
  if (denied) return denied;
  const path = safeGamePath(request.cookies.get("lava-auth-return")?.value);
  const origin = request.nextUrl.protocol + "//" + request.headers.get("host");
  let success = false;
  const context = supabaseConfigured() ? authClient(request) : null;
  const code = request.nextUrl.searchParams.get("code");
  const providerValue = request.cookies.get("lava-auth-provider")?.value;
  const expectedProvider: OAuthProvider =
    providerValue === "apple" ? "apple" : "google";
  if (context && code && !request.nextUrl.searchParams.has("error")) {
    try {
      const { error } = await context.client.auth.exchangeCodeForSession(code);
      if (!error) {
        const { data } = await context.client.auth.getUser();
        success = accountProvider(data.user) === expectedProvider;
        if (!success) await context.client.auth.signOut({ scope: "local" });
      }
      const ticket = request.cookies.get("cards-login-ticket")?.value;
      if (success && ticket) {
        const claim = await context.client.rpc("cards_claim_login", {
          secret: ticket,
        });
        if (claim.error) success = false;
        else if (claim.data === true) {
          const pending = await context.client.rpc("cards_pending_choice");
          if (pending.data)
            await resolveCardsChoice(
              context.client,
              "device",
              pending.data.revision,
              pending.data.sourceRevision,
            );
        }
      }
    } catch {}
  }
  const response =
    request.cookies.get("lava-auth-popup")?.value === "1"
      ? popupResult(success, expectedProvider)
      : NextResponse.redirect(
          new URL(path + (success ? "?auth=success" : "?auth=error"), origin),
          303,
        );
  response.cookies.set("cards-login-ticket", "", {
    path: "/api/tetris",
    httpOnly: true,
    maxAge: 0,
  });
  response.cookies.set("lava-auth-popup", "", {
    path: "/api/tetris",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
  });
  response.cookies.set("lava-auth-return", "", {
    path: "/api/tetris",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
  });
  response.cookies.set("lava-auth-provider", "", {
    path: "/api/tetris",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return context ? context.apply(response) : response;
}
