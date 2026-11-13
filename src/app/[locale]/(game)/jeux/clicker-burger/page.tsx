import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ClickerBurger } from "@/features/clicker-burger/client";
import {
  clickerBurgerEnabled,
  clickerBurgerPublic,
} from "@/features/clicker-burger/flags";
import { portfolioMetadata } from "@/lib/portfolio-seo";
import { isLocalGamePreview } from "@/lib/game-publication";
export const instant = false;
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    ...portfolioMetadata("/jeux/clicker-burger", locale, {
      title: "Clicker Burger",
      description: "Un jeu de gestion incrémental, d’une table à un empire de burgers.",
    }),
    robots: { index: clickerBurgerPublic, follow: clickerBurgerPublic },
  };
}
export default async function ClickerBurgerPage({ params }: Props) {
  if (!clickerBurgerEnabled && !isLocalGamePreview) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  return <ClickerBurger />;
}
