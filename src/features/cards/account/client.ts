"use client";
import { useIdentityState } from "@/features/account/client-store";
import { useEffect, useSyncExternalStore } from "react";
import type { CardsSave } from "../persistence/types";
import type { CardsSettings } from "../feel/config";
export type SavePreview = {
  cards: number;
  credits: number;
  lastPlayedAt: string;
};
export type SaveChoice = {
  revision: number;
  sourceRevision: number;
  device: SavePreview;
  account: SavePreview;
};
export type CardsAccount = {
  pendingChoice: SaveChoice | null;
  legacyProcessed?: boolean;
  profile: {
    credits: number;
    free_boosters: number;
    theme: "default" | "blue" | "red";
    equipped_avatar_frame: string | null;
    custom_avatar_enabled: boolean;
    custom_avatar_path: string | null;
    avatar_version: number;
    settings: CardsSettings;
  };
  save: CardsSave;
  cosmetics: string[];
  saveRevision: number;
  lastPlayedAt: string;
  user: {
    id: string;
    anonymous: boolean;
    name: string | null;
    avatar: string | null;
  };
};
type State = {
  data: CardsAccount | null;
  error: string | null;
  loading: boolean;
};
let state: State = { data: null, error: null, loading: false };
const server: State = { data: null, error: null, loading: true };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());
let pending: Promise<CardsAccount> | null = null;
export async function cardsRequest(
  action = "state",
  payload: Record<string, unknown> = {},
  requestId = crypto.randomUUID(),
): Promise<CardsAccount> {
  const response = await fetch("/api/tetris/cards/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload, requestId }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Connexion indisponible.");
  if (result.legacyProcessed && !result.pendingChoice) {
    try {
      Object.keys(localStorage)
        .filter(
          (key) =>
            key === "cards.save.v1" ||
            key === "cards.cloud-binding.v1" ||
            key === "cards.settings.v1" ||
            key.startsWith("cards.backup."),
        )
        .forEach((key) => localStorage.removeItem(key));
    } catch {}
  }
  if (
    state.data?.user.id === result.user.id &&
    state.data!.saveRevision > result.saveRevision
  )
    return state.data!;
  state = { data: result, error: null, loading: false };
  emit();
  return result;
}
export function loadCardsAccount() {
  if (pending) return pending;
  state = { ...state, loading: true };
  emit();
  pending = cardsRequest()
    .catch((error) => {
      state = { ...state, error: error.message, loading: false };
      emit();
      throw error;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}
export function useCardsAccount() {
  const identity = useIdentityState();
  useEffect(() => {
    if (
      identity.loaded &&
      !identity.busy &&
      state.data &&
      state.data.user.anonymous ===
        (identity.kind !== "google" && identity.kind !== "apple")
    )
      void loadCardsAccount().catch(() => {});
  }, [identity.loaded, identity.busy, identity.kind]);
  const current = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state,
    () => server,
  );
  useEffect(() => {
    if (!state.data && !state.loading) void loadCardsAccount().catch(() => {});
    const refresh = () => {
      void loadCardsAccount().catch(() => {});
    };
    const identityMessage = (event: MessageEvent) => {
      if (
        event.origin === location.origin &&
        (event.data?.type === "tetris-google-auth" ||
          event.data?.type === "tetris-apple-auth")
      )
        refresh();
    };
    window.addEventListener("message", identityMessage);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("message", identityMessage);
    };
  }, []);
  return current;
}
