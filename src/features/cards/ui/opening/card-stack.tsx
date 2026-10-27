"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { getCard } from "../../catalog/cards";
import { RARITY_LABELS } from "../../catalog/types";
import type { DrawnCard } from "../../engine/draw";
import type { CardsAudio } from "../../feel/audio";
import {
  hapticKindForRarity,
  isSpecialRarity,
  openingEffectTokens,
  shinyRevealTiming,
  type CardsSettings,
} from "../../feel/config";
import { cardsHaptic } from "../../feel/haptics";
import { CardFace } from "../card-face";
import { SpecialReveal } from "./special-reveal";
import { stackLayout, swipeGesture, releaseAction } from "./gesture-config";

type Props = {
  cards: DrawnCard[];
  currentIndex: number;
  enabled: boolean;
  visible: boolean;
  reduced: boolean;
  settings: CardsSettings;
  audio: React.MutableRefObject<CardsAudio | null>;
  iosSwitch: React.RefObject<HTMLInputElement | null>;
  onCommit: (index: number) => void;
  onSettled: () => void;
};

export function CardStack(props: Props) {
  const { cards, currentIndex, enabled, visible } = props;
  const [departingIndex, setDepartingIndex] = useState<number | null>(null);
  const transitioning = departingIndex === currentIndex;
  const activeIndex = transitioning ? currentIndex + 1 : currentIndex;
  return (
    <div
      className={`cards-stack ${enabled ? "" : "cards-stack-waiting"}`}
      style={{
        visibility: visible ? "visible" : "hidden",
        pointerEvents: visible ? undefined : "none",
      }}
      aria-hidden={!visible}
    >
      <div className="cards-stack-stage" tabIndex={-1}>
        {cards.map((front, index) => (
          <FrontCard
            key={index}
            {...props}
            front={front}
            currentIndex={index}
            active={index === activeIndex}
            departing={transitioning && index === currentIndex}
            consumed={index < currentIndex}
            depth={Math.max(0, index - activeIndex)}
            enabled={enabled && index === activeIndex}
            interactive={enabled && index === activeIndex && !transitioning}
            onCommit={(index) => {
              props.onCommit(index);
              setDepartingIndex(index);
            }}
          />
        ))}
      </div>
      <p
        className="text-center text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        {enabled
          ? `Carte ${currentIndex + 1} sur 5 · Touchez ou glissez`
          : "Découpez le booster"}
      </p>
    </div>
  );
}

