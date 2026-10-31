import { NextResponse } from "next/server";
import type { OAuthProvider } from "../auth/identity";
export function popupResult(ok: boolean, provider: OAuthProvider = "google") {
  const label = provider === "apple" ? "Apple" : "Google";
  return new NextResponse(
    `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Connexion ${label}</title><body><p>${ok ? "Connexion réussie. Tu peux revenir au jeu." : `Connexion ${label} impossible ou annulée. Reviens au jeu pour réessayer.`}</p><script>if(window.opener){window.opener.postMessage({type:"tetris-${provider}-auth",ok:${ok}},location.origin);window.close();}</script></body></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy":
          "default-src 'none'; script-src 'unsafe-inline'; frame-ancestors 'none'",
      },
    },
  );
}
