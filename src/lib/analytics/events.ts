/**
 * Catalogue d’events analytics.
 *
 * Convention pour les nouveautés :
 * 1. Ajouter un nom ici (AnalyticsEvents).
 * 2. Appeler track("event_name", { ... }) depuis le composant / handler.
 * L’autocapture PostHog couvre clics / formulaires génériques ;
 * les events typés servent aux actions produit significatives.
 *
 * `posthog-js` est importé dynamiquement pour éviter de charger le SDK
 * dans les bundles / workers qui n’en ont pas besoin (ex. Prefetch).
 */
import { getConsent } from "./consent";

export const AnalyticsEvents = {
  page_view: "page_view",
  nav_click: "navigation_clicked",
  copy_email: "contact_email_copied",
  contact_cta: "contact_cta_clicked",
  home_cta: "home_cta_clicked",
  home_interaction: "home_interaction",
  consent_updated: "analytics_consent_updated",
  game_feedback: "game_feedback_submitted",
  game_share: "game_shared",
  game_started: "game_started",
  cta_clicked: "cta_clicked",
  brush_used: "brush_used",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

export function getAnalyticsContext() {
  if (typeof window === "undefined") {
    return { site: "portfolio", surface: "unknown", locale: "fr", internal_visitor: false } as const;
  }

  let internalVisitor = false;
  try {
    const marker = new URLSearchParams(window.location.search).get("mtmd_internal");
    if (marker === "1" || marker === "0") {
      window.localStorage.setItem("mtmd_internal_traffic", marker === "1" ? "1" : "0");
    }
    internalVisitor = window.localStorage.getItem("mtmd_internal_traffic") === "1";
  } catch {
    // Tracking continues without the optional owner-traffic marker.
  }

  const segments = window.location.pathname.split("/").filter(Boolean);
  const locales = new Set(["fr", "en", "zh", "ar", "es", "it", "de"]);
  const firstSegment = segments[0] && locales.has(segments[0]) ? segments[1] : segments[0];
  const surface = firstSegment ?? "home";

  return {
    site: "portfolio",
    surface,
    locale: document.documentElement.lang || "fr",
    internal_visitor: internalVisitor,
  } as const;
}

export function track(event: AnalyticsEventName, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (getConsent() !== "granted") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  void import("posthog-js")
    .then(({ default: posthog }) => {
      if (getConsent() !== "granted") return;
      const context = getAnalyticsContext();
      posthog.register(context);
      posthog.capture(event, { ...properties, ...context });
    })
    .catch(() => {
      // ignore analytics failures
    });
}
