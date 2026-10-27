"use client";

import { X, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { CATALOG, CARD_SETS, cardSet, type CardSetId } from "../catalog/cards";
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

type SortKey = "number" | "rarity" | "recent";

export function CollectionScreen({ save }: { save: CardsSave }) {
  const reduced = usePrefersReducedMotion();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [setFilter, setSetFilter] = useState<CardSetId | "all">("all");
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [includeMissing, setIncludeMissing] = useState(false);
  const [sort, setSort] = useState<SortKey>("number");
  const [shinyOnly, setShinyOnly] = useState(false);
  const [normalViewFor, setNormalViewFor] = useState<string | null>(null);
  const [detail, setDetail] = useState<CardDefinition | null>(null);

  const swipeStart = useRef<{ id: number; x: number; y: number } | null>(null);

  const progress = catalogProgress(save);
  const copies = totalCopies(save);
  const uniques = uniqueOwnedCount(save);

  const rows = useMemo(() => {
    let list = CATALOG.filter(
      (card) => setFilter === "all" || cardSet(card) === setFilter,
    );
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
    if (!includeMissing)
      list = list.filter((c) => (save.collection[c.id]?.qty ?? 0) > 0);

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
  }, [
    query,
    rarity,
    includeMissing,
    sort,
    shinyOnly,
    setFilter,
    save.collection,
  ]);

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

  const activeFilters: { key: string; label: string; clear: () => void }[] = [];
  if (setFilter !== "all")
    activeFilters.push({
      key: "set",
      label: CARD_SETS.find((set) => set.id === setFilter)!.name,
      clear: () => setSetFilter("all"),
    });
  if (query.trim())
    activeFilters.push({
      key: "query",
      label: `Recherche : ${query.trim()}`,
      clear: () => setQuery(""),
    });
  if (rarity !== "all")
    activeFilters.push({
      key: "rarity",
      label: RARITY_LABELS[rarity],
      clear: () => setRarity("all"),
    });
  if (shinyOnly)
    activeFilters.push({
      key: "shiny",
      label: "Shiny",
      clear: () => setShinyOnly(false),
    });
  if (sort !== "number")
    activeFilters.push({
      key: "sort",
      label: sort === "rarity" ? "Tri : rareté" : "Tri : récentes",
      clear: () => setSort("number"),
    });
  const clearFilters = () => {
    setSetFilter("all");
    setQuery("");
    setRarity("all");
    setShinyOnly(false);
    setSort("number");
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

      <div className="cards-collection-toolbar">
        <div className="cards-collection-toolbar-start">
          <label className="cards-missing-toggle">
            <span>Afficher les cartes manquantes</span>
            <Switch
              checked={includeMissing}
              onCheckedChange={setIncludeMissing}
              aria-label="Afficher les cartes manquantes"
            />
          </label>
        </div>
        <Button
          variant="outline"
          className="min-h-11"
          onClick={() => setFiltersOpen(true)}
        >
          <SlidersHorizontal aria-hidden="true" /> Filtrer
          {activeFilters.length > 0 && (
            <Badge variant="secondary">{activeFilters.length}</Badge>
          )}
        </Button>
      </div>
      {activeFilters.length > 0 && (
        <div className="cards-active-filters" aria-label="Filtres actifs">
          {activeFilters.map((filter) => (
            <Button
              key={filter.key}
              size="sm"
              variant="secondary"
              className="min-h-9"
              aria-label={`Retirer le filtre ${filter.label}`}
              onClick={filter.clear}
            >
              {filter.label}
              <X aria-hidden="true" />
            </Button>
          ))}
        </div>
      )}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent
          side="right"
          className="cards-filter-sheet w-full sm:max-w-md overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>Filtrer la collection</SheetTitle>
            <SheetDescription>Affiner les cartes affichées.</SheetDescription>
          </SheetHeader>
          <div className="cards-filter-controls px-4 pb-4">
            <fieldset className="cards-set-filter">
              <legend>Collection</legend>
              <div className="cards-set-options">
                {[
                  {
                    id: "all",
                    name: "Toutes les collections",
                    count: CATALOG.length,
                  },
                  ...CARD_SETS,
                ].map((set) => (
                  <label key={set.id} className="cards-set-option">
                    <input
                      type="radio"
                      name="cards-collection-filter"
                      value={set.id}
                      checked={setFilter === set.id}
                      onChange={() => setSetFilter(set.id as CardSetId | "all")}
                    />
                    <span>{set.name}</span>
                    <span className="cards-set-option-count">
                      {set.count} cartes
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Input
              type="search"
              placeholder="Rechercher une carte…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-3"
              aria-label="Rechercher par nom"
            />

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
                aria-pressed={rarity === "all"}
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
                  aria-pressed={rarity === r}
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
                  aria-pressed={sort === key}
                  variant={sort === key ? "default" : "outline"}
                  className="min-h-11"
                  onClick={() => setSort(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="cards-filter-footer">
            <Button
              variant="ghost"
              disabled={activeFilters.length === 0}
              onClick={clearFilters}
            >
              Tout effacer
            </Button>
            <Button variant="primary" onClick={() => setFiltersOpen(false)}>
              Voir {rows.length} carte{rows.length > 1 ? "s" : ""}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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
