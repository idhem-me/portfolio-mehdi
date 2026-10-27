"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, animate } from "motion/react";
import { Button } from "@/components/ui/button";
import type { PackKind } from "../../engine/draw";
import type { CardsAudio } from "../../feel/audio";
import type { CardsSettings } from "../../feel/config";
import { cardsHaptic } from "../../feel/haptics";
import type { CutDirection } from "../../persistence/types";
import { cutGesture, wrapperExitTiming } from "./gesture-config";

type Props = {
  kind: PackKind;
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
  kind,
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
  const committedRef = useRef(false);
  const axisLocked = useRef<"h" | "v" | null>(null);
  const exitStarted = useRef(false);
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
      if (committedRef.current || phase !== "cutting") return;
      committedRef.current = true;
      setCommitted(true);
      unlock();
      audio.current?.emit("tear");
      cardsHaptic("tear", settings, iosSwitch.current);
      setProgress(1);
      onCutValidated(direction);
    },
    [phase, unlock, audio, settings, iosSwitch, onCutValidated],
  );

  useEffect(() => {
    if (phase !== "wrapperExit" || exitStarted.current) return;
    exitStarted.current = true;

    const dir = cutDirection === "left" ? -1 : 1;
    const stripTarget =
      dir *
      (typeof window !== "undefined" ? window.innerWidth * 0.75 : 400);
    const bodyTarget =
      typeof window !== "undefined" ? window.innerHeight * 1.15 : 800;

    if (reduced) {
      const t = window.setTimeout(() => onWrapperExitDone(), 160);
      return () => window.clearTimeout(t);
    }

    void animate(stripX, stripTarget, {
      duration: wrapperExitTiming.stripMs / 1000,
      ease: [0.22, 0.8, 0.3, 1],
    });
    void animate(bodyY, bodyTarget, {
      duration: wrapperExitTiming.bodyMs / 1000,
      ease: [0.55, 0.06, 0.85, 0.3],
    });

    const fallback = window.setTimeout(
      () => onWrapperExitDone(),
      wrapperExitTiming.fallbackMs,
    );
    return () => window.clearTimeout(fallback);
  }, [
    phase,
    cutDirection,
    reduced,
    onWrapperExitDone,
    stripX,
    bodyY,
  ]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (phase !== "cutting" || committedRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    axisLocked.current = null;
    lastTick.current = 0;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current || phase !== "cutting" || committedRef.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

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
    setProgress(p);
    stripX.set(dx * 0.35);
    feedbackAt(p);

    if (p >= 1) {
      commit(dx >= 0 ? "right" : "left");
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragStart.current || phase !== "cutting") return;
    const dx = e.clientX - dragStart.current.x;
    const p = Math.min(1, Math.abs(dx) / cutGesture.distance);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (p >= cutGesture.commitProgress && axisLocked.current !== "v") {
      commit(dx >= 0 ? "right" : "left");
    } else if (!committedRef.current) {
      resetCut();
    }
  };

  const onPointerCancel = () => {
    if (phase === "cutting" && !committedRef.current) resetCut();
  };

  const gold = kind === "gold_pack";
  const stripRotate =
    phase === "wrapperExit"
      ? cutDirection === "left"
        ? -18
        : 18
      : 0;

  return (
    <div className="cards-cut-stage">
      <div
        className="cards-booster-assembly"
        style={{ ["--cut-progress" as string]: String(progress) }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div className="cards-booster-inner-cards" aria-hidden>
          <div className="cards-mini-stack">
            <span />
            <span />
            <span />
          </div>
        </div>

        <motion.div
          className={`cards-booster-body ${gold ? "cards-booster-gold" : ""}`}
          style={{ y: bodyY }}
        >
          <span className="cards-booster-label">
            {gold ? "Gold Pack" : "Booster"}
          </span>
        </motion.div>

        <motion.div
          className="cards-booster-strip"
          style={{
            x: stripX,
            y: phase === "wrapperExit" ? bodyY : 0,
            rotate: stripRotate,
          }}
          aria-hidden
        >
          <span className="cards-cut-line" />
        </motion.div>
      </div>

      {phase === "cutting" && !committed && (
        <div className="mt-4 flex w-full max-w-sm flex-col gap-2 px-4">
          <p className="text-center text-sm text-muted-foreground">
            Glisse horizontalement pour découper le haut du booster.
          </p>
          <Button
            variant="accent"
            size="lg"
            className="min-h-11"
            onClick={() => commit(cutGesture.defaultDirection)}
          >
            Découper le booster
          </Button>
        </div>
      )}
    </div>
  );
}
