"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import {
  subscribeConsent,
  getConsent,
  setConsent,
  type ConsentStatus,
} from "@/lib/analytics/consent";
import { AnalyticsEvents, track } from "@/lib/analytics/events";

export function ConsentBanner() {
  const t = useTranslations("consent");
  const { open } = useSidebar();
  const [status, setStatus] = useState<ConsentStatus>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setStatus(getConsent());
      setMounted(true);
    });
    const unsubscribe = subscribeConsent(setStatus);
    const open = () => setStatus(null);
    window.addEventListener("analytics-preferences", open);
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
      window.removeEventListener("analytics-preferences", open);
    };
  }, []);

  if (!mounted || status !== null) return null;

  function accept() {
    setConsent("granted");
    setStatus("granted");
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 p-4 shadow-lg backdrop-blur transition-[inset-inline-start] duration-200 ease-linear supports-[backdrop-filter]:bg-background/80 md:inset-x-auto md:end-0 md:start-[var(--consent-sidebar-offset)]"
      style={
        {
          "--consent-sidebar-offset": open
            ? "var(--sidebar-width)"
            : "var(--sidebar-width-icon)",
        } as CSSProperties
      }
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p
            id="consent-title"
            className="flex items-center gap-1.5 text-sm font-medium tracking-tight"
          >
            <Cookie className="size-4" aria-hidden />
            {t("title")}
          </p>
          <p
            id="consent-desc"
            className="text-sm leading-relaxed text-muted-foreground"
          >
            {t("description")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={deny}
            data-analytics-action="consent_deny"
          >
            {t("deny")}
          </Button>
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={accept}
            data-analytics-action="consent_accept"
          >
            {t("accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
