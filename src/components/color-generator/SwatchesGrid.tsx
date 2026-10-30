"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, AlertCircle, Copy, Download, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Swatch } from "@/lib/color-generator";
export function SwatchesGrid({
  palette,
  name,
  onName,
  copy,
  svg,
  feedback,
  download,
}: {
  palette: Swatch[];
  name: string;
  onName: (name: string) => void;
  copy: (text: string, id: string) => Promise<void>;
  svg: string;
  feedback: Record<string, "copied" | "error">;
  download: () => void;
}) {
  const t = useTranslations("colorGenerator");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  return (
    <section className="space-y-4" aria-label={t("palette")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {editing ? (
          <Input
            autoFocus
            aria-label={t("name")}
            className="max-w-72"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (editing) {
                onName(draft.trim());
                setEditing(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setEditing(false);
              }
              if (e.key === "Enter") {
                onName(draft.trim());
                setEditing(false);
              }
            }}
          />
        ) : (
          <Button
            variant="ghost"
            className="max-w-full justify-start truncate px-0 text-lg"
            onClick={() => {
              setDraft(name);
              setEditing(true);
            }}
          >
            {name}
            <Pencil className="ms-2 size-3 text-muted-foreground" />
          </Button>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="min-w-36 max-w-full whitespace-normal"
            aria-live="polite"
            onClick={() => void copy(svg, `svg:${svg}`)}
          >
            {feedback[`svg:${svg}`] === "copied" ? (
              <Check className="size-4 text-emerald-600" aria-hidden />
            ) : feedback[`svg:${svg}`] === "error" ? (
              <AlertCircle aria-hidden />
            ) : (
              <Copy aria-hidden />
            )}
            {t(
              feedback[`svg:${svg}`] === "copied"
                ? "copied"
                : feedback[`svg:${svg}`] === "error"
                  ? "copyError"
                  : "copySvg",
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={download}>
            <Download />
            {t("downloadSvg")}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:grid-cols-10">
        {Array.from({ length: 20 }, (_, i) => {
          const s = palette[i];
          const state = s ? feedback[`swatch:${s.label}:${s.hex}`] : undefined;
          return s ? (
            <button
              key={i}
              type="button"
              style={{ backgroundColor: s.hex, color: s.text }}
              className="relative flex min-h-28 flex-col justify-between rounded-xl border border-black/5 p-3 text-start transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-live="polite"
              aria-label={`${state ? t(state === "copied" ? "copied" : "copyError") : t("copy")} ${s.label} ${s.hex}${s.isBase ? `, ${t("base")}` : ""}`}
              onClick={() => void copy(s.hex, `swatch:${s.label}:${s.hex}`)}
            >
              <span className="text-xs font-medium">{s.label}</span>
              {s.isBase && (
                <span
                  aria-hidden="true"
                  className="absolute end-3 top-3 size-2 rounded-full bg-current"
                />
              )}
              <span className="flex items-center gap-1 font-mono text-[11px] font-medium">
                {state === "copied" ? (
                  <>
                    <Check className="size-3 shrink-0" aria-hidden />
                    {t("copied")}
                  </>
                ) : state === "error" ? (
                  <AlertCircle aria-hidden className="size-4" />
                ) : (
                  <span className="uppercase">{s.hex}</span>
                )}
              </span>
            </button>
          ) : (
            <div
              key={i}
              className="flex min-h-28 items-end rounded-xl border border-border/50 bg-muted/60 p-3 text-xs text-muted-foreground"
            >
              {t("empty")}
            </div>
          );
        })}
      </div>
    </section>
  );
}
