"use client";
import { Button } from "@/components/ui/button";
import { login, useIdentityState } from "../client-store";
import type { ScoreDraft } from "../../tetris/auth/draft";
export function GoogleSignIn({
  draft,
  disabled = false,
  variant = "secondary",
  label = "Se connecter avec Google",
}: {
  draft?: ScoreDraft;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  label?: string;
}) {
  const state = useIdentityState();
  if (state.kind === "google") return null;
  return (
    <Button
      type="button"
      variant={variant}
      className="identity-action"
      disabled={
        disabled ||
        !state.loaded ||
        !!state.busy ||
        state.loading ||
        !state.online ||
        !state.googleAvailable
      }
      aria-busy={state.busy === "login"}
      onClick={() => void login(draft)}
    >
      {state.busy === "login" ? "Connexion à Google…" : label}
    </Button>
  );
}