function FrontCard({
  front,
  currentIndex,
  enabled,
  reduced,
  settings,
  audio,
  iosSwitch,
  onCommit,
  onSettled,
  active,
  departing,
  consumed,
  depth,
  interactive,
}: Props & {
  front: DrawnCard;
  active: boolean;
  departing: boolean;
  consumed: boolean;
  depth: number;
  interactive: boolean;
}) {
  const [faceUp, setFaceUp] = useState(false);
  const [special, setSpecial] = useState(false);
  const locked = useRef(true);
  const alive = useRef(false);
  const pointer = useRef<{
    id: number;
    x: number;
    y: number;
    time: number;
    max: number;
  } | null>(null);
  const animation = useRef<ReturnType<typeof animate> | null>(null);
  const target = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], reduced ? [0, 0] : [-22, 22]);
  const card = getCard(front.cardId)!;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      animation.current?.stop();
      pointer.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const token = front.shiny
      ? shinyRevealTiming
      : openingEffectTokens[front.rarity];
    const exceptional = Boolean(front.shiny) || isSpecialRarity(front.rarity);
    const reveal = window.setTimeout(
      () => {
        setFaceUp(true);
        if (document.activeElement === target.current?.parentElement)
          target.current?.focus();
        setSpecial(exceptional && !reduced);
        if (settings.sound) {
          audio.current?.unlock();
          audio.current?.emit(exceptional ? "exceptional" : "reveal");
        }
        cardsHaptic(
          front.shiny ? "legendary" : hapticKindForRarity(front.rarity),
          settings,
          iosSwitch.current,
        );
        locked.current = false;
      },
      reduced ? 0 : exceptional ? token.tensionMs : 60,
    );
    const settle = window.setTimeout(
      () => setSpecial(false),
      reduced ? 0 : token.tensionMs + token.revealMs + token.settleMs,
    );
    return () => {
      window.clearTimeout(reveal);
      window.clearTimeout(settle);
    };
  }, [enabled, front.rarity, front.shiny, reduced, settings, audio, iosSwitch]);

  const eject = async (direction: 1 | -1) => {
    if (locked.current || !interactive || !faceUp) return;
    locked.current = true; // Synchronous: rapid taps/keys cannot enqueue another eject.
    pointer.current = null;
    // Persist the accepted gesture now; credit/resume never waits for animation.
    onCommit(currentIndex);
    if (settings.sound) {
      audio.current?.unlock();
      audio.current?.emit("flip");
    }
    cardsHaptic("light", settings, iosSwitch.current);
    animation.current?.stop();
    if (!reduced) {
      animation.current = animate(x, direction * (window.innerWidth + 360), {
        duration: 0.23,
        ease: [0.35, 0, 0.8, 0.3],
      });
      await animation.current;
    }
    if (alive.current) {
      // Keep keyboard focus on the shared stage while its front child is replaced.
      const stage = target.current?.parentElement;
      (
        stage?.querySelector<HTMLElement>(".cards-stack-front") ?? stage
      )?.focus();
      onSettled();
    }
  };

  const cancel = () => {
    pointer.current = null;
    if (!locked.current) {
      animation.current?.stop();
      animation.current = animate(
        x,
        0,
        reduced ? { duration: 0 } : swipeGesture.spring,
      );
    }
  };

  return (
    <motion.div
      ref={target}
      className={`cards-stack-card ${active ? "cards-stack-front" : departing ? "cards-stack-outgoing" : "cards-stack-back"}`}
      style={{
        x,
        rotate,
        zIndex: departing ? 30 : 20 - depth,
        display: consumed ? "none" : undefined,
      }}
      animate={{
        y: depth * stackLayout.backOffsetY,
        scale: 1 - Math.min(depth, 4) * stackLayout.backScaleStep,
      }}
      transition={reduced ? { duration: 0 } : swipeGesture.spring}
      role={active ? "button" : undefined}
      aria-hidden={!active}
      tabIndex={interactive ? 0 : -1}
      aria-disabled={!faceUp || !interactive}
      aria-label={
        faceUp
          ? `${card.name}${front.shiny ? ", Shiny" : ""}, ${RARITY_LABELS[front.rarity]}. Touchez ou glissez pour avancer.`
          : `Carte ${currentIndex + 1} face cachée`
      }
      onPointerDown={(event) => {
        if (
          locked.current ||
          !interactive ||
          !event.isPrimary ||
          event.button !== 0
        )
          return;
        animation.current?.stop();
        event.currentTarget.setPointerCapture(event.pointerId);
        pointer.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          time: performance.now(),
          max: 0,
        };
      }}
      onPointerMove={(event) => {
        const p = pointer.current;
        if (!p || p.id !== event.pointerId) return;
        const dx = event.clientX - p.x;
        p.max = Math.max(p.max, Math.hypot(dx, event.clientY - p.y));
        x.set(dx);
      }}
      onPointerUp={(event) => {
        const p = pointer.current;
        if (!p || p.id !== event.pointerId) return;
        pointer.current = null;
        const dx = event.clientX - p.x;
        const action = releaseAction(
          dx,
          event.clientY - p.y,
          performance.now() - p.time,
          p.max,
        );
        if (action === "cancel") cancel();
        else void eject(action === "left" ? -1 : 1);
      }}
      onPointerCancel={cancel}
      onLostPointerCapture={() => {
        if (pointer.current) cancel();
      }}
      onClick={(event) => {
        if (event.detail === 0) void eject(1);
      }}
      onKeyDown={(event) => {
        if (["Enter", " ", "ArrowLeft", "ArrowRight"].includes(event.key)) {
          event.preventDefault();
          if (!event.repeat) void eject(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <div className="cards-stack-loaded-face">
        <CardFace
          card={card}
          shiny={front.shiny}
          effectActive={faceUp && !reduced}
          className="cards-stack-face"
        />
      </div>
      <SpecialReveal
        rarity={front.rarity}
        shiny={front.shiny}
        active={special && faceUp}
        reduced={reduced}
      />
    </motion.div>
  );
}
