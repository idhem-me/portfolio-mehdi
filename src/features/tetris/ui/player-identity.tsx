"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { loadProfile, syncLocalScores } from "../profile/client-store";
import { GoogleSignIn } from "./google-sign-in";
import { Button } from "@/components/ui/button";
import { leaderboardEnabled } from "../flags";
import { saveDraft, type ScoreDraft } from "../auth/draft";
type AuthState = {
  googleAvailable: boolean;
  user: { displayName: string } | null;
  loading: boolean;
};
type Identity = {
  auth: AuthState;
  mode: "guest" | "google";
  choose: (mode: "guest" | "google") => void;
  login: (draft?: ScoreDraft) => void;
  logout: () => void;
  refresh: () => Promise<void>;
  message: string;
};
const Context = createContext<Identity | null>(null);
export function PlayerIdentityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [auth, setAuth] = useState<AuthState>({
      googleAvailable: false,
      user: null,
      loading: leaderboardEnabled,
    }),
    [mode, setMode] = useState<"guest" | "google">("guest"),
    [message, setMessage] = useState("");
  const chosen = useRef(false);
  useEffect(() => {
    void loadProfile().then(() => syncLocalScores());
    const reload = () => void loadProfile(true).then(() => syncLocalScores());
    window.addEventListener("online", reload);
    window.addEventListener("focus", reload);
    return () => {
      window.removeEventListener("online", reload);
      window.removeEventListener("focus", reload);
    };
  }, []);
  useEffect(() => {
    if (!leaderboardEnabled) return;
    const abort = new AbortController();
    const url = new URL(location.href),
      cancelled = url.searchParams.get("auth") === "error";
    if (url.searchParams.has("auth")) {
      url.searchParams.delete("auth");
      history.replaceState(history.state, "", url);
    }
    fetch("/api/tetris/auth", {
      signal: AbortSignal.any([abort.signal, AbortSignal.timeout(10000)]),
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) => {
        if (abort.signal.aborted) return;
        setAuth({ ...data, loading: false });
        if (data.user && !chosen.current) setMode("google");
        if (cancelled) setMessage("Connexion Google annulée.");
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setAuth({ googleAvailable: false, user: null, loading: false });
      });
    return () => abort.abort();
  }, []);
  const refresh = async () => {
    setAuth((state) => ({ ...state, loading: true }));
    try {
      const response = await fetch("/api/tetris/auth", {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw Error("Connexion indisponible.");
      const data = await response.json();
      await loadProfile(true);
      setAuth({ ...data, loading: false });
      if (data.user) setMode("google");
    } catch (error) {
      setAuth((state) => ({ ...state, loading: false }));
      throw error;
    }
  };
  const choose = (value: "guest" | "google") => {
    chosen.current = true;
    setMode(value);
  };
  const login = (draft?: ScoreDraft) => {
    if (draft && !saveDraft(draft)) {
      setMessage(
        "Impossible de conserver cette partie. Envoyez votre score avec un pseudo.",
      );
      return;
    }
    // OAuth must leave the app document so PKCE cookies and the provider redirect are processed.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(
      "/api/tetris/auth/google?returnTo=" +
        encodeURIComponent(location.pathname),
    );
  };
  const logout = async () => {
    setAuth((s) => ({ ...s, loading: true }));
    try {
      const response = await fetch("/api/tetris/auth", {
        method: "POST",
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw Error();
      setAuth((s) => ({ ...s, user: null, loading: false }));
      choose("guest");
      await loadProfile(true);
    } catch {
      setAuth((s) => ({ ...s, loading: false }));
      setMessage("Déconnexion impossible pour le moment.");
    }
  };
  return (
    <Context.Provider
      value={{ auth, mode, choose, login, logout, refresh, message }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePlayerIdentity() {
  const value = useContext(Context);
  if (!value) throw Error("PlayerIdentityProvider missing");
  return value;
}
export function IdentityChoices({
  draft,
  disabled = false,
}: {
  draft?: ScoreDraft;
  disabled?: boolean;
}) {
  const { auth, mode, choose, logout, message } = usePlayerIdentity();
  return (
    <div className="lava-identity">
      <div
        className="lava-identity-options"
        role="group"
        aria-label="Identité pour le classement"
      >
        <Button
          type="button"
          variant={mode === "guest" ? "secondary" : "outline"}
          aria-pressed={mode === "guest"}
          disabled={disabled}
          onClick={() => choose("guest")}
        >
          Avec un pseudo
        </Button>
        {!auth.user && <GoogleSignIn draft={draft} disabled={disabled} />}
      </div>
      {auth.user && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span>Google connecté · {auth.user.displayName}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled || auth.loading}
            onClick={logout}
          >
            Se déconnecter
          </Button>
        </div>
      )}
      {message && (
        <p role="status" className="text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
