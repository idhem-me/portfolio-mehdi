"use client";

import { Button } from "@/components/ui/button";
import type { DrawOptions } from "../engine/draw";
import type { Rarity } from "../catalog/types";
import { RARITY_LABELS } from "../catalog/types";

const PREVIEWS: { label: string; options: DrawOptions }[] = [
  { label: "Standard", options: { forceKind: "standard" } },
  {
    label: "5ᵉ Rare",
    options: { forceKind: "standard", forceFifthRarity: "rare" },
  },
  {
    label: "5ᵉ Épique",
    options: { forceKind: "standard", forceFifthRarity: "epic" },
  },
  {
    label: "5ᵉ Légendaire",
    options: { forceKind: "standard", forceFifthRarity: "legendary" },
  },
  {
    label: "5ᵉ Gold",
    options: { forceKind: "standard", forceFifthRarity: "gold" },
  },
  {
    label: "5ᵉ Diamant",
    options: { forceKind: "standard", forceFifthRarity: "diamond" },
  },
  { label: "Gold Pack", options: { forceKind: "gold_pack" } },
];

export function DevPreviewPanel({
  onSimulate,
  disabled,
}: {
  onSimulate: (options: DrawOptions) => void;
  disabled?: boolean;
}) {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <section className="cards-dev-preview mt-6 w-full max-w-sm rounded-lg border border-border p-3">
      <h3 className="text-sm font-medium">Preview dev</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Simulations uniquement — ne modifient pas la collection ni les stats.
        Probabilités live inchangées.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PREVIEWS.map((p) => (
          <Button
            key={p.label}
            type="button"
            size="sm"
            variant="secondary"
            disabled={disabled}
            className="min-h-11"
            onClick={() => onSimulate(p.options)}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <p className="sr-only">
        Raretés :{" "}
        {(
          ["rare", "epic", "legendary", "gold", "diamond"] as Exclude<
            Rarity,
            "common"
          >[]
        )
          .map((r) => RARITY_LABELS[r])
          .join(", ")}
      </p>
    </section>
  );
}
