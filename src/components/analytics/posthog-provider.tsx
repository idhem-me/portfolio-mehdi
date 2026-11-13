"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { getConsent, subscribeConsent, type ConsentStatus } from "../../lib/analytics/consent";
import { getAnalyticsContext } from "../../lib/analytics/events";

function getPosthogHost() {
  return (
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.replace(/\/$/, "") ||
    "https://eu.i.posthog.com"
  );
}

function initPosthog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || typeof window === "undefined") return false;
  if (posthog.__loaded) return true;

  posthog.init(key, {
    api_host: getPosthogHost(),
    persistence: "memory",
    opt_out_capturing_by_default: true,
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: false,
    disable_session_recording: true,
    // Explicit opt-in for intercepted browser tests; production still filters bots.
    opt_out_useragent_filter:
      process.env.NEXT_PUBLIC_POSTHOG_TEST_CAPTURE === "true",
  });
  return true;
}

function shutdownPosthog() {
  if (typeof window === "undefined") return;
  try {
    posthog.opt_out_capturing();
  } catch {
    // ignore
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const readyRef = useRef(false);
  const lastPageviewRef = useRef<string | null>(null);

  useEffect(() => {
    function captureCurrentPageview() {
      const context = getAnalyticsContext();
      posthog.register(context);
      const url = window.location.pathname;
      if (lastPageviewRef.current === url) return;
      lastPageviewRef.current = url;
      posthog.capture("$pageview", {
        $current_url: window.location.origin + url,
        ...context,
      });
    }

    function applyConsent(status: ConsentStatus) {
      if (status === "granted") {
        const needsFreshPageview = !readyRef.current;
        const ok = initPosthog();
        if (ok) {
          posthog.register(getAnalyticsContext());
          try {
            posthog.opt_in_capturing();
          } catch {
            // ignore
          }
          if (needsFreshPageview) lastPageviewRef.current = null;
          readyRef.current = true;
          captureCurrentPageview();
        }
      } else {
        shutdownPosthog();
        readyRef.current = false;
      }
    }

    applyConsent(getConsent());
    return subscribeConsent(applyConsent);
  }, []);

  useEffect(() => {
    if (getConsent() !== "granted") return;
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    if (!posthog.__loaded) {
      initPosthog();
    }
    if (!posthog.__loaded) return;

    const context = getAnalyticsContext();
    posthog.register(context);
    const url = pathname;
    if (lastPageviewRef.current === url) return;
    lastPageviewRef.current = url;

    posthog.capture("$pageview", {
      $current_url: window.location.origin + url,
      ...context,
    });
  }, [pathname, searchParams]);

  return children;
}
