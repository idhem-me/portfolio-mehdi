"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { openingEffectTokens } from "../feel/config";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  RARITY_LABELS,
  type CardDefinition,
  type Rarity,
} from "../catalog/types";

const rarityClass: Record<Rarity, string> = {
  common: "cards-rarity-common",
  rare: "cards-rarity-rare",
  epic: "cards-rarity-epic",
  legendary: "cards-rarity-legendary",
  gold: "cards-rarity-gold",
  diamond: "cards-rarity-diamond",
};

export function CardFace({
  card,
  qty,
  missing = false,
  compact = false,
  className,
  effectActive = false,
  faceDown = false,
  isNew,
  interactive = false,
  shiny = false,
  shinyQty,
}: {
  card: CardDefinition;
  qty?: number;
  missing?: boolean;
  compact?: boolean;
  className?: string;
  effectActive?: boolean;
  faceDown?: boolean;
  isNew?: boolean;
  interactive?: boolean;
  shiny?: boolean;
  shinyQty?: number;
}) {
  const element = useRef<HTMLElement>(null);
  const frame = useRef<number | null>(null);
  const activePointer = useRef<number | null>(null);
  const reduced = usePrefersReducedMotion();
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );
  const reset = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    activePointer.current = null;
    const style = element.current?.style;
    style?.setProperty("--tilt-x", "0deg");
    style?.setProperty("--tilt-y", "0deg");
    style?.setProperty("--glare", "0");
    element.current?.removeAttribute("data-touching");
  };
  const track = (event: React.PointerEvent<HTMLElement>) => {
    if (
      !interactive ||
      reduced ||
      (event.pointerType !== "mouse" &&
        activePointer.current !== event.pointerId)
    )
      return;
    const node = element.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / rect.width),
    );
    const y = Math.max(
      0,
      Math.min(1, (event.clientY - rect.top) / rect.height),
    );
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      node.dataset.touching = "true";
      node.style.setProperty("--pointer-x", `${x * 100}%`);
      node.style.setProperty("--pointer-y", `${y * 100}%`);
      node.style.setProperty("--tilt-x", `${(0.5 - y) * 12}deg`);
      node.style.setProperty("--tilt-y", `${(x - 0.5) * 12}deg`);
      node.style.setProperty(
        "--glare",
        String(openingEffectTokens[card.rarity].intensity * 0.32),
      );
      frame.current = null;
    });
  };
  if (faceDown || missing) {
    return (
      <div
        className={cn(
          "cards-card cards-card-back",
          missing && "cards-card-unowned",
          className,
        )}
        aria-label={
          missing ? `${card.name} — Non obtenue` : "Carte face cachée"
        }
        aria-disabled={missing || undefined}
      >
        {missing && (
          <span className="text-2xl font-semibold text-center px-2">
            Non obtenue
          </span>
        )}
        {missing && compact && (
          <span className="cards-card-number cards-card-unowned-footer">
            #{String(card.number).padStart(3, "0")}
          </span>
        )}
      </div>
    );
  }

  return (
    <article
      ref={element}
      onPointerDown={
        interactive
          ? (event) => {
              if (!event.isPrimary) return;
              activePointer.current = event.pointerId;
              event.currentTarget.setPointerCapture(event.pointerId);
              track(event);
            }
          : undefined
      }
      onPointerMove={interactive ? track : undefined}
      onPointerUp={interactive ? reset : undefined}
      onPointerCancel={interactive ? reset : undefined}
      onLostPointerCapture={interactive ? reset : undefined}
      onPointerLeave={interactive ? reset : undefined}
      className={cn(
        "cards-card",
        shiny && "cards-card-shiny",
        interactive && "cards-card-interactive",
        rarityClass[card.rarity],
        missing && "cards-card-missing",
        compact && "cards-card-compact",
        effectActive && "cards-card-effect-active",
        className,
      )}
      data-rarity={card.rarity}
      data-shiny={shiny || undefined}
      aria-label={`${card.name}${shiny ? ", Shiny" : ""}, ${RARITY_LABELS[card.rarity]}, n° ${String(card.number).padStart(3, "0")}`}
    >
      {interactive && <span className="cards-touch-glare" aria-hidden />}
      {shiny && (
        <div className="cards-shiny-foil" aria-hidden>
          <span>✦</span>
          <span>✧</span>
          <span>✦</span>
          <span>✧</span>
        </div>
      )}
      <div className="cards-card-art" aria-hidden>
        <span className="cards-card-art-label">
          CARTE {card.number}
          <br />
          {RARITY_LABELS[card.rarity]}
        </span>
        {effectActive && <span className="cards-card-shine" />}
      </div>
      <div className="cards-card-meta">
        <p className="cards-card-name">
          {card.name}
          {shiny && (
            <span className="cards-shiny-label">
              {" "}
              ✦ Shiny{shinyQty ? ` ×${shinyQty}` : ""}
            </span>
          )}
        </p>
        <div className="cards-card-row">
          <Badge variant="secondary">{RARITY_LABELS[card.rarity]}</Badge>
          <span className="flex items-center gap-2">
            {qty !== undefined && qty > 0 && (
              <span className="text-xs text-muted-foreground">×{qty}</span>
            )}
            <span className="cards-card-number">
              #{String(card.number).padStart(3, "0")}
            </span>
          </span>
        </div>
        {isNew && (
          <div className="cards-card-row">
            <Badge variant="default">Nouvelle</Badge>
          </div>
        )}
      </div>
    </article>
  );
}
