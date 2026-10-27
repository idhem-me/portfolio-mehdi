"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { GoogleSignIn } from "@/features/account/ui/google-sign-in";
import { useIdentityState } from "@/features/account/client-store";

const NOTICE_KEY = "cards.local-save-notice.v1";

/** Account login currently links identity only; never promise cloud card storage. */
export function LocalSaveNotice({
  boostersOpened,
}: {
  boostersOpened: number;
}) {
  const titleId = useId();
  const identity = useIdentityState();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(NOTICE_KEY) === "dismissed";
    } catch {
      return false;
    }
  });
  if (boostersOpened < 3 || dismissed || identity.kind === "google")
    return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(NOTICE_KEY, "dismissed");
    } catch {
      /* Keep the choice for this visit. */
    }
  };

  return (
    <section
      className="cards-local-save-notice mx-4 mb-4 space-y-3 rounded-xl border border-border bg-card p-4"
      aria-labelledby={titleId}
    >
      <h2 id={titleId} className="text-base font-medium">
        Ta collection est sauvegardée sur cet appareil
      </h2>
      <p className="text-sm text-muted-foreground">
        Tes cartes et tes boosters restent dans ce navigateur. Effacer ses
        données ou changer d’appareil ne permet pas de retrouver cette
        progression.
      </p>
      <p className="text-sm text-muted-foreground">
        Connecte-toi avec Google pour sauvegarder ta progression et la retrouver
        sur tes autres appareils.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button variant="outline" className="min-h-11" onClick={dismiss}>
          Continuer sur cet appareil
        </Button>
        <GoogleSignIn />
      </div>
      {identity.loaded && !identity.googleAvailable && (
        <p className="text-xs text-muted-foreground">
          La connexion Google n’est pas disponible dans cet environnement.
        </p>
      )}
      {identity.error && (
        <p role="alert" className="text-sm text-destructive">
          {identity.error}
        </p>
      )}
    </section>
  );
}
