"use client";

import type { SVGProps } from "react";
import { useTranslations } from "next-intl";
import { TrackedAnchor } from "@/components/analytics/tracked-link";
import { setAvatarWink } from "@/components/creative/gaze-avatar";
import { Button } from "@/components/ui/button";
import { AnalyticsEvents, track } from "@/lib/analytics/events";
import { profileMeta } from "@/data/profile-meta";

const winkOn = {
  onMouseEnter: () => setAvatarWink("AD-clin"),
  onMouseLeave: () => setAvatarWink(null),
} as const;

export function ContactMailtoButton() {
  const t = useTranslations("contact");

  return (
    <Button asChild variant="outline" size="sm" className="mt-2 w-full">
      <TrackedAnchor
        href={`mailto:${profileMeta.email}`}
        event={AnalyticsEvents.contact_cta}
        eventProps={{ action: "mailto" }}
        {...winkOn}
      >
        {t("openMail")}
      </TrackedAnchor>
    </Button>
  );
}

function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function IMessageIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2C6.477 2 2 5.91 2 10.714c0 2.777 1.53 5.24 3.905 6.84-.16.9-.58 2.45-.66 2.84-.1.48.18.47.38.34.16-.1 2.54-1.73 3.3-2.25.98.26 2.02.4 3.075.4 5.523 0 10-3.91 10-8.714C22 5.91 17.523 2 12 2z" />
    </svg>
  );
}

const messageApps = [
  {
    id: "whatsapp",
    href: profileMeta.whatsappHref,
    label: "WhatsApp",
    Icon: WhatsAppIcon,
    external: true,
  },
  {
    id: "imessage",
    href: profileMeta.smsHref,
    label: "iMessage",
    Icon: IMessageIcon,
    external: false,
  },
] as const;

export function ContactPhoneLink() {
  return (
    <div className="space-y-3">
      <p className="text-sm tabular-nums text-muted-foreground">
        {profileMeta.phone}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {messageApps.map(({ id, href, label, Icon, external }) => (
          <Button
            key={id}
            asChild
            variant="outline"
            size="sm"
            className="justify-start gap-2 font-normal"
          >
            <a
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              onClick={() => {
                track(AnalyticsEvents.contact_cta, {
                  action: "message",
                  app: id,
                });
              }}
              {...winkOn}
            >
              <Icon className="size-3.5 shrink-0 opacity-80" />
              <span className="truncate">{label}</span>
            </a>
          </Button>
        ))}
      </div>
    </div>
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
        {...winkOn}
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
        {...winkOn}
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
        {...winkOn}
      >
        {t("viewProfile")}
      </TrackedAnchor>
    </Button>
  );
}
