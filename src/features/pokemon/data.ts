import "server-only";
import catalogue from "./catalogue.json";

export type PokemonEntry = {
  id: number;
  name: string;
  generation: number;
  types: number[];
  sprite: string | null;
  shiny: string | null;
};

type Species = (typeof catalogue)[number];

function localize(entry: Species, locale: string): PokemonEntry {
  const names: Record<string, string> = entry.names;
  const name = names[locale] ?? names.en ?? entry.slug;
  return {
    id: entry.id,
    name,
    generation: entry.generation,
    types: entry.types,
    sprite: entry.sprite,
    shiny: entry.shiny,
  };
}

export type PokemonBatch = { rows: PokemonEntry[]; total: number };

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim();
}

export function getPokemonBatch(
  locale: string,
  {
    offset = 0,
    query = "",
    type,
    generation,
  }: {
    offset?: number;
    query?: string;
    type?: number;
    generation?: number;
  } = {},
): PokemonBatch {
  const search = normalize(query);
  const number = search.match(/^#?([0-9]+)$/);
  const matches = catalogue.filter((entry) => {
    if (type && !entry.types.includes(type)) return false;
    if (generation && entry.generation !== generation) return false;
    if (number) return entry.id === Number(number[1]);
    const names: Record<string, string> = entry.names;
    return (
      !search ||
      [names[locale], names.fr, names.en, entry.slug].some(
        (name) => name && normalize(name).includes(search),
      )
    );
  });
  return {
    rows: matches
      .slice(offset, offset + 24)
      .map((entry) => localize(entry, locale)),
    total: matches.length,
  };
}

export function getPokemonGenerations() {
  return [...new Set(catalogue.map((entry) => entry.generation))];
}

export function getPokemon(id: string, locale: string) {
  const entry = catalogue.find((entry) => String(entry.id) === id);
  return entry && localize(entry, locale);
}
