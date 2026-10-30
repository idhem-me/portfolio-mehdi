"use client";
import { useTranslations } from "next-intl";
import { Check, Copy, AlertCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type { ColorSpace, ExportFormat } from "@/lib/color-generator";
export function CodeExport({
  code,
  format,
  space,
  onFormat,
  onSpace,
  copy,
  feedback,
}: {
  code: string;
  format: ExportFormat;
  space: ColorSpace;
  onFormat: (format: ExportFormat) => void;
  onSpace: (space: ColorSpace) => void;
  copy: () => void;
  feedback?: "copied" | "error";
}) {
  const t = useTranslations("colorGenerator");
  return (
    <section aria-label={t("export")} className="pt-5">
      <Tabs value={format} onValueChange={(v) => onFormat(v as ExportFormat)}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TabsList variant="line" aria-label={t("format")}>
            {(["CSS", "Tailwind", "Tailwind 4", "Tokens"] as const).map((v) => (
              <TabsTrigger key={v} value={v}>
                {v}
              </TabsTrigger>
            ))}
          </TabsList>
          <div role="group" aria-label={t("space")} className="flex gap-1">
            {(["HEX", "RGBA", "HSL", "OKLCH"] as const).map((v) => (
              <Button
                key={v}
                size="sm"
                variant={space === v ? "secondary" : "ghost"}
                aria-pressed={space === v}
                onClick={() => onSpace(v)}
              >
                {v}
              </Button>
            ))}
          </div>
        </div>
        {(["CSS", "Tailwind", "Tailwind 4", "Tokens"] as const).map((v) => (
          <TabsContent key={v} value={v}>
            <div className="relative mt-3 overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="font-mono text-xs text-muted-foreground">
                  {format} / {space}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copy}
                  aria-live="polite"
                  className="min-w-24 max-w-full whitespace-normal"
                >
                  {feedback === "copied" ? (
                    <Check className="size-4 text-emerald-600" aria-hidden />
                  ) : feedback === "error" ? (
                    <AlertCircle aria-hidden />
                  ) : (
                    <Copy aria-hidden />
                  )}
                  {t(
                    feedback === "copied"
                      ? "copied"
                      : feedback === "error"
                        ? "copyError"
                        : "copy",
                  )}
                </Button>
              </div>
              <pre
                dir="ltr"
                tabIndex={0}
                className="max-h-[32rem] overflow-auto p-5 text-xs leading-7 text-foreground sm:text-sm"
              >
                <code>{code}</code>
              </pre>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
