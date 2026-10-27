"use client";

import { animate } from "motion/react";
import { useEffect, useRef } from "react";
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
  onOpen,
  canOpen,
}: {
  selected: CardSetId;
  onOpen: () => void;
  canOpen: boolean;
  onSelect: (setId: CardSetId) => void;
  reduced: boolean;
  collection: Record<string, { qty: number }>;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selected);
  const suppressClick = useRef(false);
  const pressedSet = useRef<string | undefined>(undefined);
  const settling = useRef<ReturnType<typeof animate> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseDrag = useRef<{
    x: number;
    scroll: number;
    index: number;
    lastX: number;
    time: number;
    velocity: number;
  } | null>(null);
  const index = CARD_SETS.findIndex((set) => set.id === selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  const go = (next: number, instant = false) => {
    const element = viewport.current;
    const target = Math.max(0, Math.min(CARD_SETS.length - 1, next));
    const item = element?.children[target] as HTMLElement | undefined;
    if (!element || !item) return;
    settling.current?.stop();
    settling.current = null;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    const left = item.offsetLeft - (element.clientWidth - item.offsetWidth) / 2;
    if (reduced || instant || Math.abs(element.scrollLeft - left) < 0.5) {
      element.scrollLeft = left;
      return;
    }
    settling.current = animate(element.scrollLeft, left, {
      type: "spring",
      stiffness: 145,
      damping: 26,
      mass: 1,
      restDelta: 0.25,
      restSpeed: 2,
      onUpdate: (value) => {
        element.scrollLeft = value;
      },
      onComplete: () => {
        settling.current = null;
      },
    });
  };
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const align = () => {
      const position = CARD_SETS.findIndex(
        (set) => set.id === selectedRef.current,
      );
      const item = element.children[position] as HTMLElement;
      if (item)
        element.scrollLeft =
          item.offsetLeft - (element.clientWidth - item.offsetWidth) / 2;
    };
    const observer = new ResizeObserver(align);
    observer.observe(element);
    return () => {
      observer.disconnect();
      settling.current?.stop();
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, []);
  const nearest = (element: HTMLDivElement) => {
    const center = element.scrollLeft + element.clientWidth / 2;
    return Array.from(element.children).reduce(
      (best, child, position, children) => {
        const distance = (node: Element) =>
          Math.abs(
            (node as HTMLElement).offsetLeft +
              (node as HTMLElement).offsetWidth / 2 -
              center,
          );
        return distance(child) < distance(children[best]) ? position : best;
      },
      0,
    );
  };
  return (
    <section
      className="cards-booster-selector"
      aria-label="Choisir une collection de boosters"
    >
      <div
        className="cards-booster-carousel"
        ref={viewport}
        onScroll={(event) => {
          const element = event.currentTarget;
          onSelect(CARD_SETS[nearest(element)].id);
          if (settleTimer.current) clearTimeout(settleTimer.current);
          if (!mouseDrag.current && !settling.current) {
            settleTimer.current = setTimeout(() => go(nearest(element)), 120);
          }
        }}
        onClick={(event) => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          const option = (event.target as HTMLElement).closest<HTMLElement>(
            "[data-booster-set]",
          );
          const clickedSet = option?.dataset.boosterSet ?? pressedSet.current;
          if (!clickedSet) return;
          if (clickedSet === selected) {
            if (canOpen) onOpen();
          } else go(CARD_SETS.findIndex((set) => set.id === clickedSet));
        }}
        onPointerDown={(event) => {
          suppressClick.current = false;
          pressedSet.current = (
            event.target as HTMLElement
          ).closest<HTMLElement>("[data-booster-set]")?.dataset.boosterSet;
          if (event.pointerType !== "mouse" || event.button !== 0) return;
          settling.current?.stop();
          settling.current = null;
          if (settleTimer.current) clearTimeout(settleTimer.current);
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.classList.add("is-dragging");
          event.currentTarget.scrollTo({
            left: event.currentTarget.scrollLeft,
            behavior: "instant",
          });
          mouseDrag.current = {
            x: event.clientX,
            scroll: event.currentTarget.scrollLeft,
            index: nearest(event.currentTarget),
            lastX: event.clientX,
            time: performance.now(),
            velocity: 0,
          };
        }}
        onPointerMove={(event) => {
          const drag = mouseDrag.current;
          if (!drag) return;
          const now = performance.now();
          const velocity =
            (drag.lastX - event.clientX) / Math.max(1, now - drag.time);
          drag.velocity = drag.velocity * 0.5 + velocity * 0.5;
          drag.lastX = event.clientX;
          drag.time = now;
          event.currentTarget.scrollLeft = drag.scroll + drag.x - event.clientX;
        }}
        onPointerUp={(event) => {
          const drag = mouseDrag.current;
          if (!drag) return;
          const distance = drag.x - event.clientX;
          suppressClick.current = Math.abs(distance) > 8;
          const velocity =
            performance.now() - drag.time < 100 ? drag.velocity : 0;
          const width = (
            event.currentTarget.children[drag.index] as HTMLElement
          ).offsetWidth;
          const advance =
            Math.abs(distance) > width * 0.18 ||
            (Math.abs(velocity) > 0.45 && Math.abs(distance) > 16);
          mouseDrag.current = null;
          event.currentTarget.classList.remove("is-dragging");
          go(
            advance
              ? drag.index + (distance > 0 ? 1 : -1)
              : nearest(event.currentTarget),
          );
        }}
        onPointerCancel={(event) => {
          mouseDrag.current = null;
          event.currentTarget.classList.remove("is-dragging");
          go(nearest(event.currentTarget));
        }}
        onLostPointerCapture={(event) => {
          if (!mouseDrag.current) return;
          mouseDrag.current = null;
          event.currentTarget.classList.remove("is-dragging");
          go(nearest(event.currentTarget));
        }}
      >
        {CARD_SETS.map((set) => (
          <div
            key={set.id}
            data-booster-set={set.id}
            className={`cards-booster-option cards-booster-option-${set.id}`}
            role="group"
            aria-roledescription="diapositive"
            aria-label={`${set.name}, ${set.count} cartes`}
          >
            <div
              className="cards-selector-pack-frame"
              role="button"
              tabIndex={selected === set.id ? 0 : -1}
              aria-label={`Ouvrir un booster ${set.name}`}
              aria-disabled={!canOpen}
              onKeyDown={(event) => {
                if (["Enter", " "].includes(event.key)) {
                  event.preventDefault();
                  if (canOpen && !event.repeat) onOpen();
                }
              }}
            >
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
          </div>
        ))}
      </div>
      <div className="cards-selector-navigation">
        <Button
          size="icon"
          variant="secondary"
          aria-label="Booster précédent"
          disabled={index === 0}
          onClick={() => go(index - 1)}
        >
          <ChevronLeft />
        </Button>
        <Button
          size="icon"
          variant="secondary"
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
