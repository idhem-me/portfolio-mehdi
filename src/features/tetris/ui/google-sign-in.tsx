"use client";
import { Button } from "@/components/ui/button";
import { login, useIdentityState } from "../profile/client-store";
import type { ScoreDraft } from "../auth/draft";
export function GoogleSignIn({
  draft,
  disabled = false,
}: {
  draft?: ScoreDraft;
  disabled?: boolean;
}) {
  const state = useIdentityState();
  if (state.kind === "google") return null;
  return (
    <Button
      type="button"
      variant="accent"
      className="identity-action"
      disabled={disabled || !state.loaded || !!state.busy || state.loading}
      aria-busy={state.busy === "login"}
      onClick={() => void login(draft)}
    >
      {state.busy === "login"
        ? "Connexion à Google…"
        : "Se connecter avec Google"}
    </Button>
  );
}
