"use client";
import { useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { Gift, ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { occasions, safeWebUrl, type GiftItem } from "../types";

export function OccasionTag({
  value,
  label,
}: {
  value: string;
  label?: string | null;
}) {
  const occasion = occasions.find((option) => option.value === value);
  const text = value === "other" ? label : occasion?.label;
  return text ? <Badge variant="secondary">{text}</Badge> : null;
}

export function WhatsAppShare({ title, url }: { title: string; url: string }) {
  const [shareError, setShareError] = useState("");
  if (!url) return null;
  const href = `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;
  return (
    <div className="space-y-3 border-t border-border pt-6">
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" asChild>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            title="Partager le lien dans une conversation ou un groupe WhatsApp"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            Partager sur WhatsApp
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
        </Button>
        <Button
          variant="primary"
          type="button"
          onClick={async () => {
            setShareError("");
            try {
              if (navigator.share) {
                await navigator.share({ title, text: title, url });
              } else {
                await navigator.clipboard.writeText(`${title}\n${url}`);
                setShareError("Lien copié. Colle-le dans Messages.");
                window.location.href = "sms:";
              }
            } catch (error) {
              if (error instanceof Error && error.name === "AbortError") return;
              setShareError(
                "Le partage n’est pas disponible ici. Copie le lien pour l’envoyer dans Messages.",
              );
            }
          }}
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          Partager par iMessage
        </Button>
      </div>
      {shareError && (
        <p role="status" className="text-sm text-muted-foreground">
          {shareError}
        </p>
      )}
    </div>
  );
}

export function ListImage({
  src,
  title,
  className = "h-40 w-full",
}: {
  src: string | null;
  title: string;
  className?: string;
}) {
  if (!src || !/^data:image\/(?:webp|png|jpeg);base64,/.test(src)) return null;
  // The image is bounded, decoded and re-encoded by the server before storage.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Image de ${title}`}
      className={`rounded-xl object-cover ${className}`}
    />
  );
}

const subscribe = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
/** Intentional document navigation across the analytics/privacy boundary. */
export function DocumentLink({ href, ...props }: React.ComponentProps<"a">) {
  return <a href={href} {...props} />;
}

export class GiftApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function giftRequest<T>(url: string, data?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: data === undefined ? "GET" : "POST",
    cache: "no-store",
    ...(data === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok)
    throw new GiftApiError(
      result.error ?? "Une erreur est survenue. Réessaie.",
      response.status,
    );
  return result as T;
}
export function errorText(error: unknown) {
  return error instanceof GiftApiError
    ? error.message
    : "La connexion a été interrompue. Réessaie sans fermer cette page.";
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-xl border p-4 text-sm ${error ? "border-destructive text-destructive" : "border-border bg-muted/40 text-muted-foreground"}`}
    >
      {children}
    </p>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: (id: string) => ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
export function TextArea({ id, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      id={id}
      {...props}
      className="min-h-24 w-full rounded-lg border border-input bg-background p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}
export function GiftImage({ item }: { item: GiftItem }) {
  const [failed, setFailed] = useState(false);
  const url = safeWebUrl(item.image_url);
  return (
    <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-muted/50">
      {url && !failed ? (
        // Remote merchant images are never passed through the server image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={item.title}
          className="h-full w-full object-contain p-4"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <Gift className="size-12 text-muted-foreground" aria-hidden="true" />
      )}
    </div>
  );
}
export function MerchantLink({ url }: { url: string | null }) {
  const href = safeWebUrl(url);
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      className="inline-flex min-h-11 items-center gap-2 text-sm text-foreground underline underline-offset-4"
    >
      Voir sur le site marchand{" "}
      <ExternalLink className="size-4" aria-hidden="true" />
      <span className="sr-only"> (nouvel onglet)</span>
    </a>
  ) : null;
}
export function Confirm({
  title,
  description,
  label,
  onConfirm,
  onClose,
  destructive = false,
}: {
  title: string;
  description: string;
  label: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  destructive?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        {error && <Notice error>{error}</Notice>}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Retour
          </Button>
          <Button
            variant={destructive ? "destructive" : "primary"}
            disabled={busy}
            onClick={async () => {
              if (busy) return;
              setBusy(true);
              try {
                await onConfirm();
                onClose();
              } catch (e) {
                setError(errorText(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "En cours…" : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function CopyLink({
  value,
  label = "Copier le lien",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setManual(false);
          } catch {
            setManual(true);
          }
        }}
      >
        {copied ? "Lien copié" : label}
      </Button>
      {manual && (
        <Input
          aria-label="Lien à copier manuellement"
          readOnly
          value={value}
          onFocus={(event) => event.target.select()}
        />
      )}
      <span className="sr-only" role="status">
        {copied ? "Le lien a été copié." : ""}
      </span>
    </div>
  );
}
