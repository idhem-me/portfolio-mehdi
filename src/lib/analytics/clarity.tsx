"use client";

import { useEffect } from "react";
import { getConsent, subscribeConsent, type ConsentStatus } from "./consent";

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

function injectClarity(projectId: string) {
  if (typeof window === "undefined") return;
  if (document.getElementById("ms-clarity")) return;

  (function (c: Window, l: Document, a: string, r: string, i: string) {
    const w = c as Window & Record<string, unknown>;
    w[a] =
      w[a] ||
      function (...args: unknown[]) {
        ((w[a] as { q?: unknown[] }).q =
          (w[a] as { q?: unknown[] }).q || []).push(args);
      };
    const t = l.createElement(r) as HTMLScriptElement;
    t.async = true;
    t.src = `https://www.clarity.ms/tag/${i}`;
    t.id = "ms-clarity";
    const y = l.getElementsByTagName(r)[0];
    y?.parentNode?.insertBefore(t, y);
  })(window, document, "clarity", "script", projectId);
}

export function ClarityScript() {
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_CLARITY_ID;
    if (!id) return;

    function apply(status: ConsentStatus) {
      if (status === "granted") {
        injectClarity(id!);
        window.clarity?.("consentv2", {
          analytics_Storage: "granted",
          ad_Storage: "denied",
        });
      } else if (document.getElementById("ms-clarity")) {
        window.clarity?.("consentv2", {
          analytics_Storage: "denied",
          ad_Storage: "denied",
        });
        // Stop already-loaded code; deleting its script element cannot unload it.
        window.location.reload();
      }
    }

    apply(getConsent());
    return subscribeConsent(apply);
  }, []);

  return null;
}
