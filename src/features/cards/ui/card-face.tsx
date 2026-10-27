"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RARITY_LABELS, type CardDefinition, type Rarity } from "../catalog/types";

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
}: {
  card: CardDefinition;
  qty?: number;
  missing?: boolean;
  compact?: boolean;
  className?: string;
  effectActive?: boolean;
  faceDown?: boolean;
  isNew?: boolean;
}) {
  if (faceDown) {
    return (
      <div
        className={cn("cards-card cards-card-back", className)}
        aria-label="Carte face cachée"
      >
        <span className="cards-card-back-mark" aria-hidden>
          ?
        </span>
      </div>
    );
  }

  return (
    <article
      className={cn(
        "cards-card",
        rarityClass[card.rarity],
        missing && "cards-card-missing",
        compact && "cards-card-compact",
        effectActive && "cards-card-effect-active",
        className,
      )}
      data-rarity={card.rarity}
      aria-label={`${card.name}, ${RARITY_LABELS[card.rarity]}, n° ${String(card.number).padStart(3, "0")}`}
    >
      <div className="cards-card-art" aria-hidden>
        <span className="cards-card-art-label">
          CARTE {card.number}
          <br />
          {RARITY_LABELS[card.rarity]}
        </span>
        {effectActive && <span className="cards-card-shine" />}
      </div>
      <div className="cards-card-meta">
        <p className="cards-card-name">{card.name}</p>
        <div className="cards-card-row">
          <Badge variant="secondary">{RARITY_LABELS[card.rarity]}</Badge>
          <span className="cards-card-number">
            #{String(card.number).padStart(3, "0")}
          </span>
        </div>
        {(qty !== undefined || isNew) && (
          <div className="cards-card-row">
            {isNew && <Badge variant="default">Nouvelle</Badge>}
            {qty !== undefined && qty > 0 && (
              <span className="text-xs text-muted-foreground">×{qty}</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
