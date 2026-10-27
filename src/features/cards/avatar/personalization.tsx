"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Toast } from "@/components/ui/toast";
import {
  cardsRequest,
  loadCardsAccount,
  useCardsAccount,
} from "../account/client";
import { COSMETICS } from "../shop/catalog";
import { CardsPlayerAvatar } from "./player-avatar";
import { validateAvatar } from "./validate";
export function Personalization() {
  const { data } = useCardsAccount();
  const [configOpen, setConfigOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [image, setImage] = useState<{
    bitmap: ImageBitmap;
    url: string;
  } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  useEffect(
    () => () => {
      if (image) {
        URL.revokeObjectURL(image.url);
        image.bitmap.close();
      }
    },
    [image],
  );
  const owned = (id: string) => !!data?.cosmetics.includes(id);
  async function equip(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      await cardsRequest("equip", payload);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Modification impossible.");
    } finally {
      setBusy(false);
    }
  }
  async function choose(file: File) {
    try {
      await validateAvatar(file);
      const bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 16777216) {
        bitmap.close();
        throw new Error("Cette image est trop grande.");
      }
      setZoom(1);
      setX(0);
      setY(0);
      setImage({ bitmap, url: URL.createObjectURL(file) });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Image invalide.");
    }
  }
  async function upload() {
    if (!image || busy) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 512;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Recadrage indisponible.");
      const size = Math.min(image.bitmap.width, image.bitmap.height) / zoom;
      const left = ((image.bitmap.width - size) * (x + 100)) / 200;
      const top = ((image.bitmap.height - size) * (y + 100)) / 200;
      context.drawImage(image.bitmap, left, top, size, size, 0, 0, 512, 512);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) =>
            value
              ? resolve(value)
              : reject(new Error("Encodage indisponible.")),
          "image/webp",
          0.88,
        ),
      );
      const form = new FormData();
      form.set("avatar", blob, "avatar.webp");
      const response = await fetch("/api/tetris/cards/avatar", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await loadCardsAccount();
      setImage(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-5" aria-label="Personnalisation">
      {(data?.profile.custom_avatar_enabled ||
        data?.profile.equipped_avatar_frame ||
        (data?.profile.theme !== "default" && data?.profile.theme)) && (
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="personalization-title" className="font-medium">
              Personnalisation
            </h2>
            <p className="text-sm text-muted-foreground">
              {[
                data?.profile.custom_avatar_enabled
                  ? "Avatar personnalisé"
                  : null,
                COSMETICS.find(
                  (c) => c.id === data?.profile.equipped_avatar_frame,
                )?.name,
                data?.profile.theme === "blue"
                  ? "Thème Bleu"
                  : data?.profile.theme === "red"
                    ? "Thème Rouge"
                    : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <CardsPlayerAvatar />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {!!data?.cosmetics.length && (
          <Button variant="secondary" onClick={() => setConfigOpen(true)}>
            Personnaliser
          </Button>
        )}
        <Button variant="secondary" asChild>
          <Link href="/boutique?tab=cosmetiques">
            Ajouter une personnalisation
          </Link>
        </Button>
      </div>
      <Sheet open={configOpen} onOpenChange={setConfigOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Mes personnalisations</SheetTitle>
            <SheetDescription>
              Équipe les éléments que tu possèdes.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-4 pb-6">
            {owned("custom-avatar") && (
              <div className="space-y-3 rounded-lg border bg-card p-4">
                <label className="flex items-center justify-between gap-4 text-sm">
                  Utiliser un avatar personnalisé
                  <Switch
                    checked={data?.profile.custom_avatar_enabled ?? false}
                    disabled={busy || !owned("custom-avatar")}
                    onCheckedChange={(enabled) =>
                      void equip({ customAvatarEnabled: enabled })
                    }
                  />
                </label>
                {owned("custom-avatar") && (
                  <label className="block text-sm">
                    Choisir une image
                    <input
                      className="mt-2 block w-full rounded-lg border p-2"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={busy}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void choose(file);
                        event.target.value = "";
                      }}
                    />
                    <span className="mt-1 block text-xs text-muted-foreground">
                      PNG, JPEG ou WebP · 2 Mo maximum
                    </span>
                  </label>
                )}
              </div>
            )}
            {COSMETICS.some((c) => c.kind === "frame" && owned(c.id)) && (
              <fieldset disabled={busy} className="space-y-3">
                <legend className="mb-2 text-sm font-medium">
                  Cercle d’avatar
                </legend>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={
                      !data?.profile.equipped_avatar_frame
                        ? "primary"
                        : "secondary"
                    }
                    onClick={() => void equip({ frame: null })}
                  >
                    Aucun
                  </Button>
                  {COSMETICS.filter(
                    (c) => c.kind === "frame" && owned(c.id),
                  ).map((c) => (
                    <Button
                      key={c.id}
                      variant={
                        data?.profile.equipped_avatar_frame === c.id
                          ? "primary"
                          : "secondary"
                      }
                      disabled={!owned(c.id)}
                      onClick={() => void equip({ frame: c.id })}
                    >
                      {"asset" in c && (
                        <Image src={c.asset} width={24} height={24} alt="" />
                      )}
                      {c.name}
                    </Button>
                  ))}
                </div>
              </fieldset>
            )}
            {COSMETICS.some((c) => c.kind === "theme" && owned(c.id)) && (
              <fieldset disabled={busy} className="space-y-3">
                <legend className="mb-2 text-sm font-medium">
                  Thème de couleur
                </legend>
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
                        variant={
                          data?.profile.theme === id ? "primary" : "secondary"
                        }
                        disabled={id !== "default" && !owned(`theme-${id}`)}
                        onClick={() => void equip({ theme: id })}
                      >
                        {label}
                      </Button>
                    ))}
                </div>
              </fieldset>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <Dialog
        open={!!image}
        onOpenChange={(open) => {
          if (!open && !busy) setImage(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Recadrer l’avatar</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            Ajuste le zoom et la position.
          </DialogDescription>
          {image && (
            <div className="cards-avatar-crop">
              <Image
                src={image.url}
                alt="Aperçu du recadrage"
                fill
                unoptimized
                style={{
                  objectFit: "cover",
                  objectPosition: `${(x + 100) / 2}% ${(y + 100) / 2}%`,
                  transform: `scale(${zoom})`,
                  transformOrigin: `${(x + 100) / 2}% ${(y + 100) / 2}%`,
                }}
              />
            </div>
          )}
          {(
            [
              ["Zoom", zoom, setZoom, 1, 3, 0.05],
              ["Horizontal", x, setX, -100, 100, 1],
              ["Vertical", y, setY, -100, 100, 1],
            ] as const
          ).map(([label, value, setter, min, max, step]) => (
            <label className="mt-3 block text-sm" key={label}>
              {label}
              <input
                className="block w-full"
                type="range"
                value={value}
                min={min}
                max={max}
                step={step}
                onChange={(event) => setter(Number(event.target.value))}
              />
            </label>
          ))}
          <DialogFooter>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setImage(null)}
            >
              Annuler
            </Button>
            <Button disabled={busy} onClick={() => void upload()}>
              {busy ? "Envoi…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Toast message={message} error onDismiss={() => setMessage(null)} />
    </section>
  );
}
