import { getPokemonBatch } from "@/features/pokemon/data";
import { locales } from "@/i18n/routing";

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const locale =
    locales.find((value) => value === params.get("locale")) ?? "fr";
  const offset = Number(params.get("offset") ?? 0);
  if (!Number.isSafeInteger(offset) || offset < 0) {
    return Response.json({ error: "Invalid offset" }, { status: 400 });
  }

  return Response.json(
    getPokemonBatch(locale, {
      offset,
      query: (params.get("query") ?? "").slice(0, 100),
      type: Number(params.get("type")) || undefined,
      generation: Number(params.get("generation")) || undefined,
    }),
  );
}
