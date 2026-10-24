"use client";

import { useEffect, useState } from "react";
import { TOOLTIP_DELAY_MS } from "@/game/core/mapConfig";
import { cn } from "@/lib/utils";

type Props = {
  text: string | null;
  /** Position souris dans le conteneur jeu (CSS px). */
  x: number;
  y: number;
  /** Conteneur pour clamp. */
  containerW: number;
  containerH: number;
};

/**
 * Tooltip unique : suit la souris, délai 150 ms, clamp écran, fort contraste.
 */
export function GameTooltip({ text, x, y, containerW, containerH }: Props) {
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    if (!text) {
      setVisible(false);
      setShown(null);
      return;
    }
    setVisible(false);
    const t = setTimeout(() => {
      setShown(text);
      setVisible(true);
    }, TOOLTIP_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);

  if (!visible || !shown) return null;

  const pad = 12;
  const approxW = Math.min(280, containerW - 24);
  const approxH = 48;
  let left = x + 16;
  let top = y + 16;
  if (left + approxW > containerW - pad) left = x - approxW - 8;
  if (top + approxH > containerH - pad) top = y - approxH - 8;
  left = Math.max(pad, Math.min(left, containerW - approxW - pad));
  top = Math.max(pad, Math.min(top, containerH - approxH - pad));

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-50 max-w-[280px] rounded-md px-3 py-2",
        "bg-stone-950/95 text-sm font-medium text-stone-50 shadow-lg",
        "border border-stone-700"
      )}
      style={{ left, top }}
      role="tooltip"
    >
      {shown}
    </div>
  );
}
