"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Rarity } from "../../catalog/types";
import {
  isSpecialRarity,
  openingEffectTokens,
} from "../../feel/config";

type Props = {
  rarity: Rarity;
  active: boolean;
  reduced: boolean;
  mobile: boolean;
  onComplete: () => void;
};

/**
 * One-shot special reveal overlay for legendary / gold / diamond
 * when the card becomes the front of the stack.
 */
export function SpecialReveal({
  rarity,
  active,
  reduced,
  mobile,
  onComplete,
}: Props) {
  const [stage, setStage] = useState<"idle" | "tension" | "burst" | "done">(
    "idle",
  );
  const onCompleteRef = useRef(onComplete);
  const token = openingEffectTokens[rarity];
  const show = active && isSpecialRarity(rarity);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    const timers: number[] = [];

    timers.push(
      window.setTimeout(() => {
        if (!cancelled) setStage("tension");
      }, 0),
    );

    const tension = reduced ? 40 : token.tensionMs;
    timers.push(
      window.setTimeout(() => {
        if (!cancelled) setStage("burst");
      }, tension),
    );

    const burst = reduced
      ? 120
      : token.tensionMs + token.revealMs + token.settleMs;
    timers.push(
      window.setTimeout(() => {
        if (cancelled) return;
        setStage("done");
        onCompleteRef.current();
      }, burst),
    );

    return () => {
      cancelled = true;
      for (const t of timers) window.clearTimeout(t);
    };
  }, [
    show,
    rarity,
    reduced,
    token.tensionMs,
    token.revealMs,
    token.settleMs,
  ]);

  if (!show || stage === "idle" || stage === "done") {
    return null;
  }

  const count = mobile ? token.particlesMobile : token.particles;
  const particles = reduced ? 0 : count;

  return (
    <AnimatePresence>
      <motion.div
        className={`cards-special-reveal cards-special-${rarity}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: stage === "tension" ? 0.55 : 1 }}
        exit={{ opacity: 0 }}
        aria-hidden
      >
        {stage === "burst" && <span className="cards-special-wave" />}
        {stage === "burst" &&
          Array.from({ length: particles }, (_, i) => (
            <span
              key={i}
              className="cards-special-particle"
              style={{
                ["--i" as string]: i,
                ["--n" as string]: particles,
              }}
            />
          ))}
      </motion.div>
    </AnimatePresence>
  );
}
