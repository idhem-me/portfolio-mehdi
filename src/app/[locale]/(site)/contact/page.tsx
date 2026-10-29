import type { Metadata } from "next";
import { Mail, MessageCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ContactFiverrButton,
  ContactLinkedInButton,
  ContactMailtoButton,
  ContactMaltButton,
  ContactPhoneLink,
} from "@/components/analytics/contact-ctas";
import { GazeAvatar } from "@/components/creative/gaze-avatar";
import { CopyEmailButton } from "@/components/layout/copy-email-button";
import { BrowserWindow } from "@/components/media/browser-window";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { profileMeta } from "@/data/profile-meta";
import { getContactPage } from "@/lib/content";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const contact = getContactPage(locale);

  return {
    title: t("contact"),
    description: contact.intro,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [
          l,
          l === routing.defaultLocale ? "/contact" : `/${l}/contact`,
        ])
      ),
    },
  };
}

function PlatformLogo({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={16}
      height={16}
      className="size-4 opacity-80 dark:invert"
      aria-hidden
    />
  );
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const tNav = await getTranslations("nav");
  const contact = getContactPage(locale);
  const photoAlt = tNav("photoAlt", { name: profileMeta.name });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <GazeAvatar />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {contact.title}
          </h1>
          <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
            {contact.intro}
          </p>
        </div>
      </header>

      <Separator className="my-10" />

      <section className="space-y-6">
        <BrowserWindow>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="h-full min-h-[120px] flex-row items-center gap-4 p-3 sm:gap-5 sm:p-4">
              <div className="relative w-14 shrink-0 self-stretch overflow-hidden rounded-lg ring-1 ring-foreground/5 sm:w-16">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/img/photos/moi/mehdi-light.png?v=20261023-2"
                  alt={photoAlt}
                  width={64}
                  height={96}
                  className="absolute inset-0 size-full object-cover object-top dark:hidden"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/img/photos/moi/mehdi-dark.png?v=20261023-2"
                  alt={photoAlt}
                  width={64}
                  height={96}
                  className="absolute inset-0 hidden size-full object-cover object-top dark:block"
                />
              </div>
              <CardHeader className="min-w-0 flex-1 gap-0.5 p-0">
                <CardTitle className="truncate tracking-tight">Mehdi</CardTitle>
                <CardDescription className="truncate">
                  Monteyremard
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/5">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Mail className="size-4 text-muted-foreground" aria-hidden />
                {t("email")}
              </p>
              <CopyEmailButton />
              <ContactMailtoButton />
            </div>

            <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/5">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <MessageCircle
                  className="size-4 text-muted-foreground"
                  aria-hidden
                />
                {t("message")}
              </p>
              <ContactPhoneLink />
            </div>

            <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/5">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <PlatformLogo src="/img/logos/linkedin.svg" />
                LinkedIn
              </p>
              <ContactLinkedInButton />
            </div>

            <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/5">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <PlatformLogo src="/img/logos/fiverr.svg" />
                Fiverr
              </p>
              <ContactFiverrButton />
            </div>

            <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/5">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <PlatformLogo src="/img/logos/malt.svg" />
                Malt
              </p>
              <ContactMaltButton />
            </div>
          </div>
        </BrowserWindow>
      </section>
    </main>
  );
}
