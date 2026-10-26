import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ClickerBurger } from "@/features/clicker-burger/client";
import {
  clickerBurgerEnabled,
  clickerBurgerPublic,
} from "@/features/clicker-burger/flags";
import { routing } from "@/i18n/routing";
export const instant = false;
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Clicker Burger",
    description:
      "Un jeu de gestion incrémental, d’une table à un empire de burgers.",
    robots: { index: clickerBurgerPublic, follow: clickerBurgerPublic },
  };
}
export default async function ClickerBurgerPage({ params }: Props) {
  if (!clickerBurgerEnabled) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <ClickerBurger
      backHref={locale === routing.defaultLocale ? "/jeux" : `/${locale}/jeux`}
    />
  );
}
