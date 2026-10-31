"use client";
import { Button } from "@/components/ui/button";
import { loginWithProvider, useIdentityState } from "../client-store";
import type { ScoreDraft } from "../../tetris/auth/draft";

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5 shrink-0">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.8 6-15Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.7-5.1c-1.8 1.2-4.1 2-6.8 2-5.2 0-9.6-3.5-11.2-8.2H5.9v5.2A20 20 0 0 0 24 44Z" />
      <path fill="#FBBC05" d="M12.8 27.9a12 12 0 0 1 0-7.8v-5.2H5.9a20 20 0 0 0 0 18.2l6.9-5.2Z" />
      <path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.9-5.9A19.7 19.7 0 0 0 24 4 20 20 0 0 0 5.9 14.9l6.9 5.2C14.4 15.4 18.8 12 24 12Z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 fill-current">
      <path d="M16.37 12.1c.02 2.17 1.9 2.9 1.92 2.91-.02.05-.3 1.04-.99 2.06-.6.88-1.23 1.75-2.22 1.77-.97.02-1.28-.57-2.4-.57-1.11 0-1.46.55-2.37.59-.95.04-1.67-.95-2.27-1.83-1.24-1.8-2.19-5.08-.92-7.3.63-1.1 1.76-1.8 2.98-1.82.93-.02 1.8.63 2.37.63.57 0 1.64-.78 2.77-.67.47.02 1.8.19 2.65 1.44-.07.04-1.58.92-1.56 2.79ZM14.55 6.51c.5-.6.84-1.43.75-2.26-.72.03-1.6.48-2.12 1.08-.47.54-.88 1.38-.77 2.19.81.06 1.64-.41 2.14-1.01Z" />
    </svg>
  );
}

export function ProviderSignIn({
  provider,
  draft,
  disabled = false,
  variant = "secondary",
  label,
  layout = "vertical",
}: {
  provider: "google" | "apple";
  draft?: ScoreDraft;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  label?: string;
  layout?: "vertical" | "horizontal";
}) {
  const state = useIdentityState();
  const apple = provider === "apple";
  const available = apple ? state.appleAvailable : state.googleAvailable;
  const serverUnavailable = state.error.startsWith("Serveur injoignable");
  const name = apple ? "Apple" : "Google";
  if (state.kind === "google" || state.kind === "apple") return null;
  return (
    <Button
      type="button"
      variant={variant}
      className={`identity-action ${layout === "horizontal" ? "w-full sm:w-fit" : ""}`}
      disabled={
        disabled ||
        !state.loaded ||
        !!state.busy ||
        state.loading ||
        !state.online ||
        serverUnavailable ||
        !available
      }
      aria-busy={state.busy === "login"}
      onClick={() => void loginWithProvider(provider, draft)}
    >
      {state.busy === "login" ? (
        "Connexion en cours…"
      ) : (
        <>
          {apple ? <AppleMark /> : <GoogleMark />}
          {label ?? `Se connecter avec ${name}`}
        </>
      )}
    </Button>
  );
}

export function GoogleSignIn(props: Omit<Parameters<typeof ProviderSignIn>[0], "provider">) {
  return <ProviderSignIn provider="google" {...props} />;
}

export function AppleSignIn(props: Omit<Parameters<typeof ProviderSignIn>[0], "provider">) {
  return <ProviderSignIn provider="apple" {...props} />;
}

export function OAuthSignInButtons({
  variant = "secondary",
  googleLabel,
  draft,
  disabled = false,
  layout = "vertical",
}: {
  variant?: "primary" | "secondary";
  googleLabel?: string;
  draft?: ScoreDraft;
  disabled?: boolean;
  layout?: "vertical" | "horizontal";
}) {
  const state = useIdentityState();
  return (
    <div
      data-provider-buttons="true"
      className={
        layout === "horizontal"
          ? "flex w-full flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start"
          : "flex w-full min-w-0 flex-col gap-2"
      }
    >
      <GoogleSignIn
        variant={variant}
        label={googleLabel}
        draft={draft}
        disabled={disabled}
        layout={layout}
      />
      <AppleSignIn
        variant={variant}
        draft={draft}
        disabled={disabled}
        layout={layout}
      />
      {state.error.startsWith("Serveur injoignable") && (
        <p className="basis-full text-sm text-muted-foreground" role="status">
          Connexion temporairement indisponible. Tu peux jouer ; tes records restent sauvegardés sur cet appareil.
        </p>
      )}
      {!state.error.startsWith("Serveur injoignable") && state.loaded && !state.loading && state.appleAvailable === false && (
        <p
          className={`text-xs text-muted-foreground ${layout === "horizontal" ? "basis-full" : ""}`}
        >
          La connexion Apple n’est pas activée dans cet environnement.
        </p>
      )}
    </div>
  );
}
