"use client";

import { Suspense } from "react";
import { ConsentBanner } from "@/components/analytics/consent-banner";
import { ClarityScript } from "./clarity";
import { PostHogProvider } from "./provider";
import { VercelAnalytics } from "./vercel";

export function AnalyticsRoot({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={children}>
      <PostHogProvider>
        <ClarityScript />
        <VercelAnalytics />
        {children}
        <ConsentBanner />
      </PostHogProvider>
    </Suspense>
  );
}
