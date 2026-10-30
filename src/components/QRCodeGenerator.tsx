"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Copy, Download, LockKeyhole, Upload, X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

type Level = "L" | "M" | "Q" | "H";

class QRBoundary extends Component<
  { children: ReactNode; message: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="alert" className="p-6 text-sm text-destructive">
        {this.props.message}
      </p>
    ) : (
      this.props.children
    );
  }
}

function download(href: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
}

export function QRCodeGenerator() {
  const t = useTranslations("qrGenerator");
  const [value, setValue] = useState("https://mehdi.design");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [fgColor, setFgColor] = useState("#000000");
  const [size, setSize] = useState(256);
  const [marginSize, setMarginSize] = useState(2);
  const [level, setLevel] = useState<Level>("M");
  const [logo, setLogo] = useState<string | null>(null);
  const [logoWidth, setLogoWidth] = useState(20);
  const [logoHeight, setLogoHeight] = useState(20);
  const [excavate, setExcavate] = useState(true);
  const [loadingLogo, setLoadingLogo] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasContainer = useRef<HTMLDivElement>(null);
  const logoRevision = useRef(0);
  useEffect(
    () => () => {
      logoRevision.current += 1;
    },
    [],
  );
  const effectiveLevel = logo ? "H" : level;
  const qrProps = {
    value,
    size,
    bgColor,
    fgColor,
    marginSize,
    level: effectiveLevel as Level,
    imageSettings: logo
      ? {
          src: logo,
          width: (size * logoWidth) / 100,
          height: (size * logoHeight) / 100,
          excavate,
        }
      : undefined,
  };

  async function addLogo(file?: File) {
    if (!file) return;
    const revision = ++logoRevision.current;
    setFeedback(null);
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setLoadingLogo(false);
      setFeedback({ message: t("logoError"), error: true });
      return;
    }
    setLoadingLogo(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          typeof reader.result === "string"
            ? resolve(reader.result)
            : reject(new Error());
        reader.onerror = () => reject(new Error());
        reader.readAsDataURL(file);
      });
      const image = new Image();
      image.src = data;
      await image.decode();
      if (revision === logoRevision.current) setLogo(data);
    } catch {
      if (revision === logoRevision.current)
        setFeedback({ message: t("logoError"), error: true });
    } finally {
      if (revision === logoRevision.current) setLoadingLogo(false);
    }
  }

  async function exportQR(format: "png" | "svg" | "copy") {
    setFeedback(null);
    setExporting(true);
    try {
      if (format === "png") {
        const image = canvasContainer.current?.querySelector("img");
        if (image) await image.decode();
        // The library redraws its canvas after the embedded image has loaded.
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        if (!canvasRef.current) throw new Error();
        download(canvasRef.current.toDataURL("image/png"), "qrcode.png");
      } else {
        if (!svgRef.current) throw new Error();
        const source = new XMLSerializer().serializeToString(svgRef.current);
        if (format === "copy") {
          await navigator.clipboard.writeText(source);
          setFeedback({ message: t("copied"), error: false });
        } else {
          const url = URL.createObjectURL(
            new Blob([source], { type: "image/svg+xml;charset=utf-8" }),
          );
          download(url, "qrcode.svg");
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      }
    } catch {
      setFeedback({
        message: t(format === "copy" ? "copyError" : "exportError"),
        error: true,
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div
      className="space-y-5 ph-no-capture ph-sensitive ph-mask"
      data-clarity-mask="true"
    >
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <LockKeyhole className="size-4 shrink-0" />
        {t("privacy")}
      </p>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("settings")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion
              type="multiple"
              defaultValue={["content", "style", "logo"]}
            >
              <AccordionItem value="content">
                <AccordionTrigger>{t("content")}</AccordionTrigger>
                <AccordionContent className="space-y-2 pb-5">
                  <label htmlFor="qr-content" className="text-sm font-medium">
                    {t("contentLabel")}
                  </label>
                  <Input
                    id="qr-content"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder={t("contentPlaceholder")}
                    disabled={exporting}
                  />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="style">
                <AccordionTrigger>{t("style")}</AccordionTrigger>
                <AccordionContent className="space-y-5 pb-5">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      {
                        id: "qr-background",
                        label: t("background"),
                        value: bgColor,
                        set: setBgColor,
                      },
                      {
                        id: "qr-foreground",
                        label: t("foreground"),
                        value: fgColor,
                        set: setFgColor,
                      },
                    ].map((color) => (
                      <div key={color.id} className="space-y-2">
                        <label
                          htmlFor={color.id}
                          className="block text-sm font-medium"
                        >
                          {color.label}
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            id={color.id}
                            type="color"
                            className="w-14 cursor-pointer p-1"
                            value={color.value}
                            onChange={(event) => color.set(event.target.value)}
                            disabled={exporting}
                          />
                          <span className="font-mono text-xs uppercase">
                            {color.value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="qr-size"
                      className="flex justify-between text-sm font-medium"
                    >
                      <span>{t("size")}</span>
                      <span>{size} px</span>
                    </label>
                    <Slider
                      id="qr-size"
                      aria-label={t("size")}
                      min={128}
                      max={1024}
                      step={8}
                      value={[size]}
                      onValueChange={([next]) => setSize(next)}
                      disabled={exporting}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="qr-margin"
                      className="flex justify-between text-sm font-medium"
                    >
                      <span>{t("margin")}</span>
                      <span>{marginSize}</span>
                    </label>
                    <Slider
                      id="qr-margin"
                      aria-label={t("margin")}
                      min={0}
                      max={10}
                      step={1}
                      value={[marginSize]}
                      onValueChange={([next]) => setMarginSize(next)}
                      disabled={exporting}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="qr-level"
                      className="block text-sm font-medium"
                    >
                      {t("level")}
                    </label>
                    {logo || exporting ? (
                      <Input
                        id="qr-level"
                        value={effectiveLevel}
                        readOnly
                        disabled
                      />
                    ) : (
                      <Select
                        id="qr-level"
                        label={t("level")}
                        value={level}
                        onValueChange={(next) => setLevel(next as Level)}
                        options={["L", "M", "Q", "H"].map((entry) => ({
                          value: entry,
                          label: entry,
                        }))}
                      />
                    )}
                    {logo && (
                      <p className="text-xs text-muted-foreground">
                        {t("forcedLevel")}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("scanHint")}
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="logo">
                <AccordionTrigger>{t("logo")}</AccordionTrigger>
                <AccordionContent className="space-y-4 pb-3">
                  <label
                    htmlFor="qr-logo"
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <Upload className="size-4" />
                    {t("logoUpload")}
                  </label>
                  <Input
                    id="qr-logo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={exporting}
                    onChange={(event) => {
                      void addLogo(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("logoHint")}
                  </p>
                  {loadingLogo && (
                    <p role="status" className="text-sm text-muted-foreground">
                      {t("loadingLogo")}
                    </p>
                  )}
                  {logo && (
                    <>
                      <div className="space-y-2">
                        <label
                          htmlFor="qr-logo-width"
                          className="flex justify-between text-sm font-medium"
                        >
                          <span>{t("logoWidth")}</span>
                          <span>{logoWidth}%</span>
                        </label>
                        <Slider
                          id="qr-logo-width"
                          aria-label={t("logoWidth")}
                          min={1}
                          max={25}
                          step={1}
                          value={[logoWidth]}
                          onValueChange={([next]) => setLogoWidth(next)}
                          disabled={exporting}
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor="qr-logo-height"
                          className="flex justify-between text-sm font-medium"
                        >
                          <span>{t("logoHeight")}</span>
                          <span>{logoHeight}%</span>
                        </label>
                        <Slider
                          id="qr-logo-height"
                          aria-label={t("logoHeight")}
                          min={1}
                          max={25}
                          step={1}
                          value={[logoHeight]}
                          onValueChange={([next]) => setLogoHeight(next)}
                          disabled={exporting}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <label
                          htmlFor="qr-excavate"
                          className="text-sm font-medium"
                        >
                          {t("excavate")}
                        </label>
                        <Switch
                          id="qr-excavate"
                          checked={excavate}
                          onCheckedChange={setExcavate}
                          disabled={exporting}
                        />
                      </div>
                      <Button
                        variant="outline"
                        disabled={exporting}
                        onClick={() => {
                          logoRevision.current++;
                          setLogo(null);
                          setLoadingLogo(false);
                        }}
                      >
                        <X />
                        {t("removeLogo")}
                      </Button>
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>{t("preview")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {!value.trim() ? (
              <p
                role="status"
                className="py-16 text-center text-muted-foreground"
              >
                {t("empty")}
              </p>
            ) : (
              <QRBoundary
                key={`${value}:${effectiveLevel}`}
                message={t("tooLong")}
              >
                <div className="flex min-h-80 items-center justify-center rounded-xl border border-border bg-muted/30 p-5">
                  <QRCodeSVG
                    ref={svgRef}
                    {...qrProps}
                    title={t("preview")}
                    className="h-auto max-h-96 max-w-full"
                  />
                </div>
                <div
                  ref={canvasContainer}
                  className="hidden"
                  aria-hidden="true"
                >
                  <QRCodeCanvas ref={canvasRef} {...qrProps} />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    disabled={loadingLogo || exporting}
                    onClick={() => void exportQR("png")}
                  >
                    <Download />
                    {t("downloadPng")}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={loadingLogo || exporting}
                    onClick={() => void exportQR("svg")}
                  >
                    <Download />
                    {t("downloadSvg")}
                  </Button>
                  <Button
                    className="sm:col-span-2"
                    variant="secondary"
                    disabled={loadingLogo || exporting}
                    onClick={() => void exportQR("copy")}
                  >
                    <Copy />
                    {t("copySvg")}
                  </Button>
                </div>
              </QRBoundary>
            )}
            {feedback && (
              <p
                role={feedback.error ? "alert" : "status"}
                className={
                  feedback.error
                    ? "text-sm text-destructive"
                    : "text-sm text-muted-foreground"
                }
              >
                {feedback.message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
