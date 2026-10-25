"use client";
import { useSyncExternalStore } from "react";
export type PlayerProfile = {
  name: string;
  avatar: string | null;
  kind: "local" | "google";
  key: string;
};
let profile: PlayerProfile | null = null;
let loaded = false;
let loading: Promise<void> | null = null;
let version = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
export function subscribeProfile(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function profileSnapshot() {
  return loaded ? profile : null;
}
export function usePlayerProfile() {
  return useSyncExternalStore(subscribeProfile, profileSnapshot, () => null);
}
export function useProfileLoaded() {
  return useSyncExternalStore(
    subscribeProfile,
    () => loaded,
    () => false,
  );
}
export function loadProfile(force = false): Promise<void> {
  if (force && loading) return loading.then(() => loadProfile(true));
  if (force) {
    loaded = false;
    emit();
  }
  if (loading || loaded) return loading ?? Promise.resolve();
  const generation = ++version;
  loading = fetch("/api/tetris/profile", {
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  })
    .then(async (r) => {
      if (!r.ok) throw Error();
      const data = await r.json();
      if (generation !== version) return;
      profile = data;
      loaded = true;
      emit();
    })
    .catch(() => {
      if (generation === version) {
        loaded = false;
        emit();
      }
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}
export async function saveProfile(name: string, avatar: string | null) {
  const r = await fetch("/api/tetris/profile", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, avatar, recipient: profile?.key ?? null }),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "Profil indisponible.");
  ++version;
  profile = data;
  loaded = true;
  emit();
  return data as PlayerProfile;
}
const queueKey = "tetris.local-score-queue.v1";
type QueuedScore = {
  id: string;
  steps: unknown[];
  identity?: "google";
  name?: string;
  opening?: boolean;
  recipient: string;
};
function readQueue(): QueuedScore[] {
  try {
    const value = JSON.parse(localStorage.getItem(queueKey) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
async function sendScore(run: QueuedScore) {
  return run.identity === "google"
    ? fetch("/api/tetris/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify(run),
      })
    : fetch("/api/tetris/local-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify(run),
      });
}
export async function submitLocalScore(
  run: QueuedScore,
  onSaved?: (result: { rank?: number | null }) => void,
) {
  try {
    const r = await sendScore(run);
    if (!r.ok) throw Error();
    onSaved?.(await r.json());
    try {
      localStorage.setItem(
        queueKey,
        JSON.stringify(readQueue().filter((item) => item.id !== run.id)),
      );
    } catch {}
    return true;
  } catch {
    try {
      const queue = readQueue().filter((item) => item.id !== run.id);
      queue.push(run);
      const json = JSON.stringify(queue);
      localStorage.setItem(queueKey, json);
    } catch {}
    return false;
  }
}
export async function syncLocalScores() {
  if (!loaded || !profile || !navigator.onLine) return;
  for (const run of readQueue()) {
    if (!run.recipient && !run.identity && profile.kind === "local")
      run.recipient = profile.key;
    if (!run.recipient || run.recipient !== profile.key) continue;
    try {
      const r = await sendScore(run);
      if (r.ok || r.status === 409)
        localStorage.setItem(
          queueKey,
          JSON.stringify(readQueue().filter((item) => item.id !== run.id)),
        );
    } catch {
      return;
    }
  }
}
