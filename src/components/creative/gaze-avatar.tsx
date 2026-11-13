"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

/** Head turn: AG = gauche, AD = droite. */
type Head = "AG" | "AD";

type AgGaze =
  "centre" | "haut" | "haut-gauche" | "gauche" | "bas" | "bas-gauche";

type AdGaze =
  "centre" | "haut" | "haut-droite" | "droite" | "bas" | "bas-droite";

type Gaze = AgGaze | AdGaze;

type Wink = "AG-clin" | "AD-clin";

const AVATAR_VERSION = "?v=original-colors-1";

/**
 * Angles via Math.atan2(dy, dx) en degrés :
 * 0° = droite, 90° = bas, ±180° = gauche, -90° = haut.
 * Zone bas élargie : +15° → +165°.
 */
const DEAD_ZONE = 0.12;
const GYRO_MAX_DEG = 28;
/** Fade-in only on top of a solid base — avoids the mid-crossfade dip/scintillation. */
const CROSSFADE_MS = 280;

const WINK_EVENT = "portfolio:avatar-wink";

/** Trigger / clear a wink pose from hover targets. */
export function setAvatarWink(wink: Wink | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WINK_EVENT, { detail: wink }));
}

function avatarSrc(head: Head, gaze: Gaze) {
  return `/img/avatar/${head}-${gaze}.svg${AVATAR_VERSION}`;
}

function winkSrc(wink: Wink) {
  return `/img/avatar/${wink}.svg${AVATAR_VERSION}`;
}

function headFromSrc(src: string): Head | null {
  if (src.includes("/AG-")) return "AG";
  if (src.includes("/AD-")) return "AD";
  return null;
}

/** Pose from pointer vector (screen: +x right, +y down). */
function resolvePose(dx: number, dy: number): { head: Head; gaze: Gaze } {
  const dist = Math.hypot(dx, dy);

  // 1. Zone centrale
  if (dist < DEAD_ZONE) {
    return dx < 0
      ? { head: "AG", gaze: "centre" }
      : { head: "AD", gaze: "centre" };
  }

  // 0° = droite, 90° = bas, ±180° = gauche, -90° = haut
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // 2. Zones du bas (+15° → +165°)
  if (angle >= 55 && angle < 90) return { head: "AD", gaze: "bas" };
  if (angle >= 90 && angle < 125) return { head: "AG", gaze: "bas" };
  if (angle >= 15 && angle < 55) return { head: "AD", gaze: "bas-droite" };
  if (angle >= 125 && angle < 165) return { head: "AG", gaze: "bas-gauche" };

  // 3. Zones latérales
  if (angle >= -20 && angle < 15) return { head: "AD", gaze: "droite" };
  if (angle >= 165 || angle < -160) return { head: "AG", gaze: "gauche" };

  // 4. Zones du haut
  if (angle >= -65 && angle < -20) return { head: "AD", gaze: "haut-droite" };
  if (angle >= -90 && angle < -65) return { head: "AD", gaze: "haut" };
  if (angle >= -115 && angle < -90) return { head: "AG", gaze: "haut" };
  if (angle >= -160 && angle < -115) return { head: "AG", gaze: "haut-gauche" };

  // Fallback (frontières exactes ±180 / 0)
  return dx < 0
    ? { head: "AG", gaze: "gauche" }
    : { head: "AD", gaze: "droite" };
}

type DeviceOrientationPermission = {
  requestPermission?: () => Promise<"granted" | "denied" | "default">;
};

type Layer = { src: string; opacity: number };

