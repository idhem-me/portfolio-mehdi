"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Download,
  FileImage,
  LoaderCircle,
  LockKeyhole,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  convertImage,
  convertedFilename,
  ImageConversionError,
  isSupportedImage,
  type ImageOutputFormat,
} from "@/lib/image-converter";

type Entry = {
  id: string;
  file: File;
  preview?: string;
  status: "waiting" | "converting" | "done" | "error";
  result?: Blob;
  resultUrl?: string;
  filename?: string;
  error?: string;
};

export function ImageConverter() {
  const t = useTranslations("imageConverter");
  const locale = useLocale();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [format, setFormat] = useState<ImageOutputFormat>("image/webp");
  const [quality, setQuality] = useState(80);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [zipProgress, setZipProgress] = useState<number | null>(null);
  const [zipError, setZipError] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const locked = useRef(false);
  const urls = useRef(new Set<string>());
  const complete = entries.filter(
    (entry) => entry.status === "done" && entry.result,
  );

  useEffect(() => {
    const activeUrls = urls.current;
    return () => {
      generation.current += 1;
      for (const url of activeUrls) URL.revokeObjectURL(url);
      activeUrls.clear();
    };
  }, []);

  function makeUrl(blob: Blob) {
    const url = URL.createObjectURL(blob);
    urls.current.add(url);
    return url;
  }

  function releaseUrl(url?: string) {
    if (!url) return;
    URL.revokeObjectURL(url);
    urls.current.delete(url);
  }

  function addFiles(files: File[]) {
    if (locked.current || !files.length) return;
    setZipError(false);
    const added = files.map((file) => {
      const supported = isSupportedImage(file);
      return {
        id: crypto.randomUUID(),
        file,
        // SVG is validated before any decoder sees it. HEIC gets its preview after conversion.
        preview:
          /^image\/(png|jpeg|webp)$/.test(file.type) &&
          !/\.(svg|heic|heif)$/i.test(file.name)
            ? makeUrl(file)
            : undefined,
        status: supported ? ("waiting" as const) : ("error" as const),
        error: supported ? undefined : "unsupported",
      };
    });
    setEntries((current) => [...current, ...added]);
  }

  function clear() {
    generation.current += 1;
    locked.current = false;
    for (const url of urls.current) URL.revokeObjectURL(url);
    urls.current.clear();
    setEntries([]);
    setBusy(false);
    setZipProgress(null);
    setZipError(false);
  }

  async function convert() {
    if (locked.current || !entries.length) return;
    locked.current = true;
    const token = ++generation.current;
    setBusy(true);
    setZipError(false);
    const options = { format, quality: quality / 100 };
    const batch = [...entries];
    for (const entry of batch) releaseUrl(entry.resultUrl);
    setEntries((current) =>
      current.map((entry) => ({
        ...entry,
        status: "waiting",
        result: undefined,
        resultUrl: undefined,
        filename: undefined,
        error: undefined,
      })),
    );
    try {
      for (const entry of batch) {
        if (generation.current !== token) break;
        setEntries((current) =>
          current.map((item) =>
            item.id === entry.id ? { ...item, status: "converting" } : item,
          ),
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (generation.current !== token) break;
        try {
          const blob = await convertImage(entry.file, options);
          if (generation.current !== token) break;
          const resultUrl = makeUrl(blob);
          setEntries((current) =>
            current.map((item) =>
              item.id === entry.id
                ? {
                    ...item,
                    status: "done",
                    result: blob,
                    resultUrl,
                    filename: convertedFilename(
                      entry.file.name,
                      options.format,
                    ),
                  }
                : item,
            ),
          );
        } catch (error) {
          if (generation.current !== token) break;
          const code =
            error instanceof ImageConversionError ? error.code : "invalid";
          setEntries((current) =>
            current.map((item) =>
              item.id === entry.id
                ? { ...item, status: "error", error: code }
                : item,
            ),
          );
        }
      }
    } finally {
      if (generation.current === token) {
        locked.current = false;
        setBusy(false);
      }
    }
  }

  function downloadUrl(url: string, name: string) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }

  async function downloadZip() {
    if (locked.current || !complete.length) return;
    locked.current = true;
    const token = generation.current;
    setZipProgress(0);
    setZipError(false);
    try {
      const JSZip = (await import("jszip")).default;
      if (token !== generation.current) return;
      const zip = new JSZip();
      const names = new Set<string>();
      for (const entry of complete) {
        const original = entry.filename!;
        let name = original;
        let suffix = 2;
        while (names.has(name.toLocaleLowerCase())) {
          const dot = original.lastIndexOf(".");
          name = `${original.slice(0, dot)}-${suffix++}${original.slice(dot)}`;
        }
        names.add(name.toLocaleLowerCase());
        zip.file(name, entry.result!);
      }
      const blob = await zip.generateAsync(
        { type: "blob", compression: "STORE" },
        (metadata) => {
          if (token === generation.current)
            setZipProgress(Math.round(metadata.percent));
        },
      );
      if (token !== generation.current) return;
      const url = makeUrl(blob);
      downloadUrl(url, "images.zip");
      setTimeout(() => releaseUrl(url), 60_000);
    } catch {
      if (token === generation.current) setZipError(true);
    } finally {
      if (token === generation.current) {
        locked.current = false;
        setZipProgress(null);
      }
    }
  }

  const size = (bytes: number) =>
    new Intl.NumberFormat(locale, {
      style: "unit",
      unit: bytes >= 1048576 ? "megabyte" : "kilobyte",
      maximumFractionDigits: 1,
    }).format(bytes / (bytes >= 1048576 ? 1048576 : 1024));
  const controlsDisabled = busy || zipProgress !== null;

  return (
    <section
      className="space-y-6 ph-no-capture ph-sensitive ph-mask"
      data-clarity-mask="true"
      aria-label={t("title")}
      aria-busy={controlsDisabled}
    >
      <Badge
        variant="secondary"
        className="h-auto max-w-full whitespace-normal py-2"
      >
        <LockKeyhole aria-hidden="true" className="shrink-0" />
        {t("privacy")}
      </Badge>
      <Card>
        <CardContent className="space-y-5">
          <fieldset
            disabled={controlsDisabled}
            className="grid gap-6 sm:grid-cols-2"
          >
            <div className="space-y-2">
              <label htmlFor="converter-format" className="text-sm font-medium">
                {t("format")}
              </label>
              <Select
                id="converter-format"
                label={t("format")}
                value={format}
                onValueChange={(value) => {
                  if (!locked.current) setFormat(value as ImageOutputFormat);
                }}
                options={[
                  { value: "image/webp", label: "WEBP" },
                  { value: "image/png", label: "PNG" },
                  { value: "image/jpeg", label: "JPEG" },
                ]}
              />
            </div>
            {format !== "image/png" && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {t("quality", { value: quality })}
                </p>
                <Slider
                  aria-label={t("quality", { value: quality })}
                  min={10}
                  max={100}
                  step={1}
                  disabled={controlsDisabled}
                  value={[quality]}
                  onValueChange={(values) => {
                    if (!locked.current) setQuality(values[0]);
                  }}
                />
              </div>
            )}
          </fieldset>
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </CardContent>
      </Card>
      <div
        className={cn(
          "space-y-4 rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-center",
          dragging && !controlsDisabled && "border-accent bg-accent/5",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          if (!controlsDisabled) setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <Upload
          aria-hidden="true"
          className="mx-auto size-7 text-muted-foreground"
        />
        <p className="text-sm">{t("drop")}</p>
        <p className="text-xs text-muted-foreground">{t("formats")}</p>
        <input
          ref={input}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/heic,image/heif,.heic,.heif,.png,.jpg,.jpeg,.webp,.svg"
          className="hidden"
          aria-label={t("select")}
          disabled={controlsDisabled}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            addFiles(files);
          }}
        />
        <Button
          variant="outline"
          disabled={controlsDisabled}
          onClick={() => input.current?.click()}
        >
          {t("select")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("limits")}</p>
      {entries.length > 0 && (
        <>
          <ol
            aria-label={t("list")}
            className="divide-y divide-border rounded-xl border border-border bg-card"
          >
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center gap-4 p-4"
              >
                {entry.resultUrl || entry.preview ? (
                  // Object URLs stay local and must bypass the remote image optimizer.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.resultUrl ?? entry.preview}
                    alt=""
                    className="size-16 rounded-md bg-muted object-contain"
                  />
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-md bg-muted">
                    <FileImage
                      aria-hidden="true"
                      className="size-6 text-muted-foreground"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1 basis-36 space-y-1">
                  <p className="break-words text-sm font-medium [overflow-wrap:anywhere]">
                    <bdi>{entry.file.name}</bdi>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("before", { size: size(entry.file.size) })}
                    {entry.result &&
                      ` · ${t("after", { size: size(entry.result.size) })}`}
                  </p>
                  <p
                    className={cn(
                      "flex items-center gap-2 text-xs",
                      entry.status === "error"
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {entry.status === "converting" && (
                      <LoaderCircle
                        aria-hidden="true"
                        className="size-3 motion-safe:animate-spin"
                      />
                    )}
                    {t(entry.status)}
                    {entry.error && ` — ${t(entry.error)}`}
                  </p>
                </div>
                {entry.resultUrl && entry.filename && (
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={t("downloadNamed", { name: entry.filename })}
                    onClick={() =>
                      downloadUrl(entry.resultUrl!, entry.filename!)
                    }
                  >
                    <Download aria-hidden="true" />
                    {t("download")}
                  </Button>
                )}
              </li>
            ))}
          </ol>
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-muted-foreground"
          >
            {zipProgress !== null
              ? t("zipProgress", { value: zipProgress })
              : t("summary", { done: complete.length, total: entries.length })}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="accent"
              disabled={controlsDisabled}
              onClick={() => void convert()}
            >
              {busy && (
                <LoaderCircle
                  aria-hidden="true"
                  className="motion-safe:animate-spin"
                />
              )}
              {t("convert")}
            </Button>
            <Button
              variant="outline"
              disabled={controlsDisabled || !complete.length}
              onClick={() => void downloadZip()}
            >
              <Download aria-hidden="true" />
              {t("downloadZip")}
            </Button>
            <Button variant="ghost" onClick={clear}>
              <Trash2 aria-hidden="true" />
              {t("clear")}
            </Button>
          </div>
        </>
      )}
      {zipError && (
        <p role="alert" className="text-sm text-destructive">
          {t("zipFailed")}
        </p>
      )}
    </section>
  );
}
