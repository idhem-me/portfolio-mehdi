"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import useSWR from "swr";
import { Gift, Heart, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toast } from "@/components/ui/toast";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { euro, safeWebUrl, type PublicList, type PublicItem } from "../types";
import {
  CopyLink,
  OccasionTag,
  ListImage,
  ListShareMenu,
  DocumentLink,
  useHydrated,
  errorText,
  Field,
  GiftApiError,
  GiftImage,
  giftRequest,
  MerchantLink,
  Notice,
  TextArea,
} from "./shared";

type Pending = {
  item_id: string;
  guest_name: string;
  guest_email: string;
  message: string;
  amount: number | null;
  token: string;
};
type Receipt = { token: string; title: string };
function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
function pendingKey(slug: string) {
  return `gifts.pending.${slug}`;
}
function receiptsKey(slug: string) {
  return `gifts.receipts.${slug}`;
}
function isPending(value: unknown): value is Pending {
  const p = value as Pending | null;
  return (
    !!p &&
    typeof p.item_id === "string" &&
    typeof p.token === "string" &&
    /^[a-f0-9]{64}$/.test(p.token) &&
    typeof p.guest_name === "string" &&
    typeof p.guest_email === "string" &&
    typeof p.message === "string" &&
    (p.amount === null || typeof p.amount === "number")
  );
}
function PaymentInfo({ value }: { value: string | null }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
      <p className="font-medium">Comment participer ?</p>
      <ol className="list-decimal space-y-2 ps-5">
        <li>Fais ton virement au créateur.</li>
        <li>Déclare ensuite le montant ici.</li>
      </ol>
      {value ? (
        <p className="whitespace-pre-wrap break-words">
          {value.split(/(https?:\/\/[^\s]+)/g).map((part, index) => {
            const href = safeWebUrl(part);
            return href ? (
              <a
                key={index}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                className="text-foreground underline"
              >
                {part}
                <span className="sr-only"> (nouvel onglet)</span>
              </a>
            ) : (
              part
            );
          })}
        </p>
      ) : (
        <p>Contacte le créateur pour les modalités de participation.</p>
      )}
      <p className="text-muted-foreground">
        Aucun paiement sur ce site. Montants déclaratifs.
      </p>
    </div>
  );
}