export function GazeAvatar() {
  const reducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const gazeRef = useRef<Gaze>("centre");
  const headRef = useRef<Head>("AG");
  const winkRef = useRef<Wink | null>(null);
  const displayedSrcRef = useRef(avatarSrc("AG", "centre"));
  const fadingRef = useRef(false);
  const pendingSrcRef = useRef<string | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Base stays fully opaque; overlay fades in on top (no empty dip).
  const [base, setBase] = useState<Layer>({
    src: avatarSrc("AG", "centre"),
    opacity: 1,
  });
  const [overlay, setOverlay] = useState<Layer>({
    src: avatarSrc("AG", "centre"),
    opacity: 0,
  });

  const applyRef = useRef<(dx: number, dy: number) => void>(() => {});
  const pointerRef = useRef<(x: number, y: number) => void>(() => {});

  const requestedSrc = useRef(avatarSrc("AG", "centre"));
  const decodedSources = useRef(new Set([avatarSrc("AG", "centre")]));
  const pendingImages = useRef(new Map<string, Promise<void>>());

  const requestPose = (src: string) => {
    requestedSrc.current = src;
    if (decodedSources.current.has(src)) {
      commitSrc(src);
      return;
    }
    let pending = pendingImages.current.get(src);
    if (!pending) {
      const image = new Image();
      image.src = src;
      pending = image.decode().then(() => { decodedSources.current.add(src); })
        .finally(() => pendingImages.current.delete(src));
      pendingImages.current.set(src, pending);
    }
    void pending.then(() => {
      if (requestedSrc.current === src) commitSrc(src);
    }).catch(() => {
      if (requestedSrc.current === src) requestedSrc.current = displayedSrcRef.current;
    });
  };

  const commitSrc = (nextSrc: string) => {
    if (nextSrc === displayedSrcRef.current && !fadingRef.current) return;

    const prevHead = headFromSrc(displayedSrcRef.current);
    const nextHead = headFromSrc(nextSrc);
    // AG ↔ AD (and reduced-motion): swap instantly — no crossfade
    const instant =
      reducedMotion ||
      (prevHead != null && nextHead != null && prevHead !== nextHead);

    if (instant) {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      fadingRef.current = false;
      pendingSrcRef.current = null;
      displayedSrcRef.current = nextSrc;
      setBase({ src: nextSrc, opacity: 1 });
      setOverlay({ src: nextSrc, opacity: 0 });
      return;
    }

    if (fadingRef.current) {
      pendingSrcRef.current = nextSrc;
      return;
    }

    fadingRef.current = true;
    displayedSrcRef.current = nextSrc;

    // Same head: fade new pose in on top of the previous one
    setOverlay({ src: nextSrc, opacity: 0 });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setOverlay({ src: nextSrc, opacity: 1 });
      });
    });

    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = setTimeout(() => {
      setBase({ src: nextSrc, opacity: 1 });
      setOverlay({ src: nextSrc, opacity: 0 });
      fadingRef.current = false;
      const pending = pendingSrcRef.current;
      pendingSrcRef.current = null;
      if (pending && pending !== displayedSrcRef.current) {
        commitSrc(pending);
      }
    }, CROSSFADE_MS + 50);
  };

  const poseSrc = () => {
    if (winkRef.current) return winkSrc(winkRef.current);
    return avatarSrc(headRef.current, gazeRef.current);
  };

  // Existing imperative DOM bridge; refs do not determine React state.
  // eslint-disable-next-line react-hooks/refs
  applyRef.current = (dx: number, dy: number) => {
    if (winkRef.current) return;

    const { head: nextHead, gaze: nextGaze } = resolvePose(dx, dy);
    headRef.current = nextHead;
    gazeRef.current = nextGaze;

    const nextSrc = avatarSrc(nextHead, nextGaze);
    if (nextSrc !== requestedSrc.current) requestPose(nextSrc);
  };

  // Existing imperative DOM bridge; refs do not determine React state.
  // eslint-disable-next-line react-hooks/refs
  pointerRef.current = (clientX: number, clientY: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // Normalized; angle uses atan2(dy, dx) — scale only affects dead zone
    const nx = (clientX - cx) / (window.innerWidth * 0.45);
    const ny = (clientY - cy) / (window.innerHeight * 0.45);
    applyRef.current(nx, ny);
  };

  const onWink = useEffectEvent((event: Event) => {
    winkRef.current = (event as CustomEvent<Wink | null>).detail ?? null;
    requestPose(poseSrc());
  });

  useEffect(() => {
    const listener = (event: Event) => onWink(event);
    window.addEventListener(WINK_EVENT, listener);
    return () => window.removeEventListener(WINK_EVENT, listener);
  }, []);

  useEffect(() => {
    return () => {
      requestedSrc.current = "";
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion || isMobile) return;

    const onMove = (e: PointerEvent) => {
      pointerRef.current(e.clientX, e.clientY);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reducedMotion, isMobile]);

  useEffect(() => {
    if (reducedMotion || !isMobile) return;

    let orientationAttached = false;

    const onOrientation = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0;
      const beta = e.beta ?? 0;
      const dx = Math.max(-1, Math.min(1, gamma / GYRO_MAX_DEG));
      const dy = Math.max(-1, Math.min(1, (beta - 45) / GYRO_MAX_DEG));
      applyRef.current(dx, dy);
    };

    const attachOrientation = () => {
      if (orientationAttached) return;
      window.addEventListener("deviceorientation", onOrientation, true);
      orientationAttached = true;
    };

    const tryRequestPermission = async () => {
      const DOE = (
        window as Window & {
          DeviceOrientationEvent?: DeviceOrientationPermission;
        }
      ).DeviceOrientationEvent;
      if (!DOE) return;
      if (typeof DOE.requestPermission === "function") {
        try {
          const result = await DOE.requestPermission();
          if (result === "granted") attachOrientation();
        } catch {
          // Fall through to touch
        }
      } else {
        attachOrientation();
      }
    };

    const onFirstGesture = () => {
      void tryRequestPermission();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (orientationAttached) return;
      const t = e.touches[0];
      if (!t) return;
      pointerRef.current(t.clientX, t.clientY);
    };

    window.addEventListener("touchstart", onFirstGesture, {
      once: true,
      passive: true,
    });
    window.addEventListener("click", onFirstGesture, { once: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onFirstGesture);
      window.removeEventListener("click", onFirstGesture);
      window.removeEventListener("touchmove", onTouchMove);
      if (orientationAttached) {
        window.removeEventListener("deviceorientation", onOrientation, true);
      }
    };
  }, [reducedMotion, isMobile]);

  const layerClass =
    "absolute inset-0 size-full object-contain motion-reduce:transition-none";

  return (
    <span
      ref={wrapRef}
      data-avatar
      style={{ colorScheme: "only light" }}
      data-physics-item
      data-physics-exact
      data-physics-circle
      aria-hidden
      className={cn(
        // size-36 visual + generous touch/pointer target (min 44px already; pad for grab)
        "relative inline-flex size-36 shrink-0 select-none items-center justify-center",
        // Soft lift via --foreground: gris léger en light, proche du blanc en dark
        "drop-shadow-[0_2px_6px_color-mix(in_oklch,var(--foreground),transparent_88%)]",
        "dark:drop-shadow-[0_2px_8px_color-mix(in_oklch,var(--foreground),transparent_72%)]",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={base.src}
        alt=""
        width={144}
        height={144}
        draggable={false}
        className={cn(layerClass)}
        style={{ opacity: 1 }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={overlay.src}
        alt=""
        width={144}
        height={144}
        draggable={false}
        className={cn(layerClass, "transition-opacity ease-in-out")}
        style={{
          opacity: overlay.opacity,
          transitionDuration: reducedMotion ? "0ms" : `${CROSSFADE_MS}ms`,
        }}
      />
    </span>
  );
}
