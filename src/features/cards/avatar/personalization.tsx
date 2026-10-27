"use client";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { cardsRequest, useCardsAccount } from "../account/client";
import { COSMETICS } from "../shop/catalog";

export function Personalization() {
  const { data } = useCardsAccount();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const owned = (id: string) => !!data?.cosmetics.includes(id);
  const ownedThemes = COSMETICS.filter(
    (cosmetic) => cosmetic.kind === "theme" && owned(cosmetic.id),
  );
  const hasPersonalization =
    ownedThemes.length > 0 ||
    (data?.profile.theme !== undefined && data.profile.theme !== "default");

  async function equip(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      await cardsRequest("equip", payload);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Modification impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!hasPersonalization) {
    return (
      <div className="cards-personalization-empty">
        <p className="text-sm text-muted-foreground">
          Aucune personnalisation pour l’instant.
        </p>
        <Button variant="secondary" asChild>
          <Link href="/boutique?tab=cosmetiques">
            Ajouter une personnalisation
          </Link>
        </Button>
        <Toast message={message} error onDismiss={() => setMessage(null)} />
      </div>
    );
  }

  return (
    <section className="space-y-5" aria-label="Personnalisation">
      <fieldset disabled={busy} className="space-y-3">
        <legend className="mb-2 text-sm font-medium">Thème de couleur</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["default", "Défaut"],
              ["blue", "Bleu"],
              ["red", "Rouge"],
            ] as const
          )
            .filter(([id]) => id === "default" || owned(`theme-${id}`))
            .map(([id, label]) => (
              <Button
                key={id}
                variant={data?.profile.theme === id ? "primary" : "secondary"}
                disabled={id !== "default" && !owned(`theme-${id}`)}
                onClick={() => void equip({ theme: id })}
              >
                {label}
              </Button>
            ))}
        </div>
      </fieldset>
      <Button variant="secondary" asChild>
        <Link href="/boutique?tab=cosmetiques">
          Ajouter une personnalisation
        </Link>
      </Button>
      <Toast message={message} error onDismiss={() => setMessage(null)} />
    </section>
  );
}
