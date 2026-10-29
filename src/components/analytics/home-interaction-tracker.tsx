"use client";
import { useEffect } from "react";
import { trackHomeInteraction } from "@/lib/analytics/home-events";

const CLICKABLE =
  'button,a[href],input,select,[role="button"],[role="menuitem"],[role="menuitemradio"],[role="radio"],[role="tab"]';

export function HomeInteractionTracker() {
  useEffect(() => {
    function capture(event: Event) {
      const origin = event.target instanceof Element ? event.target : null;
      const element = origin?.closest<HTMLElement>(CLICKABLE);
      if (
        !element ||
        element.closest(
          '[data-analytics-gesture], [aria-disabled="true"], :disabled',
        )
      )
        return;
      // A range click is followed by a committed change: count only the final value.
      if (
        event.type !== "change" &&
        element.matches('input[type="range"], select')
      )
        return;
      if (
        event.type === "change" &&
        !element.matches('input[type="range"], select')
      )
        return;
      if (
        event instanceof MouseEvent &&
        event.type === "auxclick" &&
        event.button !== 1
      )
        return;
      const properties: Record<string, unknown> = {
        interaction: event.type === "change" ? "change" : "click",
      };
      let action = element.dataset.analyticsAction;
      if (element.matches("a[href]")) {
        const url = new URL(
          element.getAttribute("href")!,
          window.location.href,
        );
        properties.destination = ["http:", "https:"].includes(url.protocol)
          ? url.origin + url.pathname
          : url.protocol;
        properties.external = url.origin !== window.location.origin;
        action ??=
          element.closest('[data-slot="sidebar"]') ||
          element.closest('[data-slot="sidebar-container"]') ||
          element.hasAttribute("data-sidebar")
            ? "navigation_link"
            : "content_link";
      }
      action ??=
        element.dataset.slot ||
        element.getAttribute("role") ||
        element.tagName.toLowerCase();
      if (element.dataset.analyticsValue)
        properties[
          element.matches('input[type="range"]') ? "control" : "value"
        ] = element.dataset.analyticsValue;
      if (element instanceof HTMLInputElement && element.type === "range")
        properties.value = Number(element.value);
      if (element.hasAttribute("aria-expanded"))
        properties.expanded_before =
          element.getAttribute("aria-expanded") === "true";
      // Run after the handler so accepting consent is eligible and refusing never sends.
      if (action === "consent_accept" || action === "consent_deny")
        queueMicrotask(() => trackHomeInteraction(action!, properties));
      else trackHomeInteraction(action, properties);
    }
    document.addEventListener("click", capture, true);
    document.addEventListener("auxclick", capture, true);
    document.addEventListener("change", capture, true);
    return () => {
      document.removeEventListener("click", capture, true);
      document.removeEventListener("auxclick", capture, true);
      document.removeEventListener("change", capture, true);
    };
  }, []);
  return null;
}
