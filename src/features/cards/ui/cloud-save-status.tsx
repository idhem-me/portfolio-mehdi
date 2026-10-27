"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { CloudView } from "../persistence/cloud-client";

export function CloudSaveStatus({
  cloud,
  openingActive = false,
  showStatus = true,
  showDialog = true,
}: {
  cloud: CloudView;
  openingActive?: boolean;
  showStatus?: boolean;
  showDialog?: boolean;
}) {
  return (
    <>
      {showStatus && (
        <div
          className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <span>
            {cloud.status === "saved"
              ? "Progression sauvegardée avec Google"
              : cloud.status === "loading"
                ? "Synchronisation de la progression…"
                : cloud.status === "conflict"
                  ? "Deux progressions sont disponibles"
                  : cloud.status === "local" && !cloud.message
                    ? "La collection est stockée sur cet appareil uniquement."
                    : cloud.message ||
                      "Sauvegarde locale · Synchronisation en attente"}
          </span>
          {(cloud.status === "pending" || cloud.message) && cloud.retry && (
            <Button size="sm" variant="ghost" onClick={cloud.retry}>
              Réessayer la synchronisation
            </Button>
          )}
        </div>
      )}
      <Dialog
        open={showDialog && Boolean(cloud.conflict) && !openingActive}
        onOpenChange={(open) => {
          if (!open) cloud.dismiss?.();
        }}
      >
        <DialogContent>
          <DialogTitle className="text-lg font-medium">
            Quelle progression veux-tu conserver ?
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            {cloud.conflict?.differentAccount
              ? "La progression de cet appareil était liée à un autre compte. Elle ne sera pas transférée sans ton choix. "
              : "La progression de cet appareil diffère de celle de ton compte Google. "}
            Sur cet appareil : {cloud.conflict?.localCards ?? 0} cartes. Sur le
            compte : {cloud.conflict?.remoteCards ?? 0} cartes. Les collections
            ne sont pas additionnées, pour éviter les doublons. Une copie de
            secours sera gardée sur cet appareil avant le remplacement.
          </DialogDescription>
          <div className="mt-4 flex flex-col gap-2">
            <Button
              disabled={cloud.status === "loading"}
              onClick={cloud.useRemote}
            >
              Utiliser la progression de ce compte
            </Button>
            <Button
              variant="outline"
              disabled={cloud.status === "loading"}
              onClick={cloud.useLocal}
            >
              Enregistrer la progression de cet appareil à la place
            </Button>
            <Button
              variant="ghost"
              disabled={cloud.status === "loading"}
              onClick={cloud.dismiss}
            >
              Continuer en local pour l’instant
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
