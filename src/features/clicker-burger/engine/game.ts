import { LEVELS } from "../data/levels";
import Decimal from "decimal.js";
import { GENERATORS, MARKETS, RESEARCH, RIVALS, EVENTS } from "../data/content";
import { PROJECTS } from "../data/projects";
export type State = {
  version: 1;
  level: number;
  eventTerms: { cost: string; reward: string } | null;
  nextEventAt: number;
  missionClaims: string[];
  money: string;
  earned: string;
  stock: number;
  ingredients: number;
  price: number;
  sold: number;
  manual: number;
  counts: Record<string, number>;
  research: string[];
  markets: string[];
  rivals: string[];
  projects: string[];
  marketFund: string;
  marketIndex: number;
  plots: { x: number; y: number; type: string; level: number }[];
  capital: number;
  elapsed: number;
  event: number;
  eventSeen: number;
  boost: number;
  boostUntil: number;
  lastSaved: number;
  log: string[];
};
export const D = (v: Decimal.Value) => new Decimal(v);
export function initial(now = Date.now(), capital = 0): State {
  return {
    version: 1,
    level: 1,
    eventTerms: null,
    nextEventAt: 180,
    missionClaims: [],
    money: "20",
    earned: "0",
    stock: 0,
    ingredients: 20,
    price: 4,
    sold: 0,
    manual: 0,
    counts: Object.fromEntries(GENERATORS.map((g) => [g.id, 0])),
    research: [],
    markets: [],
    rivals: [],
    projects: [],
    marketFund: "0",
    marketIndex: 100,
    plots: [{ x: 2, y: 2, type: "stand", level: 1 }],
    capital,
    elapsed: 0,
    event: -1,
    eventSeen: 0,
    boost: 1,
    boostUntil: 0,
    lastSaved: now,
    log: ["Votre empire commence avec 20 € et une friteuse douteuse."],
  };
}
export function marketUnlocked(s: State) {
  return s.research.includes("ipo");
}
/** Bruit déterministe ±1, mean-reversion douce, biais revenu — drift plafonné. */
export function marketDrift(s: State) {
  const r = rates(s);
  const income = Math.min(r.production, r.demand) * s.price;
  const bias = Math.tanh((income - 40) / 200) * 0.000004;
  const revert = ((100 - s.marketIndex) / 100) * 0.000006;
  const noise =
    Math.sin(s.elapsed * 12.9898) * Math.cos(s.elapsed * 78.233) * 0.000008;
  return Math.min(0.000012, Math.max(-0.000012, bias + revert + noise));
}
export function tickMarket(s: State) {
  if (!marketUnlocked(s)) return;
  const factor = 1 + marketDrift(s);
  s.marketIndex = Math.min(500, Math.max(20, s.marketIndex * factor));
  if (D(s.marketFund).gt(0))
    s.marketFund = D(s.marketFund).mul(factor).toDecimalPlaces(8).toString();
}
export function era(s: State) {
  if (s.research.includes("warp")) return 5;
  if (
    s.research.includes("space") &&
    domination(s) >= 70 &&
    s.counts.megafactory >= 3
  )
    return 4;
  if (s.research.includes("global")) return 3;
  if (s.research.includes("franchise")) return 2;
  if (D(s.earned).gte(1000)) return 1;
  return 0;
}
export function domination(s: State) {
  return Math.min(
    100,
    s.markets.filter((id) =>
      ["europe", "asia", "america", "africa"].includes(id),
    ).length *
      18 +
      s.rivals.reduce(
        (a, id) => a + (RIVALS.find((r) => r.id === id)?.share ?? 0),
        0,
      ),
  );
}
export function legacyBuildingLevel(s: State) {
  const gates = [
    true,
    true,
    s.research.includes("recipe"),
    s.research.includes("franchise") && s.counts.warehouse >= 1,
    s.research.includes("global") &&
      s.markets.some((id) => ["lyon", "paris"].includes(id)),
    era(s) >= 4 && s.markets.includes("mars"),
    era(s) >= 4 && s.markets.includes("europa"),
    s.research.includes("warp"),
    s.markets.includes("alpha"),
    s.markets.includes("multiverse"),
  ];
  let level = 1;
  for (let i = 1; i < LEVELS.length; i++) {
    if (
      !gates[i] ||
      D(s.earned).lt(
        [
          "0",
          "250",
          "5000",
          "100000",
          "5000000",
          "500000000",
          "500000000000",
          "5000000000000",
          "500000000000000",
          "500000000000000000",
        ][i],
      )
    )
      break;
    level = i + 1;
  }
  return level;
}
export function buildingLevel(s: State) {
  return s.level;
}
export function upgradeOffer(s: State) {
  if (s.level >= LEVELS.length) return null;
  const requirements = [
    true,
    true,
    s.research.includes("recipe"),
    s.research.includes("franchise") && s.counts.warehouse >= 1,
    s.research.includes("global") &&
      s.markets.some((id) => ["lyon", "paris"].includes(id)),
    era(s) >= 4 && s.markets.includes("mars"),
    era(s) >= 4 && s.markets.includes("europa"),
    s.research.includes("warp"),
    s.markets.includes("alpha"),
    s.markets.includes("multiverse"),
  ];
  const hints = [
    "",
    "Atteindre la trésorerie nécessaire.",
    "Créer la recette signature.",
    "Créer une franchise et ouvrir un centre logistique.",
    "Ouvrir un marché national et rechercher le menu mondial.",
    "Programme spatial, 70 % de domination, 3 mégafactories et marché martien.",
    "Ouvrir le marché Europe / Jupiter.",
    "Rechercher la livraison supraluminique.",
    "Ouvrir Alpha du Centaure.",
    "Ouvrir le marché multivers.",
  ];
  const next = LEVELS[s.level];
  const unlocked = requirements[s.level];
  return {
    ...next,
    level: s.level + 1,
    unlocked,
    requirement: hints[s.level],
    affordable: unlocked && D(s.money).gte(next.cost),
  };
}
export function eventOffer(s: State) {
  if (s.event < 0) return null;
  if (s.eventTerms) return { ...EVENTS[s.event], ...s.eventTerms };
  const e = EVENTS[s.event],
    r = rates(s);
  const revenue = D(Math.min(r.production, r.demand)).mul(s.price);
  const price = Decimal.max(
    e.cost,
    D(s.money).mul(0.01),
    revenue.mul(5),
  ).ceil();
  const reward = Decimal.max(
    price.mul(2),
    D(s.money).mul(0.05),
    revenue.mul(30),
  ).ceil();
  return { ...e, cost: price.toString(), reward: reward.toString() };
}
export function levelMultiplier(s: State) {
  return LEVELS[buildingLevel(s) - 1].multiplier;
}
export function clickProduction(s: State) {
  return (
    (s.research.includes("recipe") ? 2 : 1) *
    (1 + s.capital * 0.1) *
    levelMultiplier(s)
  );
}
export function rates(s: State) {
  const e = era(s);
  const bonus = clickProduction(s);
  const logistics =
    (s.research.includes("automation") ? 1.5 : 1) *
    (s.projects.includes("pilot-line") ? 1.2 : 1);
  const spaceBonus = s.research.includes("astrochef") ? 1.25 : 1;
  let production =
    GENERATORS.filter((g) => !["factory", "megafactory", "trader"].includes(g.id)).reduce(
      (n, g) => n + s.counts[g.id] * g.production,
      0,
    ) * bonus;
  const distribution = s.counts.warehouse * 60 * bonus * logistics;
  const harvest = s.counts.farm * 35 * bonus * logistics;
  production += Math.min(
    (s.counts.factory * 45 + s.counts.megafactory * 15000) * bonus,
    distribution,
    harvest,
  );
  production += s.plots.reduce((n, p) => n + (p.level - 1) * 0.5, 0);
  production +=
    (s.counts.orbital * 2e5 + s.counts.quantum * 5e8) * (spaceBonus - 1);
  let demand = 1.3 + s.counts.marketing * 1.4 + s.counts.restaurant * 5;
  const marketDemand = MARKETS.filter((m) => s.markets.includes(m.id)).reduce(
    (n, m) => n + m.demand * (1 - m.competition) * m.power,
    0,
  );
  demand +=
    marketDemand * (s.research.includes("menus") ? 1.15 : 1) +
    (s.counts.orbital * 2e5 + s.counts.quantum * 5e8) * spaceBonus;
  demand *=
    Math.pow(4 / s.price, 1.5) *
    (1 + s.capital * 0.04) *
    (s.elapsed < s.boostUntil ? s.boost : 1) *
    (1 + s.rivals.length * 0.1) *
    (s.research.includes("branding") ? 1.2 : 1) *
    (s.projects.includes("test-kitchen") ? 1.1 : 1);
  return {
    production,
    demand,
    ingredientCost: s.research.includes("coldchain") ? 0.25 : 0.5,
    harvest,
    era: e,
  };
}
/** Skill asymptote < 1 : même une armée de traders reste sous l’optimum manuel. */
export function traderSkill(count: number) {
  if (count <= 0) return 0;
  return 0.88 * (1 - 1 / (1 + count * 0.35));
}
export function incomeAtPrice(s: State, price: number) {
  const probe = { ...s, price };
  const r = rates(probe);
  return Math.min(r.production, r.demand) * price;
}
export function optimalPrice(s: State) {
  let best = 4,
    bestIncome = -1;
  for (let p = 1; p <= 20; p += 0.5) {
    const income = incomeAtPrice(s, p);
    if (income > bestIncome) {
      bestIncome = income;
      best = p;
    }
  }
  return best;
}
/** Prix ciblé : se rapproche de l’optimum depuis 4 €, sans l’atteindre (skill < 1). */
export function traderTargetPrice(s: State) {
  const n = s.counts.trader ?? 0;
  if (n <= 0) return s.price;
  const skill = traderSkill(n);
  const optimal = optimalPrice(s);
  let target = Math.min(
    20,
    Math.max(1, Math.round((4 + (optimal - 4) * skill) * 2) / 2),
  );
  if (target === optimal && skill < 1) {
    target = optimal > 4 ? target - 0.5 : optimal < 4 ? target + 0.5 : target;
    target = Math.min(20, Math.max(1, target));
  }
  return target;
}
export function tick(s: State, seconds: number): State {
  const n = structuredClone(s);
  const steps = Math.floor(Math.min(Math.max(0, seconds), 28800));
  for (let i = 0; i < steps; i++) {
    if ((n.counts.trader ?? 0) > 0) n.price = traderTargetPrice(n);
    tickMarket(n);
    const r = rates(n);
    n.elapsed++;
    n.ingredients = Math.min(1e100, n.ingredients + r.harvest);
    const can = Math.max(
      0,
      Math.min(
        Math.min(r.production, Math.max(r.production, r.demand) * 30 - n.stock),
        n.ingredients +
          Math.max(0, D(n.money).div(r.ingredientCost).toNumber()),
      ),
    );
    const used = Math.max(0, can - n.ingredients);
    n.ingredients = Math.max(0, n.ingredients - can);
    n.money = D(n.money).minus(D(used).mul(r.ingredientCost)).toString();
    n.stock = Math.min(1e100, n.stock + can);
    const sold = Math.min(n.stock, r.demand);
    n.stock -= sold;
    n.sold = Math.min(1e100, n.sold + sold);
    const revenue = D(sold).mul(n.price);
    n.money = D(n.money).plus(revenue).toString();
    n.earned = D(n.earned).plus(revenue).toString();
    if (n.event >= 0 && !n.eventTerms) {
      const offer = eventOffer(n)!;
      n.eventTerms = { cost: offer.cost, reward: offer.reward };
    }
    if (n.elapsed >= n.nextEventAt && n.event < 0) {
      n.event = n.eventSeen % EVENTS.length;
      n.eventSeen++;
      const offer = eventOffer(n)!;
      n.eventTerms = { cost: offer.cost, reward: offer.reward };
      n.nextEventAt = n.elapsed + 180;
    }
  }
  return n;
}
export function cost(s: State, id: string, quantity = 1) {
  const g = GENERATORS.find((g) => g.id === id);
  if (!g || quantity < 1) return D(0);
  return D(g.base)
    .mul(D(g.growth).pow(s.counts[id]))
    .mul(D(g.growth).pow(quantity).minus(1))
    .div(D(g.growth).minus(1))
    .ceil();
}
export function affordable(s: State, id: string, requested: number | "max") {
  let lo = 0,
    hi = Math.min(
      10000 - (s.counts[id] ?? 0),
      requested === "max" ? 10000 : Math.max(0, Math.floor(requested)),
    );
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (cost(s, id, mid).lte(s.money)) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
function note(s: State, text: string) {
  s.log = [text, ...s.log].slice(0, 25);
}
export type Action =
  | { type: "level-up" }
  | { type: "cook" }
  | { type: "price"; value: number }
  | { type: "buy"; id: string; quantity: number | "max" }
  | { type: "research" | "market" | "acquire" | "project"; id: string }
  | { type: "stock-buy" | "stock-sell"; fraction: number }
  | { type: "build"; id: string; x: number; y: number }
  | { type: "upgrade"; index: number }
  | { type: "event"; accept: boolean };
export function act(s: State, a: Action): State {
  const n = structuredClone(s);
  const pay = (v: Decimal.Value) => {
    if (D(v).gt(n.money)) return false;
    n.money = D(n.money).minus(v).toString();
    return true;
  };
  if (a.type === "level-up") {
    const offer = upgradeOffer(s);
    if (!offer?.affordable || !pay(offer.cost)) return s;
    n.level++;
    n.ingredients=Math.max(n.ingredients,clickProduction(n)*10);
    note(n, `${offer.name} · niveau ${n.level}.`);
  }
  if (a.type === "cook") {
    const amount = clickProduction(s);
    const extra = Math.max(0, amount - n.ingredients);
    if (!pay(D(extra).mul(rates(n).ingredientCost))) return s;
    n.ingredients = Math.max(0, n.ingredients - amount);
    n.stock += amount;
    n.manual++;
  }
  if (a.type === "price" && Number.isFinite(a.value))
    n.price = Math.min(20, Math.max(1, Math.round(a.value * 2) / 2));
  if (a.type === "buy") {
    const g = GENERATORS.find((g) => g.id === a.id);
    if (!g || g.era > era(s)) return s;
    const q = affordable(s, a.id, a.quantity);
    if (!q || !pay(cost(s, a.id, q))) return s;
    n.counts[a.id] += q;
    note(n, `${g.name} : +${q}. Votre ambition gagne du terrain.`);
  }
  if (a.type === "research") {
    const r = RESEARCH.find((r) => r.id === a.id);
    if (
      !r ||
      n.research.includes(r.id) ||
      r.era > era(n) ||
      !r.requires.every((id) => n.research.includes(id)) ||
      !pay(r.cost)
    )
      return s;
    n.research.push(r.id);
    note(n, `Recherche terminée : ${r.name}.`);
  }
  if (a.type === "project") {
    const p = PROJECTS.find((p) => p.id === a.id);
    if (
      !p ||
      n.projects.includes(p.id) ||
      p.era > era(n) ||
      !p.requiresResearch.every((id) => n.research.includes(id)) ||
      n.stock < p.stock ||
      n.ingredients < p.ingredients ||
      !pay(p.money)
    )
      return s;
    n.stock -= p.stock;
    n.ingredients -= p.ingredients;
    n.projects.push(p.id);
    note(n, `Projet achevé : ${p.name}.`);
  }
  if (a.type === "stock-buy") {
    if (!marketUnlocked(n) || !(a.fraction > 0) || a.fraction > 1) return s;
    const amount = D(n.money).mul(a.fraction).toDecimalPlaces(8);
    if (amount.lte(0) || amount.gt(n.money)) return s;
    n.money = D(n.money).minus(amount).toString();
    n.marketFund = D(n.marketFund).plus(amount).toString();
    note(n, `Bourse : achat de ${fmt(amount)} €.`);
  }
  if (a.type === "stock-sell") {
    if (!marketUnlocked(n) || !(a.fraction > 0) || a.fraction > 1) return s;
    const amount = D(n.marketFund).mul(a.fraction).toDecimalPlaces(8);
    if (amount.lte(0) || amount.gt(n.marketFund)) return s;
    n.marketFund = D(n.marketFund).minus(amount).toString();
    n.money = D(n.money).plus(amount).toString();
    note(n, `Bourse : vente de ${fmt(amount)} €.`);
  }
  if (a.type === "market") {
    const m = MARKETS.find((m) => m.id === a.id);
    if (!m || m.era > era(n) || n.markets.includes(m.id) || !pay(m.cost))
      return s;
    n.markets.push(m.id);
    note(n, `${m.name} a désormais une nouvelle raison de commander.`);
  }
  if (a.type === "acquire") {
    const r = RIVALS.find((r) => r.id === a.id);
    if (!r || era(n) < 2 || n.rivals.includes(r.id) || !pay(r.cost)) return s;
    n.rivals.push(r.id);
    note(n, `${r.name} rejoint votre empire. La concurrence applaudit peu.`);
  }
  if (a.type === "build") {
    const g = GENERATORS.find((g) => g.id === a.id);
    if (
      !g ||
      g.era > era(n) ||
      era(n) < 1 ||
      !Number.isInteger(a.x) ||
      !Number.isInteger(a.y) ||
      a.x < 0 ||
      a.y < 0 ||
      a.x > 4 ||
      a.y > 4 ||
      n.plots.some((p) => p.x === a.x && p.y === a.y) ||
      !pay(cost(s, a.id))
    )
      return s;
    n.plots.push({ x: a.x, y: a.y, type: g.asset, level: 1 });
    n.counts[g.id]++;
    note(n, `${g.name} construit. Terrain inclus dans le prix.`);
  }
  if (a.type === "upgrade") {
    const p = n.plots[a.index];
    if (!p || p.level >= 4 || !pay(D(180).mul(D(4).pow(p.level - 1)))) return s;
    p.level++;
    note(n, `Bâtiment amélioré au niveau ${p.level}.`);
  }
  if (a.type === "event") {
    if (n.event < 0) return s;
    const ev = eventOffer(n)!;
    if (a.accept && !pay(ev.cost)) return s;
    if (a.accept) {
      n.money = D(n.money).plus(ev.reward).toString();
      n.boost = ev.multiplier;
      n.boostUntil = n.elapsed + ev.duration;
      note(
        n,
        `${ev.title} : demande ×${ev.multiplier} pendant ${ev.duration} s.`,
      );
    }
    n.event = -1;
    n.eventTerms = null;
    n.nextEventAt = n.elapsed + 180;
  }
  return n;
}
export function prestigeGain(s: State) {
  return Math.max(0, Math.floor(D(s.earned).div(1e6).sqrt().toNumber()));
}
export function prestige(s: State, now = Date.now()) {
  const gain = prestigeGain(s);
  if (!gain) return s;
  const n = initial(now, Math.min(1e9, s.capital + gain));
  n.log = [
    "Votre entreprise vient de faire faillite. Les actionnaires sont ravis.",
  ];
  return n;
}
export function fmt(v: Decimal.Value, digits = 1) {
  const n = D(v);
  if (n.abs().lt(1000))
    return n
      .toNumber()
      .toLocaleString("fr-FR", { maximumFractionDigits: digits });
  for (const [power, suffix] of [
    [12, "Bn"],
    [9, "Md"],
    [6, "M"],
    [3, "k"],
  ] as const) {
    if (n.abs().gte(D(10).pow(power)) && n.abs().lt("1e15"))
      return `${n.div(D(10).pow(power)).toFixed(digits).replace(".", ",")} ${suffix}`;
  }
  return n.toExponential(2);
}
