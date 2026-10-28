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
  discovered?: number[];
  onDiscover?: (index: number) => void;
  currentIndex: number;
  enabled: boolean;
  visible: boolean;
  reduced: boolean;
  settings: CardsSettings;
  audio: React.MutableRefObject<CardsAudio | null>;
  iosSwitch: React.RefObject<HTMLInputElement | null>;
  onCommit: (index: number) => void;
  onSettled: () => void;
  /** Increment to request advancing the front card (tap outside). */
  advanceRequest?: number;
};

export function CardStack(props: Props) {
  const { cards, currentIndex, enabled, visible } = props;
  const [departingIndex, setDepartingIndex] = useState<number | null>(null);
  const transitioning = departingIndex === currentIndex;
  const activeIndex = transitioning ? currentIndex + 1 : currentIndex;
  return (
    <div
      className={`cards-stack ${enabled ? "" : "cards-stack-waiting"} ${visible ? "cards-stack-rising" : "cards-stack-packed"}`}
      style={{
        visibility: visible ? "visible" : "hidden",
        pointerEvents: visible ? undefined : "none",
      }}
      aria-hidden={!visible}
    >
      <div className="cards-stack-stage" tabIndex={-1}>
        {cards.map((front, index) =>
          index >= Math.max(0, currentIndex - 1) && index <= activeIndex + 3 ? (
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
          ) : null,
        )}
      </div>
      <p
        className="text-center text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        {enabled
          ? `Carte ${currentIndex + 1} sur ${cards.length} · Touchez n’importe où ou glissez`
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
  discovered,
  onDiscover,
  advanceRequest = 0,
}: Props & {
  front: DrawnCard;
  active: boolean;
  departing: boolean;
  consumed: boolean;
  depth: number;
  interactive: boolean;
}) {
  const wasDiscovered = discovered?.includes(currentIndex) ?? false;
  const [faceUp, setFaceUp] = useState(wasDiscovered);
  const [settled, setSettled] = useState(wasDiscovered);
  const revealedOnce = useRef(wasDiscovered);
  const discoveryCallback = useRef(onDiscover);
  const lastAdvanceRequest = useRef(advanceRequest);
  useEffect(() => {
    discoveryCallback.current = onDiscover;
  }, [onDiscover]);
  const wowY = useMotionValue(0);
  const wowZoom = useMotionValue(1);
  const wowOpacity = useMotionValue(1);
  const wow = ["legendary", "gold", "diamond"].includes(front.rarity);
  const [special, setSpecial] = useState(false);
  const locked = useRef(!wasDiscovered);
  const alive = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      if (settleTimer.current) clearTimeout(settleTimer.current);
      pointer.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled || revealedOnce.current) return;
    const token = front.shiny
      ? shinyRevealTiming
      : openingEffectTokens[front.rarity];
    const exceptional = Boolean(front.shiny) || isSpecialRarity(front.rarity);
    const reveal = window.setTimeout(
      () => {
        revealedOnce.current = true;
        setFaceUp(true);
        discoveryCallback.current?.(currentIndex);
        if (reduced) {
          wowOpacity.set(0);
          void animate(wowOpacity, 1, { duration: 0.18 });
        }
        if (wow && !reduced) {
          void animate(wowY, [0, 180, 360], {
            duration: 1.4,
            ease: [0.22, 0.8, 0.25, 1],
          });
          void animate(wowZoom, [1, 1.2, 1.035, 1], {
            duration: 1.4,
            times: [0, 0.4, 0.8, 1],
            ease: "easeOut",
          });
        }
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
        settleTimer.current = setTimeout(
          () => {
            setSpecial(false);
            locked.current = false;
            setSettled(true);
          },
          wow && !reduced
            ? 1400
            : reduced
              ? 0
              : token.revealMs + token.settleMs,
        );
      },
      reduced ? 0 : exceptional ? token.tensionMs : 60,
    );
    return () => {
      window.clearTimeout(reveal);
    };
  }, [
    enabled,
    front.rarity,
    front.shiny,
    reduced,
    settings,
    audio,
    iosSwitch,
    currentIndex,
    wow,
    wowY,
    wowZoom,
    wowOpacity,
  ]);

  const eject = async (direction: 1 | -1) => {
    if (locked.current || !interactive || !faceUp) return;
    locked.current = true; // Synchronous: rapid taps/keys cannot enqueue another eject.
    setSettled(false);
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

  useEffect(() => {
    if (advanceRequest === lastAdvanceRequest.current) return;
    lastAdvanceRequest.current = advanceRequest;
    if (!interactive || !settled || !faceUp || advanceRequest <= 0) return;
    void eject(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advanceRequest, interactive, settled, faceUp]);

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
          ? `${card.name}${front.shiny ? ", Shiny" : ""}, ${RARITY_LABELS[front.rarity]}. Touchez n’importe où ou glissez pour avancer.`
          : `${card.name}${front.shiny ? ", Shiny" : ""}, ${RARITY_LABELS[front.rarity]}. Révélation…`
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
      <motion.div
        className="cards-stack-loaded-face cards-wow-visual"
        style={{ rotateY: wowY, scale: wowZoom, opacity: wowOpacity }}
      >
        <div className="cards-wow-front">
          <CardFace
            card={card}
            shiny={front.shiny}
            effectActive={faceUp && !reduced}
            className="cards-stack-face"
          />
        </div>
        <div className="cards-wow-back">
          <CardFace card={card} faceDown className="cards-stack-face" />
        </div>
      </motion.div>
      <SpecialReveal
        rarity={front.rarity}
        shiny={front.shiny}
        active={special && faceUp}
        reduced={reduced}
      />
    </motion.div>
  );
}
