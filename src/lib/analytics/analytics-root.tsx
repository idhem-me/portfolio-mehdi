"use client";

import { Suspense } from "react";
import { ClarityScript } from "./clarity";
import { PostHogProvider } from "./provider";
import { VercelAnalytics } from "./vercel";

export function AnalyticsRoot({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <PostHogProvider>
          <ClarityScript />
          <VercelAnalytics />
        </PostHogProvider>
      </Suspense>
      {children}
    </>
  );
}
