"use client";
import Image from "next/image";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Toast } from "@/components/ui/toast";
import {
  cardsRequest,
  useCardsAccount,
  loadCardsAccount,
} from "../account/client";
import {
  CREDIT_PACKS,
  COSMETICS,
  SHOP_TABS,
  formatCredits,
  type ShopTab,
} from "./catalog";
import "../ui/game.css";
type Purchase = { id: string; title: string; action: string; price: number };
export function Shop() {
  const account = useCardsAccount();
  const query = useSearchParams();
  const requested = query.get("tab");
  const tab: ShopTab = SHOP_TABS.some((t) => t.id === requested)
    ? (requested as ShopTab)
    : "credits";
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const balance = account.data?.profile.credits ?? 0;
  async function confirm() {
    if (!purchase || busy) return;
    setBusy(true);
    try {
      await cardsRequest(
        purchase.action,
        { id: purchase.id },
        requestId ?? crypto.randomUUID(),
      );
      setPurchase(null);
      setFailed(false);
      setToast("Achat effectué");
    } catch (error) {
      setFailed(true);
      setToast(error instanceof Error ? error.message : "Achat impossible.");
    } finally {
      setBusy(false);
    }
  }
  const items: Purchase[] =
    tab === "credits"
      ? CREDIT_PACKS.map((p) => ({
          id: p.id,
          title: `${formatCredits(p.amount)} gems`,
          price: 0,
          action: "grant_credits",
        }))
      : COSMETICS.map((p) => ({
          id: p.id,
          title: p.name,
          price: p.price,
          action: "buy_cosmetic",
        }));
  return (
    <div className="cards-shop-content">
      <div className="space-y-6">
        <Tabs
          value={tab}
          onValueChange={(value) =>
            window.history.replaceState(
              null,
              "",
              `${window.location.pathname}?tab=${value}`,
            )
          }
        >
          <TabsList className="flex h-auto w-full flex-wrap">
            {SHOP_TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent key={tab} value={tab} className="mt-6">
            {account.error && (
              <p role="alert" className="text-destructive">
                {account.error}
              </p>
            )}
            {!account.data ? (
              <div role="status" className="py-8 text-sm text-muted-foreground">
                {account.error ? (
                  <Button
                    variant="secondary"
                    onClick={() => void loadCardsAccount().catch(() => {})}
                  >
                    Réessayer
                  </Button>
                ) : (
                  "Chargement de la boutique…"
                )}
              </div>
            ) : tab === "abonnements" ? (
              <p className="py-12 text-center text-muted-foreground">
                Bientôt disponible
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => {
                  const owned = account.data?.cosmetics.includes(item.id);
                  const insufficient = item.price > balance;
                  const cosmetic = COSMETICS.find((c) => c.id === item.id);
                  return (
                    <Card key={item.id} className="cards-shop-product">
                      <div className="cards-shop-product-image">
                        {cosmetic && "asset" in cosmetic ? (
                          <Image
                            src={cosmetic.asset}
                            width={80}
                            height={80}
                            alt=""
                          />
                        ) : (
                          <ImageIcon aria-label="Visuel à venir" />
                        )}
                      </div>
                      <CardContent className="min-w-0 space-y-2">
                        <CardTitle className="text-base">
                          {item.title}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {owned
                            ? "Possédé"
                            : item.price === 0
                              ? "Gratuit"
                              : `${formatCredits(item.price)} gems`}
                        </p>
                        {owned ? (
                          <Button
                            variant="secondary"
                            asChild
                            className="w-full"
                          >
                            <Link href="/jeux/cards?tab=profile">Équiper</Link>
                          </Button>
                        ) : (
                          <Button
                            className="w-full"
                            disabled={busy || !account.data || insufficient}
                            onClick={() => {
                              setRequestId(crypto.randomUUID());
                              setPurchase(item);
                            }}
                          >
                            Acheter
                          </Button>
                        )}
                        {!owned && insufficient && (
                          <p className="text-sm text-muted-foreground">
                            Il vous manque {formatCredits(item.price - balance)}{" "}
                            gems.{" "}
                            <Link
                              className="underline"
                              href="/boutique?tab=credits"
                            >
                              Obtenir des gems
                            </Link>
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Dialog
        open={!!purchase}
        onOpenChange={(open) => {
          if (!open && !busy) setPurchase(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Acheter {purchase?.title}
              {purchase?.price
                ? ` pour ${formatCredits(purchase.price)} gems`
                : ""}{" "}
              ?
            </DialogTitle>
            <DialogDescription>
              {purchase?.price
                ? "Les gems seront déduits de ton solde."
                : "Ce pack est gratuit. Aucun paiement n’est nécessaire."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setPurchase(null)}
            >
              Annuler
            </Button>
            <Button disabled={busy} onClick={() => void confirm()}>
              {busy ? "Achat en cours…" : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Toast
        message={toast}
        error={failed}
        placement="top-end"
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
