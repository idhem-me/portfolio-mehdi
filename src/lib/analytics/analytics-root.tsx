"use client";

import { TrackingProvider } from "@/lib/tracking/provider";
import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isGiftPath } from "@/features/gift-lists/types";
import { ClarityScript } from "./clarity";
import { PostHogProvider } from "./provider";
import { VercelAnalytics } from "./vercel";

export function AnalyticsRoot({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AnalyticsBoundary>{children}</AnalyticsBoundary>
    </Suspense>
  );
}

function AnalyticsBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sensitive = isGiftPath(pathname);
  const [usedAnalytics, setUsedAnalytics] = useState(!sensitive);
  if (!sensitive && !usedAnalytics) setUsedAnalytics(true);
  // The gift entry uses document navigation. This is a backstop for any future
  // client navigation: render no private UI until a document without SDKs loads.
  const reload = sensitive && usedAnalytics;
  useEffect(() => {
    if (reload) window.location.reload();
  }, [reload, sensitive]);
  if (reload) return null;
  if (sensitive) return children;
  return (
    <>
      <Suspense fallback={null}>
        <PostHogProvider>
          <TrackingProvider />
          <ClarityScript />
          <VercelAnalytics />
        </PostHogProvider>
      </Suspense>
      {children}
    </>
  );
}
