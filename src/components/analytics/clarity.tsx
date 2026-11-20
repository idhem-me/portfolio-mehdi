"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { getConsent, hasReplayConsent, subscribeConsent } from "@/lib/analytics/consent";

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

const productionOrigin = "https://portfolio.mtmd.fr";
const editorialPaths = new Set([
  "/",
  "/a-propos",
  "/product-designer",
  "/realisations",
  "/realisations/onewallet",
  "/realisations/tetris",
  "/realisations/trusted-interactions",
]);

function isEditorialPath(pathname: string) {
  const path = pathname.replace(/^\/(fr|en|zh|ar|es|it|de)(?=\/|$)/, "");
  return editorialPaths.has(path.replace(/\/$/, "") || "/");
}

function isEditorialUrl(url: URL | Location) {
  return (
    url.origin === productionOrigin &&
    isEditorialPath(url.pathname) &&
    !url.search &&
    !url.hash
  );
}

function hasSafeReferrer() {
  if (!document.referrer) return true;
  const referrer = new URL(document.referrer);
  return referrer.origin === productionOrigin
    ? isEditorialUrl(referrer)
    : referrer.pathname === "/" && !referrer.search && !referrer.hash;
}

function installNavigationGuard(stop: () => void) {
  // Clarity also wraps the History API and restarts after URL changes.
  // Run this guard before changing history so it cannot restart on a private URL.
  for (const method of ["pushState", "replaceState"] as const) {
    const update = window.history[method];
    window.history[method] = function (state, unused, destination) {
      if (destination != null) {
        const url = new URL(destination, window.location.href);
        if (url.origin === productionOrigin && !isEditorialUrl(url)) {
          stop();
          if (method === "replaceState") window.location.replace(url);
          else window.location.assign(url);
          return;
        }
      }
      update.call(this, state, unused, destination);
    };
  }

  function leaveDocumentIfUnsafe() {
    if (!isEditorialUrl(window.location)) {
      stop();
      window.location.reload();
    }
  }

  window.addEventListener("popstate", leaveDocumentIfUnsafe, true);
  window.addEventListener("hashchange", leaveDocumentIfUnsafe, true);

  const stopBeforeSensitiveLink = (event: MouseEvent) => {
    const link = event.target instanceof Element && event.target.closest("a[href]");
    if (!(link instanceof HTMLAnchorElement)) return;
    const url = new URL(link.href);
    if (!url.search && !url.hash && (url.origin !== productionOrigin || isEditorialUrl(url))) {
      return;
    }
    // The SDK includes the clicked URL independently of page masking.
    stop();
  };
  window.addEventListener("click", stopBeforeSensitiveLink, true);
  window.addEventListener("contextmenu", stopBeforeSensitiveLink, true);
}

export function ClarityBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_CLARITY_ID;
    if (!id || !/^[a-z0-9]+$/i.test(id)) return;
    if (!isEditorialPath(pathname) || !isEditorialUrl(window.location) || !hasSafeReferrer()) return;

    function apply() {
      if (getConsent() !== "granted" || !hasReplayConsent()) {
        if (document.getElementById("ms-clarity")) {
          window.clarity?.("consentv2", {
            analytics_Storage: "denied",
            ad_Storage: "denied",
          });
          window.clarity?.("stop");
          window.location.reload();
        }
        return;
      }
      if (!isEditorialUrl(window.location) || document.getElementById("ms-clarity")) return;

      const script = document.createElement("script");
      script.async = true;
      script.referrerPolicy = "no-referrer";
      script.src = `https://www.clarity.ms/tag/${id}`;
      script.id = "ms-clarity";

      const queue = Object.assign((...args: unknown[]) => { queue.q.push(args); }, {
        q: [] as unknown[][],
      });
      window.clarity = queue;
      window.clarity("consentv2", { analytics_Storage: "granted", ad_Storage: "denied" });
      installNavigationGuard(() => window.clarity?.("stop"));
      document.head.appendChild(script);
      setLoaded(true);
    }

    apply();
    return subscribeConsent(apply);
  }, [pathname]);

  // Next can render route content before its History API update.
  // Keep non-editorial content out of every document that loaded Clarity.
  return loaded && !isEditorialPath(pathname) ? null : children;
}
