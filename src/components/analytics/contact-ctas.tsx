"use client";

import { useTranslations } from "next-intl";
import { TrackedAnchor } from "@/components/analytics/tracked-link";
import { Button } from "@/components/ui/button";
import { AnalyticsEvents } from "@/lib/analytics/events";
import { profileMeta } from "@/data/profile-meta";

export function ContactMailtoButton() {
  const t = useTranslations("contact");

  return (
    <Button asChild variant="outline" size="sm" className="mt-2 w-full">
      <TrackedAnchor
        href={`mailto:${profileMeta.email}`}
        event={AnalyticsEvents.contact_cta}
        eventProps={{ action: "mailto" }}
      >
        {t("openMail")}
      </TrackedAnchor>
    </Button>
  );
}

export function ContactPhoneLink() {
  return (
    <TrackedAnchor
      href={profileMeta.phoneHref}
      className="text-sm text-foreground underline-offset-4 hover:underline"
      event={AnalyticsEvents.contact_cta}
      eventProps={{ action: "phone" }}
    >
      {profileMeta.phone}
    </TrackedAnchor>
  );
}

export function ContactLinkedInButton() {
  const t = useTranslations("contact");

  return (
    <Button asChild variant="outline" size="sm">
      <TrackedAnchor
        href={profileMeta.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        event={AnalyticsEvents.contact_cta}
        eventProps={{ action: "linkedin" }}
      >
        {t("viewProfile")}
      </TrackedAnchor>
    </Button>
  );
}

export function ContactFiverrButton() {
  const t = useTranslations("contact");

  return (
    <Button asChild variant="outline" size="sm">
      <TrackedAnchor
        href={profileMeta.fiverr}
        target="_blank"
        rel="noopener noreferrer"
        event={AnalyticsEvents.contact_cta}
        eventProps={{ action: "fiverr" }}
      >
        {t("viewProfile")}
      </TrackedAnchor>
    </Button>
  );
}

export function ContactMaltButton() {
  const t = useTranslations("contact");

  return (
    <Button asChild variant="outline" size="sm">
      <TrackedAnchor
        href={profileMeta.malt}
        target="_blank"
        rel="noopener noreferrer"
        event={AnalyticsEvents.contact_cta}
        eventProps={{ action: "malt" }}
      >
        {t("viewProfile")}
      </TrackedAnchor>
    </Button>
  );
}
