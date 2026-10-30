"use client";
import { ColorPicker } from "./ColorPicker";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Minus, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select } from "@/components/ui/select";
import {
  algorithms,
  channels,
  fromChannels,
  normalizeHex,
  type Settings,
  type InputFormat,
} from "@/lib/color-generator";
function ChannelInput({
  value,
  onValue,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: number;
  onValue: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      {...props}
      value={draft ?? Number(value.toFixed(Number(props.step) < 0.01 ? 4 : 2))}
      onChange={(e) => {
        setDraft(e.target.value);
        if (e.target.value.trim() && Number.isFinite(e.target.valueAsNumber))
          onValue(e.target.valueAsNumber);
      }}
      onBlur={() => setDraft(null)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}
export function ControlPanel({
  settings,
  mode,
  onChange,
  onMode,
}: {
  settings: Settings;
  mode: InputFormat;
  onChange: (patch: Partial<Settings>) => void;
  onMode: (mode: InputFormat) => void;
}) {
  const t = useTranslations("colorGenerator");
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const channelMode = mode === "HEX" ? "RGB" : mode;
  const values = channels(settings.hex, channelMode);
  const labels =
    mode === "RGB"
      ? ["R", "G", "B"]
      : mode === "HSL"
        ? ["H", "S", "L"]
        : ["L", "C", "H"];
  const maxes =
    mode === "RGB"
      ? [255, 255, 255]
      : mode === "HSL"
        ? [360, 100, 100]
        : [100, 0.4, 360];
  const steps =
    mode === "RGB"
      ? [1, 1, 1]
      : mode === "HSL"
        ? [0.1, 0.1, 0.1]
        : [0.5, 0.005, 1];
  function updateHex(value: string) {
    setDraft(value);
    setInvalid(false);
    const hex = normalizeHex(value);
    if (hex) onChange({ hex });
  }
  function validate() {
    const hex = normalizeHex(draft ?? settings.hex);
    setInvalid(!hex);
    if (hex) {
      onChange({ hex });
      setDraft(null);
    }
  }
  function updateChannel(index: number, value: number) {
    if (!Number.isFinite(value)) return;
    const next = [...values];
    next[index] = value;
    onChange({ hex: fromChannels(next, channelMode) });
    setDraft(null);
    setInvalid(false);
  }
  return (
    <Card className="grid gap-7 p-5 lg:grid-cols-3 lg:gap-8 lg:p-6">
      <section className="space-y-4" aria-label={t("base")}>
        <div className="flex items-center gap-2">
          <ColorPicker
            color={settings.hex}
            onChange={(hex) => {
              onChange({ hex });
              setDraft(null);
              setInvalid(false);
            }}
          />
          <Input
            aria-label={t("hex")}
            dir="ltr"
            value={draft ?? settings.hex.toUpperCase()}
            aria-invalid={invalid}
            aria-describedby={invalid ? "hex-error" : undefined}
            onChange={(e) => updateHex(e.target.value)}
            onBlur={validate}
            onKeyDown={(e) => {
              if (e.key === "Enter") validate();
            }}
          />
          <div className="w-28 shrink-0">
            <Select
              label={t("inputMode")}
              value={mode}
              onValueChange={(v) => onMode(v as InputFormat)}
              options={["HEX", "RGB", "HSL", "OKLCH"].map((v) => ({
                value: v,
                label: v,
              }))}
            />
          </div>
        </div>
        {invalid && (
          <p id="hex-error" className="text-sm text-destructive" role="alert">
            {t("invalidHex")}
          </p>
        )}
        {(mode === "HEX" ? [] : labels).map((label, i) => (
          <div
            key={`${mode}-${i}`}
            className="flex items-center gap-3"
            dir="ltr"
          >
            <label
              htmlFor={`channel-${i}`}
              className="w-3 text-xs text-muted-foreground"
            >
              {label}
            </label>
            <ChannelInput
              id={`channel-${i}`}
              aria-label={`${mode} ${label}`}
              type="number"
              min={0}
              max={maxes[i]}
              step={steps[i]}
              value={values[i]}
              className="w-24 shrink-0 tabular-nums"
              onValue={(value) => updateChannel(i, value)}
            />
            <Slider
              aria-label={`${mode} ${label}`}
              min={0}
              max={maxes[i]}
              step={steps[i]}
              value={[values[i]]}
              onValueChange={(v) => updateChannel(i, v[0])}
              style={{
                background: `linear-gradient(to right, ${Array.from(
                  { length: 13 },
                  (_, n) => {
                    const next = [...values];
                    next[i] = (maxes[i] * n) / 12;
                    return fromChannels(next, channelMode);
                  },
                ).join(", ")})`,
              }}
            />
          </div>
        ))}
      </section>
      <section className="space-y-6 lg:border-s lg:border-border lg:ps-8">
        <div className="space-y-2">
          <label
            htmlFor="algorithm"
            className="text-xs font-medium text-muted-foreground"
          >
            {t("algorithm")}
          </label>
          <Select
            id="algorithm"
            label={t("algorithm")}
            value={settings.algorithm}
            onValueChange={(v) =>
              onChange({ algorithm: v as Settings["algorithm"] })
            }
            options={algorithms.map((v) => ({ value: v, label: v }))}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {t("contrast")}
            </span>
            <output className="font-mono text-sm tabular-nums">
              {settings.contrast.toFixed(2)}
            </output>
          </div>
          <Slider
            aria-label={t("contrast")}
            min={-1}
            max={1}
            step={0.01}
            value={[settings.contrast]}
            onValueChange={(v) => onChange({ contrast: v[0] })}
          />
        </div>
      </section>
      <section className="space-y-6 lg:border-s lg:border-border lg:ps-8">
        <div className="space-y-2">
          <label
            htmlFor="naming"
            className="text-xs font-medium text-muted-foreground"
          >
            {t("naming")}
          </label>
          <Select
            id="naming"
            label={t("naming")}
            value={settings.naming}
            onValueChange={(v) => onChange({ naming: v as Settings["naming"] })}
            options={[
              { value: "tailwind", label: "50, 100…900, 950" },
              { value: "sequential", label: "1, 2, 3…20" },
              { value: "tens", label: "10, 20, 30…200" },
            ]}
          />
        </div>
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            {t("count")}
          </p>
          <div className="flex items-center gap-5">
            <Button
              variant="outline"
              size="icon"
              aria-label={t("less")}
              disabled={settings.count <= 3}
              onClick={() => onChange({ count: settings.count - 1 })}
            >
              <Minus />
            </Button>
            <output
              className="min-w-6 text-center text-xl tabular-nums"
              aria-live="polite"
            >
              {settings.count}
            </output>
            <Button
              variant="outline"
              size="icon"
              aria-label={t("more")}
              disabled={settings.count >= 20}
              onClick={() => onChange({ count: settings.count + 1 })}
            >
              <Plus />
            </Button>
          </div>
        </div>
      </section>
    </Card>
  );
}
