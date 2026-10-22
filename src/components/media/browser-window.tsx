import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const CHROME = {
  light: "/img/photos/Browser-Light.svg",
  dark: "/img/photos/Browser-Dark.svg",
  width: 720,
  height: 91,
} as const;

type BrowserWindowProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Fenêtre flottante avec chrome navigateur en header et contenu variable en dessous.
 * Light / dark via deux SVG (classe `.dark` sur `<html>`).
 * Le fond du contenu suit `bg-background` (même fond que la page).
 * Hover : brillance texturée (`data-shine`) + lift / ombre, comme le bouton accent.
 */
export function BrowserWindow({ children, className }: BrowserWindowProps) {
  const imgClass =
    "pointer-events-none block w-full select-none";

  return (
    <div
      data-shine
      className={cn(
        "relative overflow-hidden rounded-[8px] bg-background shadow-[0_0_0_1px_color-mix(in_oklch,var(--foreground),transparent_88%),0_8px_24px_-6px_rgb(0_0_0_/_.35)] transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-[0_0_0_1px_color-mix(in_oklch,var(--foreground),transparent_88%),0_12px_32px_-8px_rgb(0_0_0_/_.4)]",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CHROME.light}
        alt=""
        width={CHROME.width}
        height={CHROME.height}
        className={cn(imgClass, "dark:hidden")}
        draggable={false}
        aria-hidden
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CHROME.dark}
        alt=""
        width={CHROME.width}
        height={CHROME.height}
        className={cn(imgClass, "hidden dark:block")}
        draggable={false}
        aria-hidden
      />
      <div className="relative bg-background p-6 sm:p-8">{children}</div>
    </div>
  );
}
