"use client";
import { useEffect } from "react";
import {
  loadProfile,
  useIdentityState,
  login,
  logout,
  syncLocalScores,
} from "../profile/client-store";
export function PlayerIdentityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    void loadProfile();
    const reload = () => void loadProfile(true).then(syncLocalScores);
    const sync = (event: StorageEvent) => {
      if (event.key?.startsWith("tetris.")) reload();
    };
    window.addEventListener("online", reload);
    window.addEventListener("focus", reload);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("online", reload);
      window.removeEventListener("focus", reload);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return children;
}
export function usePlayerIdentity() {
  const state = useIdentityState();
  return {
    ...state,
    auth: {
      loading: state.loading,
      googleAvailable: state.googleAvailable,
      user:
        state.kind === "google" ? { displayName: state.profile.name } : null,
    },
    login,
    logout,
    refresh: () => loadProfile(true),
    message: state.error,
  };
}
export { IdentitySelector as IdentityChoices } from "./identity-selector";
