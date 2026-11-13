import { PageBreadcrumb } from "@/components/layout/page-breadcrumb";
import type { Metadata } from "next";
import { portfolioMetadata } from "@/lib/portfolio-seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PokemonCatalogue } from "@/features/pokemon/catalogue";
import {
  getPokemonBatch,
  getPokemonGenerations,
} from "@/features/pokemon/data";

export const instant = false;
type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pokemon" });

  return portfolioMetadata("/jeux/pokemon", locale, {
    title: t("pokedex"),
    description: t("catalogueIntro"),
  });
}

export default async function PokemonPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pokemon");
  const nav = await getTranslations("nav");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-6 py-8">
      <PageBreadcrumb
        current={t("pokedex")}
        parents={[{ href: "/jeux", label: nav("games") }]}
      />
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {t("pokedex")}
      </h1>
      <PokemonCatalogue
        initialBatch={getPokemonBatch(locale)}
        generations={getPokemonGenerations()}
      />
    </div>
  );
}
