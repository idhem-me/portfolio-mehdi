"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { HomeKeyword } from "@/lib/content";
import { cn } from "@/lib/utils";

/** Fond surlignage jaune (texte via classes Tailwind : noir clair / blanc dark). */
const MARK_BG = {
  light: "oklch(0.92 0.16 95 / 0.4)",
  dark: "oklch(0.7 0.17 95 / 0.45)",
} as const;

const MIN_SIZE_PX = 14;
const MAX_SIZE_PX = 20;
/** Marge anti-chevauchement (hitbox) — jamais de superposition. */
const MARGIN_PX = 10;
const MIN_ROT_DEG = -5;
const MAX_ROT_DEG = 5;
const MAX_ATTEMPTS = 200;
const TONE_COUNT = 6;
const MEASURE_PAD = 1.06;

type KeywordCloudProps = {
  keywords: HomeKeyword[];
  className?: string;
};

type Placement = {
  left: number;
  top: number;
  fontSize: number;
  rotate: number;
  width: number;
  height: number;
  toneIndex: number;
  highlighted: boolean;
};

type Box = { left: number; top: number; width: number; height: number };

function hashSeed(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function overlaps(a: Box, b: Box) {
  return !(
    a.left + a.width <= b.left ||
    b.left + b.width <= a.left ||
    a.top + a.height <= b.top ||
    b.top + b.height <= a.top
  );
}

function withMargin(box: Box, margin: number): Box {
  return {
    left: box.left - margin,
    top: box.top - margin,
    width: box.width + margin * 2,
    height: box.height + margin * 2,
  };
}

function rotatedBounds(
  left: number,
  top: number,
  width: number,
  height: number,
  rotateDeg: number,
): Box {
  const rad = (rotateDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const bw = width * cos + height * sin;
  const bh = width * sin + height * cos;
  const cx = left + width / 2;
  const cy = top + height / 2;
  return {
    left: cx - bw / 2,
    top: cy - bh / 2,
    width: bw,
    height: bh,
  };
}

function measureWord(
  text: string,
  fontSize: number,
  fontFamily: string,
): { width: number; height: number } {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      width: Math.ceil(text.length * fontSize * 0.55 * MEASURE_PAD),
      height: Math.ceil(fontSize * 1.2),
    };
  }
  ctx.font = `600 ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  const width = Math.ceil(metrics.width * MEASURE_PAD);
  const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
  const descent = metrics.actualBoundingBoxDescent || fontSize * 0.25;
  return {
    width,
    height: Math.ceil((ascent + descent) * MEASURE_PAD),
  };
}

function hitboxFor(
  left: number,
  top: number,
  width: number,
  height: number,
  rotate: number,
  margin = MARGIN_PX,
): Box {
  return withMargin(rotatedBounds(left, top, width, height, rotate), margin);
}

function fitsInContainer(box: Box, containerW: number, containerH: number) {
  return (
    box.left >= 0 &&
    box.top >= 0 &&
    box.left + box.width <= containerW &&
    box.top + box.height <= containerH
  );
}

function tryPlace(
  width: number,
  height: number,
  rotate: number,
  containerW: number,
  containerH: number,
  placed: Placement[],
  rng: () => number,
  margin = MARGIN_PX,
): { left: number; top: number } | null {
  const placedBoxes = placed.map((p) =>
    hitboxFor(p.left, p.top, p.width, p.height, p.rotate, margin),
  );

  const collides = (left: number, top: number) => {
    const box = hitboxFor(left, top, width, height, rotate, margin);
    if (!fitsInContainer(box, containerW, containerH)) return true;
    return placedBoxes.some((p) => overlaps(box, p));
  };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const left = rng() * Math.max(containerW - width, 0);
    const top = rng() * Math.max(containerH - height, 0);
    if (!collides(left, top)) return { left, top };
  }

  const stepX = Math.max(4, Math.floor(width * 0.25));
  const stepY = Math.max(4, Math.floor(height * 0.25));
  for (let top = margin; top <= containerH - height - margin; top += stepY) {
    for (let left = margin; left <= containerW - width - margin; left += stepX) {
      if (!collides(left, top)) return { left, top };
    }
  }

  return null;
}

/** Mots à toujours garder visibles (souvent exclus car trop courts / placés en dernier). */
const PRIORITY_LABELS = new Set(["Figma", "Vibecoding"]);

function packKeywords(
  labels: string[],
  containerW: number,
  containerH: number,
  fontFamily: string,
): Placement[] {
  const rng = createRng(
    hashSeed(`${labels.join("|")}|${containerW}x${containerH}`),
  );

  // Longs d’abord ; Figma / Vibecoding prioritaires (sans jamais chevaucher)
  const order = labels
    .map((text, index) => ({
      text,
      index,
      rank: measureWord(text, MAX_SIZE_PX, fontFamily).width,
      priority: PRIORITY_LABELS.has(text) ? 1 : 0,
    }))
    .sort((a, b) => b.priority - a.priority || b.rank - a.rank);

  const highlightBudget = Math.max(3, Math.round(labels.length * 0.35));

  const runPass = (margin: number, forceMinSize: boolean): (Placement | null)[] => {
    const byIndex: (Placement | null)[] = labels.map(() => null);
    let highlightsLeft = highlightBudget;

    for (const { text, index } of order) {
      const toneIndex = Math.floor(rng() * TONE_COUNT);
      const highlighted = highlightsLeft > 0 && rng() < 0.45;
      if (highlighted) highlightsLeft -= 1;

      const preferred = forceMinSize
        ? MIN_SIZE_PX
        : MIN_SIZE_PX + rng() * (MAX_SIZE_PX - MIN_SIZE_PX);
      const sizes: number[] = [];
      for (let s = preferred; s >= MIN_SIZE_PX; s -= 1) sizes.push(s);
      if (sizes[sizes.length - 1] !== MIN_SIZE_PX) sizes.push(MIN_SIZE_PX);

      const placedSoFar = byIndex.filter(Boolean) as Placement[];
      let placed: Placement | null = null;

      for (const fontSize of sizes) {
        const size = Math.max(MIN_SIZE_PX, fontSize);
        const rotate = forceMinSize
          ? 0
          : MIN_ROT_DEG + rng() * (MAX_ROT_DEG - MIN_ROT_DEG);
        const { width, height } = measureWord(text, size, fontFamily);
        if (width + margin * 2 > containerW || height + margin * 2 > containerH) {
          continue;
        }

        for (const rot of forceMinSize ? [0] : [rotate, 0]) {
          const pos = tryPlace(
            width,
            height,
            rot,
            containerW,
            containerH,
            placedSoFar,
            rng,
            margin,
          );
          if (pos) {
            placed = {
              ...pos,
              fontSize: size,
              rotate: rot,
              width,
              height,
              toneIndex,
              highlighted,
            };
            break;
          }
        }
        if (placed) break;
      }

      // Uniquement si aucune collision — jamais de fallback qui superpose
      if (placed) byIndex[index] = placed;
    }

    return byIndex;
  };

  // Passe 1 : marge confortable + tailles variées
  let byIndex = runPass(MARGIN_PX, false);
  // Passe 2 : si des trous, tout en 14px + même marge (toujours sans overlap)
  if (byIndex.some((p) => !p)) {
    byIndex = runPass(MARGIN_PX, true);
  }
  // Passe 3 : marge un peu plus serrée mais collision toujours testée
  if (byIndex.some((p) => !p)) {
    byIndex = runPass(6, true);
  }

  return byIndex.map((p, i) => {
    if (p) return p;
    // Mot non placé sans chevauchement → masqué (pas de superposition)
    return {
      left: -9999,
      top: -9999,
      fontSize: MIN_SIZE_PX,
      rotate: 0,
      width: 0,
      height: 0,
      toneIndex: i % TONE_COUNT,
      highlighted: false,
    };
  });
}

export function KeywordCloud({ keywords, className }: KeywordCloudProps) {
  const rootRef = useRef<HTMLUListElement>(null);
  const [placements, setPlacements] = useState<Placement[] | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { resolvedTheme } = useTheme();
  const markBg =
    resolvedTheme === "dark" ? MARK_BG.dark : MARK_BG.light;

  const labels = useMemo(() => keywords.map((k) => k.label), [keywords]);
  const seedKey = useMemo(() => labels.join("|"), [labels]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || labels.length === 0) return;

    const layout = () => {
      const { width, height } = root.getBoundingClientRect();
      if (width < 8 || height < 8) return;
      const fontFamily = getComputedStyle(root).fontFamily || "sans-serif";
      setPlacements(packKeywords(labels, width, height, fontFamily));
    };

    layout();

    const ro = new ResizeObserver(layout);
    ro.observe(root);
    return () => ro.disconnect();
  }, [labels, seedKey]);

  return (
    <TooltipProvider delayDuration={120}>
      <ul
        ref={rootRef}
        className={cn("relative h-full min-h-32 w-full font-sans", className)}
        aria-label={labels.join(", ")}
      >
        {keywords.map((keyword, i) => {
          const p = placements?.[i];
          const visible = Boolean(p && p.left > -1000 && p.width > 0);
          if (!visible) return null;

          return (
            <li
              key={`${keyword.label}-${i}`}
              className="absolute list-none"
              style={{
                left: p!.left,
                top: p!.top,
                transform: `rotate(${p!.rotate}deg)`,
                transformOrigin: "center center",
              }}
            >
              <Tooltip
                open={openIndex === i}
                onOpenChange={(open) => setOpenIndex(open ? i : null)}
              >
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    data-physics-item
                    data-physics-exact
                    className={cn(
                      "cursor-pointer whitespace-nowrap leading-none font-semibold outline-none",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                      p!.highlighted && "text-neutral-950 dark:!text-white",
                    )}
                    style={{
                      fontSize: `${p!.fontSize}px`,
                      ...(p!.highlighted
                        ? {
                            paddingInline: "0.15em",
                            backgroundImage: `linear-gradient(
                              transparent 42%,
                              ${markBg} 42%,
                              ${markBg} 88%,
                              transparent 88%
                            )`,
                          }
                        : {
                            color: `var(--kw-${p!.toneIndex})`,
                          }),
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label={`${keyword.label} : ${keyword.definition}`}
                  >
                    {keyword.label}
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={6}
                  className="max-w-[220px] text-left leading-snug"
                >
                  {keyword.definition}
                </TooltipContent>
              </Tooltip>
            </li>
          );
        })}
      </ul>
    </TooltipProvider>
  );
}
