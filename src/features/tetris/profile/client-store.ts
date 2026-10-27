"use client";
import { useSyncExternalStore } from "react";
import { saveDraft, type ScoreDraft, type GameSummary } from "../auth/draft";
import { validateNickname } from "./fields";
export type PlayerProfile = {
  name: string;
  avatar: string | null;
  kind: "local" | "google";
  key: string;
  serverKey?: string;
};
export type LocalScore = {
  id: string;
  name: string;
  score: number;
  lines: number;
  created: number;
  identityKey: string | null;
  kind: "local" | "google" | "anonymous";
};
type Selection =
  | { kind: "anonymous"; profile: null }
  | { kind: "local" | "google"; profile: PlayerProfile };
type State = Selection & {
  loaded: boolean;
  loading: boolean;
  googleAvailable: boolean;
  online: boolean;
  error: string;
  busy: "login" | "logout" | "profile" | null;
  scores: LocalScore[];
};
const localKey = "tetris.local-profile.v2",
  scoresKey = "tetris.local-scores.v2",
  queueKey = "tetris.local-score-queue.v1";
const initial: State = {
  kind: "anonymous",
  profile: null,
  loaded: false,
  loading: false,
  googleAvailable: false,
  online: true,
  error: "",
  busy: null,
  scores: [],
};
let state: State = initial;
let local: PlayerProfile | null = null;
let loading: Promise<void> | null = null;
let generation = 0;
const listeners = new Set<() => void>();
function emit(patch: Partial<State>) {
  state = { ...state, ...patch } as State;
  listeners.forEach((listener) => listener());
}
export function setNetworkOnline(online: boolean) {
  emit({ online });
}
function select(profile: PlayerProfile | null) {
  return profile
    ? { kind: profile.kind, profile }
    : { kind: "anonymous" as const, profile: null };
}
export function subscribeProfile(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function identitySnapshot() {
  return state;
}
export function useIdentityState() {
  return useSyncExternalStore(
    subscribeProfile,
    identitySnapshot,
    () => initial,
  );
}
export function usePlayerProfile() {
  return useIdentityState().profile;
}
export function useProfileLoaded() {
  const state = useIdentityState();
  return state.loaded && !state.loading;
}
export function profileSnapshot() {
  return state.profile;
}
function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    throw Error(
      "Le navigateur ne peut pas enregistrer ces données. Libère un peu d’espace ou autorise le stockage, puis réessaie.",
    );
  }
}
function validProfile(value: unknown): value is PlayerProfile {
  const p = value as PlayerProfile;
  return (
    !!p &&
    typeof p.name === "string" &&
    typeof p.key === "string" &&
    /^[a-f0-9]{64}$/.test(p.key) &&
    (p.kind === "local" || p.kind === "google") &&
    (p.avatar === null || typeof p.avatar === "string")
  );
}
export async function loadProfile(force = false): Promise<void> {
  if (loading) return force ? loading.then(() => loadProfile(true)) : loading;
  if (state.loaded && !force) return;
  const id = ++generation,
    cached = read<unknown>(localKey, null);
  if (validProfile(cached) && cached.kind === "local") local = cached;
  if (!state.loaded)
    emit({
      ...select(local),
      scores: read<LocalScore[]>(scoresKey, []),
      loaded: true,
    });
  emit({ loading: true, online: navigator.onLine });
  loading = (async () => {
    try {
      const [p, a] = await Promise.all([
        fetch("/api/tetris/profile", {
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        }),
        fetch("/api/tetris/auth", {
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        }),
      ]);
      // A missing local-profile backend must not disable the independent Google login.
      if (!a.ok) throw Error();
      const [profile, auth] = await Promise.all([
        p.ok ? p.json() : Promise.resolve(null),
        a.json(),
      ]);
      if (id !== generation) return;
      if (validProfile(profile) && profile.kind === "local" && !local) {
        local = profile;
        write(localKey, local);
      }
      emit({
        ...select(
          validProfile(profile) && profile.kind === "google" ? profile : local,
        ),
        loading: false,
        loaded: true,
        googleAvailable: !!auth.googleAvailable,
        ...(!p.ok
          ? {
              error:
                "Serveur injoignable. Continue ici, ou connecte-toi avec Google.",
            }
          : state.error.startsWith("Serveur injoignable")
            ? { error: "" }
            : {}),
      });
      void syncLocalScores();
    } catch {
      if (id === generation)
        emit({
          loading: false,
          loaded: true,
          error: "Serveur injoignable. Continue sur cet appareil.",
        });
    } finally {
      loading = null;
    }
  })();
  return loading;
}
export async function saveProfile(rawName: string, avatar: string | null) {
  if (state.kind === "google")
    throw Error("Ton profil est géré par ton compte Google.");
  const name = validateNickname(rawName),
    key =
      local?.key ??
      Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
  if (state.busy) throw Error("Patiente un instant avant de réessayer.");
  ++generation;
  emit({ busy: "profile" });
  try {
    let next: PlayerProfile = { name, avatar, key, kind: "local" };
    if (navigator.onLine) {
      try {
        const r = await fetch("/api/tetris/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(5000),
          body: JSON.stringify({ name, avatar }),
        });
        if (r.status === 403)
          throw Error(
            "Ton compte Google a changé. Rouvre le profil avant de réessayer.",
          );
        if (r.status === 409)
          throw Error("Ce pseudo est déjà utilisé. Choisis-en un autre.");
        if (r.status === 400)
          throw Error("Vérifie ton pseudo et ta photo, puis réessaie.");
        if (r.ok) {
          const result = await r.json();
          if (validProfile(result) && result.kind === "local")
            next = {
              ...result,
              key: local?.key ?? result.key,
              serverKey: result.key,
            };
        }
      } catch (error) {
        if (error instanceof Error && /pseudo|photo|Google/.test(error.message))
          throw error;
      }
    }
    if (identitySnapshot().kind === "google")
      throw Error(
        "Ton compte Google a changé. Rouvre le profil avant de réessayer.",
      );
    write(localKey, next);
    local = next;
    ++generation;
    emit({ ...select(next), loaded: true, error: "" });
    return next;
  } finally {
    emit({ busy: null });
  }
}
let popupJob: Promise<void> | null = null;
export function login(draft?: ScoreDraft): Promise<void> {
  if (popupJob) return popupJob;
  if (state.busy) return Promise.resolve();
  if (!navigator.onLine) {
    emit({
      error:
        "Connexion Google impossible hors connexion. Vérifie ton réseau, puis réessaie.",
    });
    return Promise.resolve();
  }
  if (draft && !saveDraft(draft)) {
    emit({
      error:
        "Impossible de conserver cette partie. Reste sur cet écran et réessaie.",
    });
    return Promise.resolve();
  }
  const popup = window.open(
    "/api/tetris/auth/google?popup=1&returnTo=" +
      encodeURIComponent(location.pathname),
    "tetris-google",
    "popup,width=500,height=680",
  );
  if (!popup) {
    emit({
      error:
        "La fenêtre Google a été bloquée. Autorise les fenêtres de connexion, puis réessaie.",
    });
    return Promise.resolve();
  }
  emit({ busy: "login", error: "" });
  popupJob = new Promise<void>((resolve) => {
    let finishing = false;
    const finish = async (success: boolean) => {
      if (finishing) return;
      finishing = true;
      clearInterval(timer);
      clearTimeout(timeout);
      window.removeEventListener("message", receive);
      await loadProfile(true);
      if (success || state.kind === "google") popup.close();
      emit({
        busy: null,
        error:
          state.kind === "google"
            ? ""
            : "Connexion Google impossible ou annulée. Réessaie quand tu le souhaites.",
      });
      popupJob = null;
      resolve();
    };
    const receive = (event: MessageEvent) => {
      if (
        event.origin === location.origin &&
        event.source === popup &&
        event.data?.type === "tetris-google-auth"
      )
        void finish(event.data.ok === true);
    };
    const timer = setInterval(() => {
      if (popup.closed) void finish(false);
    }, 400);
    const timeout = setTimeout(() => {
      popup.close();
      void finish(false);
    }, 120000);
    window.addEventListener("message", receive);
  });
  return popupJob;
}
export async function logout() {
  emit({ busy: "logout", error: "" });
  try {
    const r = await fetch("/api/tetris/auth", {
      method: "POST",
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw Error();
    ++generation;
    emit({ ...select(local), busy: null, error: "" });
    return true;
  } catch {
    emit({
      busy: null,
      error: "Déconnexion impossible. Vérifie ta connexion et réessaie.",
    });
    return false;
  }
}
export type QueuedScore = {
  id: string;
  steps: unknown[];
  identity?: "google" | "guest";
  name?: string;
  opening?: boolean;
  recipient?: string;
  summary?: GameSummary;
  localOnly?: boolean;
};
async function sendScore(run: QueuedScore) {
  return fetch(
    run.identity === "google" || run.identity === "guest"
      ? "/api/tetris/leaderboard"
      : "/api/tetris/local-scores",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify(
        !run.identity &&
          run.recipient === state.profile?.key &&
          state.profile?.serverKey
          ? { ...run, recipient: state.profile.serverKey }
          : run,
      ),
    },
  );
}
function rememberScore(run: QueuedScore) {
  if (!run.summary) return;
  const existing = state.scores.find((s) => s.id === run.id);
  const score: LocalScore = {
    id: run.id,
    name: run.name ?? state.profile?.name ?? "Anonyme",
    score: run.summary.score,
    lines: run.summary.lines,
    created: existing?.created ?? Date.now(),
    identityKey: run.recipient ?? null,
    kind: run.identity === "guest" ? "anonymous" : state.kind,
  };
  if (existing && JSON.stringify(existing) === JSON.stringify(score)) return;
  const scores = [...state.scores.filter((s) => s.id !== run.id), score];
  write(scoresKey, scores);
  emit({ scores });
}
export async function saveDeviceScore(run: QueuedScore) {
  if (run.recipient && run.recipient !== state.profile?.key)
    throw Error(
      "Cette partie attend son identité d’origine. Reconnecte-toi pour la sauvegarder.",
    );
  rememberScore(run);
}
function queue(run: QueuedScore) {
  write(queueKey, [
    ...read<QueuedScore[]>(queueKey, []).filter((item) => item.id !== run.id),
    run,
  ]);
}
export type SubmitScoreResult =
  { ok: true } | { ok: false; reason?: "auth" | "network" | "identity" };

export async function submitLocalScore(
  run: QueuedScore,
  onSaved?: (result: { rank?: number | null }) => void,
): Promise<SubmitScoreResult> {
  if (run.recipient && run.recipient !== state.profile?.key)
    return { ok: false, reason: "identity" };
  try {
    rememberScore(run);
    if (run.opening || run.localOnly) {
      onSaved?.({});
      return { ok: true };
    }
    try {
      const r = await sendScore(run);
      if (!r.ok) {
        const auth = r.status === 401;
        throw Object.assign(Error(), { auth });
      }
      onSaved?.(await r.json());
      write(
        queueKey,
        read<QueuedScore[]>(queueKey, []).filter((item) => item.id !== run.id),
      );
      return { ok: true };
    } catch (error) {
      queue(run);
      if (!run.identity) {
        onSaved?.({});
        return { ok: true };
      }
      return {
        ok: false,
        reason:
          error instanceof Error &&
          "auth" in error &&
          (error as Error & { auth?: boolean }).auth
            ? "auth"
            : "network",
      };
    }
  } catch {
    return { ok: false, reason: "network" };
  }
}
export async function syncLocalScores() {
  if (!state.loaded || !navigator.onLine) return;
  for (const run of read<QueuedScore[]>(queueKey, [])) {
    if (!run.recipient && !run.identity && state.kind === "local") {
      run.recipient = state.profile.key;
      queue(run);
    }
    if (run.recipient && run.recipient !== state.profile?.key) continue;
    if (!run.recipient && run.identity !== "guest") continue;
    try {
      const r = await sendScore(run);
      if (r.ok)
        write(
          queueKey,
          read<QueuedScore[]>(queueKey, []).filter(
            (item) => item.id !== run.id,
          ),
        );
    } catch {
      return;
    }
  }
}
