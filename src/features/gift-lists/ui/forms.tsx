"use client";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { encodePhoto } from "@/features/account/profile/photo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { occasions, type GiftItem, type GiftList } from "../types";
import {
  errorText,
  Field,
  giftRequest,
  ListImage,
  Notice,
  TextArea,
} from "./shared";

type ListData = Pick<
  GiftList,
  | "title"
  | "description"
  | "occasion_type"
  | "occasion_label"
  | "cover_image"
  | "is_surprise_mode"
  | "payment_info"
>;
export function ListForm({
  initial,
  onSave,
  onClose,
  onDelete,
}: {
  initial?: GiftList;
  onSave: (data: ListData) => Promise<void>;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [value, setValue] = useState<ListData>(
    initial ?? {
      title: "",
      description: "",
      occasion_type: "birthday",
      occasion_label: "",
      cover_image: null,
      is_surprise_mode: false,
      payment_info: "",
    },
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preparingImage, setPreparingImage] = useState(false);
  const lock = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || preparingImage) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await onSave(value);
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy && !preparingImage) onClose();
      }}
    >
      <DialogContent className="max-h-[90svh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {initial ? "Modifier la liste" : "Créer une liste"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Titre, occasion et préférences de partage.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <fieldset disabled={busy || preparingImage} className="space-y-5">
            <Field label="Titre de la liste">
              {(id) => (
                <Input
                  id={id}
                  autoFocus
                  required
                  maxLength={160}
                  value={value.title}
                  onChange={(e) =>
                    setValue({ ...value, title: e.target.value })
                  }
                  placeholder="Les cadeaux de Fanny"
                />
              )}
            </Field>
            <Field label="Type de liste">
              {(id) => (
                <Select
                  id={id}
                  label="Type de liste"
                  value={value.occasion_type}
                  options={occasions}
                  onValueChange={(occasion_type) =>
                    setValue({ ...value, occasion_type })
                  }
                />
              )}
            </Field>
            {value.occasion_type === "other" && (
              <Field label="Précise l’occasion (facultatif)">
                {(id) => (
                  <Input
                    id={id}
                    maxLength={80}
                    placeholder="Crémaillère, départ en retraite…"
                    value={value.occasion_label ?? ""}
                    onChange={(event) =>
                      setValue({ ...value, occasion_label: event.target.value })
                    }
                  />
                )}
              </Field>
            )}

            <Field label="Image de la liste (facultatif)">
              {(id) => (
                <Input
                  id={id}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setPreparingImage(true);
                    setError("");
                    try {
                      const cover_image = await encodePhoto(file, {
                        maxDimension: 960,
                      });
                      setValue((current) => ({ ...current, cover_image }));
                    } catch (error) {
                      setError(
                        error instanceof Error
                          ? error.message
                          : "Impossible de préparer cette image.",
                      );
                    } finally {
                      setPreparingImage(false);
                    }
                  }}
                />
              )}
            </Field>
            {value.cover_image && (
              <div className="space-y-2">
                <ListImage
                  src={value.cover_image}
                  title={value.title || "la liste"}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setValue({ ...value, cover_image: null })}
                >
                  Retirer l’image
                </Button>
              </div>
            )}
            {preparingImage && (
              <p role="status" className="text-sm text-muted-foreground">
                Préparation de l’image…
              </p>
            )}
            {initial && (
              <Field label="Description (facultatif)">
                {(id) => (
                  <TextArea
                    id={id}
                    maxLength={5000}
                    value={value.description ?? ""}
                    onChange={(e) =>
                      setValue({ ...value, description: e.target.value })
                    }
                  />
                )}
              </Field>
            )}
            <Field
              label="Instructions de participation (facultatif)"
              hint="Lien ou IBAN, visible par les personnes ayant la liste."
            >
              {(id) => (
                <TextArea
                  id={id}
                  maxLength={2000}
                  value={value.payment_info ?? ""}
                  onChange={(e) =>
                    setValue({ ...value, payment_info: e.target.value })
                  }
                  placeholder="Pour participer, voici mon lien…"
                />
              )}
            </Field>
            <div className="space-y-2 rounded-xl border border-border bg-muted p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium">Mode Surprise</span>
                <Switch
                  aria-label="Mode Surprise"
                  checked={value.is_surprise_mode}
                  onCheckedChange={(is_surprise_mode) =>
                    setValue({ ...value, is_surprise_mode })
                  }
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {value.is_surprise_mode
                  ? "Réservations et messages masqués dans ton espace."
                  : "Réservations et messages visibles dans ton espace."}
              </p>
              {initial?.reservations_revealed_at && (
                <p className="text-sm text-muted-foreground">
                  Réservations déjà révélées.
                </p>
              )}
            </div>
          </fieldset>
          {error && <Notice error>{error}</Notice>}
          <DialogFooter>
            {onDelete && (
              <Button
                className="me-auto"
                type="button"
                variant="destructive"
                disabled={busy || preparingImage}
                onClick={onDelete}
              >
                Supprimer la liste
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={busy || preparingImage}
              onClick={onClose}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={busy || preparingImage}
            >
              {busy
                ? "Enregistrement…"
                : initial
                  ? "Enregistrer"
                  : "Créer ma liste"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type ItemData = Omit<GiftItem, "id">;
export function ItemForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: GiftItem;
  onSave: (data: ItemData) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [image, setImage] = useState(initial?.image_url ?? "");
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [group, setGroup] = useState(initial?.is_group_gift ?? false);
  const [priority, setPriority] = useState(initial?.priority ?? "normal");
  const [busy, setBusy] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  async function extract() {
    if (extracting) return;
    setExtracting(true);
    setError("");
    setMessage("");
    try {
      const result = await giftRequest<{
        title: string | null;
        image_url: string | null;
        price: number | null;
        message?: string;
      }>("/api/tetris/gifts/extract", { url });
      if (result.title) setTitle(result.title);
      if (result.image_url) setImage(result.image_url);
      if (result.price !== null) setPrice(String(result.price));
      setMessage(
        result.message ||
          "Informations récupérées. Vérifie-les avant d’ajouter le cadeau.",
      );
    } catch (e) {
      setMessage(`${errorText(e)} Tu peux remplir le cadeau manuellement.`);
    } finally {
      setExtracting(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || extracting) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await onSave({
        title,
        url: url || null,
        image_url: image || null,
        price: price === "" ? null : Number(price.replace(",", ".")),
        is_group_gift: group,
        priority,
      });
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy && !extracting) onClose();
      }}
    >
      <DialogContent className="max-h-[90svh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {initial ? "Modifier le cadeau" : "Ajouter un cadeau"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Ajout par lien ou saisie manuelle.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <fieldset disabled={busy || extracting} className="space-y-5">
            <Field label="Lien du produit (facultatif)">
              {(id) => (
                <Input
                  id={id}
                  autoFocus
                  type="url"
                  maxLength={4096}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://boutique.fr/produit"
                />
              )}
            </Field>
            <Button
              type="button"
              variant="primary"
              disabled={!url || busy || extracting}
              onClick={() => void extract()}
            >
              {extracting
                ? "Lecture de la boutique…"
                : "Remplir automatiquement"}
            </Button>
            <Field label="Nom du cadeau">
              {(id) => (
                <Input
                  id={id}
                  required
                  maxLength={200}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              )}
            </Field>
            <Field label="Prix estimé (€)">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={group ? "0.01" : "0"}
                  max="999999999.99"
                  step="0.01"
                  required={group}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              )}
            </Field>
            <Field label="Lien de l’image (facultatif)">
              {(id) => (
                <Input
                  id={id}
                  type="url"
                  maxLength={4096}
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                />
              )}
            </Field>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="size-5 accent-primary"
                checked={group}
                onChange={(e) => setGroup(e.target.checked)}
              />
              Autoriser la participation à plusieurs
            </label>
            {group && (
              <p className="text-sm text-muted-foreground">
                Prix cible requis. Ajoute les modalités de participation aux
                réglages de la liste.
              </p>
            )}
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="size-5 accent-primary"
                checked={priority === "high"}
                onChange={(e) =>
                  setPriority(e.target.checked ? "high" : "normal")
                }
              />
              C’est un coup de cœur
            </label>
          </fieldset>
          {message && <Notice>{message}</Notice>}
          {error && <Notice error>{error}</Notice>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy || extracting}
              onClick={onClose}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={busy || extracting}
            >
              {busy
                ? "Enregistrement…"
                : initial
                  ? "Enregistrer"
                  : "Ajouter le cadeau"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
