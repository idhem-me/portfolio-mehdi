"use client";
import { useSyncExternalStore } from "react";
import {
  getConsent,
  subscribeConsent,
  setConsent,
  openAnalyticsPreferences,
} from "./consent";
export function useAnalyticsConsent() {
  const status = useSyncExternalStore(subscribeConsent, getConsent, () => null);
  return {
    status,
    granted: status === "granted",
    accept: () => setConsent("granted"),
    withdraw: () => setConsent("denied"),
    openPreferences: openAnalyticsPreferences,
  };
}
