"use client";

import { TrackedAnchor } from "@/components/analytics/tracked-link";
import { Button } from "@/components/ui/button";
import { AnalyticsEvents } from "@/lib/analytics/events";
import { profile } from "@/data/resume";

export function ContactMailtoButton() {
  return (
    <Button asChild variant="outline" size="sm" className="mt-2 w-full">
      <TrackedAnchor
        href={`mailto:${profile.email}`}
        event={AnalyticsEvents.contact_cta}
        eventProps={{ action: "mailto" }}
      >
        Ouvrir l&apos;app mail
      </TrackedAnchor>
    </Button>
  );
}

export function ContactPhoneLink() {
  return (
    <TrackedAnchor
      href={profile.phoneHref}
      className="text-sm text-foreground underline-offset-4 hover:underline"
      event={AnalyticsEvents.contact_cta}
      eventProps={{ action: "phone" }}
    >
      {profile.phone}
    </TrackedAnchor>
  );
}

export function ContactLinkedInButton() {
  return (
    <Button asChild variant="outline" size="sm">
      <TrackedAnchor
        href={profile.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        event={AnalyticsEvents.contact_cta}
        eventProps={{ action: "linkedin" }}
      >
        Voir le profil
      </TrackedAnchor>
    </Button>
  );
}
