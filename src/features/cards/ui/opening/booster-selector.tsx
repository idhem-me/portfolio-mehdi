"use client";

import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BoosterArtwork } from "./booster-artwork";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CARD_SETS,
  CATALOG,
  cardSet,
  type CardSetId,
} from "../../catalog/cards";

export function BoosterSelector({
  selected,
  onSelect,
  reduced,
  collection,
}: {
  selected: CardSetId;
  onSelect: (setId: CardSetId) => void;
  reduced: boolean;
  collection: Record<string, { qty: number }>;
}) {
  const index = CARD_SETS.findIndex((set) => set.id === selected);
  const go = (next: number) => {
    const set = CARD_SETS[next];
    if (set) onSelect(set.id);
  };
  return (
    <section
      className="cards-booster-selector"
      aria-label="Choisir une collection de boosters"
    >
      <div className="cards-booster-carousel">
        {CARD_SETS.filter((set) => set.id === selected).map((set) => (
          <motion.div
            key={set.id}
            initial={reduced ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.x) > 40)
                go(index + (info.offset.x < 0 ? 1 : -1));
            }}
            className={`cards-booster-option cards-booster-option-${set.id}`}
            role="group"
            aria-roledescription="diapositive"
            aria-label={`${set.name}, ${set.count} cartes`}
          >
            <div className="cards-selector-pack-frame">
              <BoosterArtwork setId={set.id} />
              <Badge
                variant="secondary"
                className="cards-booster-completion"
                aria-label={`Complétion ${set.name} : ${CATALOG.filter((card) => cardSet(card) === set.id && (collection[card.id]?.qty ?? 0) > 0).length} sur ${set.count} cartes`}
              >
                {
                  CATALOG.filter(
                    (card) =>
                      cardSet(card) === set.id &&
                      (collection[card.id]?.qty ?? 0) > 0,
                  ).length
                }
                /{set.count}
              </Badge>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="cards-selector-navigation">
        <Button
          size="icon"
          variant="ghost"
          aria-label="Booster précédent"
          disabled={index === 0}
          onClick={() => go(index - 1)}
        >
          <ChevronLeft />
        </Button>
        <div
          className="cards-selector-dots"
          role="group"
          aria-label="Collections"
        >
          {CARD_SETS.map((set, position) => (
            <button
              key={set.id}
              aria-label={`Choisir ${set.name}`}
              aria-pressed={selected === set.id}
              onClick={() => go(position)}
            >
              <span />
            </button>
          ))}
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Booster suivant"
          disabled={index === CARD_SETS.length - 1}
          onClick={() => go(index + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </section>
  );
}
