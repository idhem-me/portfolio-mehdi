import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { PokemonPlayground } from "@/features/pokemon/playground";
import { getPokemon } from "@/features/pokemon/data";

export const instant = false;

export default async function PokemonStagePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ shiny?: string | string[] }>;
}) {
  const { locale, id } = await params;
  const pokemon = getPokemon(id, locale);
  if (!pokemon) notFound();
  setRequestLocale(locale);
  const { shiny } = await searchParams;

  return (
    <PokemonPlayground
      key={pokemon.id}
      pokemon={pokemon}
      shiny={shiny === "1"}
    />
  );
}
