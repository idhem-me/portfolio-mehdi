"use client";
import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  Gift,
  ExternalLink,
  MessageCircle,
  QrCode,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export function ListShareMenu({ title, url }: { title: string; url: string }) {
  const [qrOpen, setQrOpen] = useState(false);

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;

  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="secondary">
            <Share2 className="size-4" aria-hidden="true" />
            Partager
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onSelect={() => {
              window.open(whatsappUrl, "_blank", "noopener,noreferrer");
            }}
          >
            <MessageCircle aria-hidden="true" />
            WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              window.location.href = `sms:&body=${encodeURIComponent(`${title}\n${url}`)}`;
            }}
          >
            <MessageCircle aria-hidden="true" />
            iMessage
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setQrOpen(true)}>
            <QrCode aria-hidden="true" />
            QR code
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ShareQRCodeDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        value={url}
        title={title}
      />
    </div>
  );
}

function ShareQRCodeDialog({
  open,
  onOpenChange,
  value,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  title: string;
}) {
  const qrRef = useRef<SVGSVGElement>(null);
  const [message, setMessage] = useState("");

  async function shareQrCode() {
    setMessage("");
    const svg = qrRef.current;
    if (!svg) return;

    let objectUrl: string | undefined;
    try {
      const svgBlob = new Blob([new XMLSerializer().serializeToString(svg)], {
        type: "image/svg+xml;charset=utf-8",
      });
      objectUrl = URL.createObjectURL(svgBlob);
      const image = new Image();
      image.src = objectUrl;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("QR image could not be loaded"));
      });

      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const png = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) =>
          blob ? resolve(blob) : reject(new Error("QR image export failed")),
          "image/png",
        );
      });
      const file = new File([png], "qr-code-liste-cadeaux.png", {
        type: "image/png",
      });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ title, files: [file] });
          return;
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return;
        }
      }
      const downloadUrl = URL.createObjectURL(png);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = file.name;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      setMessage("QR code téléchargé. Tu peux maintenant le joindre à un message.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setMessage("Le QR code n’a pas pu être partagé. Réessaie.");
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>QR code de la liste</DialogTitle>
          <DialogDescription>
            Scanne ce code pour ouvrir « {title} ».
          </DialogDescription>
        </DialogHeader>
        <div className="mx-auto flex w-fit items-center justify-center rounded-xl bg-white p-4">
          <QRCodeSVG
            ref={qrRef}
            value={value}
            size={256}
            title="QR code de partage de la liste"
          />
        </div>
        {message && (
          <p role="status" className="text-center text-sm text-muted-foreground">
            {message}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button variant="primary" onClick={() => void shareQrCode()}>
            <QrCode className="size-4" aria-hidden="true" />
            Partager le QR code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      className="min-h-24 w-full rounded-lg border border-input bg-background p-3 text-[length:var(--control-text)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}
export function GiftImage({ item }: { item: GiftItem }) {
  const [failed, setFailed] = useState(false);
  const url = item.image_url?.startsWith("data:image/webp;base64,")
    ? item.image_url
    : safeWebUrl(item.image_url);
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
  variant = "outline",
}: {
  value: string;
  label?: string;
  variant?: "primary" | "outline" | "secondary";
}) {
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={variant}
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
