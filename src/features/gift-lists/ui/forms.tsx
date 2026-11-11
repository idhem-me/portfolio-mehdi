"use client";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeCheckbox } from "@/components/design-system/native-controls";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { GiftFormDialog } from "./form-dialog";
import { GiftPhotoError, giftPhotoAccept, prepareGiftPhoto } from "./photo";
import { occasions, type GiftItem, type GiftList } from "../types";
import {
  errorText,
  Field,
  giftRequest,
  ListImage,
  Notice,
  TextArea,
} from "./shared";

function PhotoField({
  onPreparing,
  onPhoto,
  saveFailed,
}: {
  onPreparing: (preparing: boolean) => void;
  onPhoto: (image: string) => void;
  saveFailed: boolean;
}) {
  const t = useTranslations("giftForms");
  const [selectionError, setSelectionError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const feedback = useId();
  const input = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (saveFailed) button.current?.focus();
  }, [saveFailed]);
  const error = selectionError || (saveFailed ? t("photoInvalid") : "");
  return (
    <div className="space-y-2">
      <Button
        ref={button}
        type="button"
        variant="secondary"
        aria-describedby={preparing || error ? feedback : undefined}
        onClick={() => input.current?.click()}
      >
        {t("chooseImage")}
      </Button>
      <input
        ref={input}
        type="file"
        hidden
        accept={giftPhotoAccept}
        onChange={async (event) => {
          const file = event.currentTarget.files?.[0];
          if (!file) return;
          event.currentTarget.value = "";
          setSelectionError("");
          setPreparing(true);
          onPreparing(true);
          try {
            onPhoto(await prepareGiftPhoto(file));
          } catch (cause) {
            setSelectionError(
              t(cause instanceof GiftPhotoError ? cause.code : "photoInvalid"),
            );
          } finally {
            setPreparing(false);
            onPreparing(false);
          }
        }}
      />
      {preparing && (
        <p
          id={feedback}
          role="status"
          className="text-sm text-muted-foreground"
        >
          {t("photoPreparing")}
        </p>
      )}
      {error && (
        <div id={feedback}>
          <Notice error>{error}</Notice>
        </div>
      )}
    </div>
  );
}

