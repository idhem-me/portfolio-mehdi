import { Crown, Sparkles, Square, Star, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { RARITY_LABELS, type Rarity } from "../catalog/types";

const ICON = "cards-rarity-icon";

function Marks({ Icon, count }: { Icon: LucideIcon; count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <Icon key={index} className={ICON} aria-hidden />
      ))}
    </>
  );
}

/**
 * Card-face rarity marks (Lucide).
 * Commune □ · Peu commune □□ · Rare □□□ · Épique ★ · Légendaire ★★ · God ♛
 * Shiny adds Sparkles beside the marks.
 */
export function RarityIcons({
  rarity,
  shiny = false,
  shinyQty,
  className,
}: {
  rarity: Rarity;
  shiny?: boolean;
  shinyQty?: number;
  className?: string;
}) {
  const label = `${RARITY_LABELS[rarity]}${shiny ? ", Shiny" : ""}`;
  return (
    <span
      className={cn("cards-rarity-icons", className)}
      title={label}
      aria-label={label}
    >
      {rarity === "common" && <Marks Icon={Square} count={1} />}
      {rarity === "rare" && <Marks Icon={Square} count={2} />}
      {rarity === "epic" && <Marks Icon={Square} count={3} />}
      {rarity === "legendary" && <Marks Icon={Star} count={1} />}
      {rarity === "gold" && <Marks Icon={Star} count={2} />}
      {rarity === "diamond" && <Crown className={ICON} aria-hidden />}
      {shiny && (
        <Sparkles className={cn(ICON, "cards-rarity-shiny")} aria-hidden />
      )}
      {shiny && shinyQty !== undefined && shinyQty > 1 && (
        <span className="cards-rarity-shiny-qty">×{shinyQty}</span>
      )}
    </span>
  );
}
