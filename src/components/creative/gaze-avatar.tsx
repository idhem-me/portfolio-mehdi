"use client";

import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

/** Head turn: AG = gauche, AD = droite. */
type Head = "AG" | "AD";

type AgGaze =
  | "centre"
  | "haut"
  | "haut-gauche"
  | "gauche"
  | "bas"
  | "bas-gauche";

type AdGaze =
  | "centre"
  | "haut"
  | "haut-droite"
  | "droite"
  | "bas"
  | "bas-droite";

type Gaze = AgGaze | AdGaze;

type Wink = "AG-clin" | "AD-clin";

const AG_GAZES: AgGaze[] = [
  "centre",
  "haut",
  "haut-gauche",
  "gauche",
  "bas",
  "bas-gauche",
];
const AD_GAZES: AdGaze[] = [
  "centre",
  "haut",
  "haut-droite",
  "droite",
  "bas",
  "bas-droite",
];

const AVATAR_SRCS = [
  ...AG_GAZES.map((g) => `/img/avatar/AG-${g}.svg`),
  ...AD_GAZES.map((g) => `/img/avatar/AD-${g}.svg`),
  "/img/avatar/AG-clin.svg",
  "/img/avatar/AD-clin.svg",
];

/**
 * Angles via Math.atan2(dy, dx) en degrés :
 * 0° = droite, 90° = bas, ±180° = gauche, -90° = haut.
 * Zone bas élargie : +15° → +165°.
 */
const DEAD_ZONE = 0.12;
const GYRO_MAX_DEG = 28;
const CROSSFADE_MS = 220;

const WINK_EVENT = "portfolio:avatar-wink";

/** Trigger / clear a wink pose from hover targets. */
export function setAvatarWink(wink: Wink | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WINK_EVENT, { detail: wink }));
}

function avatarSrc(head: Head, gaze: Gaze) {
  return `/img/avatar/${head}-${gaze}.svg`;
}

function winkSrc(wink: Wink) {
  return `/img/avatar/${wink}.svg`;
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

  const [front, setFront] = useState<Layer>({
    src: avatarSrc("AG", "centre"),
    opacity: 1,
  });
  const [back, setBack] = useState<Layer>({
    src: avatarSrc("AG", "centre"),
    opacity: 0,
  });

  const applyRef = useRef<(dx: number, dy: number) => void>(() => {});
  const pointerRef = useRef<(x: number, y: number) => void>(() => {});

  const commitSrc = (nextSrc: string) => {
    if (nextSrc === displayedSrcRef.current && !fadingRef.current) return;

    if (reducedMotion) {
      displayedSrcRef.current = nextSrc;
      pendingSrcRef.current = null;
      fadingRef.current = false;
      setFront({ src: nextSrc, opacity: 1 });
      setBack((b) => ({ ...b, opacity: 0 }));
      return;
    }

    if (fadingRef.current) {
      pendingSrcRef.current = nextSrc;
      return;
    }

    fadingRef.current = true;
    const fromSrc = displayedSrcRef.current;

    setBack({ src: fromSrc, opacity: 1 });
    setFront({ src: nextSrc, opacity: 0 });
    displayedSrcRef.current = nextSrc;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFront({ src: nextSrc, opacity: 1 });
        setBack({ src: fromSrc, opacity: 0 });
      });
    });

    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = setTimeout(() => {
      fadingRef.current = false;
      const pending = pendingSrcRef.current;
      pendingSrcRef.current = null;
      if (pending && pending !== displayedSrcRef.current) {
        commitSrc(pending);
      }
    }, CROSSFADE_MS + 40);
  };

  const poseSrc = () => {
    if (winkRef.current) return winkSrc(winkRef.current);
    return avatarSrc(headRef.current, gazeRef.current);
  };

  applyRef.current = (dx: number, dy: number) => {
    if (winkRef.current) return;

    const { head: nextHead, gaze: nextGaze } = resolvePose(dx, dy);
    headRef.current = nextHead;
    gazeRef.current = nextGaze;

    const nextSrc = avatarSrc(nextHead, nextGaze);
    if (nextSrc !== displayedSrcRef.current) {
      commitSrc(nextSrc);
    }
  };

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

  useEffect(() => {
    for (const src of AVATAR_SRCS) {
      const img = new Image();
      img.src = src;
    }
  }, []);

  useEffect(() => {
    const onWink = (e: Event) => {
      const wink = (e as CustomEvent<Wink | null>).detail ?? null;
      winkRef.current = wink;
      commitSrc(poseSrc());
    };
    window.addEventListener(WINK_EVENT, onWink);
    return () => window.removeEventListener(WINK_EVENT, onWink);
  }, []);

  useEffect(() => {
    return () => {
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
      const DOE = DeviceOrientationEvent as unknown as DeviceOrientationPermission;
      if (typeof DOE.requestPermission === "function") {
        try {
          const result = await DOE.requestPermission();
          if (result === "granted") attachOrientation();
        } catch {
          // Fall through to touch
        }
      } else if ("DeviceOrientationEvent" in window) {
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
    "absolute inset-0 size-full object-contain transition-opacity ease-out motion-reduce:transition-none";

  return (
    <span
      ref={wrapRef}
      data-physics-item
      data-physics-exact
      aria-hidden
      className="relative inline-block size-36 shrink-0 select-none"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={back.src}
        alt=""
        width={144}
        height={144}
        draggable={false}
        className={cn(layerClass)}
        style={{
          opacity: back.opacity,
          transitionDuration: reducedMotion ? "0ms" : `${CROSSFADE_MS}ms`,
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={front.src}
        alt=""
        width={144}
        height={144}
        draggable={false}
        className={cn(layerClass)}
        style={{
          opacity: front.opacity,
          transitionDuration: reducedMotion ? "0ms" : `${CROSSFADE_MS}ms`,
        }}
      />
    </span>
  );
}
