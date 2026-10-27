"use client";

import { CloudSaveStatus } from "./cloud-save-status";
import type { CloudView } from "../persistence/cloud-client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { CATALOG } from "../catalog/cards";
import { RARITIES, RARITY_LABELS } from "../catalog/types";
import {
  FIFTH_CARD_PERCENT,
  GOLD_PACK_PERCENT,
  SHINY_PERCENT,
} from "../engine/rates";
import type { CardsSave } from "../persistence/types";
import {
  catalogProgress,
  totalCopies,
  uniqueOwnedCount,
} from "../persistence/repository";

export function ProfileScreen({
  save,
  cloud,
}: {
  save: CardsSave;
  cloud: CloudView;
}) {
  const [ratesOpen, setRatesOpen] = useState(false);
  const progress = catalogProgress(save);

  return (
    <div className="cards-profile space-y-6">
      <CloudSaveStatus cloud={cloud} showDialog={false} />

      <section className="space-y-3">
        <h2 className="text-base font-medium">Statistiques</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Boosters ouverts" value={save.stats.boostersOpened} />
          <Stat label="Gold Packs" value={save.stats.goldPacksOpened} />
          <Stat label="Cartes uniques" value={uniqueOwnedCount(save)} />
          <Stat label="Exemplaires" value={totalCopies(save)} />
          <Stat
            label="Exemplaires Shiny"
            value={Object.values(save.collection).reduce(
              (total, entry) => total + (entry.shinyQty ?? 0),
              0,
            )}
          />
          <Stat
            label="Progression"
            value={`${progress.owned}/${CATALOG.length}`}
          />
          <Stat
            label="Meilleure rareté"
            value={
              save.stats.bestRarity ? RARITY_LABELS[save.stats.bestRarity] : "—"
            }
          />
        </dl>
        <div className="space-y-2">
          <p className="text-sm font-medium">Exemplaires par rareté</p>
          <ul className="flex flex-wrap gap-2">
            {RARITIES.map((r) => (
              <li key={r}>
                <Badge variant="secondary">
                  {RARITY_LABELS[r]} · {save.stats.copiesByRarity[r]}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-2">
        <Button
          variant="outline"
          className="min-h-11 justify-between"
          onClick={() => setRatesOpen(true)}
        >
          Probabilités
        </Button>
      </section>

      <Dialog open={ratesOpen} onOpenChange={setRatesOpen}>
        <DialogContent className="max-w-sm">
          <div className="space-y-3">
            <DialogTitle>Probabilités</DialogTitle>
            <DialogDescription>
              Booster standard : 4 communes + 1 carte rare minimum. Gold Pack
              avant tirage : {GOLD_PACK_PERCENT}&nbsp;% (
              {GOLD_PACK_PERCENT / 100}).
            </DialogDescription>
            <ul className="space-y-2 text-sm">
              {(
                Object.entries(FIFTH_CARD_PERCENT) as [
                  keyof typeof FIFTH_CARD_PERCENT,
                  number,
                ][]
              ).map(([key, pct]) => (
                <li key={key} className="flex justify-between gap-2">
                  <span>{RARITY_LABELS[key]}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {pct}&nbsp;%
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">
              Shiny : {SHINY_PERCENT} % par exemplaire, indépendamment de la
              rareté (1 sur 100 000).
            </p>
            <p className="text-xs text-muted-foreground">
              Tirage côté client — non sécurisé contre la triche. Une future
              version serveur validera les boosters.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  );
}
