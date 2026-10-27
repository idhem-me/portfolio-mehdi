"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from "motion/react";
import { Button } from "@/components/ui/button";
import { getCard } from "../../catalog/cards";
import { RARITY_LABELS, type Rarity } from "../../catalog/types";
import type { DrawnCard } from "../../engine/draw";
import type { CardsAudio } from "../../feel/audio";
import {
  hapticKindForRarity,
  isSpecialRarity,
  type CardsSettings,
} from "../../feel/config";
import { cardsHaptic } from "../../feel/haptics";
import { CardFace } from "../card-face";
import { SpecialReveal } from "./special-reveal";
import { stackLayout, swipeGesture } from "./gesture-config";

type Props = {
  cards: DrawnCard[];
  currentIndex: number;
  reduced: boolean;
  settings: CardsSettings;
  audio: React.MutableRefObject<CardsAudio | null>;
  iosSwitch: React.RefObject<HTMLInputElement | null>;
  onAdvance: () => void;
  onRevealAll: () => void;
};

export function CardStack({
  cards,
  currentIndex,
  reduced,
  settings,
  audio,
  iosSwitch,
  onAdvance,
  onRevealAll,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [faceUp, setFaceUp] = useState(false);
  const [specialActive, setSpecialActive] = useState(false);
  const specialDone = useRef<Set<number>>(new Set());
  const moved = useRef(false);
  const x = useMotionValue(0);
  const rotate = useTransform(
    x,
    [-200, 200],
    [-200 * swipeGesture.rotateFactor, 200 * swipeGesture.rotateFactor],
  );

  const front = cards[currentIndex];
  const frontCard = front ? getCard(front.cardId) : undefined;
  const frontRarity = front?.rarity;

  const unlock = useCallback(() => {
    if (settings.sound) {
      audio.current?.unlock();
      audio.current?.setVolume(settings.effectsVolume);
    }
  }, [settings.sound, settings.effectsVolume, audio]);

  // Remount reveal sequence when front index changes (async to satisfy lint).
  useEffect(() => {
    if (!front || currentIndex >= 5) return;
    let cancelled = false;
    x.set(0);
    moved.current = false;

    const rarity = front.rarity;
    const needsSpecial =
      isSpecialRarity(rarity) && !specialDone.current.has(currentIndex);

    const startId = window.setTimeout(() => {
      if (cancelled) return;
      setFaceUp(false);
      if (needsSpecial) {
        setBusy(true);
        setSpecialActive(true);
        unlock();
        audio.current?.emit("exceptional");
        cardsHaptic(hapticKindForRarity(rarity), settings, iosSwitch.current);
      } else {
        setSpecialActive(false);
        const flipId = window.setTimeout(() => {
          if (cancelled) return;
          setFaceUp(true);
          unlock();
          audio.current?.emit(
            rarity === "epic" ? "exceptional" : "reveal",
          );
          audio.current?.emit("flip");
          cardsHaptic(
            hapticKindForRarity(rarity),
            settings,
            iosSwitch.current,
          );
        }, reduced ? 40 : 120);
        // stash for cleanup via cancelled flag + clear on unmount
        (startId as unknown as { flip?: number }).flip = flipId;
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(startId);
    };
  }, [
    currentIndex,
    front,
    reduced,
    unlock,
    audio,
    settings,
    iosSwitch,
    x,
  ]);

  const onSpecialComplete = useCallback(() => {
    specialDone.current.add(currentIndex);
    setSpecialActive(false);
    setFaceUp(true);
    setBusy(false);
  }, [currentIndex]);

  const eject = useCallback(
    async (direction: 1 | -1) => {
      if (busy || currentIndex >= 5) return;
      setBusy(true);
      unlock();
      audio.current?.emit("flip");
      cardsHaptic("light", settings, iosSwitch.current);

      const target =
        direction *
        (typeof window !== "undefined" ? window.innerWidth * 1.1 : 500);

      if (!reduced) {
        await animate(x, target, {
          duration: 0.28,
          ease: [0.4, 0, 0.8, 0.2],
        });
      } else {
        x.set(target);
      }

      onAdvance();
      x.set(0);
      setBusy(false);
    },
    [
      busy,
      currentIndex,
      unlock,
      audio,
      settings,
      iosSwitch,
      reduced,
      x,
      onAdvance,
    ],
  );

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (busy || specialActive) return;
    const dx = info.offset.x;
    const vx = info.velocity.x;
    const far = Math.abs(dx) >= swipeGesture.distance;
    const fast = Math.abs(vx) >= swipeGesture.velocity * 1000;
    if (far || fast) {
      void eject(dx >= 0 ? 1 : -1);
    } else {
      void animate(x, 0, swipeGesture.spring);
    }
  };

  const onTapAdvance = () => {
    if (busy || specialActive) return;
    if (moved.current) return;
    void eject(1);
  };

  if (!front || !frontCard || currentIndex >= 5) {
    return null;
  }

  const behind = cards
    .slice(currentIndex + 1, currentIndex + 1 + stackLayout.maxVisibleBehind)
    .map((drawn, i) => {
      const depth = i + 1;
      const def = getCard(drawn.cardId)!;
      return (
        <div
          key={`${drawn.cardId}-behind-${depth}`}
          className="cards-stack-card cards-stack-back"
          style={{
            zIndex: 10 - depth,
            transform: `translateY(${depth * stackLayout.backOffsetY}px) scale(${1 - depth * stackLayout.backScaleStep})`,
          }}
          aria-hidden
        >
          <CardFace card={def} faceDown className="cards-stack-face" />
        </div>
      );
    });

  return (
    <div className="cards-stack">
      <div className="cards-stack-stage">
        {behind}
        <motion.div
          key={currentIndex}
          className="cards-stack-card cards-stack-front"
          style={{ x, rotate, zIndex: 20 }}
          drag={busy || specialActive ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.9}
          onDragStart={() => {
            moved.current = false;
          }}
          onDrag={(_, info) => {
            if (Math.abs(info.offset.x) > swipeGesture.tapSlop) {
              moved.current = true;
            }
          }}
          onDragEnd={onDragEnd}
          onTap={onTapAdvance}
          role="button"
          tabIndex={0}
          aria-label={
            faceUp
              ? `${frontCard.name}, ${RARITY_LABELS[frontRarity as Rarity]}. Glisser ou appuyer pour la suivante.`
              : `Carte ${currentIndex + 1} en cours de révélation`
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onTapAdvance();
            }
            if (e.key === "ArrowLeft") void eject(-1);
            if (e.key === "ArrowRight") void eject(1);
          }}
        >
          <CardFace
            card={frontCard}
            faceDown={!faceUp}
            effectActive={faceUp && !reduced}
            className="cards-stack-face"
          />
          <SpecialReveal
            key={`special-${currentIndex}`}
            rarity={frontRarity as Rarity}
            active={specialActive}
            reduced={reduced}
            mobile={
              typeof window !== "undefined" && window.innerWidth < 768
            }
            onComplete={onSpecialComplete}
          />
        </motion.div>
      </div>

      <div className="cards-stack-actions">
        <Button
          variant="outline"
          className="min-h-11 flex-1"
          disabled={busy || specialActive}
          onClick={() => void eject(1)}
        >
          Carte suivante
        </Button>
        <Button
          variant="secondary"
          className="min-h-11 flex-1"
          disabled={busy}
          onClick={onRevealAll}
        >
          Tout révéler
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {currentIndex + 1} / 5
      </p>
    </div>
  );
}
