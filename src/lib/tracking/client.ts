"use client";
import { deltaLimits } from "./limits";
import { getConsent, subscribeConsent } from "@/lib/analytics/consent";
import { track as capture } from "@/lib/analytics/events";
export const counters = [
  "mouse_px",
  "clicks",
  "scroll_px",
  "key_presses",
  "active_ms",
  "brush_strokes",
  "colors_used",
  "games_played",
  "cta_clicks",
  "theme_toggles",
  "lang_changes",
] as const;
export type Counter = (typeof counters)[number];
type Game = { game: string; score: number; at: string };
let visitor = "",
  session = "",
  running = false,
  last = 0;
let values: Record<string, number> = {},
  pages: Record<string, number> = {},
  games: Game[] = [];
let currentPath = "";
let lifetime: Record<string, number> = {};
let pendingInfo: { id: string; delta: Record<string, number> } | null = null;
let emitted = new Set<string>();
function createId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
const colors = new Set<string>();
const played = new Set<string>();
function event(name: string) {
  if (!emitted.has(name)) {
    emitted.add(name);
    sessionStorage.setItem(
      "backoffice_events_" + session,
      JSON.stringify([...emitted]),
    );
    capture(name, { visitor_id: visitor, session_id: session });
  }
}
export const track = {
  increment(key: Counter, n = 1) {
    if (!running || getConsent() !== "granted" || n <= 0) return;
    values[key] = (values[key] || 0) + n;
    lifetime[key] = (lifetime[key] || 0) + n;
    if (key === "brush_strokes") event("brush_used");
    if (key === "cta_clicks") event("cta_clicked");
  },
  color(color: string) {
    if (running && !colors.has(color)) {
      colors.add(color);
      sessionStorage.setItem(
        "backoffice_colors_" + session,
        JSON.stringify([...colors]),
      );
      track.increment("colors_used");
    }
  },
  game(game: string, score = 0) {
    if (!running) return;
    if (game !== "tetris" && played.has(game)) return;
    played.add(game);
    sessionStorage.setItem(
      "backoffice_played_" + session,
      JSON.stringify([...played]),
    );
    track.increment("games_played");
    games.push({ game, score, at: new Date().toISOString() });
    games = games.slice(-20);
    event("game_played");
  },
  page(path: string) {
    if (running && path !== currentPath) {
      currentPath = path;
      pages[path] = (pages[path] || 0) + 1;
      lifetime.pages = (lifetime.pages || 0) + 1;
    }
  },
  snapshot() {
    return {
      total: { ...lifetime },
      unsent: {
        ...values,
        pages: Object.values(pages).reduce((a, b) => a + b, 0),
      },
      pending: pendingInfo,
    };
  },
  ids() {
    return { visitor, session };
  },
};
export function startTracking() {
  let cleanup = () => {};
  let applied: string | null | undefined;
  const remove = async () => {
    const id = localStorage.getItem("backoffice_delete");
    if (!id) return;
    try {
      const r = await fetch("/api/backoffice/me", {
        method: "DELETE",
        headers: { "x-visitor-id": id },
      });
      if (r.ok) localStorage.removeItem("backoffice_delete");
    } catch {}
  };
  function apply() {
    const status = getConsent();
    if (status === applied) return;
    applied = status;
    cleanup();
    running = false;
    if (getConsent() !== "granted") {
      const id = localStorage.getItem("backoffice_visitor");
      if (id) localStorage.setItem("backoffice_delete", id);
      localStorage.removeItem("backoffice_visitor");
      for (const key of Object.keys(sessionStorage))
        if (key.startsWith("backoffice_")) sessionStorage.removeItem(key);
      visitor = "";
      session = "";
      lifetime = {};
      pendingInfo = null;
      void remove();
      return;
    }
    void remove();
    visitor = localStorage.getItem("backoffice_visitor") || createId();
    localStorage.setItem("backoffice_visitor", visitor);
    const oldActivity = Number(
      sessionStorage.getItem("backoffice_activity") || 0,
    );
    session =
      Date.now() - oldActivity > 1800000
        ? createId()
        : sessionStorage.getItem("backoffice_session") || createId();
    sessionStorage.setItem("backoffice_session", session);
    lifetime = {};
    pendingInfo = null;
    currentPath = "";
    values = {};
    pages = {};
    games = [];
    try {
      emitted = new Set(
        JSON.parse(
          sessionStorage.getItem("backoffice_events_" + session) || "[]",
        ),
      );
    } catch {
      emitted = new Set();
    }
    colors.clear();
    played.clear();
    try {
      for (const c of JSON.parse(
        sessionStorage.getItem("backoffice_colors_" + session) || "[]",
      ))
        colors.add(c);
      for (const g of JSON.parse(
        sessionStorage.getItem("backoffice_played_" + session) || "[]",
      ))
        played.add(g);
    } catch {}
    running = true;
    last = Date.now();
    sessionStorage.setItem("backoffice_activity", String(last));
    track.page(location.pathname);
    let context: object | undefined = {
      device: /iPad|Tablet/i.test(navigator.userAgent)
        ? "tablet"
        : /Mobile/i.test(navigator.userAgent)
          ? "mobile"
          : "desktop",
      browser: /Firefox/i.test(navigator.userAgent)
        ? "Firefox"
        : /Edg/i.test(navigator.userAgent)
          ? "Edge"
          : /Chrome/i.test(navigator.userAgent)
            ? "Chrome"
            : "Safari",
      lang: document.documentElement.lang,
      width:
        innerWidth < 640 ? "small" : innerWidth < 1024 ? "medium" : "large",
    };
    if (sessionStorage.getItem("backoffice_context_" + session))
      context = undefined;
    const abort = new AbortController();
    let pending: string | null = null,
      sending = false,
      previous = Date.now(),
      x: number | undefined,
      y: number | undefined,
      exited = false,
      frame = 0,
      sx = scrollX,
      sy = scrollY;
    function flush(beacon = false) {
      if (!running || getConsent() !== "granted" || sending) return;
      if (!pending) {
        if (
          !Object.keys(values).length &&
          !Object.keys(pages).length &&
          !games.length &&
          !context
        )
          return;
        const batch = {
          visitor_id: visitor,
          session_id: session,
          batch_id: createId(),
          delta: Object.fromEntries(
            Object.entries(values).map(([k, n]) => [
              k,
              Math.min(n, deltaLimits[k]),
            ]),
          ),
          pages: {} as Record<string, number>,
          games: [] as Game[],
          context,
        };
        for (const [p, n] of Object.entries(pages)) {
          batch.pages[p] = n;
          if (new TextEncoder().encode(JSON.stringify(batch)).length >= 1950) {
            delete batch.pages[p];
            break;
          }
          delete pages[p];
        }
        while (games.length) {
          batch.games.push(games[0]);
          if (new TextEncoder().encode(JSON.stringify(batch)).length >= 1950) {
            batch.games.pop();
            break;
          }
          games.shift();
        }
        pendingInfo = {
          id: batch.batch_id,
          delta: {
            ...batch.delta,
            pages: Object.values(batch.pages).reduce((a, b) => a + b, 0),
          },
        };
        pending = JSON.stringify(batch);
        for (const [k, n] of Object.entries(batch.delta)) {
          values[k] -= n;
          if (values[k] === 0) delete values[k];
        }
        context = undefined;
      }
      if (beacon) {
        if (navigator.sendBeacon("/api/track", pending)) {
          sessionStorage.setItem("backoffice_context_" + session, "1");
          pending = null;
        }
        return;
      }
      sending = true;
      void fetch("/api/track", {
        method: "POST",
        body: pending,
        signal: abort.signal,
      })
        .then((r) => {
          if (r.ok) {
            sessionStorage.setItem("backoffice_context_" + session, "1");
            pending = null;
            pendingInfo = null;
          }
        })
        .catch(() => {})
        .finally(() => {
          sending = false;
        });
    }
    function interact() {
      const now = Date.now();
      if (now - last > 1800000) {
        flush(true);
        session = createId();
        sessionStorage.setItem("backoffice_session", session);
        emitted.clear();
        colors.clear();
        played.clear();
        context = {
          device: /Mobile/i.test(navigator.userAgent) ? "mobile" : "desktop",
          browser: /Firefox/i.test(navigator.userAgent)
            ? "Firefox"
            : /Chrome/i.test(navigator.userAgent)
              ? "Chrome"
              : "Safari",
          lang: document.documentElement.lang,
          width:
            innerWidth < 640 ? "small" : innerWidth < 1024 ? "medium" : "large",
        };
        x = undefined;
        y = undefined;
        currentPath = "";
        track.page(location.pathname);
      }
      last = now;
    }
    const click = (e: MouseEvent) => {
      if (
        (e.target as Element).closest("[data-analytics-action=consent_accept]")
      )
        return;
      interact();

      track.increment("clicks");
      const a = (e.target as Element).closest("a");
      if (a && (a.host !== location.host || a.pathname.endsWith("/contact")))
        track.increment("cta_clicks");
    };
    const key = () => {
      interact();
      track.increment("key_presses");
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      interact();
      if (frame) return;
      frame = requestAnimationFrame(() => {
        if (x !== undefined && y !== undefined)
          track.increment(
            "mouse_px",
            Math.round(Math.hypot(e.clientX - x, e.clientY - y)),
          );
        x = e.clientX;
        y = e.clientY;
        frame = 0;
      });
    };
    const scroll = () => {
      interact();
      track.increment(
        "scroll_px",
        Math.round(Math.abs(scrollX - sx) + Math.abs(scrollY - sy)),
      );
      sx = scrollX;
      sy = scrollY;
    };
    const visibility = () => {
      if (document.hidden) {
        if (!exited) {
          flush(true);
          exited = true;
        }
      } else exited = false;
      previous = Date.now();
      x = undefined;
      y = undefined;
    };
    const hide = () => {
      if (!exited) {
        flush(true);
        exited = true;
      }
    };
    document.addEventListener("click", click);
    document.addEventListener("keydown", key);
    document.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", hide);
    const clock = setInterval(() => {
      const now = Date.now();
      sessionStorage.setItem("backoffice_activity", String(last));
      if (!document.hidden)
        track.increment(
          "active_ms",
          Math.max(0, Math.min(now, last + 60000) - previous),
        );
      previous = now;
    }, 1000);
    const timer = setInterval(() => flush(), 30000);
    cleanup = () => {
      abort.abort();
      clearInterval(clock);
      clearInterval(timer);
      cancelAnimationFrame(frame);
      document.removeEventListener("click", click);
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", hide);
    };
  }
  apply();
  const unsubscribe = subscribeConsent(apply);
  window.addEventListener("online", remove);
  return () => {
    cleanup();
    unsubscribe();
    running = false;
    window.removeEventListener("online", remove);
  };
}
