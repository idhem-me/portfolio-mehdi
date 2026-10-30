"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, FileText, LoaderCircle, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { inspectPdf, mergePdfs, PdfInputError } from "./engine";

type Entry = { id: string; file: File; pages: number };

export function PdfMerger() {
  const t = useTranslations("tools");
  const locale = useLocale();
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const urls = useRef(new Set<string>());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "reading" | "merging" | "success">("idle");
  const [dragging, setDragging] = useState(false);
  const busy = status === "reading" || status === "merging";
  const totalPages = entries.reduce((total, entry) => total + entry.pages, 0);

  useEffect(() => {
    const activeUrls = urls.current;
    return () => { for (const url of activeUrls) URL.revokeObjectURL(url); };
  }, []);

  async function addFiles(files: File[]) {
    if (lock.current || !files.length) return;
    lock.current = true;
    setStatus("reading");
    setErrors([]);
    const added: Entry[] = [];
    const rejected: string[] = [];
    try {
      for (const file of files) {
        try {
          const pages = await inspectPdf(await file.arrayBuffer());
          added.push({ id: crypto.randomUUID(), file, pages });
        } catch (error) {
          rejected.push(`${file.name} — ${t(error instanceof PdfInputError ? error.code : "readFailed")}`);
        }
      }
      setEntries(current => [...current, ...added]);
      setErrors(rejected);
    } finally {
      lock.current = false;
      setStatus("idle");
    }
  }

  function move(index: number, offset: number) {
    setStatus("idle");
    setEntries(current => {
      const next = [...current];
      const target = index + offset;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function download() {
    if (lock.current || entries.length < 2) return;
    lock.current = true;
    setStatus("merging");
    setErrors([]);
    // Paint the busy state before PDF processing begins.
    await new Promise(resolve => setTimeout(resolve, 0));
    try {
      const bytes = await mergePdfs(entries.map(entry => entry.file));
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
      urls.current.add(url);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "documents-fusionnes.pdf";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => { URL.revokeObjectURL(url); urls.current.delete(url); }, 60_000);
      setStatus("success");
    } catch {
      setErrors([t("failed")]);
      setStatus("idle");
    } finally {
      lock.current = false;
    }
  }

  return (
    <section className="space-y-6 ph-no-capture ph-sensitive ph-mask" data-clarity-mask="true" aria-label={t("mergeTitle")} aria-busy={busy}>
      <div
        className={cn("space-y-4 rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-center transition-colors", dragging && !busy && "border-accent bg-accent/5")}
        onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
        onDrop={event => { event.preventDefault(); setDragging(false); void addFiles(Array.from(event.dataTransfer.files)); }}
      >
        <Upload aria-hidden="true" className="mx-auto size-7 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("drop")}</p>
        <input ref={input} type="file" multiple accept=".pdf,application/pdf" className="hidden" aria-label={t("add")} disabled={busy}
          onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void addFiles(files); }} />
        <Button variant="outline" disabled={busy} onClick={() => input.current?.click()}><Plus aria-hidden="true" />{t("add")}</Button>
      </div>
      {errors.length > 0 && <div role="alert" className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{errors.map((error, index) => <p key={index} className="break-words [overflow-wrap:anywhere]">{error}</p>)}</div>}
      {entries.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("summary", { count: entries.length, pages: totalPages })}</p>
          <ol aria-label={t("list")} className="divide-y divide-border rounded-xl border border-border bg-card">
            {entries.map((entry, index) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-3 p-4">
                <FileText aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1 basis-32">
                  <p className="break-words text-sm font-medium [overflow-wrap:anywhere]"><bdi>{entry.file.name}</bdi></p>
                  <p className="text-xs text-muted-foreground">{t("pages", { count: entry.pages })} · {new Intl.NumberFormat(locale, { style: "unit", unit: entry.file.size >= 1048576 ? "megabyte" : "kilobyte", maximumFractionDigits: 1 }).format(entry.file.size / (entry.file.size >= 1048576 ? 1048576 : 1024))}</p>
                </div>
                <div className="ms-auto flex items-center gap-1">
                  <Button variant="ghost" size="icon" disabled={busy || index === 0} aria-label={t("up", { name: entry.file.name })} onClick={() => move(index, -1)}><ArrowUp aria-hidden="true" /></Button>
                  <Button variant="ghost" size="icon" disabled={busy || index === entries.length - 1} aria-label={t("down", { name: entry.file.name })} onClick={() => move(index, 1)}><ArrowDown aria-hidden="true" /></Button>
                  <Button variant="ghost" size="icon" disabled={busy} aria-label={t("remove", { name: entry.file.name })} onClick={() => { setEntries(current => current.filter(item => item.id !== entry.id)); setStatus("idle"); }}><Trash2 aria-hidden="true" /></Button>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
      <p role="status" aria-live="polite" className={cn("text-sm", status === "success" ? "text-success" : "text-muted-foreground")}>
        {busy ? <span className="inline-flex items-center gap-2"><LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />{t(status === "reading" ? "reading" : "merging")}</span> : status === "success" ? t("success") : entries.length < 2 ? t("needTwo") : t("summary", { count: entries.length, pages: totalPages })}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="accent" disabled={busy || entries.length < 2} onClick={() => void download()}>{t("merge")}</Button>
        {entries.length > 0 && <Button variant="ghost" disabled={busy} onClick={() => { setEntries([]); setErrors([]); setStatus("idle"); }}>{t("clear")}</Button>}
      </div>
    </section>
  );
}
