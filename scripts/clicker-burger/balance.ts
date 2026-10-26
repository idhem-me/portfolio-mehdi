import {
  initial,
  tick,
  act,
  D,
  rates,
  cost,
  buildingLevel,
  era,
  upgradeOffer,
  restaurantCount,
} from "../../src/features/clicker-burger/engine/game";
import { discoveries } from "../../src/features/clicker-burger/systems/discovery";
import {
  visibleMissions,
  claimMission,
} from "../../src/features/clicker-burger/data/missions";
export function simulate(active = true, maxHours = 48) {
  let s = initial(0);
  const reached: Record<number, number> = { 1: 0 };
  for (let time = 0; time < maxHours * 3600; time += 10) {
    if ((active && time < 600) || s.counts.cook === 0)
      for (let i = 0; i < 10; i++) s = act(s, { type: "cook" });
    s = tick(s, 10);
    for (const mission of visibleMissions(s)) s = claimMission(s, mission.id);
    for (const research of discoveries(s).research) {
      if (D(s.money).gte(research.cost))
        s = act(s, { type: "research", id: research.id });
    }
    if (upgradeOffer(s)?.affordable) s = act(s, { type: "level-up" });
    const fixed =
      era(s) >= 3
        ? ["farm", "factory", "warehouse", "megafactory"]
        : era(s) >= 2
          ? ["farm", "factory", "warehouse"]
          : [];
    for (const id of fixed) {
      const desired = id === "megafactory" ? 3 : 1;
      if (s.counts[id] < desired && D(s.money).gte(cost(s, id)))
        s = act(s, { type: "buy", id, quantity: 1 });
    }
    for (let iteration = 0; iteration < 8; iteration++) {
      const v = discoveries(s),
        before = rates(s);
      const income = Math.min(before.production, before.demand) * s.price;
      const slots = restaurantCount(s);
      if (
        slots > 0 &&
        s.markets.length >= slots &&
        v.generators.some((g) => g.id === "restaurant") &&
        D(s.money).gte(cost(s, "restaurant").mul(2))
      ) {
        s = act(s, { type: "buy", id: "restaurant", quantity: 1 });
        continue;
      }
      const options = [
        ...v.generators
          .filter((g) => {
            if (D(s.money).lt(cost(s, g.id))) return false;
            if (
              (g.id === "cook" || g.id === "grill") &&
              before.production >= before.demand
            )
              return false;
            return true;
          })
          .map((g) => ({
            price: cost(s, g.id).toNumber(),
            state: act(s, { type: "buy", id: g.id, quantity: 1 }),
          })),
        ...v.markets
          .filter((m) => !s.markets.includes(m.id) && D(s.money).gte(m.cost))
          .map((m) => ({
            price: m.cost,
            state: act(s, { type: "market", id: m.id }),
          })),
      ];
      const nextMarket = v.markets.find((m) => !s.markets.includes(m.id));
      if (nextMarket && D(s.money).gte(D(nextMarket.cost).mul(2))) {
        s = act(s, { type: "market", id: nextMarket.id });
        continue;
      }
      const best = options
        .map((option) => {
          const after = rates(option.state);
          return {
            ...option,
            score:
              (Math.min(after.production, after.demand) * s.price - income) /
              option.price,
          };
        })
        .sort((a, b) => b.score - a.score)[0];
      if (
        !best ||
        best.score <= 1 / (1800 * (era(s) + 1)) ||
        D(s.money).lt(D(best.price).mul(2))
      )
        break;
      s = best.state;
    }
    if (s.event >= 0)
      s = act(s, { type: "event", accept: D(s.money).gte(100) });
    const level = buildingLevel(s);
    for (let i = 1; i <= level; i++)
      if (reached[i] === undefined) reached[i] = time + 10;
    if (level === 10) return { reached, state: s, hours: (time + 10) / 3600 };
  }
  return { reached, state: s, hours: maxHours };
}
if (process.argv[1]?.endsWith("balance.ts")) {
  for (const active of [true, false]) {
    const result = simulate(active);
    console.log(
      JSON.stringify(
        {
          strategy: active ? "active start" : "idle after first employee",
          levels: result.reached,
          earned: result.state.earned,
          era: era(result.state),
          counts: result.state.counts,
          research: result.state.research,
          markets: result.state.markets,
          hours: result.hours,
        },
        null,
        2,
      ),
    );
  }
}
