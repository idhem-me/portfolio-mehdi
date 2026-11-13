"use client";

import { NativeButton } from "@/components/design-system/native-controls";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { CaseStudyImage } from "@/lib/content";
import { ThemePairImage } from "@/features/case-study/ui/theme-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

function groupPairs(images: CaseStudyImage[]) {
  const pairs: { light: CaseStudyImage; dark: CaseStudyImage }[] = [];
  let i = 0;
  while (i < images.length) {
    const current = images[i]!;
    const next = images[i + 1];
    if (current.theme === "light" && next?.theme === "dark") {
      pairs.push({ light: current, dark: next });
      i += 2;
    } else {
      i += 1;
    }
  }
  return pairs;
}

type CaseStudySliderProps = {
  images: CaseStudyImage[];
  pairLabels?: { light: string; dark: string };
  className?: string;
};

/** Slider pleine largeur : une slide = largeur colonne, scroll soft + flèches. */
export function CaseStudySlider({
  images,
  pairLabels,
  className,
}: CaseStudySliderProps) {
  const t = useTranslations("caseStudyControls");
  const direction = useLocale() === "ar" ? -1 : 1;
  const pairs = groupPairs(images);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const reduced = usePrefersReducedMotion();
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startScroll: number;
    moved: boolean;
  } | null>(null);

  const syncIndex = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    const next = Math.round(direction * el.scrollLeft / el.clientWidth);
    setIndex(Math.max(0, Math.min(pairs.length - 1, next)));
  }, [direction, pairs.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    syncIndex();
    el.addEventListener("scroll", syncIndex, { passive: true });
    const ro = new ResizeObserver(syncIndex);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", syncIndex);
      ro.disconnect();
    };
  }, [syncIndex]);

  const goTo = useCallback(
    (next: number) => {
      const el = scrollerRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(pairs.length - 1, next));
      el.scrollTo({
        left: direction * clamped * el.clientWidth,
        behavior: reduced ? "auto" : "smooth",
      });
      setIndex(clamped);
    },
    [direction, pairs.length, reduced],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    // Laisser passer clics lightbox / toggle thème
    if ((e.target as HTMLElement | null)?.closest?.("button")) return;
    const el = scrollerRef.current;
    if (!el) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollerRef.current;
    if (!drag || !el || e.pointerId !== drag.pointerId) return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > 4) drag.moved = true;
    el.scrollLeft = drag.startScroll - dx;
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollerRef.current;
    if (!drag || !el || e.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (!drag.moved) return;
    const width = el.clientWidth || 1;
    const target = Math.round(direction * el.scrollLeft / width);
    goTo(target);
  };

  if (pairs.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        <div
          ref={scrollerRef}
          className={cn(
            "flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain",
            "touch-pan-y [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            !reduced && "scroll-smooth",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          role="region"
          aria-roledescription="carousel"
          aria-label={t("screens")}
        >
          {pairs.map(({ light, dark }, pairIndex) => (
            <div
              key={`${light.src ?? light.alt}-${pairIndex}`}
              className="min-w-full shrink-0 basis-full snap-start snap-always"
            >
              <ThemePairImage
                light={light}
                dark={dark}
                browser={false}
                labels={pairLabels}
              />
            </div>
          ))}
        </div>

        {pairs.length > 1 ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              className="absolute start-2 top-1/2 z-10 -translate-y-1/2 shadow-sm ring-1 ring-foreground/10 disabled:opacity-40"
              aria-label={t("previous")}
              disabled={index <= 0}
              onClick={() => goTo(index - 1)}
            >
              <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              className="absolute end-2 top-1/2 z-10 -translate-y-1/2 shadow-sm ring-1 ring-foreground/10 disabled:opacity-40"
              aria-label={t("next")}
              disabled={index >= pairs.length - 1}
              onClick={() => goTo(index + 1)}
            >
              <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
            </Button>
          </>
        ) : null}
      </div>

      {pairs.length > 1 ? (
        <div
          className="flex flex-wrap items-center justify-center gap-1"
          role="group"
          aria-label={t("screens")}
        >
          {pairs.map((pair, i) => (
            <NativeButton
              key={`${pair.light.src ?? pair.light.alt}-${i}`}
              type="button"
              aria-current={i === index ? "true" : undefined}
              aria-label={t("slide", { number: i + 1, name: pair.light.caption ?? pair.light.alt })}
              className="group grid size-(--control-height-icon-xs) place-items-center rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => goTo(i)}
            >
              <span aria-hidden className={cn(
                "h-1.5 rounded-full transition-[width,background-color] duration-300 ease-out motion-reduce:transition-none",
                i === index ? "w-5 bg-foreground" : "w-1.5 bg-foreground/35 group-hover:bg-foreground/60",
              )} />
            </NativeButton>
          ))}
        </div>
      ) : null}
    </div>
  );
}
