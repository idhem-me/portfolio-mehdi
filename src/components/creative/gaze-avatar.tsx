"use client";

import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

type Gaze = "haut" | "bas" | "centre" | "gauche" | "droite";
type Head = "gauche" | "droite";

const GAZES: Gaze[] = ["haut", "bas", "centre", "gauche", "droite"];
const HEADS: Head[] = ["gauche", "droite"];

const AVATAR_SRCS = GAZES.flatMap((gaze) =>
  HEADS.map((head) => `/img/avatar/avatar-${gaze}-${head}.svg`),
);

/** Normalized distance under which gaze stays centre. */
const DEAD_ZONE = 0.18;
/** Hysteresis margin so gaze does not flicker at sector borders. */
const GAZE_HYSTERESIS = 0.1;
/** Horizontal threshold for head turn (normalized). */
const HEAD_EPS = 0.12;
/** Gyro angles (deg) mapped to ±1. */
const GYRO_MAX_DEG = 28;
/** Crossfade duration between pose variants (ms). */
const CROSSFADE_MS = 220;

function avatarSrc(gaze: Gaze, head: Head) {
  return `/img/avatar/avatar-${gaze}-${head}.svg`;
}

/**
 * Map dx/dy (screen: +x right, +y down) to a gaze sector.
 * Uses hysteresis against the current gaze to reduce flicker.
 */
function resolveGaze(dx: number, dy: number, current: Gaze): Gaze {
  const dist = Math.hypot(dx, dy);
  const enterDead = DEAD_ZONE;
  const leaveDead = DEAD_ZONE + GAZE_HYSTERESIS;

  if (current === "centre") {
    if (dist < leaveDead) return "centre";
  } else if (dist < enterDead) {
    return "centre";
  }

  const angle = Math.atan2(-dy, dx);
  const sectors: { gaze: Gaze; center: number }[] = [
    { gaze: "droite", center: 0 },
    { gaze: "haut", center: Math.PI / 2 },
    { gaze: "gauche", center: Math.PI },
    { gaze: "bas", center: -Math.PI / 2 },
  ];

  const angularDist = (a: number, b: number) => {
    let d = a - b;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return Math.abs(d);
  };

  if (current !== "centre") {
    const currentSector = sectors.find((s) => s.gaze === current);
    if (
      currentSector &&
      angularDist(angle, currentSector.center) <
        Math.PI / 4 + GAZE_HYSTERESIS
    ) {
      return current;
    }
  }

  let best: Gaze = "droite";
  let bestDist = Infinity;
  for (const s of sectors) {
    const d = angularDist(angle, s.center);
    if (d < bestDist) {
      bestDist = d;
      best = s.gaze;
    }
  }
  return best;
}

function resolveHead(dx: number, current: Head): Head {
  if (dx < -HEAD_EPS) return "gauche";
  if (dx > HEAD_EPS) return "droite";
  return current;
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
  const headRef = useRef<Head>("gauche");
  const displayedSrcRef = useRef(avatarSrc("centre", "gauche"));
  const fadingRef = useRef(false);
  const pendingSrcRef = useRef<string | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [front, setFront] = useState<Layer>({
    src: avatarSrc("centre", "gauche"),
    opacity: 1,
  });
  const [back, setBack] = useState<Layer>({
    src: avatarSrc("centre", "gauche"),
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

    // Queue if a crossfade is already running
    if (fadingRef.current) {
      pendingSrcRef.current = nextSrc;
      return;
    }

    fadingRef.current = true;
    const fromSrc = displayedSrcRef.current;

    // Back holds the outgoing pose; front fades in the new one
    setBack({ src: fromSrc, opacity: 1 });
    setFront({ src: nextSrc, opacity: 0 });
    displayedSrcRef.current = nextSrc;

    // Next frame → opacity 1 (CSS transition handles the blend)
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

  applyRef.current = (dx: number, dy: number) => {
    const mag = Math.hypot(dx, dy);
    const scale = mag > 1 ? 1 / mag : 1;
    const nx = dx * scale;
    const ny = dy * scale;

    const nextGaze = resolveGaze(nx, ny, gazeRef.current);
    const nextHead = resolveHead(nx, headRef.current);
    const changed =
      nextGaze !== gazeRef.current || nextHead !== headRef.current;

    gazeRef.current = nextGaze;
    headRef.current = nextHead;

    if (changed) {
      commitSrc(avatarSrc(nextGaze, nextHead));
    }
  };

  pointerRef.current = (clientX: number, clientY: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
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
