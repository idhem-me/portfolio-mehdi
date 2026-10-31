"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cardsRequest, loadCardsAccount, useCardsAccount } from "./client";
import { formatCredits } from "../shop/catalog";
export function SaveChoiceDialog() {
  const { data } = useCardsAccount();
  const pending = data?.pendingChoice;
  const [keep, setKeep] = useState<"device" | "account" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    if (!pending || !keep || busy) return;
    setBusy(true);
    try {
      await cardsRequest("resolve", {
        keep,
        revision: pending.revision,
        sourceRevision: pending.sourceRevision,
      });
      setKeep(null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Choix impossible.");
      await loadCardsAccount().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Dialog open={!!pending}>
        <DialogContent
          className="max-w-lg"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogTitle className="text-lg font-medium">
            Choisis ta sauvegarde
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            Deux sauvegardes ont été trouvées. Garde celle que tu veux : l’autre
            sera supprimée.
          </DialogDescription>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {pending &&
              (["device", "account"] as const).map((source) => {
                const preview = pending[source];
                return (
                  <section
                    className="space-y-3 rounded-lg border bg-card p-4"
                    key={source}
                  >
                    <h3 className="font-medium">
                      {source === "device" ? "Cet appareil" : "Compte"}
                    </h3>
                    <p className="text-sm">
                      {formatCredits(preview.cards)} cartes ·{" "}
                      {formatCredits(preview.credits)} gems
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(preview.lastPlayedAt).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                    <Button
                      className="w-full whitespace-nowrap"
                      disabled={busy}
                      onClick={() => setKeep(source)}
                    >
                      Garder celle-ci
                    </Button>
                  </section>
                );
              })}
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!keep}
        onOpenChange={(open) => {
          if (!open && !busy) setKeep(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Supprimer l’autre sauvegarde ?</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            Cette action est définitive.
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setKeep(null)}
            >
              Annuler
            </Button>
            <Button disabled={busy} onClick={() => void confirm()}>
              {busy ? "Enregistrement…" : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
