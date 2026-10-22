"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import {
  getConsent,
  subscribeConsent,
  type ConsentStatus,
} from "./consent";

/** Vercel Web Analytics — chargé uniquement après consentement RGPD. */
export function VercelAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    function apply(status: ConsentStatus) {
      setEnabled(status === "granted");
    }
    apply(getConsent());
    return subscribeConsent(apply);
  }, []);

  if (!enabled) return null;
  return <Analytics />;
}
