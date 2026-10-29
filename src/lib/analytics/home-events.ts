import { AnalyticsEvents, track } from "./events";

export function isHomePath(pathname: string) {
  return /^\/(?:fr|en|zh|ar|es|it|de)?\/?$/.test(pathname);
}

/** Only stable identifiers and aggregate gesture metadata; never drawing coordinates. */
export function trackHomeInteraction(
  action: string,
  properties: Record<string, unknown> = {},
) {
  if (typeof window === "undefined" || !isHomePath(window.location.pathname))
    return;
  track(AnalyticsEvents.home_interaction, {
    ...properties,
    action,
    page: "home",
    pathname: window.location.pathname,
    locale: document.documentElement.lang || "fr",
    viewport: window.innerWidth < 768 ? "mobile" : "desktop",
  });
}
