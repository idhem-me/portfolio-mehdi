"use client";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { converter } from "culori";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import {
  colorName,
  toHex,
  exportCode,
  generatePalette,
  generateSvg,
  slugify,
  type Settings,
  type InputFormat,
  type ExportFormat,
  type ColorSpace,
} from "@/lib/color-generator";
import { ControlPanel } from "./ControlPanel";
import { SwatchesGrid } from "./SwatchesGrid";
import { CodeExport } from "./CodeExport";
const initial: Settings = {
  hex: "#8f6dea",
  algorithm: "Tailwind CSS",
  contrast: 0,
  count: 11,
  naming: "tailwind",
};
export function ColorGenerator() {
  const t = useTranslations("colorGenerator");
  const [settings, update] = useReducer(
    (s: Settings, patch: Partial<Settings>) => ({ ...s, ...patch }),
    initial,
  );
  const [presetRevision, setPresetRevision] = useState(0);
  const [mode, setMode] = useState<InputFormat>("HEX");
  const [format, setFormat] = useState<ExportFormat>("CSS");
  const [space, setSpace] = useState<ColorSpace>("HEX");
  const [customName, setCustomName] = useState("Violet");
  const [feedback, setFeedback] = useState<Record<string, "copied" | "error">>(
    {},
  );
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
    };
  }, []);
  const palette = useMemo(() => generatePalette(settings), [settings]);
  const automaticName = useMemo(() => colorName(settings.hex), [settings.hex]);
  const name = customName || automaticName;
  const code = exportCode(palette, name, format, space);
  const svg = generateSvg(palette, name);
  async function copy(value: string, id: string) {
    let result: "copied" | "error";
    try {
      await navigator.clipboard.writeText(value);
      result = "copied";
    } catch {
      result = "error";
    }
    clearTimeout(timers.current.get(id));
    setFeedback((previous) => ({ ...previous, [id]: result }));
    timers.current.set(
      id,
      setTimeout(
        () => {
          setFeedback((previous) => {
            const next = { ...previous };
            delete next[id];
            return next;
          });
          timers.current.delete(id);
        },
        result === "copied" ? 2000 : 5000,
      ),
    );
  }
  function download() {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(name)}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="space-y-12">
      <section aria-labelledby="generate-palette" className="space-y-5">
        <h2
          id="generate-palette"
          className="text-xl font-semibold tracking-tight"
        >
          {t("generateSection")}
        </h2>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("presetsIntro")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(
              [
                ["violet", initial.hex],
                ["gray", "--muted-foreground"],
                ["warning", "--warning"],
                ["success", "--success"],
                ["danger", "--destructive"],
              ] as const
            ).map(([preset, token]) => (
              <Button
                key={preset}
                variant="outline"
                className="h-auto justify-start gap-3 whitespace-normal px-4 py-3 text-start"
                onClick={(event) => {
                  const value = token.startsWith("--")
                    ? getComputedStyle(event.currentTarget)
                        .getPropertyValue(token)
                        .trim()
                    : token;
                  const color = converter("oklch")(value);
                  if (!color) return;
                  update({
                    hex: toHex(color),
                    algorithm: "Tailwind CSS",
                    contrast: 0,
                    count: 11,
                    naming: "tailwind",
                  });
                  setCustomName(t(`presetNames.${preset}`));
                  setPresetRevision((revision) => revision + 1);
                }}
              >
                <span
                  aria-hidden="true"
                  className="size-5 shrink-0 rounded-full border border-foreground/10"
                  style={{
                    backgroundColor: token.startsWith("--")
                      ? `var(${token})`
                      : token,
                  }}
                />
                {t(`presetNames.${preset}`)}
              </Button>
            ))}
          </div>
        </div>
        <ControlPanel
          key={presetRevision}
          settings={settings}
          mode={mode}
          onChange={update}
          onMode={setMode}
        />
      </section>
      <section aria-labelledby="preview-palette" className="space-y-5">
        <h2
          id="preview-palette"
          className="text-xl font-semibold tracking-tight"
        >
          {t("previewSection")}
        </h2>
        <SwatchesGrid
          palette={palette}
          name={name}
          onName={setCustomName}
          copy={copy}
          svg={svg}
          feedback={feedback}
          download={download}
        />
      </section>
      <section aria-labelledby="export-palette" className="space-y-5">
        <h2
          id="export-palette"
          className="text-xl font-semibold tracking-tight"
        >
          {t("codeSection")}
        </h2>
        <CodeExport
          code={code}
          format={format}
          space={space}
          onFormat={setFormat}
          onSpace={setSpace}
          copy={() => void copy(code, `code:${code}`)}
          feedback={feedback[`code:${code}`]}
        />
      </section>
    </div>
  );
}
