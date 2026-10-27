"use client";

import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CATALOG } from "../catalog/cards";
import {
  RARITIES,
  RARITY_LABELS,
  RARITY_RANK,
  type CardDefinition,
  type Rarity,
} from "../catalog/types";
import type { CardsSave } from "../persistence/types";
import {
  catalogProgress,
  totalCopies,
  uniqueOwnedCount,
} from "../persistence/repository";
import { CardFace } from "./card-face";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type OwnFilter = "all" | "owned" | "missing";
type SortKey = "number" | "rarity" | "recent";

export function CollectionScreen({ save }: { save: CardsSave }) {
  const reduced = usePrefersReducedMotion();
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [own, setOwn] = useState<OwnFilter>("all");
  const [sort, setSort] = useState<SortKey>("number");
  const [shinyOnly, setShinyOnly] = useState(false);
  const [normalViewFor, setNormalViewFor] = useState<string | null>(null);
  const [detail, setDetail] = useState<CardDefinition | null>(null);

  const swipeStart = useRef<{ id: number; x: number; y: number } | null>(null);

  const progress = catalogProgress(save);
  const copies = totalCopies(save);
  const uniques = uniqueOwnedCount(save);

  const rows = useMemo(() => {
    let list = [...CATALOG];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          String(c.number).includes(q) ||
          c.id.includes(q),
      );
    }
    if (shinyOnly)
      list = list.filter(
        (card) => (save.collection[card.id]?.shinyQty ?? 0) > 0,
      );
    if (rarity !== "all") list = list.filter((c) => c.rarity === rarity);
    if (own === "owned") list = list.filter((c) => save.collection[c.id]);
    if (own === "missing") list = list.filter((c) => !save.collection[c.id]);

    list.sort((a, b) => {
      if (sort === "number") return a.number - b.number;
      if (sort === "rarity") {
        const d = RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
        return d !== 0 ? d : a.number - b.number;
      }
      const ta = save.collection[a.id]?.lastAcquiredAt ?? 0;
      const tb = save.collection[b.id]?.lastAcquiredAt ?? 0;
      return tb - ta || a.number - b.number;
    });
    return list;
  }, [query, rarity, own, sort, shinyOnly, save.collection]);

  const detailShiny = Boolean(
    detail &&
    (save.collection[detail.id]?.shinyQty ?? 0) > 0 &&
    normalViewFor !== detail.id,
  );
  const detailIndex = detail
    ? rows.findIndex((card) => card.id === detail.id)
    : -1;
  const navigate = (direction: -1 | 1) => {
    const next = rows[detailIndex + direction];
    if (next) setDetail(next);
  };

  return (
    <div className="cards-collection">
      <div className="cards-stats-row">
        <p className="text-sm text-muted-foreground">
          {uniques}/{progress.total} uniques · {copies} exemplaires
        </p>
        <Badge variant="secondary">
          {Math.round((progress.owned / progress.total) * 100)} %
        </Badge>
      </div>

      <Input
        type="search"
        placeholder="Rechercher une carte…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mt-3"
        aria-label="Rechercher par nom"
      />

      <div className="cards-filter-row mt-3">
        <Button
          size="sm"
          variant={own === "all" ? "default" : "outline"}
          className="min-h-11"
          onClick={() => setOwn("all")}
        >
          Toutes
        </Button>
        <Button
          size="sm"
          variant={own === "owned" ? "default" : "outline"}
          className="min-h-11"
          onClick={() => setOwn("owned")}
        >
          Possédées
        </Button>
        <Button
          size="sm"
          variant={own === "missing" ? "default" : "outline"}
          className="min-h-11"
          onClick={() => setOwn("missing")}
        >
          Manquantes
        </Button>
      </div>

      <div className="cards-filter-row mt-2">
        <Button
          size="sm"
          variant={shinyOnly ? "secondary" : "outline"}
          aria-pressed={shinyOnly}
          className="min-h-11"
          onClick={() => setShinyOnly((value) => !value)}
        >
          Shiny uniquement
        </Button>
        <Button
          size="sm"
          variant={rarity === "all" ? "secondary" : "outline"}
          className="min-h-11"
          onClick={() => setRarity("all")}
        >
          Rareté
        </Button>
        {RARITIES.map((r) => (
          <Button
            key={r}
            size="sm"
            variant={rarity === r ? "secondary" : "outline"}
            className="min-h-11"
            onClick={() => setRarity(r)}
          >
            {RARITY_LABELS[r]}
          </Button>
        ))}
      </div>

      <div className="cards-filter-row mt-2">
        {(
          [
            ["number", "N°"],
            ["rarity", "Rareté"],
            ["recent", "Récentes"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={sort === key ? "default" : "outline"}
            className="min-h-11"
            onClick={() => setSort(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Aucune carte ne correspond aux filtres.
        </p>
      ) : (
        <ul className="cards-grid mt-4">
          {rows.map((card) => {
            const entry = save.collection[card.id];
            const missing = !entry;
            return (
              <li key={card.id}>
                <button
                  type="button"
                  className="cards-grid-hit"
                  onClick={() => setDetail(card)}
                >
                  <CardFace
                    card={card}
                    shiny={(entry?.shinyQty ?? 0) > 0}
                    shinyQty={entry?.shinyQty}
                    missing={missing}
                    qty={entry?.qty}
                    compact
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={Boolean(detail)}
        onOpenChange={(o) => !o && setDetail(null)}
      >
        <DialogContent
          className="cards-detail cards-surface"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              if (!event.repeat) navigate(event.key === "ArrowLeft" ? -1 : 1);
            }
          }}
        >
          {detail && (
            <div className="cards-detail-layout">
              <Button
                variant="ghost"
                size="icon"
                className="cards-detail-close"
                aria-label="Fermer la fiche"
                onClick={() => setDetail(null)}
              >
                <X />
              </Button>
              <DialogTitle className="sr-only">{detail.name}</DialogTitle>
              <DialogDescription className="sr-only">
                {RARITY_LABELS[detail.rarity]} · #
                {String(detail.number).padStart(3, "0")}
              </DialogDescription>
              <div
                className="cards-detail-card"
                onPointerDownCapture={(event) => {
                  if (event.isPrimary && event.button === 0) {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    swipeStart.current = {
                      id: event.pointerId,
                      x: event.clientX,
                      y: event.clientY,
                    };
                  }
                }}
                onPointerUpCapture={(event) => {
                  const start = swipeStart.current;
                  swipeStart.current = null;
                  if (!start || start.id !== event.pointerId) return;
                  const dx = event.clientX - start.x;
                  const dy = event.clientY - start.y;
                  if (Math.abs(dx) >= 80 && Math.abs(dx) > Math.abs(dy) * 1.3)
                    navigate(dx < 0 ? 1 : -1);
                }}
                onPointerCancelCapture={() => {
                  swipeStart.current = null;
                }}
              >
                <CardFace
                  key={detail.id}
                  interactive={Boolean(save.collection[detail.id])}
                  missing={!save.collection[detail.id]}
                  card={detail}
                  shiny={detailShiny}
                  effectActive={
                    !reduced &&
                    Boolean(save.collection[detail.id]) &&
                    RARITY_RANK[detail.rarity] >= RARITY_RANK.rare
                  }
                />
              </div>
              {detail && (save.collection[detail.id]?.shinyQty ?? 0) > 0 && (
                <div
                  className="flex justify-center gap-2"
                  aria-label="Variante de carte"
                >
                  {save.collection[detail.id]!.qty >
                    (save.collection[detail.id]!.shinyQty ?? 0) && (
                    <Button
                      size="sm"
                      variant={!detailShiny ? "secondary" : "outline"}
                      onClick={() => setNormalViewFor(detail.id)}
                    >
                      Classique
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={detailShiny ? "secondary" : "outline"}
                    onClick={() => setNormalViewFor(null)}
                  >
                    ✦ Shiny ×{save.collection[detail.id]!.shinyQty}
                  </Button>
                </div>
              )}
              <div
                className="flex items-center justify-center gap-4"
                aria-label="Navigation entre les cartes"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11"
                  aria-label="Carte précédente"
                  disabled={detailIndex <= 0}
                  onClick={() => navigate(-1)}
                >
                  <ChevronLeft />
                </Button>
                <span
                  role="status"
                  aria-live="polite"
                  className="text-xs text-muted-foreground"
                >
                  {detailIndex + 1} / {rows.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11"
                  aria-label="Carte suivante"
                  disabled={detailIndex >= rows.length - 1}
                  onClick={() => navigate(1)}
                >
                  <ChevronRight />
                </Button>
              </div>
              {save.collection[detail.id] && detail.description && (
                <p className="text-center text-xs text-muted-foreground">
                  {detail.description}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
