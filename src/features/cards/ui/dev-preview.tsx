"use client";

import { Button } from "@/components/ui/button";
import type { DrawOptions } from "../engine/draw";
import { FlaskConical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

const PREVIEWS: { label: string; options: DrawOptions }[] = [
  { label: "10 boosters", options: { forceKind: "standard", batchSize: 10 } },
  { label: "Shiny", options: { forceKind: "standard", forceShiny: true } },
  { label: "Standard", options: { forceKind: "standard" } },
  {
    label: "5ᵉ Peu commune",
    options: { forceKind: "standard", forceFifthRarity: "rare" },
  },
  {
    label: "5ᵉ Rare",
    options: { forceKind: "standard", forceFifthRarity: "epic" },
  },
  {
    label: "5ᵉ Épique",
    options: { forceKind: "standard", forceFifthRarity: "legendary" },
  },
  {
    label: "5ᵉ Légendaire",
    options: { forceKind: "standard", forceFifthRarity: "gold" },
  },
  {
    label: "5ᵉ God",
    options: { forceKind: "standard", forceFifthRarity: "diamond" },
  },
  { label: "Gold Pack", options: { forceKind: "gold_pack" } },
];

export function DevPreviewPanel({
  onSimulate,
  disabled,
  unlimited,
  onToggleUnlimited,
}: {
  onSimulate: (options: DrawOptions) => void;
  disabled?: boolean;
  unlimited?: boolean;
  onToggleUnlimited?: () => void;
}) {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="cards-simulation-fab"
          aria-label="Simulation"
          title="Simulation"
          disabled={disabled}
        >
          <FlaskConical aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-64"
      >
        <DropdownMenuLabel>Simulation</DropdownMenuLabel>
        <p className="px-2 pb-2 text-xs text-muted-foreground">
          Sans effet sur la collection ni les statistiques.
        </p>
        {onToggleUnlimited && (
          <>
            <DropdownMenuCheckboxItem
              checked={unlimited}
              onCheckedChange={onToggleUnlimited}
            >
              Boosters illimités (dev)
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
          </>
        )}
        {PREVIEWS.map((preview) => (
          <DropdownMenuItem
            key={preview.label}
            disabled={disabled}
            onSelect={() => onSimulate(preview.options)}
          >
            {preview.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
