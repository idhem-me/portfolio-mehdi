import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

/** Convenience alias → /jeux/cards */
export default async function CardsAliasPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const href =
    locale === routing.defaultLocale ? "/jeux/cards" : `/${locale}/jeux/cards`;
  redirect(href);
}
