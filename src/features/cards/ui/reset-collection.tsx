"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export function ResetCollection({
  onResetLocal,
}: {
  onResetLocal: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <>
      <Button
        variant="destructive"
        className="min-h-11 w-full"
        onClick={() => setConfirmReset(true)}
      >
        Réinitialiser la collection
      </Button>
      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent className="max-w-sm">
          <div className="space-y-4">
            <DialogTitle>Réinitialiser ?</DialogTitle>
            <DialogDescription>
              Efface la collection et les statistiques de Cartes dans ta sauvegarde.
              Tes crédits, boosters, cosmétiques et réglages sont conservés.
              Cette action est définitive.
            </DialogDescription>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setConfirmReset(false)}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onResetLocal();
                  setConfirmReset(false);
                }}
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
