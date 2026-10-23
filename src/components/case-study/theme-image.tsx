"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { BrowserWindow } from "@/components/media/browser-window";
import { LightboxTrigger } from "@/components/case-study/image-lightbox";
import { Button } from "@/components/ui/button";
import type { CaseStudyImage } from "@/lib/content";
import { cn } from "@/lib/utils";

type ThemeImageProps = {
  image: CaseStudyImage;
  className?: string;
  priority?: boolean;
  /** Force un ratio identique (object-cover). Ex. "aspect-[4/3]". */
  aspectClassName?: string;
  /**
   * Ancrage du crop. `bottom` = coupe le haut (garde le bas).
   * Par défaut : centre.
   */
  objectPosition?: "center" | "top" | "bottom";
};

const objectPositionClass = {
  center: "object-center",
  top: "object-top",
  bottom: "object-bottom",
} as const;

export function ThemeImage({
  image,
  className,
  priority,
  aspectClassName,
  objectPosition = "center",
}: ThemeImageProps) {
  if (image.placeholder || !image.src) {
    return (
      <figure className="space-y-2">
        <div
          className={cn(
            "flex w-full items-center justify-center rounded-lg bg-muted/50 ring-1 ring-dashed ring-foreground/15",
            aspectClassName ?? "aspect-[16/10]",
            className
          )}
          role="img"
          aria-label={image.alt}
        >
          <span className="px-4 text-center text-sm text-muted-foreground">
            {image.caption ?? image.alt}
          </span>
        </div>
      </figure>
    );
  }

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.src}
      alt={image.alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn(
        aspectClassName
          ? cn("size-full object-cover", objectPositionClass[objectPosition])
          : "block w-full",
        !image.browser && !aspectClassName && "rounded-lg ring-1 ring-foreground/5",
        className
      )}
    />
  );

  const media = aspectClassName ? (
    <div
      className={cn(
        "w-full overflow-hidden rounded-lg ring-1 ring-foreground/5",
        aspectClassName
      )}
    >
      {img}
    </div>
  ) : image.browser ? (
    <BrowserWindow className="w-full overflow-hidden">{img}</BrowserWindow>
  ) : (
    img
  );

  return (
    <figure className="h-full space-y-2">
      <LightboxTrigger src={image.src} alt={image.alt}>
        {media}
      </LightboxTrigger>
      {image.caption ? (
        <figcaption className="text-center text-xs text-muted-foreground">
          {image.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

type ThemePairProps = {
  light: CaseStudyImage;
  dark: CaseStudyImage;
  browser?: boolean;
  priority?: boolean;
  className?: string;
  labels?: { light: string; dark: string };
};

/** Paire light/dark avec toggle local en haut à droite. */
export function ThemePairImage({
  light,
  dark,
  browser,
  priority,
  className,
  labels = { light: "Mode clair", dark: "Mode sombre" },
}: ThemePairProps) {
  const { resolvedTheme } = useTheme();
  const [mode, setMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (!resolvedTheme) return;
    setMode(resolvedTheme === "dark" ? "dark" : "light");
  }, [resolvedTheme]);

  const active = mode === "light" ? light : dark;
  const useBrowser = browser ?? Boolean(active.browser);
  const src = active.src;

  if (!src) return null;

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={active.alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn(
        "block w-full rounded-lg",
        useBrowser ? "rounded-none" : "ring-1 ring-foreground/5"
      )}
    />
  );

  const framed = useBrowser ? (
    <BrowserWindow className="w-full overflow-hidden">{img}</BrowserWindow>
  ) : (
    img
  );

  return (
    <figure className={cn("relative space-y-2", className)}>
      <div className="relative">
        <LightboxTrigger src={src} alt={active.alt}>
          {framed}
        </LightboxTrigger>
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          className="absolute top-2 end-2 z-10 shadow-sm ring-1 ring-foreground/10"
          aria-label={mode === "light" ? labels.dark : labels.light}
          onClick={(e) => {
            e.stopPropagation();
            setMode((m) => (m === "light" ? "dark" : "light"));
          }}
        >
          {mode === "light" ? (
            <Moon className="size-3.5" aria-hidden />
          ) : (
            <Sun className="size-3.5" aria-hidden />
          )}
        </Button>
      </div>
      {active.caption ? (
        <figcaption className="text-center text-xs text-muted-foreground">
          {active.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** Groupe une liste d’images : paires light/dark → ThemePairImage, sinon ThemeImage. */
export function ThemeImageGroup({
  images,
  className,
  priority,
  pairLabels,
}: {
  images: CaseStudyImage[];
  className?: string;
  priority?: boolean;
  pairLabels?: { light: string; dark: string };
}) {
  const items: ReactNode[] = [];
  let i = 0;
  let pairIndex = 0;

  while (i < images.length) {
    const current = images[i]!;
    const next = images[i + 1];
    const isPair = current.theme === "light" && next?.theme === "dark";

    if (isPair && next) {
      items.push(
        <ThemePairImage
          key={`${current.src}-${next.src}`}
          light={current}
          dark={next}
          browser={current.browser || next.browser}
          priority={priority && pairIndex === 0}
          labels={pairLabels}
        />
      );
      pairIndex += 1;
      i += 2;
    } else {
      items.push(
        <ThemeImage
          key={`${current.src ?? "ph"}-${current.theme ?? "any"}-${i}`}
          image={current}
          priority={priority && items.length === 0}
        />
      );
      i += 1;
    }
  }

  return <div className={cn("space-y-4", className)}>{items}</div>;
}
