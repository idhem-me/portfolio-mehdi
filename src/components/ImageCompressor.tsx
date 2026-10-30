"use client";

import { NativeInput } from "@/components/design-system/native-controls";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, ImageDown, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  compressedFilename,
  useImageCompression,
  type CompressionFormat,
} from "@/hooks/useImageCompression";
import { cn } from "@/lib/utils";

export function ImageCompressor() {
  const t = useTranslations("imageCompressor");
  const locale = useLocale();
  const input = useRef<HTMLInputElement>(null);
  const { entries, busy, rejected, addFiles, clear, compress } =
    useImageCompression();
  const [maxSize, setMaxSize] = useState("1");
  const [maxDimension, setMaxDimension] = useState("1920");
  const [format, setFormat] = useState<CompressionFormat>("original");
  const [dragging, setDragging] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [zipError, setZipError] = useState(false);
  const completed = entries.filter((entry) => entry.result && entry.resultUrl);
  const valid =
    Number.isFinite(Number(maxSize)) &&
    Number(maxSize) > 0 &&
    Number.isFinite(Number(maxDimension)) &&
    Number(maxDimension) >= 1;
  const disabled = busy || zipping;
  const size = (bytes: number) =>
    new Intl.NumberFormat(locale, {
      style: "unit",
      unit: bytes >= 1048576 ? "megabyte" : "kilobyte",
      maximumFractionDigits: 1,
    }).format(bytes / (bytes >= 1048576 ? 1048576 : 1024));

  async function downloadAll() {
    if (zipping || !completed.length) return;
    setZipping(true);
    setZipError(false);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const names = new Set<string>();
      for (const entry of completed) {
        const base = compressedFilename(entry.result!);
        let name = base;
        let index = 2;
        while (names.has(name.toLowerCase()))
          name = base.replace(/(\.[^.]+)$/, `-${index++}$1`);
        names.add(name.toLowerCase());
        zip.file(name, entry.result!);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "compressed-images.zip";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setZipError(true);
    } finally {
      setZipping(false);
    }
  }

  return (
    <section
      className="space-y-6 ph-no-capture ph-sensitive ph-mask"
      data-clarity-mask="true"
      aria-label={t("title")}
      aria-busy={disabled}
    >
      <div
        className={cn(
          "space-y-4 rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-center",
          dragging && !disabled && "border-accent bg-accent/5",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) addFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <Upload
          aria-hidden="true"
          className="mx-auto size-7 text-muted-foreground"
        />
        <p className="text-sm text-muted-foreground">{t("drop")}</p>
        <NativeInput
          ref={input}
          className="hidden"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          aria-label={t("add")}
          disabled={disabled}
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          {t("add")}
        </Button>
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
          {t("privacy")}
        </p>
      </div>
      <Card>
        <CardContent className="space-y-4">
          <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-2 text-sm">
              <span>{t("maxSize")}</span>
              <Input
                type="number"
                min="0.01"
                step="0.1"
                value={maxSize}
                onChange={(event) => setMaxSize(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span>{t("maxDimension")}</span>
              <Input
                type="number"
                min="1"
                step="1"
                value={maxDimension}
                onChange={(event) => setMaxDimension(event.target.value)}
              />
            </label>
            <div
              className={cn(
                "space-y-2 text-sm",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              <p id="compression-format-label">{t("format")}</p>
              <Select
                value={format}
                label={t("format")}
                onValueChange={(value) => {
                  if (!disabled) setFormat(value as CompressionFormat);
                }}
                options={[
                  { value: "original", label: t("original") },
                  { value: "image/webp", label: "WEBP" },
                  { value: "image/jpeg", label: "JPEG" },
                  { value: "image/png", label: "PNG" },
                ]}
              />
            </div>
          </fieldset>
          {!valid && (
            <p role="alert" className="text-sm text-destructive">
              {t("invalidSettings")}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{t("settingsHint")}</p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="accent"
              disabled={disabled || !valid || !entries.length}
              onClick={() =>
                void compress({
                  maxSizeMB: Number(maxSize),
                  maxWidthOrHeight: Number(maxDimension),
                  format,
                })
              }
            >
              <ImageDown aria-hidden="true" />
              {busy ? t("compressing") : t("compress")}
            </Button>
            {!!entries.length && (
              <Button variant="ghost" disabled={zipping} onClick={clear}>
                {busy ? t("cancelClear") : t("clear")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {!!rejected.length && (
        <p role="alert" className="break-words text-sm text-destructive">
          {t("rejected", { names: rejected.join(", ") })}
        </p>
      )}
      {!!entries.length && (
        <ol
          className="divide-y divide-border rounded-xl border border-border bg-card"
          aria-label={t("results")}
        >
          {entries.map((entry) => {
            const savings = entry.result
              ? Math.round((1 - entry.result.size / entry.file.size) * 100)
              : 0;
            return (
              <li
                key={entry.id}
                className="flex flex-wrap items-center gap-4 p-4"
              >
                {/* Local blob previews never use the server image optimizer. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.resultUrl ?? entry.preview}
                  alt=""
                  className="size-16 rounded-md bg-muted object-contain"
                />
                <div className="min-w-0 flex-1 basis-40 space-y-2">
                  <p className="break-words text-sm font-medium">
                    <bdi>{entry.file.name}</bdi>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("before")}: {size(entry.file.size)}
                    {entry.result &&
                      ` → ${t("after")}: ${size(entry.result.size)}`}
                  </p>
                  <p
                    role="status"
                    className={cn(
                      "text-xs text-muted-foreground",
                      entry.status === "error" && "text-destructive",
                    )}
                  >
                    {t(entry.status)}
                  </p>
                  {entry.status === "compressing" && (
                    <progress
                      className="h-2 w-full accent-current"
                      aria-label={t("progress", { name: entry.file.name })}
                      max={100}
                      value={entry.progress}
                    />
                  )}
                  {entry.result && (
                    <Badge variant="secondary">
                      {savings >= 0 ? `−${savings}%` : `+${Math.abs(savings)}%`}
                    </Badge>
                  )}
                </div>
                {entry.resultUrl && entry.result && (
                  <Button variant="outline" asChild>
                    <a
                      href={entry.resultUrl}
                      download={compressedFilename(entry.result)}
                      aria-label={t("downloadNamed", { name: entry.file.name })}
                    >
                      <Download aria-hidden="true" />
                      {t("download")}
                    </a>
                  </Button>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {completed.length > 1 && (
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => void downloadAll()}
        >
          <Download aria-hidden="true" />
          {zipping ? t("zipping") : t("downloadAll")}
        </Button>
      )}
      {zipError && (
        <p role="alert" className="text-sm text-destructive">
          {t("zipError")}
        </p>
      )}
    </section>
  );
}
