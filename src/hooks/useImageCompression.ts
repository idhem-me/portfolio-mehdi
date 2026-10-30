"use client";

import { useEffect, useRef, useState } from "react";

export type CompressionFormat =
  "original" | "image/webp" | "image/jpeg" | "image/png";
export type CompressionSettings = {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  format: CompressionFormat;
};
export type CompressionEntry = {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "compressing" | "done" | "error";
  progress: number;
  result?: File;
  resultUrl?: string;
};

const supported = new Set(["image/jpeg", "image/png", "image/webp"]);

export function compressedFilename(file: File): string {
  const extension =
    (
      {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      } as Record<string, string>
    )[file.type] ?? "png";
  const basename =
    file.name.replace(/\.[^.]*$/, "").replace(/[\\/\u0000-\u001f]/g, "_") ||
    "image";
  return `${basename}-compressed.${extension}`;
}

export function useImageCompression() {
  const [entries, setEntries] = useState<CompressionEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const entriesRef = useRef<CompressionEntry[]>([]);
  const urls = useRef(new Set<string>());
  const controller = useRef<AbortController | null>(null);
  const active = useRef(true);
  const locked = useRef(false);

  function update(
    transform: (items: CompressionEntry[]) => CompressionEntry[],
  ) {
    entriesRef.current = transform(entriesRef.current);
    if (active.current) setEntries(entriesRef.current);
  }

  function makeUrl(blob: Blob) {
    const url = URL.createObjectURL(blob);
    urls.current.add(url);
    return url;
  }

  useEffect(() => {
    active.current = true;
    const allocated = urls.current;
    return () => {
      active.current = false;
      controller.current?.abort();
      for (const url of allocated) URL.revokeObjectURL(url);
      allocated.clear();
    };
  }, []);

  function addFiles(files: File[]) {
    if (locked.current) return;
    const invalid: string[] = [];
    const added: CompressionEntry[] = [];
    for (const file of files) {
      if (!supported.has(file.type) || !file.size) {
        invalid.push(file.name);
        continue;
      }
      added.push({
        id: crypto.randomUUID(),
        file,
        preview: makeUrl(file),
        status: "pending",
        progress: 0,
      });
    }
    setRejected(invalid);
    update((items) => [...items, ...added]);
  }

  function clear() {
    controller.current?.abort();
    for (const url of urls.current) URL.revokeObjectURL(url);
    urls.current.clear();
    update(() => []);
    setRejected([]);
  }

  async function compress(settings: CompressionSettings) {
    if (
      locked.current ||
      !Number.isFinite(settings.maxSizeMB) ||
      settings.maxSizeMB <= 0 ||
      !Number.isFinite(settings.maxWidthOrHeight) ||
      settings.maxWidthOrHeight < 1
    )
      return;
    const batch = [...entriesRef.current];
    if (!batch.length) return;
    locked.current = true;
    setBusy(true);
    const abort = new AbortController();
    controller.current = abort;
    for (const entry of batch) {
      if (entry.resultUrl) {
        URL.revokeObjectURL(entry.resultUrl);
        urls.current.delete(entry.resultUrl);
      }
    }
    update((items) =>
      items.map((item) => ({
        ...item,
        status: "pending",
        progress: 0,
        result: undefined,
        resultUrl: undefined,
      })),
    );
    try {
      const { default: imageCompression } =
        await import("browser-image-compression");
      for (const entry of batch) {
        if (abort.signal.aborted || !active.current) break;
        update((items) =>
          items.map((item) =>
            item.id === entry.id
              ? { ...item, status: "compressing", progress: 0 }
              : item,
          ),
        );
        try {
          const result = await imageCompression(entry.file, {
            maxSizeMB: settings.maxSizeMB,
            maxWidthOrHeight: Math.floor(settings.maxWidthOrHeight),
            useWebWorker: true,
            libURL: new URL(
              "/vendor/browser-image-compression.js",
              window.location.origin,
            ).href,
            ...(settings.format !== "original"
              ? { fileType: settings.format }
              : {}),
            signal: abort.signal,
            onProgress: (progress: number) => {
              if (abort.signal.aborted || !active.current) return;
              update((items) =>
                items.map((item) =>
                  item.id === entry.id
                    ? {
                        ...item,
                        progress: Math.min(100, Math.max(0, progress)),
                      }
                    : item,
                ),
              );
            },
          });
          if (abort.signal.aborted || !active.current) break;
          const resultUrl = makeUrl(result);
          update((items) =>
            items.map((item) =>
              item.id === entry.id
                ? { ...item, status: "done", progress: 100, result, resultUrl }
                : item,
            ),
          );
        } catch {
          if (!abort.signal.aborted)
            update((items) =>
              items.map((item) =>
                item.id === entry.id ? { ...item, status: "error" } : item,
              ),
            );
        }
      }
    } catch {
      if (!abort.signal.aborted)
        update((items) =>
          items.map((item) =>
            item.status === "done" ? item : { ...item, status: "error" },
          ),
        );
    } finally {
      if (controller.current === abort) controller.current = null;
      locked.current = false;
      if (active.current) {
        update((items) =>
          items.map((item) =>
            item.status === "compressing"
              ? { ...item, status: "pending", progress: 0 }
              : item,
          ),
        );
        setBusy(false);
      }
    }
  }

  return { entries, busy, rejected, addFiles, clear, compress };
}
