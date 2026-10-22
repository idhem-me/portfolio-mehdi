"use client";

import { ArrowRight } from "lucide-react";
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

export function HomeCtas() {
  const t = useTranslations("home");

  return (
    <div className="flex flex-col items-start gap-5">
      <div className="flex flex-col items-start gap-2">
        <span
          data-physics-item
          data-physics-button
          className="inline-flex rounded-lg"
        >
          <Button asChild variant="default">
            <TrackedLink
              href="/product-designer"
              event={AnalyticsEvents.home_cta}
              eventProps={{ href: "/product-designer", label: "parcours" }}
            >
              {t("ctaPath")}
              <ArrowRight data-icon="inline-end" />
            </TrackedLink>
          </Button>
        </span>
        <span
          data-physics-item
          data-physics-button
          className="inline-flex rounded-lg"
        >
          <Button asChild variant="secondary">
            <TrackedLink
              href="/contact"
              event={AnalyticsEvents.home_cta}
              eventProps={{ href: "/contact", label: "contact" }}
            >
              {t("ctaContact")}
            </TrackedLink>
          </Button>
        </span>
      </div>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
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
      </p>
    </div>
  );
}
