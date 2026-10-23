import type { Metadata, Viewport } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { isVillageEnabled } from "@/game/flags";
import { routing } from "@/i18n/routing";
import { VillageClient } from "./VillageClient";

/** Flag serveur — hors shell static strict. */
export const instant = false;

type Props = {
  params: Promise<{ locale: string }>;
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isVillageEnabled()) {
    return { robots: { index: false, follow: false } };
  }

  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return { robots: { index: false, follow: false } };
  }

  const t = await getTranslations({ locale, namespace: "Village" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [
          l,
          l === routing.defaultLocale ? "/village" : `/${l}/village`,
        ])
      ),
    },
  };
}

export default async function VillagePage({ params }: Props) {
  if (!isVillageEnabled()) {
    notFound();
  }

  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return <VillageClient />;
}