function ReserveForm({
  item,
  list,
  pending,
  onPending,
  onClose,
  onSuccess,
}: {
  item: PublicItem;
  list: PublicList;
  pending: Pending | null;
  onPending: (value: Pending | null) => void;
  onClose: () => void;
  onSuccess: (receipt: Receipt) => Promise<void>;
}) {
  const [name, setName] = useState(pending?.guest_name ?? "");
  const [email, setEmail] = useState(pending?.guest_email ?? "");
  const [message, setMessage] = useState(pending?.message ?? "");
  const [amount, setAmount] = useState(pending?.amount?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const input: Pending = pending ?? {
        item_id: item.id,
        guest_name: name.trim(),
        guest_email: email.trim(),
        message: message.trim(),
        amount: item.is_group_gift ? Number(amount.replace(",", ".")) : null,
        token: randomToken(),
      };
      // Save before sending: a lost response can be retried with exactly the same secret.
      try {
        sessionStorage.setItem(pendingKey(list.slug), JSON.stringify(input));
      } catch {
        throw new GiftApiError(
          "Autorise le stockage de session de ce navigateur pour conserver ton lien d’annulation et éviter une double réservation.",
          400,
        );
      }
      onPending(input);
      await giftRequest(`/api/gifts/${list.slug}`, input);
      await onSuccess({ token: input.token, title: item.title });
      onClose();
    } catch (e) {
      setError(errorText(e));
      if (e instanceof GiftApiError && [400, 404, 409].includes(e.status)) {
        try {
          sessionStorage.removeItem(pendingKey(list.slug));
        } catch {
          /* No request was sent if storage was unavailable. */
        }
        onPending(null);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const remaining = Math.max(
    0,
    Number(item.price ?? 0) - Number(item.amount_contributed),
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90svh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {item.is_group_gift
              ? "Participer à ce cadeau"
              : "Réserver ce cadeau"}
          </DialogTitle>
          <DialogDescription className="break-words text-sm text-muted-foreground">
            {item.title}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          {item.is_group_gift && <PaymentInfo value={list.payment_info} />}
          {pending && (
            <Notice>
              Réessaie avec les mêmes informations pour éviter un doublon.
            </Notice>
          )}
          <fieldset disabled={busy || !!pending} className="space-y-4">
            <Field label="Prénom et nom" hint="Visible par les invités.">
              {(id) => (
                <Input
                  id={id}
                  autoFocus
                  required
                  autoComplete="name"
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              )}
            </Field>
            <Field
              label="Email (facultatif)"
              hint="Privé. Aucun email automatique."
            >
              {(id) => (
                <Input
                  id={id}
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
            </Field>
            {item.is_group_gift && (
              <Field
                label="Montant de ta participation (€)"
                hint={`${euro(remaining)} restent à déclarer.`}
              >
                {(id) => (
                  <Input
                    id={id}
                    type="number"
                    min="0.01"
                    max={remaining.toFixed(2)}
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                )}
              </Field>
            )}
            <Field
              label="Petit mot (facultatif)"
              hint="Privé, pour le créateur."
            >
              {(id) => (
                <TextArea
                  id={id}
                  maxLength={2000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              )}
            </Field>
          </fieldset>
          {error && <Notice error>{error}</Notice>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onClose}
            >
              Fermer
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy
                ? "Confirmation…"
                : pending
                  ? "Réessayer la confirmation"
                  : item.is_group_gift
                    ? "Confirmer ma participation"
                    : "Confirmer ma réservation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PublicGiftList(props: { slug: string }) {
  const hydrated = useHydrated();
  return hydrated ? (
    <PublicGiftListClient {...props} />
  ) : (
    <p className="p-8">Ouverture de la liste…</p>
  );
}

function PublicGiftListClient({ slug }: { slug: string }) {
  const { data, error, isLoading, mutate } = useSWR<PublicList, GiftApiError>(
    `/api/gifts/${slug}`,
    giftRequest,
    { refreshInterval: 15000, shouldRetryOnError: false },
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(() => {
    try {
      const stored = JSON.parse(
        sessionStorage.getItem(pendingKey(slug)) ?? "null",
      );
      return isPending(stored) ? stored : null;
    } catch {
      return null;
    }
  });
  const [receipts, setReceipts] = useState<Receipt[]>(() => {
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem(receiptsKey(slug)) ?? "[]",
      );
      return Array.isArray(saved)
        ? saved.filter(
            (value): value is Receipt =>
              typeof value?.token === "string" &&
              /^[a-f0-9]{64}$/.test(value.token) &&
              typeof value.title === "string",
          )
        : [];
    } catch {
      return [];
    }
  });
  const origin = window.location.origin;
  const [notice, setNotice] = useState(() =>
    new URLSearchParams(window.location.search).get("reservation") ===
    "cancelled"
      ? "Réservation annulée. Le cadeau ou le montant réservé est de nouveau disponible."
      : "",
  );
  const dismissNotice = useCallback(() => setNotice(""), []);
  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get("reservation") !== "cancelled") return;
    currentUrl.searchParams.delete("reservation");
    window.history.replaceState(
      null,
      "",
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
    );
  }, []);
  const activeItem = data?.items.find((item) => item.id === selected);
  async function success(receipt: Receipt) {
    const updated = [
      ...receipts.filter((r) => r.token !== receipt.token),
      receipt,
    ];
    setReceipts(updated);
    setNotice("Réservation confirmée.");
    setPending(null);
    try {
      localStorage.setItem(receiptsKey(slug), JSON.stringify(updated));
      sessionStorage.removeItem(pendingKey(slug));
    } catch {
      setNotice(
        "Réservation confirmée. Copie ton lien d’annulation : il n’a pas pu être enregistré.",
      );
    }
    // A refresh failure must not turn a committed reservation into a failed submission.
    void mutate();
  }
  return (
    <main
      lang="fr"
      dir="ltr"
      className="mx-auto min-h-screen w-full max-w-5xl space-y-8 px-5 py-10 sm:px-8"
    >
      {isLoading && <Notice>Ouverture de la liste…</Notice>}
      {error && (
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">
            {error.status === 404
              ? "Liste introuvable"
              : "La liste est momentanément indisponible"}
          </h1>
          <Notice error>{error.message}</Notice>
          <Button variant="outline" onClick={() => void mutate()}>
            Réessayer
          </Button>
        </div>
      )}
      {data && (
        <>
          <header className="space-y-2">
            <ListImage
              src={data.cover_image}
              title={data.title}
              className="max-h-56 w-full"
            />
            <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-4xl">
              {data.title}
            </h1>
            <OccasionTag
              value={data.occasion_type}
              label={data.occasion_label}
            />
            {data.description && (
              <p className="max-w-2xl whitespace-pre-wrap break-words text-muted-foreground">
                {data.description}
              </p>
            )}
          </header>
          {pending && (
            <div className="space-y-3">
              <Notice>Une réservation reste à confirmer.</Notice>
              <Button
                variant="outline"
                onClick={() => setSelected(pending.item_id)}
              >
                Reprendre ma réservation
              </Button>
            </div>
          )}
          <Toast
            key={receipts.length}
            message={notice || null}
            onDismiss={dismissNotice}
            placement="top-end"
          />
          {receipts.length > 0 && (
            <Accordion
              type="single"
              collapsible
              className="rounded-xl border border-border bg-card"
            >
              <AccordionItem value="my-reservations" className="border-0">
                <AccordionTrigger
                  aria-label={`Mes réservations (${receipts.length})`}
                  className="min-h-12 items-center gap-3 px-4 py-3 hover:no-underline"
                >
                  <span className="flex items-center gap-2">
                    <BookmarkCheck
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span>Mes réservations</span>
                    <Badge variant="secondary">{receipts.length}</Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-1 [&_a]:no-underline">
                  <ul className="divide-y divide-border border-t border-border">
                    {receipts.map((receipt) => {
                      const cancelUrl = `/listes/annuler?retour=${encodeURIComponent(`/l/${data.slug}`)}#${receipt.token}`;
                      return (
                        <li
                          key={receipt.token}
                          className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span className="min-w-0 break-words font-medium">
                            {receipt.title}
                          </span>
                          {origin && (
                            <div className="flex shrink-0 flex-wrap items-start gap-2">
                              <CopyLink
                                value={`${origin}${cancelUrl}`}
                                label="Copier le lien"
                              />
                              <Button variant="ghost" asChild>
                                <a href={cancelUrl}>Annuler ma réservation</a>
                              </Button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
          {data.items.length === 0 && (
            <Notice>Cette liste ne contient pas encore de cadeau.</Notice>
          )}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((item) => {
              const complete = item.is_group_gift
                ? Number(item.amount_contributed) >= Number(item.price)
                : item.reserved;
              const progress = item.price
                ? Math.min(
                    100,
                    (Number(item.amount_contributed) / Number(item.price)) *
                      100,
                  )
                : 0;
              return (
                <article
                  key={item.id}
                  className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-4"
                >
                  <GiftImage key={item.image_url} item={item} />
                  <div className="space-y-2">
                    <h2 className="break-words text-lg font-semibold">
                      {item.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{euro(item.price)}</span>
                      {item.priority === "high" && (
                        <Badge variant="secondary">
                          <Heart className="size-3" aria-hidden="true" />
                          Coup de cœur
                        </Badge>
                      )}
                    </div>
                    <MerchantLink url={item.url} />
                  </div>
                  <div className="mt-auto space-y-3 border-t border-border pt-4">
                    {item.is_group_gift ? (
                      <>
                        <p className="text-sm font-medium">
                          {euro(Number(item.amount_contributed))} /{" "}
                          {euro(item.price)} déclarés
                        </p>
                        <div
                          role="progressbar"
                          aria-label={`Participation pour ${item.title}`}
                          aria-valuenow={progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          className="h-2 w-full overflow-hidden rounded-full bg-muted"
                        >
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        {item.guest_names.length > 0 && (
                          <p className="break-words text-sm text-muted-foreground">
                            Avec {item.guest_names.join(", ")}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="break-words text-sm text-muted-foreground">
                        {item.reserved
                          ? `Déjà réservé par ${item.guest_names.join(", ")}`
                          : "Encore disponible"}
                      </p>
                    )}
                    <Button
                      className="w-full"
                      variant={complete ? "outline" : "primary"}
                      disabled={
                        complete || (!!pending && pending.item_id !== item.id)
                      }
                      onClick={() => setSelected(item.id)}
                    >
                      {complete
                        ? item.is_group_gift
                          ? "Objectif atteint"
                          : "Déjà réservé"
                        : item.is_group_gift
                          ? "Participer"
                          : "Je réserve ce cadeau"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
      {data && (
        <ListShareMenu title={data.title} url={`${origin}/l/${data.slug}`} />
      )}
      <footer className="pt-6 text-center">
        <DocumentLink
          href="/outils/listes-cadeaux?creer=1"
          className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Gift className="size-4" aria-hidden="true" />À mon tour de créer une
          liste
        </DocumentLink>
      </footer>
      {activeItem && data && (
        <ReserveForm
          key={activeItem.id}
          item={activeItem}
          list={data}
          pending={pending?.item_id === activeItem.id ? pending : null}
          onPending={setPending}
          onClose={() => setSelected(null)}
          onSuccess={success}
        />
      )}
    </main>
  );
}

export function CancelReservation() {
  const hydrated = useHydrated();
  return hydrated ? (
    <CancelReservationClient />
  ) : (
    <p className="p-8">Vérification du lien…</p>
  );
}
function CancelReservationClient() {
  const [returnTo] = useState(() => {
    const candidate = new URLSearchParams(window.location.search).get("retour");
    return candidate && /^\/l\/[a-f0-9]{20}$/.test(candidate)
      ? candidate
      : "/outils/listes-cadeaux";
  });
  const [token] = useState(() => {
    const raw = window.location.hash.slice(1);
    return /^[a-f0-9]{64}$/.test(raw) ? raw : null;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    if (token) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
  }, [token]);
  return (
    <main
      lang="fr"
      dir="ltr"
      className="mx-auto min-h-screen max-w-lg space-y-6 px-6 py-16"
    >
      <Gift className="size-10 text-foreground" aria-hidden="true" />
      <h1 className="text-3xl font-semibold">Annuler ma réservation</h1>
      {!token ? (
        <Notice error>
          Ce lien d’annulation est incomplet. Ouvre le lien personnel reçu lors
          de ta réservation.
        </Notice>
      ) : (
        <>
          <p className="text-muted-foreground">
            Le cadeau ou le montant réservé sera de nouveau disponible dans la
            liste.
          </p>
          {error && <Notice error>{error}</Notice>}
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              if (lock.current) return;
              lock.current = true;
              setBusy(true);
              setError("");
              try {
                await giftRequest("/api/gifts/cancel", { token });
                try {
                  for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (!key?.startsWith("gifts.receipts.")) continue;
                    const saved: Receipt[] = JSON.parse(
                      localStorage.getItem(key) ?? "[]",
                    );
                    localStorage.setItem(
                      key,
                      JSON.stringify(saved.filter((r) => r.token !== token)),
                    );
                  }
                } catch {
                  /* Cancellation already succeeded remotely. */
                }
                window.location.replace(
                  `${returnTo}?reservation=cancelled`,
                );
              } catch (e) {
                setError(errorText(e));
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            {busy ? "Annulation…" : "Confirmer l’annulation"}
          </Button>
        </>
      )}
      <Button variant="outline" asChild>
        <a href={returnTo}>Ne pas annuler ma réservation</a>
      </Button>
    </main>
  );
}