function OptionalTextArea({
  action,
  label,
  hint,
  placeholder,
  maxLength,
  value,
  onChange,
}: {
  action: string;
  label: string;
  hint?: string;
  placeholder?: string;
  maxLength: number;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(() => !!value.trim());
  const id = useId();
  const input = useRef<HTMLTextAreaElement>(null);

  return (
    <div>
      {!open && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="max-w-full whitespace-normal text-start"
          aria-expanded={false}
          aria-controls={id}
          onClick={() => {
            flushSync(() => setOpen(true));
            input.current?.focus();
          }}
        >
          {action}
        </Button>
      )}
      <div id={id} hidden={!open}>
        {open && (
          <Field label={label} hint={hint}>
            {(fieldId) => (
              <TextArea
                id={fieldId}
                ref={input}
                maxLength={maxLength}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
              />
            )}
          </Field>
        )}
      </div>
    </div>
  );
}

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
  const t = useTranslations("giftForms");
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
    <GiftFormDialog
      title={initial ? "Modifier la liste" : "Créer une liste"}
      description="Titre, occasion et préférences de partage."
      locked={busy || preparingImage}
      onClose={onClose}
      onSubmit={submit}
      error={
        error &&
        error !== "invalid_gift_photo" && <Notice error>{error}</Notice>
      }
      actions={
        <>
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
        </>
      }
    >
      <fieldset disabled={busy || preparingImage} className="space-y-5">
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
        <Field label={t("listName")}>
          {(id) => (
            <Input
              id={id}
              required
              maxLength={160}
              value={value.title}
              onChange={(e) => setValue({ ...value, title: e.target.value })}
              placeholder="Les cadeaux de Fanny"
            />
          )}
        </Field>

        <PhotoField
          saveFailed={error === "invalid_gift_photo"}
          onPreparing={(preparing) => {
            setPreparingImage(preparing);
            if (preparing) setError("");
          }}
          onPhoto={(cover_image) =>
            setValue((current) => ({ ...current, cover_image }))
          }
        />
        {value.cover_image && (
          <div className="space-y-2">
            <ListImage
              src={value.cover_image}
              title={value.title || "la liste"}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setError("");
                setValue({ ...value, cover_image: null });
              }}
            >
              Retirer l’image
            </Button>
          </div>
        )}
        <OptionalTextArea
          action={t("addDescription")}
          label={t("description")}
          maxLength={5000}
          value={value.description ?? ""}
          onChange={(description) => setValue({ ...value, description })}
        />
        <OptionalTextArea
          action={t("addPaymentInstructions")}
          label="Instructions de participation (facultatif)"
          hint="Lien ou IBAN, visible par les personnes ayant la liste."
          placeholder="Pour participer, voici mon lien…"
          maxLength={2000}
          value={value.payment_info ?? ""}
          onChange={(payment_info) => setValue({ ...value, payment_info })}
        />
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
    </GiftFormDialog>
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
  const [preparingItemImage, setPreparingItemImage] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [manualEntry, setManualEntry] = useState(false);
  const lock = useRef(false);
  async function extract() {
    if (extracting) return;
    setExtracting(true);
    setError("");
    setMessage("");
    setManualEntry(false);
    setTitle("");
    setPrice("");
    setImage("");
    try {
      const result = await giftRequest<{
        title: string | null;
        image_url: string | null;
        price: number | null;
        message?: string;
        manual_entry?: boolean;
        status?: string;
      }>("/api/tetris/gifts/extract", { url });
      if (result.title) setTitle(result.title);
      if (result.image_url) setImage(result.image_url);
      if (result.price !== null) setPrice(String(result.price));
      setMessage(
        result.message ||
          "Informations récupérées. Vérifie-les avant d’ajouter le cadeau.",
      );
      setManualEntry(
        result.manual_entry === true || result.status === "manual",
      );
    } catch (e) {
      setMessage(`${errorText(e)} Tu peux remplir le cadeau manuellement.`);
      setManualEntry(true);
    } finally {
      setExtracting(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || extracting || preparingItemImage) return;
    const parsedPrice = price === "" ? null : Number(price.replace(",", "."));
    if (
      (parsedPrice !== null &&
        (!Number.isFinite(parsedPrice) ||
          parsedPrice < 0 ||
          parsedPrice > 999999999.99)) ||
      (group && (parsedPrice === null || parsedPrice <= 0))
    ) {
      setError(
        "Indique un prix valide, supérieur à zéro pour un cadeau commun.",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await onSave({
        title,
        url: url || null,
        image_url: image || null,
        price: parsedPrice,
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
    <GiftFormDialog
      title={initial ? "Modifier le cadeau" : "Ajouter un cadeau"}
      description="Ajout par lien ou saisie manuelle."
      locked={busy || extracting || preparingItemImage}
      onClose={onClose}
      onSubmit={submit}
      error={
        error &&
        error !== "invalid_gift_photo" && <Notice error>{error}</Notice>
      }
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={busy || extracting || preparingItemImage}
            onClick={onClose}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={busy || extracting || preparingItemImage}
          >
            {busy
              ? "Enregistrement…"
              : initial
                ? "Enregistrer"
                : "Ajouter le cadeau"}
          </Button>
        </>
      }
    >
      <fieldset
        disabled={busy || extracting || preparingItemImage}
        className="space-y-5"
      >
        <Field label="Lien du produit (facultatif)">
          {(id) => (
            <Input
              id={id}
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
          {extracting ? "Lecture de la boutique…" : "Remplir automatiquement"}
        </Button>
        {manualEntry && message && (
          <p
            role="status"
            className="flex items-start gap-2 text-sm text-warning"
          >
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            {message}
          </p>
        )}
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
              type="text"
              inputMode="decimal"
              pattern="[0-9]+([.,][0-9]{1,2})?"
              title="Un prix avec au maximum deux décimales (ex. : 19,99)."
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
              type="text"
              inputMode="url"
              maxLength={250000}
              value={image.startsWith("data:image/") ? "" : image}
              onChange={(e) => setImage(e.target.value)}
            />
          )}
        </Field>
        <PhotoField
          saveFailed={error === "invalid_gift_photo"}
          onPreparing={(preparing) => {
            setPreparingItemImage(preparing);
            if (preparing) setError("");
          }}
          onPhoto={setImage}
        />
        {image.startsWith("data:image/") && (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt="Aperçu de la photo du cadeau"
              className="max-h-48 rounded-lg object-contain"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setError("");
                setImage("");
              }}
            >
              Retirer la photo
            </Button>
          </div>
        )}
        <NativeCheckbox
          checked={group}
          onChange={(e) => setGroup(e.target.checked)}
        >
          Autoriser la participation à plusieurs
        </NativeCheckbox>
        {group && (
          <p className="text-sm text-muted-foreground">
            Prix cible requis. Ajoute les modalités de participation aux
            réglages de la liste.
          </p>
        )}
        <NativeCheckbox
          checked={priority === "high"}
          onChange={(e) => setPriority(e.target.checked ? "high" : "normal")}
        >
          C’est un coup de cœur
        </NativeCheckbox>
      </fieldset>
      {message && !manualEntry && <Notice>{message}</Notice>}
    </GiftFormDialog>
  );
}
