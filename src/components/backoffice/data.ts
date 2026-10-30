"use client";
import { getConsent, subscribeConsent } from "@/lib/analytics/consent";
import { track } from "@/lib/tracking/client";
export async function fetcher(url: string) {
  if (getConsent() !== "granted") throw new Error("Consent required");
  const controller = new AbortController();
  const unsubscribe = subscribeConsent((status) => {
    if (status !== "granted") controller.abort();
  });
  const { visitor, session } = track.ids();
  const snapshot = track.snapshot();
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      headers: {
        "x-visitor-id": visitor,
        "x-session-id": session,
        "x-pending-batch": snapshot.pending?.id || "",
      },
      cache: "no-store",
    });
    if (!r.ok) throw new Error("Unavailable");
    const data = await r.json();
    if (url === "/api/backoffice/me") {
      const extra: Record<string, number> = { ...snapshot.unsent };
      if (snapshot.pending && !data.pending_applied)
        for (const [k, n] of Object.entries(snapshot.pending.delta))
          extra[k] = (extra[k] || 0) + n;
      for (const [k, n] of Object.entries(extra)) data[k] = (data[k] || 0) + n;
      data.localSnapshot = snapshot.total;
    }
    return data;
  } finally {
    unsubscribe();
  }
}
export function distance(px: number, locale: string) {
  const cm = px / 37.8;
  return (
    "≈ " +
    new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
      cm >= 100000 ? cm / 100000 : cm >= 10000 ? cm / 100 : cm,
    ) +
    " " +
    (cm >= 100000 ? "km" : cm >= 10000 ? "m" : "cm")
  );
}
export type Row = {
  id: string;
  short_label: string;
  started_at: string;
  last_seen_at: string;
  isMe: boolean;
  isCurrent: boolean;
  country: string;
  device: string;
  pages: Record<string, number>;
  games: { game: string; score: number }[];
} & Record<string, unknown>;
