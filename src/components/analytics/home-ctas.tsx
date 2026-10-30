"use client";

import { useTranslations } from "next-intl";
import {
  TrackedAnchor,
  TrackedLink,
} from "@/components/analytics/tracked-link";
import { Button } from "@/components/ui/button";
import { AnalyticsEvents } from "@/lib/analytics/events";
import { profileMeta } from "@/data/profile-meta";

function PlatformLink({
  href,
  label,
  logoSrc,
}: {
  href: string;
  label: string;
  logoSrc: string;
}) {
  return (
    <TrackedAnchor
      data-physics-item
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      event={AnalyticsEvents.home_cta}
      eventProps={{ href, label: label.toLowerCase() }}
      className="inline-flex items-center gap-1.5 rounded-lg text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc}
        alt=""
        width={16}
        height={16}
        className="size-4 opacity-80 dark:invert"
        aria-hidden
      />
      {label}
    </TrackedAnchor>
  );
}

export function HomeStatus() {
  const t = useTranslations("home");

  return (
    <p className="home-paper-status flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
      <span data-physics-item className="inline-block rounded-lg">
        {t("freelanceOn")}
      </span>
      <PlatformLink
        href={profileMeta.malt}
        label="Malt"
        logoSrc="/img/logos/malt.svg"
      />
      <PlatformLink
        href={profileMeta.fiverr}
        label="Fiverr"
        logoSrc="/img/logos/fiverr.svg"
      />
      <span data-physics-item className="inline-block rounded-lg" aria-hidden>
        ·
      </span>
      <span
        data-physics-item
        className="inline-flex items-center gap-1.5 rounded-lg"
      >
        {t("productDesignerAtWorldline")}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/logos/worldline-logo-icon.svg"
          alt=""
          width={24}
          height={12}
          className="h-3 w-auto opacity-80 dark:invert"
          aria-hidden
        />
      </span>
    </p>
  );
}

export function HomeCtas() {
  const t = useTranslations("nav");
  const tHome = useTranslations("home");

  return (
    <div className="home-paper-ctas flex flex-wrap items-start gap-2">
      <span
        data-physics-item
        data-physics-button
        className="inline-flex max-w-full rounded-lg"
      >
        <Button
          asChild
          variant="default"
          className="h-auto! min-h-(--control-height) max-w-full whitespace-normal! text-start"
        >
          <TrackedLink
            href="/realisations"
            event={AnalyticsEvents.home_cta}
            eventProps={{ href: "/realisations", label: "realisations" }}
          >
            <span>{t("realisations")}</span>
          </TrackedLink>
        </Button>
      </span>
      <span
        data-physics-item
        data-physics-button
        className="inline-flex max-w-full rounded-lg"
      >
        <Button
          asChild
          variant="secondary"
          className="h-auto! min-h-(--control-height) max-w-full whitespace-normal! text-start"
        >
          <TrackedLink
            href="/outils"
            event={AnalyticsEvents.home_cta}
            eventProps={{ href: "/outils", label: "outils" }}
          >
            <span>{t("tools")}</span>
          </TrackedLink>
        </Button>
      </span>
      <span
        data-physics-item
        data-physics-button
        className="inline-flex max-w-full rounded-lg"
      >
        <Button
          asChild
          variant="secondary"
          className="h-auto! min-h-(--control-height) max-w-full whitespace-normal! text-start"
        >
          <TrackedLink
            href="/jeux"
            event={AnalyticsEvents.home_cta}
            eventProps={{ href: "/jeux", label: "jeux" }}
          >
            <span>{tHome("ctaPlay")}</span>
          </TrackedLink>
        </Button>
      </span>
    </div>
  );
}
