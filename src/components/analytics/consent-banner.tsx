"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getConsent,
  setConsent,
  type ConsentStatus,
} from "@/lib/analytics/consent";
import { AnalyticsEvents, track } from "@/lib/analytics/events";

export function ConsentBanner() {
  const [status, setStatus] = useState<ConsentStatus>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setStatus(getConsent());
    setMounted(true);
  }, []);

  if (!mounted || status !== null) return null;

  function accept() {
    setConsent("granted");
    setStatus("granted");
    // track after consent is stored so capture is allowed
    queueMicrotask(() => {
      track(AnalyticsEvents.consent_updated, { status: "granted" });
    });
  }

  function deny() {
    setConsent("denied");
    setStatus("denied");
  }

  return (
    <div
      role="dialog"
      aria-labelledby="consent-title"
      aria-describedby="consent-desc"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p id="consent-title" className="text-sm font-medium tracking-tight">
            Mesure d&apos;audience
          </p>
          <p
            id="consent-desc"
            className="text-sm leading-relaxed text-muted-foreground"
          >
            J&apos;utilise PostHog, Microsoft Clarity et Vercel Analytics pour
            comprendre l&apos;usage du site (pages vues, interactions). Aucun
            tracking sans votre accord.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={deny}>
            Refuser
          </Button>
          <Button type="button" size="sm" onClick={accept}>
            Accepter
          </Button>
        </div>
      </div>
    </div>
  );
}
