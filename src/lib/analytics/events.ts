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
  nav_click: "nav_click",
  copy_email: "copy_email",
  contact_cta: "contact_cta",
  home_cta: "home_cta",
  home_interaction: "home_interaction",
  consent_updated: "consent_updated",
  game_feedback: "game_feedback",
  game_share: "game_share",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

export function track(
  event: AnalyticsEventName | (string & {}),
  properties?: Record<string, unknown>,
) {
  if (typeof window === "undefined") return;
  if (!["game_played","cta_clicked","brush_used"].includes(event)) return;
  if (getConsent() !== "granted") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  void import("posthog-js")
    .then(({ default: posthog }) => {
      if (getConsent() !== "granted") return;
      posthog.capture(event, properties);
    })
    .catch(() => {
      // ignore analytics failures
    });
}
