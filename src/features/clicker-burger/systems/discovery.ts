import { GENERATORS, RESEARCH, MARKETS, RIVALS } from "../data/content";
import { D, era, domination, type State } from "../engine/game";
// Discovery uses lifetime revenue and permanent purchases, never current cash.
export function discoveries(s: State) {
  const e = era(s),
    earned = D(s.earned);
  const milestones: Record<string, boolean> = {
    cook: s.sold >= 10,
    grill: s.counts.cook > 0 && earned.gte(100),
    marketing: s.counts.grill > 0 || earned.gte(200),
    restaurant: e >= 1,
    trader: e >= 1 && (s.counts.marketing > 0 || s.counts.restaurant > 0),
    farm: e >= 2,
    factory: s.counts.farm > 0,
    warehouse: s.counts.factory > 0,
    megafactory: e >= 3 && s.counts.factory > 0 && earned.gte(1e7),
    orbital: e >= 4,
    quantum: e >= 5,
  };
  const generators = GENERATORS.filter(
    (g) => s.counts[g.id] > 0 || (g.era <= e && milestones[g.id]),
  );
  const research = RESEARCH.filter(
    (r) =>
      !s.research.includes(r.id) &&
      r.era <= e &&
      r.requires.every((id) => s.research.includes(id)) &&
      (
        {
          recipe: s.counts.cook > 0 && earned.gte(150),
          franchise: e >= 1,
          branding: e >= 1 && s.counts.marketing > 0,
          coldchain: s.counts.farm > 0,
          automation: s.counts.warehouse > 0,
          global: s.markets.some((id) =>
            ["lyon", "bordeaux", "marseille", "paris", "riviera"].includes(id),
          ),
          menus: s.markets.some((id) =>
            ["europe", "asia", "america", "africa"].includes(id),
          ),
          space: domination(s) >= 50,
          astrochef: s.markets.includes("moon"),
          warp: s.markets.includes("moon"),
        } as Record<string, boolean>
      )[r.id],
  );
  const eligible = MARKETS.filter((m) => m.era <= e);
  const next = eligible.find((m) => !s.markets.includes(m.id));
  const markets = eligible.filter(
    (m) => s.markets.includes(m.id) || m.id === next?.id,
  );
  const rivals = RIVALS.filter(
    (r) =>
      s.rivals.includes(r.id) ||
      (e >= 2 &&
        earned.gte(r.cost * 0.2) &&
        r.id === RIVALS.find((v) => !s.rivals.includes(v.id))?.id),
  );
  return {
    generators,
    research,
    markets,
    rivals,
    map: e >= 1,
    bulk: Object.values(s.counts).some((n) => n >= 5),
    prestige: earned.gte(1e6) || s.capital > 0,
  };
}
