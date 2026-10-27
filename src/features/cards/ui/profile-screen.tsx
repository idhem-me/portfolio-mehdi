"use client";

import { Personalization } from "../avatar/personalization";
import { useCardsAccount } from "../account/client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export function ProfileScreen({ save }: { save: CardsSave }) {
  const account = useCardsAccount();
  const [ratesOpen, setRatesOpen] = useState(false);
  const [tab, setTab] = useState<"stats" | "perso">("stats");
  const progress = catalogProgress(save);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("section") === "perso")
      setTab("perso");
  }, []);

  return (
    <div className="cards-profile space-y-6">
      <p className="text-sm text-muted-foreground">
        {account.data?.user.anonymous
          ? "Progression enregistrée dans ta session invité."
          : "Progression sauvegardée avec Google."}
      </p>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          const next = value as "stats" | "perso";
          setTab(next);
          const url = new URL(window.location.href);
          if (next === "perso") url.searchParams.set("section", "perso");
          else url.searchParams.delete("section");
          window.history.replaceState(null, "", url);
        }}
        className="gap-4"
      >
        <TabsList className="w-full" aria-label="Sections du profil">
          <TabsTrigger value="stats" className="flex-1">
            Statistiques
          </TabsTrigger>
          <TabsTrigger value="perso" className="flex-1">
            Personnalisation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-6">
          <section className="space-y-3">
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
                  save.stats.bestRarity
                    ? RARITY_LABELS[save.stats.bestRarity]
                    : "—"
                }
              />
            </dl>
            <div className="space-y-2">
              <p className="text-sm font-medium">Exemplaires par rareté</p>
              <ul className="flex flex-wrap gap-2">
                {RARITIES.map((rarity) => (
                  <li key={rarity}>
                    <Badge variant="secondary">
                      {RARITY_LABELS[rarity]} ·{" "}
                      {save.stats.copiesByRarity[rarity]}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <Button
              variant="secondary"
              className="w-fit"
              onClick={() => setRatesOpen(true)}
            >
              Probabilités
            </Button>
          </section>
        </TabsContent>

        <TabsContent value="perso" className="cards-profile-perso">
          <Personalization />
        </TabsContent>
      </Tabs>

      <Dialog open={ratesOpen} onOpenChange={setRatesOpen}>
        <DialogContent className="max-w-sm">
          <div className="space-y-3">
            <DialogTitle>Probabilités</DialogTitle>
            <DialogDescription>
              Booster standard : 4 communes + 1 carte peu commune minimum. Gold
              Pack avant tirage : {GOLD_PACK_PERCENT}&nbsp;% (
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
              Tirages et progression validés par le serveur.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  );
}
