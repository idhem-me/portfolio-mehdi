"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { saveDraft, type ScoreDraft } from "../auth/draft";
import { usePlayerIdentity } from "./player-identity";
type GoogleApi = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        nonce: string;
        callback: (response: { credential: string }) => void;
        auto_select: boolean;
      }) => void;
      renderButton: (
        element: HTMLElement,
        options: {
          theme: string;
          size: string;
          text: string;
          locale: string;
          width: number;
          click_listener: () => void;
        },
      ) => void;
    };
  };
};
let pending: ((credential: string) => void) | null = null;
let setup: Promise<{ google: GoogleApi; nonce: string }> | null = null;
async function initialize() {
  if (setup) return setup;
  setup = (async () => {
    const response = await fetch("/api/tetris/auth/credential", {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const config = await response.json();
    if (!response.ok || !config.available)
      throw Error("Connexion Google indisponible pour le moment.");
    const google = await new Promise<GoogleApi>((resolve, reject) => {
      const current = (window as Window & { google?: GoogleApi }).google;
      if (current) {
        resolve(current);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      const timeout = setTimeout(() => {
        script.remove();
        reject(Error("Chargement Google impossible."));
      }, 15000);
      script.onload = () => {
        clearTimeout(timeout);
        const api = (window as Window & { google?: GoogleApi }).google;
        if (api) resolve(api);
        else reject(Error("Google indisponible."));
      };
      script.onerror = () => {
        clearTimeout(timeout);
        script.remove();
        reject(Error("Chargement Google impossible."));
      };
      document.head.appendChild(script);
    });
    google.accounts.id.initialize({
      client_id: config.clientId,
      nonce: config.nonce,
      auto_select: false,
      callback: (response) => pending?.(response.credential),
    });
    return { google, nonce: config.nonce };
  })().catch((error) => {
    setup = null;
    throw error;
  });
  return setup;
}
export function GoogleSignIn({
  draft,
  disabled = false,
}: {
  draft?: ScoreDraft;
  disabled?: boolean;
}) {
  const { refresh } = usePlayerIdentity();
  const host = useRef<HTMLDivElement>(null),
    latest = useRef({ draft, refresh });
  useEffect(() => {
    latest.current = { draft, refresh };
  });
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0),
    [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    let observer: ResizeObserver | undefined;
    const handler = async (credential: string, nonce: string) => {
      if (!active) return;
      setBusy(true);
      setError("");
      try {
        const response = await fetch("/api/tetris/auth/credential", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential, nonce }),
          signal: AbortSignal.timeout(15000),
        });
        const data = await response.json();
        if (!response.ok || !data.ok)
          throw Error(data.error || "Connexion impossible.");
        setup = null;
        await latest.current.refresh();
      } catch (cause) {
        setup = null;
        setError(
          cause instanceof Error ? cause.message : "Connexion impossible.",
        );
      } finally {
        if (active) setBusy(false);
      }
    };
    void initialize()
      .then(({ google, nonce }) => {
        if (!active || !host.current) return;
        const element = host.current;
        let previousWidth = 0;
        const render = () => {
          const width = Math.min(320, Math.floor(element.clientWidth || 280));
          if (width === previousWidth) return;
          previousWidth = width;
          element.replaceChildren();
          google.accounts.id.renderButton(element, {
            theme: "outline",
            size: "large",
            text: "continue_with",
            locale: "fr",
            width,
            click_listener: () => {
              if (latest.current.draft && !saveDraft(latest.current.draft)) {
                setError(
                  "Le score reste sur cet écran. Réessaie ou choisis un pseudo.",
                );
                pending = null;
                return;
              }
              pending = (credential) => void handler(credential, nonce);
            },
          });
        };
        render();
        observer = new ResizeObserver(render);
        observer.observe(element);
        setReady(true);
      })
      .catch((cause) => {
        if (active) setError(cause.message);
      });
    return () => {
      active = false;
      observer?.disconnect();
    };
  }, [retry]);
  return (
    <div className="space-y-2" aria-busy={busy}>
      <div
        ref={host}
        className={disabled || busy ? "pointer-events-none opacity-50" : ""}
        inert={disabled || busy}
        aria-label="Continuer avec Google"
      />
      {!ready && !error && (
        <p role="status" className="text-sm text-muted-foreground">
          Chargement Google…
        </p>
      )}
      {busy && (
        <p role="status" className="text-sm">
          Connexion…
        </p>
      )}
      {error && (
        <>
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setError("");
              setReady(false);
              setRetry((v) => v + 1);
            }}
          >
            Réessayer Google
          </Button>
        </>
      )}
    </div>
  );
}
