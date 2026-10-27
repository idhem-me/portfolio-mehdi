"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { motion, useMotionValue, animate } from "motion/react";
import type { PackKind } from "../../engine/draw";
import type { CardsAudio } from "../../feel/audio";
import type { CardsSettings } from "../../feel/config";
import { cardsHaptic } from "../../feel/haptics";
import type { CutDirection } from "../../persistence/types";
import { BoosterArtwork } from "./booster-artwork";
import type { CardSetId } from "../../catalog/cards";
import { cutGesture, wrapperExitTiming, cutRelease } from "./gesture-config";

type Props = {
  kind: PackKind;
  entryRect?: { x: number; y: number; width: number; height: number } | null;
  stackIndex?: number;
  batchCount?: number;
  setId: CardSetId;
  frontIndex?: number;
  phase: "cutting" | "wrapperExit";
  cutDirection?: CutDirection;
  reduced: boolean;
  settings: CardsSettings;
  audio: React.MutableRefObject<CardsAudio | null>;
  iosSwitch: React.RefObject<HTMLInputElement | null>;
  onCutValidated: (direction: CutDirection) => void;
  onWrapperExitDone: () => void;
};

export function BoosterCutStage({
  entryRect,
  stackIndex = 0,
  setId,
  frontIndex = 0,
  phase,
  cutDirection = "right",
  reduced,
  settings,
  audio,
  iosSwitch,
  onCutValidated,
  onWrapperExitDone,
}: Props) {
  const [progress, setProgress] = useState(0);
  const [committed, setCommitted] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const lastTick = useRef(0);
  const maxTravel = useRef(0);
  const committedRef = useRef(false);
  const axisLocked = useRef<"h" | "v" | null>(null);
  const assembly = useRef<HTMLDivElement>(null);
  const enterX = useMotionValue(0);
  const enterY = useMotionValue(0);
  const enterScaleX = useMotionValue(1);
  const enterScaleY = useMotionValue(1);
  const [entering, setEntering] = useState(Boolean(entryRect && !reduced));
  useLayoutEffect(() => {
    if (!entryRect || reduced || !assembly.current) return;
    const target = assembly.current.getBoundingClientRect();
    enterX.set(entryRect.x - target.x);
    enterY.set(entryRect.y - target.y);
    enterScaleX.set(entryRect.width / target.width);
    enterScaleY.set(entryRect.height / target.height);
    const options = {
      duration: 0.55,
      ease: [0.22, 0.8, 0.25, 1] as [number, number, number, number],
    };
    const animations = [
      animate(enterX, 0, options),
      animate(enterY, 0, options),
      animate(enterScaleX, 1, options),
      animate(enterScaleY, 1, options),
    ];
    const timer = window.setTimeout(() => setEntering(false), 550);
    return () => {
      window.clearTimeout(timer);
      animations.forEach((animation) => animation.stop());
    };
  }, [entryRect, reduced, enterX, enterY, enterScaleX, enterScaleY]);
  const stripX = useMotionValue(0);
  const bodyY = useMotionValue(0);

  const unlock = useCallback(() => {
    if (settings.sound) {
      audio.current?.unlock();
      audio.current?.setVolume(settings.effectsVolume);
    }
  }, [settings.sound, settings.effectsVolume, audio]);

  const feedbackAt = (p: number) => {
    const step = cutGesture.feedbackStep;
    const tick = Math.floor(p / step);
    if (tick > lastTick.current && tick > 0) {
      lastTick.current = tick;
      unlock();
      audio.current?.emit("tear");
      cardsHaptic("tear", settings, iosSwitch.current);
    }
  };

  const resetCut = () => {
    dragStart.current = null;
    axisLocked.current = null;
    lastTick.current = 0;
    setProgress(0);
    void animate(stripX, 0, { type: "spring", stiffness: 380, damping: 28 });
  };

  const commit = useCallback(
    (direction: CutDirection) => {
      if (entering || committedRef.current || phase !== "cutting") return;
      committedRef.current = true;
      setCommitted(true);
      unlock();
      audio.current?.emit("tear");
      cardsHaptic("tear", settings, iosSwitch.current);
      setProgress(1);
      onCutValidated(direction);
    },
    [entering, phase, unlock, audio, settings, iosSwitch, onCutValidated],
  );

  useEffect(() => {
    if (phase !== "wrapperExit") return;
    const delayMs = reduced ? 0 : stackIndex * wrapperExitTiming.staggerMs;
    const feedbackTimer = window.setTimeout(() => {
      if (settings.sound) {
        if (stackIndex > 0) audio.current?.emit("tear");
        audio.current?.emit("fall");
      }
      if (stackIndex > 0) cardsHaptic("tear", settings, iosSwitch.current);
    }, delayMs);

    const dir = cutDirection === "left" ? -1 : 1;
    const stripTarget =
      dir *
      (typeof window !== "undefined" ? window.innerWidth * 1.5 + 500 : 1500);
    const bodyTarget =
      typeof window !== "undefined" ? window.innerHeight * 1.15 : 800;

    if (reduced) {
      const t = window.setTimeout(() => onWrapperExitDone(), 160);
      return () => {
        window.clearTimeout(t);
        window.clearTimeout(feedbackTimer);
      };
    }

    const stripAnimation = animate(stripX, stripTarget, {
      duration: wrapperExitTiming.stripMs / 1000,
      delay: delayMs / 1000,
      ease: [0.22, 0.8, 0.3, 1],
    });
    const bodyAnimation = animate(bodyY, bodyTarget, {
      duration: wrapperExitTiming.bodyMs / 1000,
      delay: delayMs / 1000,
      ease: [0.55, 0.06, 0.85, 0.3],
    });

    const fallback = window.setTimeout(
      () => onWrapperExitDone(),
      delayMs + wrapperExitTiming.fallbackMs,
    );
    return () => {
      window.clearTimeout(fallback);
      window.clearTimeout(feedbackTimer);
      stripAnimation.stop();
      bodyAnimation.stop();
    };
  }, [
    phase,
    stackIndex,
    settings,
    iosSwitch,
    cutDirection,
    reduced,
    onWrapperExitDone,
    stripX,
    bodyY,
    settings.sound,
    audio,
  ]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      phase !== "cutting" ||
      committedRef.current ||
      !e.isPrimary ||
      e.button !== 0 ||
      dragStart.current
    )
      return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    maxTravel.current = 0;
    axisLocked.current = null;
    lastTick.current = 0;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current || phase !== "cutting" || committedRef.current)
      return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    maxTravel.current = Math.max(maxTravel.current, Math.hypot(dx, dy));

    if (!axisLocked.current) {
      if (
        Math.abs(dy) > cutGesture.axisLockMinDy &&
        Math.abs(dy) > Math.abs(dx) * cutGesture.axisLockRatio
      ) {
        axisLocked.current = "v";
        resetCut();
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        return;
      }
      if (Math.abs(dx) > 12) axisLocked.current = "h";
    }
    if (axisLocked.current === "v") return;

    const p = Math.min(1, Math.abs(dx) / cutGesture.distance);
    e.currentTarget.style.setProperty(
      "--cut-origin",
      dx >= 0 ? "left" : "right",
    );
    setProgress(p);
    stripX.set(dx * 0.35);
    feedbackAt(p);

    if (p >= 1 && cutRelease(dx, dy)) {
      commit(dx >= 0 ? "right" : "left");
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current || phase !== "cutting") return;
    const dx = e.clientX - dragStart.current.x;
    const direction = cutRelease(dx, e.clientY - dragStart.current.y);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (
      maxTravel.current <= 10 &&
      Math.hypot(dx, e.clientY - dragStart.current.y) <= 10
    ) {
      commit("right");
    } else if (direction && axisLocked.current !== "v") {
      commit(direction);
    } else if (!committedRef.current) {
      resetCut();
    }
  };

  const onPointerCancel = () => {
    if (phase === "cutting" && !committedRef.current) resetCut();
  };

  const depth = Math.max(
    0,
    stackIndex - (phase === "wrapperExit" ? frontIndex : 0),
  );
  const stripRotate =
    phase === "wrapperExit" ? (cutDirection === "left" ? -18 : 18) : 0;

  return (
    <motion.div
      className="cards-cut-stage"
      initial={false}
      animate={{
        y: -depth * 4,
        scale: 1 - depth * (0.075 / 9),
        opacity: entering && stackIndex > 0 ? 0 : 1,
      }}
      transition={{ duration: reduced ? 0 : 0.16, ease: [0.22, 0.8, 0.25, 1] }}
      style={{
        zIndex: 30 - stackIndex,
        pointerEvents: stackIndex > 0 ? "none" : undefined,
        transformOrigin: "50% 0%",
      }}
      aria-hidden={stackIndex > 0}
    >
      {stackIndex === 0 && phase === "cutting" && !committed && !entering && (
        <p className="cards-cut-hint">Touche ou glisse pour ouvrir</p>
      )}
      <motion.div
        ref={assembly}
        className={`cards-booster-assembly ${phase === "wrapperExit" ? "is-exiting" : ""}`}
        style={{
          ["--cut-progress" as string]: String(progress),
          x: enterX,
          y: enterY,
          scaleX: enterScaleX,
          scaleY: enterScaleY,
          transformOrigin: "0 0",
        }}
        role={stackIndex === 0 ? "button" : undefined}
        tabIndex={stackIndex === 0 && phase === "cutting" ? 0 : -1}
        aria-label="Découper le booster"
        aria-disabled={phase !== "cutting" || committed}
        onKeyDown={(event) => {
          if (["Enter", " ", "ArrowLeft", "ArrowRight"].includes(event.key)) {
            event.preventDefault();
            if (!event.repeat)
              commit(event.key === "ArrowLeft" ? "left" : "right");
          }
        }}
        onClick={(event) => {
          if (event.detail === 0) commit("right");
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <motion.div className="cards-booster-body" style={{ y: bodyY }}>
          <BoosterArtwork setId={setId} showCollection={false} />
        </motion.div>

        <motion.div
          className="cards-booster-strip"
          style={{ x: stripX }}
          animate={{
            y:
              phase === "wrapperExit" && !reduced
                ? -(typeof window !== "undefined" ? window.innerHeight : 1000)
                : 0,
            opacity: phase === "wrapperExit" ? 0 : 1,
            rotate: reduced ? 0 : stripRotate,
          }}
          transition={{
            duration: reduced ? 0 : wrapperExitTiming.stripMs / 1000,
            delay: reduced
              ? 0
              : (stackIndex * wrapperExitTiming.staggerMs) / 1000,
            ease: "easeOut",
          }}
          aria-hidden
        >
          <BoosterArtwork setId={setId} showCollection={false} />
          <span className="cards-cut-line" />
        </motion.div>
        {stackIndex === 0 && phase === "cutting" && !committed && !entering && (
          <span className="cards-cut-glow" aria-hidden="true" />
        )}
      </motion.div>
    </motion.div>
  );
}
