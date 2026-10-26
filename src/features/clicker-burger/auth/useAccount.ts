import { useCallback, useEffect, useRef, useState } from "react";
export type Profile = {
  name: string;
  avatar: string | null;
  kind: "local" | "google";
  key: string;
};
export function validProfile(value: unknown): value is Profile {
  if (!value || typeof value !== "object") return false;
  const p = value as Profile;
  return (
    typeof p.name === "string" &&
    p.name.length <= 100 &&
    /^[a-f0-9]{64}$/.test(p.key) &&
    ["local", "google"].includes(p.kind) &&
    (p.avatar === null || typeof p.avatar === "string")
  );
}
export function accountSaveKey(profile: Profile | null) {
  return profile
    ? `clicker-burger.save.v1.${profile.key}`
    : "food-empire.save.v1";
}
const LOCAL_PROFILE_KEY = "tetris.local-profile.v2";
function readLocalProfile(): Profile | null {
  try {
    const cached = JSON.parse(
      localStorage.getItem(LOCAL_PROFILE_KEY) || "null",
    );
    return validProfile(cached) && cached.kind === "local" ? cached : null;
  } catch {
    return null;
  }
}
function writeLocalProfile(profile: Profile) {
  localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
}
function guestMode() {
  try {
    return localStorage.getItem("clicker-burger.profile-mode") === "guest";
  } catch {
    return false;
  }
}
export function useAccount() {
  const guest = useRef(guestMode());
  const [state, setState] = useState<{
    profile: Profile | null;
    loaded: boolean;
    available: boolean;
    online: boolean;
    busy: boolean;
    error: string;
  }>({
    profile: guestMode() ? null : readLocalProfile(),
    loaded: false,
    available: false,
    online: true,
    busy: false,
    error: "",
  });
  const cleanup = useRef<(() => void) | null>(null);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++request.current;
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
      if (!p.ok || !a.ok) throw Error();
      const [profile, auth] = await Promise.all([p.json(), a.json()]);
      if (validProfile(profile) && profile.kind === "local")
        writeLocalProfile(profile);
      if (id === request.current)
        setState((prev) => ({
          ...prev,
          profile:
            validProfile(profile) && profile.kind === "google"
              ? profile
              : guest.current
                ? null
                : validProfile(profile)
                  ? profile
                  : readLocalProfile(),
          loaded: true,
          available: auth.googleAvailable === true,
          online: true,
          error: "",
        }));
    } catch {
      if (id === request.current)
        setState((prev) => ({
          ...prev,
          loaded: true,
          online: false,
          available: false,
          error:
            "Service de compte indisponible. La partie reste sauvegardée sur cet appareil.",
        }));
    }
  }, []);
  useEffect(() => {
    const invalidate = () => {
      request.current++;
    };
    void refresh();
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    return () => {
      invalidate();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      cleanup.current?.();
    };
  }, [refresh]);
  const login = () => {
    if (state.busy || !state.available) return;
    const popup = window.open(
      "/api/tetris/auth/google?popup=1",
      "clicker-burger-google",
      "popup,width=500,height=680",
    );
    if (!popup) {
      setState((prev) => ({
        ...prev,
        error: "Autorisez la fenêtre de connexion Google.",
      }));
      return;
    }
    setState((prev) => ({ ...prev, busy: true, error: "" }));
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      cleanup.current?.();
      cleanup.current = null;
      void refresh().finally(() =>
        setState((prev) => ({ ...prev, busy: false })),
      );
    };
    const receive = (event: MessageEvent) => {
      if (
        event.source === popup &&
        [location.origin, "http://127.0.0.1:3000"].includes(event.origin) &&
        event.data?.type === "tetris-google-auth"
      )
        finish();
    };
    const timer = setInterval(() => {
      if (popup.closed) finish();
    }, 400);
    const timeout = setTimeout(() => {
      popup.close();
      finish();
    }, 120000);
    window.addEventListener("message", receive);
    cleanup.current = () => {
      clearInterval(timer);
      clearTimeout(timeout);
      window.removeEventListener("message", receive);
    };
  };
  const logout = async () => {
    setState((prev) => ({ ...prev, busy: true, error: "" }));
    try {
      const response = await fetch("/api/tetris/auth", {
        method: "POST",
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw Error();
      await refresh();
    } catch {
      setState((prev) => ({
        ...prev,
        error: "Déconnexion impossible. Réessayez.",
      }));
    } finally {
      setState((prev) => ({ ...prev, busy: false }));
    }
  };
  const saveProfile = async (name: string) => {
    const normalized = name.normalize("NFKC").trim();
    if (!/^[\p{L}\p{N} ._-]{2,20}$/u.test(normalized)) {
      setState((prev) => ({
        ...prev,
        error: "Pseudo : 2 à 20 lettres, chiffres, espaces, points ou tirets.",
      }));
      return false;
    }
    if (!state.online) {
      try {
        const key =
          state.profile?.kind === "local"
            ? state.profile.key
            : Array.from(crypto.getRandomValues(new Uint8Array(32)))
                .map((n) => n.toString(16).padStart(2, "0"))
                .join("");
        const profile: Profile = {
          key,
          name: normalized,
          avatar: state.profile?.kind === "local" ? state.profile.avatar : null,
          kind: "local",
        };
        writeLocalProfile(profile);
        guest.current = false;
        localStorage.setItem("clicker-burger.profile-mode", "local");
        setState((prev) => ({ ...prev, profile, error: "" }));
        return true;
      } catch {
        setState((prev) => ({
          ...prev,
          error: "Impossible d’enregistrer le profil sur cet appareil.",
        }));
        return false;
      }
    }
    setState((prev) => ({ ...prev, busy: true, error: "" }));
    try {
      const response = await fetch("/api/tetris/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          avatar: state.profile?.avatar ?? null,
          recipient: state.profile?.key ?? null,
        }),
        signal: AbortSignal.timeout(10000),
      });
      const body = await response.json();
      if (!response.ok || !validProfile(body))
        throw Error(
          typeof body.error === "string" ? body.error : "Profil invalide.",
        );
      if (body.kind === "local") writeLocalProfile(body);
      guest.current = false;
      localStorage.setItem("clicker-burger.profile-mode", "local");
      setState((prev) => ({ ...prev, profile: body }));
      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Profil indisponible.",
      }));
      return false;
    } finally {
      setState((prev) => ({ ...prev, busy: false }));
    }
  };
  const playGuest = () => {
    if (state.profile?.kind === "google") return;
    try {
      localStorage.setItem("clicker-burger.profile-mode", "guest");
    } catch {
      /* Optional. */
    }
    guest.current = true;
    setState((prev) => ({ ...prev, profile: null }));
  };
  const selectLocal = () => {
    const profile = readLocalProfile();
    if (!profile) return;
    guest.current = false;
    try {
      localStorage.setItem("clicker-burger.profile-mode", "local");
    } catch {
      /* Optional. */
    }
    setState((prev) => ({ ...prev, profile }));
  };
  return {
    ...state,
    refresh,
    login,
    logout,
    saveProfile,
    playGuest,
    selectLocal,
    hasLocalProfile: !!readLocalProfile(),
  };
}
