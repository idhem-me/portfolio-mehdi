"use client";
import { useState } from "react";
import useSWR from "swr";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Gift, Plus, Settings, EyeOff, Heart } from "lucide-react";
import { useRouter, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GoogleSignIn } from "@/features/account/ui/google-sign-in";
import { useIdentityState } from "@/features/account/client-store";
import { euro, type GiftList, type GiftItem, type OwnerDetail } from "../types";
import { ListForm, ItemForm } from "./forms";
import {
  Confirm,
  OccasionTag,
  ListImage,
  WhatsAppShare,
  DocumentLink,
  useHydrated,
  CopyLink,
  GiftApiError,
  GiftImage,
  MerchantLink,
  Notice,
  giftRequest,
} from "./shared";

const api = "/api/tetris/gifts";
function SignIn({ retry }: { retry: () => void }) {
  const identity = useIdentityState();
  return (
    <section className="space-y-5 rounded-2xl border border-border bg-card p-6">
      <Gift className="size-9 text-foreground" aria-hidden="true" />
      <h2 className="text-xl font-semibold">
        Connecte-toi pour créer une liste
      </h2>
      <p className="text-muted-foreground">
        Tes proches pourront réserver sans compte.
      </p>
      <GoogleSignIn />
      <Button variant="ghost" onClick={retry}>
        Actualiser ma connexion
      </Button>
      {identity.error && <Notice error>{identity.error}</Notice>}
    </section>
  );
}
export function CreatorDashboard() {
  const identity = useIdentityState();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [create, setCreate] = useState(() => searchParams.get("creer") === "1");
  const {
    data: response,
    error,
    isLoading,
    mutate,
  } = useSWR<{ lists: GiftList[] }, GiftApiError>(
    [api, identity.profile?.key ?? identity.kind],
    ([url]: [string, string]) => giftRequest(url),
    { shouldRetryOnError: false, refreshInterval: 15000 },
  );
  const data =
    identity.kind === "google" && !identity.busy && !error
      ? response
      : undefined;
  return (
    <main
      lang="fr"
      dir="ltr"
      className="mx-auto w-full max-w-4xl space-y-8 px-6 py-10"
    >
      <DocumentLink
        href="/outils"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Tous les outils
      </DocumentLink>
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            Mes listes de cadeaux
          </h1>
          <p className="max-w-xl text-muted-foreground">
            Crée une liste et partage-la avec tes proches.
          </p>
        </div>
        {data && data.lists.length > 0 && (
          <Button variant="accent" onClick={() => setCreate(true)}>
            <Plus aria-hidden="true" className="size-4" />
            Créer une liste
          </Button>
        )}
      </header>
      {isLoading && <Notice>Chargement de tes listes…</Notice>}
      {error?.status === 401 ? (
        <SignIn retry={() => void mutate()} />
      ) : (
        error && (
          <div className="space-y-3">
            <Notice error>{error.message}</Notice>
            <Button variant="outline" onClick={() => void mutate()}>
              Réessayer
            </Button>
          </div>
        )
      )}
      {data && data.lists.length === 0 && (
        <section className="space-y-4 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <Gift
            className="mx-auto size-12 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="text-xl font-semibold">Une occasion à fêter ?</h2>
          <p className="text-muted-foreground">
            Ajoute tes envies, quelle que soit la boutique.
          </p>
          <Button variant="accent" onClick={() => setCreate(true)}>
            Créer ma première liste
          </Button>
        </section>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {data?.lists.map((list) => (
          <Link
            key={list.id}
            href={`/outils/listes-cadeaux/${list.id}`}
            className="space-y-3 rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ListImage src={list.cover_image} title={list.title} />
            <h2 className="break-words text-xl font-semibold">{list.title}</h2>
            <div className="flex flex-wrap gap-2">
              <OccasionTag
                value={list.occasion_type}
                label={list.occasion_label}
              />
              {list.is_surprise_mode && !list.reservations_revealed_at && (
                <Badge variant="outline">Surprise</Badge>
              )}
            </div>
            {list.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {list.description}
              </p>
            )}
          </Link>
        ))}
      </div>
      {create && data && (
        <ListForm
          onClose={() => setCreate(false)}
          onSave={async (value) => {
            const result = await giftRequest<{ list: GiftList }>(api, {
              action: "create_list",
              data: value,
            });
            await mutate();
            router.push(`/outils/listes-cadeaux/${result.list.id}`);
          }}
        />
      )}
    </main>
  );
}

export function CreatorList({ id }: { id: string }) {
  const identity = useIdentityState();
  const locale = useLocale();
  const router = useRouter();
  const hydrated = useHydrated();
  const origin = hydrated ? window.location.origin : "";
  const {
    data: response,
    error,
    mutate,
    isLoading,
  } = useSWR<OwnerDetail, GiftApiError>(
    [`${api}?id=${id}`, identity.profile?.key ?? identity.kind],
    ([url]: [string, string]) => giftRequest(url),
    { shouldRetryOnError: false, refreshInterval: 10000 },
  );
  const data =
    identity.kind === "google" && !identity.busy && !error
      ? response
      : undefined;
  const [editingList, setEditingList] = useState(false);
  const [itemForm, setItemForm] = useState<GiftItem | "new" | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    label: string;
    action: () => Promise<void>;
    destructive?: boolean;
  } | null>(null);
  const post = async (value: unknown) => {
    await giftRequest(api, value);
    await mutate();
  };
  const share = data && origin ? `${origin}/l/${data.list.slug}` : "";
  const prefix = locale === "fr" ? "" : `/${locale}`;
  return (
    <main
      lang="fr"
      dir="ltr"
      className="mx-auto w-full max-w-5xl space-y-7 px-6 py-10"
    >
      <Link
        href="/outils/listes-cadeaux"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Mes listes
      </Link>
      {isLoading && <Notice>Chargement de la liste…</Notice>}
      {error?.status === 401 ? (
        <SignIn retry={() => void mutate()} />
      ) : (
        error && (
          <div className="space-y-3">
            <Notice error>{error.message}</Notice>
            <Button variant="outline" onClick={() => void mutate()}>
              Réessayer
            </Button>
          </div>
        )
      )}
      {data && (
        <>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <ListImage
                src={data.list.cover_image}
                title={data.list.title}
                className="h-24 w-24"
              />
              <h1 className="break-words text-3xl font-semibold tracking-tight">
                {data.list.title}
              </h1>
              <OccasionTag
                value={data.list.occasion_type}
                label={data.list.occasion_label}
              />
              {data.list.description && (
                <p className="max-w-2xl whitespace-pre-wrap break-words text-muted-foreground">
                  {data.list.description}
                </p>
              )}
            </div>
            <Button variant="outline" onClick={() => setEditingList(true)}>
              <Settings aria-hidden="true" className="size-4" />
              Réglages de la liste
            </Button>
          </header>
          <section
            aria-label="Partager ma liste"
            className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-border bg-card p-5"
          >
            <div className="min-w-0 space-y-3">
              <h2 className="font-semibold">Partager la liste</h2>
              {share && (
                <>
                  <p className="break-all text-sm text-muted-foreground">
                    {share}
                  </p>
                  <div className="flex flex-wrap items-start gap-3">
                    <CopyLink value={share} />
                    <Button asChild variant="ghost">
                      <a
                        href={`${prefix}/l/${data.list.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Voir la liste publique
                        <span className="sr-only"> (nouvel onglet)</span>
                      </a>
                    </Button>
                  </div>
                </>
              )}
            </div>
            {share && (
              <div className="rounded-xl bg-white p-3">
                <QRCodeSVG
                  value={share}
                  size={88}
                  title="QR code de partage de la liste"
                />
              </div>
            )}
          </section>
          {data.activity.hidden ? (
            <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-muted/40 p-5">
              <div className="space-y-2">
                <p className="flex items-center gap-2 font-medium">
                  <EyeOff className="size-4" aria-hidden="true" />
                  Mode Surprise
                </p>
                <p className="max-w-xl text-sm text-muted-foreground">
                  Réservations masquées ici, visibles sur le lien public.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  setConfirm({
                    title: "Révéler les réservations ?",
                    description:
                      "Les participants et leurs messages seront révélés définitivement.",
                    label: "Révéler les réservations",
                    action: () => post({ action: "reveal", list_id: id }),
                  })
                }
              >
                Révéler les réservations
              </Button>
            </section>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">
              Les cadeaux{" "}
              <span className="font-normal text-muted-foreground">
                ({data.items.length})
              </span>
            </h2>
            <Button variant="accent" onClick={() => setItemForm("new")}>
              <Plus className="size-4" aria-hidden="true" />
              Ajouter un cadeau
            </Button>
          </div>
          {data.items.length === 0 && (
            <Notice>
              Ajoute ton premier cadeau, avec ou sans lien de boutique.
            </Notice>
          )}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((item) => {
              const reservations =
                data.activity.reservations?.filter(
                  (reservation) => reservation.item_id === item.id,
                ) ?? [];
              return (
                <article
                  key={item.id}
                  className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-4"
                >
                  <GiftImage key={item.image_url} item={item} />
                  <div className="space-y-2">
                    <h3 className="break-words font-semibold">{item.title}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{euro(item.price)}</span>
                      {item.is_group_gift && (
                        <Badge variant="outline">À plusieurs</Badge>
                      )}
                      {item.priority === "high" && (
                        <Badge variant="secondary">
                          <Heart className="size-3" aria-hidden="true" />
                          Coup de cœur
                        </Badge>
                      )}
                    </div>
                    <MerchantLink url={item.url} />
                  </div>
                  {data.activity.hidden ? (
                    <p className="text-sm text-muted-foreground">
                      Réservations masquées
                    </p>
                  ) : (
                    <div className="space-y-3 border-t border-border pt-3">
                      {item.is_group_gift && (
                        <p className="text-sm font-medium">
                          {euro(
                            reservations.reduce(
                              (sum, r) =>
                                sum + Number(r.amount_contributed ?? 0),
                              0,
                            ),
                          )}{" "}
                          / {euro(item.price)} déclarés
                        </p>
                      )}
                      {reservations.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Pas encore réservé
                        </p>
                      ) : (
                        reservations.map((r) => (
                          <div key={r.id} className="space-y-1 text-sm">
                            <p className="break-words font-medium">
                              {r.guest_name}
                              {r.amount_contributed != null
                                ? ` · ${euro(r.amount_contributed)}`
                                : " a réservé ce cadeau"}
                            </p>
                            {r.message && (
                              <p className="whitespace-pre-wrap break-words text-muted-foreground">
                                « {r.message} »
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setItemForm(item)}
                    >
                      Modifier<span className="sr-only"> {item.title}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setConfirm({
                          title: "Supprimer ce cadeau ?",
                          destructive: true,
                          description:
                            "Ce cadeau et ses réservations seront définitivement supprimés.",
                          label: "Supprimer le cadeau",
                          action: () =>
                            post({
                              action: "delete_item",
                              list_id: id,
                              item_id: item.id,
                            }),
                        })
                      }
                    >
                      Supprimer<span className="sr-only"> {item.title}</span>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
          <WhatsAppShare title={data.list.title} url={share} />
          {editingList && (
            <ListForm
              initial={data.list}
              onClose={() => setEditingList(false)}
              onDelete={() => {
                setEditingList(false);
                setConfirm({
                  title: "Supprimer cette liste ?",
                  destructive: true,
                  description:
                    "La liste et ses réservations seront supprimées. Le lien de partage ne fonctionnera plus.",
                  label: "Supprimer la liste",
                  action: async () => {
                    await giftRequest(api, {
                      action: "delete_list",
                      list_id: id,
                    });
                    router.replace("/outils/listes-cadeaux");
                  },
                });
              }}
              onSave={(value) =>
                post({ action: "update_list", list_id: id, data: value })
              }
            />
          )}
          {itemForm && (
            <ItemForm
              initial={itemForm === "new" ? undefined : itemForm}
              onClose={() => setItemForm(null)}
              onSave={(value) =>
                post({
                  action: itemForm === "new" ? "add_item" : "update_item",
                  list_id: id,
                  ...(itemForm === "new" ? {} : { item_id: itemForm.id }),
                  data: value,
                })
              }
            />
          )}
        </>
      )}
      {confirm && (
        <Confirm
          {...confirm}
          onConfirm={confirm.action}
          onClose={() => setConfirm(null)}
        />
      )}
    </main>
  );
}
