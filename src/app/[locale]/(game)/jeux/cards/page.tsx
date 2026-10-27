import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CardsGame } from "@/features/cards/client";
import { cardsEnabled, cardsPublic } from "@/features/cards/flags";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Cartes",
    description:
      "Prototype de collection de cartes — ouvre des boosters, construis ta collection.",
    robots: { index: cardsPublic, follow: cardsPublic },
  };
}

export default function CardsPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div role="status" className="p-6 text-sm text-muted-foreground">
          Chargement de Cartes…
        </div>
      }
    >
      <LocalizedCards {...props} />
    </Suspense>
  );
}

async function LocalizedCards({ params }: Props) {
  if (!cardsEnabled) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  return <CardsGame backHref="/jeux" />;
}
