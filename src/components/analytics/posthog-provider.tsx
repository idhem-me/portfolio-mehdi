"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { PostHog } from "posthog-js";
import { getConsent, subscribeConsent, type ConsentStatus } from "../../lib/analytics/consent";
import { getAnalyticsContext } from "../../lib/analytics/events";

function getPosthogHost() {
  return (
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.replace(/\/$/, "") ||
    "https://eu.i.posthog.com"
  );
}

function initPosthog(posthog: PostHog, key: string) {
  if (posthog.__loaded) return;

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
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sdkRef = useRef<PostHog | null>(null);
  const lastPageviewRef = useRef<string | null>(null);

  useEffect(() => {
    const configuredKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!configuredKey) return;
    const key = configuredKey;

    let active = true;

    async function applyConsent(status: ConsentStatus) {
      if (status !== "granted") {
        sdkRef.current?.opt_out_capturing();
        lastPageviewRef.current = null;
        return;
      }

      try {
        const { default: posthog } = await import("posthog-js");
        if (!active || getConsent() !== "granted") return;

        initPosthog(posthog, key);
        sdkRef.current = posthog;
        posthog.opt_in_capturing();
        capturePageview(posthog);
      } catch {
        // Analytics failures should not interrupt navigation.
      }
    }

    function capturePageview(posthog: PostHog) {
      const url = window.location.pathname;
      if (lastPageviewRef.current === url) return;
      lastPageviewRef.current = url;
      const context = getAnalyticsContext();
      posthog.register(context);
      posthog.capture("$pageview", {
        $current_url: window.location.origin + url,
        ...context,
      });
    }

    void applyConsent(getConsent());
    const unsubscribe = subscribeConsent((status) => void applyConsent(status));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const posthog = sdkRef.current;
    if (!posthog || getConsent() !== "granted") return;
    if (lastPageviewRef.current === pathname) return;
    lastPageviewRef.current = pathname;
    const context = getAnalyticsContext();
    posthog.register(context);
    posthog.capture("$pageview", {
      $current_url: window.location.origin + pathname,
      ...context,
    });
  }, [pathname, searchParams]);

  return children;
}
