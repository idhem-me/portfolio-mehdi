import { LEVELS } from "../data/levels";
import Decimal from "decimal.js";
import {
  GENERATORS,
  MARKETS,
  RESEARCH,
  RIVALS,
  EVENTS,
  EUROPE_CITIES,
  WORLD_CITIES,
  MOON_MARKETS,
  MARS_MARKETS,
  COOKS_PER_OUTLET,
} from "../data/content";
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
  /** Jours de jeu écoulés (1 s réelle = 1 jour). */
  elapsed: number;
  /** Jour civil de départ (YYYY-MM-DD, UTC). */
  calendarStart: string;
  event: number;
  eventSeen: number;
  boost: number;
  boostUntil: number;
  /** Jusqu’à cet elapsed, les directeurs des ventes ne touchent pas au prix. */
  priceHoldUntil: number;
  lastSaved: number;
  log: string[];
};
export const D = (v: Decimal.Value) => new Decimal(v);
/** Date UTC YYYY-MM-DD. */
export function calendarStartISO(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}
/** Date in-game = calendrier de départ + jours écoulés. */
export function gameDate(s: State): Date {
  const [y, m, d] = s.calendarStart.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + Math.max(0, Math.floor(s.elapsed)));
  return dt;
}
export function gameDateISO(s: State) {
  return gameDate(s).toISOString().slice(0, 10);
}
export function formatGameDate(s: State) {
  return gameDate(s).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
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
    price: 8,
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
    calendarStart: calendarStartISO(now),
    event: -1,
    eventSeen: 0,
    boost: 1,
    boostUntil: 0,
    priceHoldUntil: 0,
    lastSaved: now,
    log: [
      "Votre empire commence avec 20 € et une friteuse douteuse. Chaque seconde fait avancer un jour.",
    ],
  };
}
export const PRICE_HOLD_SECONDS = 180;
export const PRICE_MIN = 1;
/** Plafond d’unités par générateur (999 B = 999×10¹²). */
export const OWNERSHIP_CAP = 999e12;
/** Plafond technique de saisie (999 Md €). À ce niveau, on ne vend rien. */
export const PRICE_MAX = 999e9;
/**
 * Ticket confort / viable en fin de partie (~10 k€ avec le spatial lointain).
 * Au-delà, la demande s’effondre même si la saisie reste autorisée.
 */
export const PRICE_COMFORT_CAP = 10_000;
/** Au-delà, la demande terrestre s’écroule si le confort n’est pas spatial. */
export const EARTH_PRICE_SOFT_CAP = 30;
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
      (WORLD_CITIES as readonly string[]).includes(id),
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
    s.research.includes("recipe") && s.counts.cook >= 8,
    s.research.includes("franchise") && s.counts.warehouse >= 1,
    s.research.includes("global") &&
      s.markets.some((id) => (EUROPE_CITIES as readonly string[]).includes(id)),
    era(s) >= 4 &&
      s.markets.some((id) => (MARS_MARKETS as readonly string[]).includes(id)),
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
/**
 * Réseau de restaurants : siège (niv. ≥ 3) + succursales + extensions +
 * acquisitions. Sert d’emplacements pour ouvrir de nouvelles extensions.
 */
export function restaurantCount(s: State) {
  if (buildingLevel(s) < 3) return 0;
  return (
    1 +
    (s.counts.restaurant ?? 0) +
    s.markets.length +
    s.rivals.length
  );
}
export function upgradeOffer(s: State) {
  if (s.level >= LEVELS.length) return null;
  const requirements = [
    true,
    true,
    s.research.includes("recipe") && s.counts.cook >= 8,
    s.research.includes("franchise") && s.counts.warehouse >= 1,
    s.research.includes("global") &&
      s.markets.some((id) => (EUROPE_CITIES as readonly string[]).includes(id)),
    era(s) >= 4 &&
      s.markets.some((id) => (MARS_MARKETS as readonly string[]).includes(id)),
    era(s) >= 4 && s.markets.includes("europa"),
    s.research.includes("warp"),
    s.markets.includes("alpha"),
    s.markets.includes("multiverse"),
  ];
  const hints = [
    "",
    "Atteindre la trésorerie nécessaire.",
    "Embaucher 8 commis et créer la recette signature.",
    "Créer une franchise et ouvrir un centre logistique.",
    "Ouvrir une ville européenne et rechercher le menu mondial.",
    "Programme spatial, 70 % de domination, 3 mégafactories et une colonie martienne.",
    "Ouvrir le marché Europe / Jupiter.",
    "Rechercher la livraison supraluminique.",
    "Ouvrir Alpha du Centaure.",
    "Ouvrir le marché multivers.",
  ];
  const next = LEVELS[s.level];
  const unlocked = requirements[s.level];
  const cost = inflatedCost(s, next.cost).toString();
  return {
    ...next,
    cost,
    level: s.level + 1,
    unlocked,
    requirement: hints[s.level],
    affordable: unlocked && D(s.money).gte(cost),
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
/**
 * Bonus permanent après liquidations. Logarithmique : un gros capital
 * accélère sans rendre le premier clic impayable (ex-×0,04 linéaire).
 * capital 10 ≈ ×2,2 · 100 ≈ ×3,3 · 10k ≈ ×5,6 · 1M ≈ ×7,9
 */
export function capitalMultiplier(s: State) {
  return 1 + Math.log10(1 + Math.max(0, s.capital)) * 1.15;
}
/**
 * Bonus d’empire (recette, capital, niveau). Conservateur : le volume suit
 * surtout le nombre d’adresses, pas un empilement de ×512.
 */
export function clickProduction(s: State) {
  return (
    (s.research.includes("recipe") ? 1.35 : 1) *
    capitalMultiplier(s) *
    levelMultiplier(s)
  );
}
/**
 * Burgers par clic manuel. Suit l’empire : base niveau + ~3 % de la prod / j.
 */
export function burgersPerClick(s: State) {
  const base = Math.max(1, clickProduction(s));
  return base + rates(s).production * 0.03;
}
/** Commis réellement productifs (plafonnés par les points de vente). */
export function effectiveCooks(s: State) {
  const outlets = Math.max(1, restaurantCount(s) || 1);
  const cap = outlets * COOKS_PER_OUTLET;
  const cooks = s.counts.cook ?? 0;
  if (cooks <= cap) return cooks;
  // Surplus : rendement marginal très faible (cuisines saturées).
  return cap + (cooks - cap) * 0.05;
}
const SPACE_MARKET_IDS = new Set<string>([
  ...MOON_MARKETS,
  ...MARS_MARKETS,
  "europa",
  "titan",
  "alpha",
  "trappist",
  "multiverse",
]);
function coreRates(s: State) {
  const e = era(s);
  const bonus = clickProduction(s);
  const logistics =
    (s.research.includes("automation") ? 1.35 : 1) *
    (s.projects.includes("pilot-line") ? 1.15 : 1);
  const spaceBonus = s.research.includes("astrochef") ? 1.2 : 1;
  const cookGen = GENERATORS.find((g) => g.id === "cook")!;
  const otherGens = GENERATORS.filter(
    (g) =>
      !["factory", "megafactory", "trader", "cook"].includes(g.id),
  );
  let production =
    effectiveCooks(s) * cookGen.production * bonus +
    otherGens.reduce((n, g) => n + s.counts[g.id] * g.production, 0) *
      bonus;
  const distribution = s.counts.warehouse * 2000 * bonus * logistics;
  const harvest = s.counts.farm * 1500 * bonus * logistics;
  const factoryGen = GENERATORS.find((g) => g.id === "factory")!;
  const megaGen = GENERATORS.find((g) => g.id === "megafactory")!;
  production += Math.min(
    (s.counts.factory * factoryGen.production +
      s.counts.megafactory * megaGen.production) *
      bonus,
    distribution,
    harvest,
  );
  production += s.plots.reduce((n, p) => n + (p.level - 1) * 8, 0);
  const orbitalGen = GENERATORS.find((g) => g.id === "orbital")!;
  const quantumGen = GENERATORS.find((g) => g.id === "quantum")!;
  production +=
    (s.counts.orbital * orbitalGen.production +
      s.counts.quantum * quantumGen.production) *
    (spaceBonus - 1);
  const demandBoost =
    (1 + (capitalMultiplier(s) - 1) * 0.55) *
    (s.elapsed < s.boostUntil ? s.boost : 1) *
    (1 + s.rivals.length * 0.08) *
    (s.research.includes("branding") ? 1.12 : 1) *
    (s.projects.includes("test-kitchen") ? 1.08 : 1);
  const menus = s.research.includes("menus") ? 1.1 : 1;
  // Terre : restos + marketing + villes (ordre de grandeur McDo / jour).
  let earthDemand =
    30 + s.counts.marketing * 35 + s.counts.restaurant * 220;
  if (buildingLevel(s) >= 3) earthDemand += 200;
  else earthDemand += 30;
  let spaceDemand = 0;
  for (const m of MARKETS) {
    if (!s.markets.includes(m.id)) continue;
    const slice = m.demand * (1 - m.competition) * m.power * menus;
    if (SPACE_MARKET_IDS.has(m.id)) spaceDemand += slice;
    else earthDemand += slice;
  }
  spaceDemand +=
    (s.counts.orbital * orbitalGen.demand +
      s.counts.quantum * quantumGen.demand) *
    spaceBonus;
  earthDemand *= demandBoost;
  spaceDemand *= demandBoost;
  return {
    production,
    earthDemand,
    spaceDemand,
    baseDemand: earthDemand + spaceDemand,
    harvest,
    era: e,
    ingredientCost: s.research.includes("coldchain") ? 0.35 : 0.55,
  };
}
/**
 * Multiplicateur spatial du ticket : sur Terre ~1× ; Lune puis Mars (≈100×)
 * et au-delà élèvent le confort pour que des prix élevés restent vendables.
 */
export function spacePriceMultiplier(s: State) {
  const moons = MOON_MARKETS.filter((id) => s.markets.includes(id)).length;
  const mars = MARS_MARKETS.filter((id) => s.markets.includes(id)).length;
  let m = 1;
  if (moons > 0) m = Math.max(m, 5 + moons * 3);
  if (mars > 0) m = Math.max(m, 100 * mars);
  if (s.markets.includes("europa")) m = Math.max(m, 250);
  if (s.markets.includes("alpha")) m = Math.max(m, 500);
  if (s.markets.includes("multiverse")) m = Math.max(m, 1000);
  if (s.research.includes("astrochef")) m *= 1.25;
  if (s.counts.orbital > 0) m *= 1 + Math.min(0.5, s.counts.orbital * 0.03);
  return m;
}
/**
 * Facteur volume selon le prix. ×1 au confort ; sous le confort on écoule
 * un peu plus. Au-dessus, chute en puissance (×2 ≈ 10 % du volume, ×5 ≈ 0).
 * Sur Terre, au-delà de ~30 € collapse supplémentaire ; en spatial le confort
 * suit le multiplicateur (Mars ≈ 100×), donc le ticket moyen reste viable.
 */
export function priceVolumeFactor(price: number, comfort: number) {
  const c = Math.max(comfort, 0.5);
  const ratio = price / c;
  let factor: number;
  if (ratio <= 1) factor = 1 + (1 - ratio) * 0.55;
  else {
    factor = Math.pow(ratio, -3.5);
    if (ratio > 2) factor *= Math.pow(2 / ratio, 1.5);
  }
  if (price > EARTH_PRICE_SOFT_CAP && comfort < EARTH_PRICE_SOFT_CAP * 1.5) {
    factor *= Math.pow(EARTH_PRICE_SOFT_CAP / price, 3);
  }
  return Math.max(0, factor);
}
function earthComfortPrice(
  s: State,
  production: number,
  baseDemand: number,
) {
  let w = 8;
  w += Math.min(6, (s.counts.cook ?? 0) * 0.008);
  w += Math.min(5, (buildingLevel(s) - 1) * 0.55);
  w += Math.min(5, restaurantCount(s) * 0.12);
  if (s.research.includes("recipe")) w += 1.5;
  if (s.research.includes("branding")) w += 2;
  if (s.research.includes("franchise")) w += 0.5;
  if (s.research.includes("menus")) w += 1;
  w += Math.min(3, s.counts.marketing * 0.04);
  w += Math.min(3, s.markets.length * 0.12);
  w += Math.min(2, s.rivals.length * 0.35);
  w += Math.min(3, s.capital * 0.1);
  if (s.projects.includes("test-kitchen")) w += 0.5;
  if (production > baseDemand * 1.35)
    w -= Math.min(
      4,
      (production / Math.max(baseDemand, 0.1) - 1.35) * 0.4,
    );
  // Plafond terrestre ~28 € : au-delà, sans marchés spatiaux, ça ne part plus.
  return Math.min(28, Math.max(5, Math.round(w * 2) / 2));
}
/** Confort terrestre (€), plafonné ~28 €. */
export function earthWillingnessToPay(s: State) {
  const { production, baseDemand } = coreRates(s);
  return earthComfortPrice(s, production, baseDemand);
}
function clampComfort(v: number) {
  return Math.min(
    PRICE_COMFORT_CAP,
    Math.max(5, Math.round(v * 2) / 2),
  );
}
/** Confort spatial (€) = confort Terre × multiplicateur orbital / Mars. */
export function spaceWillingnessToPay(s: State) {
  return clampComfort(
    earthWillingnessToPay(s) * spacePriceMultiplier(s),
  );
}
/**
 * Confort affiché : moyenne pondérée Terre / spatial.
 * Un seul prix mondial ; la Terre refuse les tickets lunaires.
 */
export function willingnessToPay(s: State) {
  const core = coreRates(s);
  const earth = earthComfortPrice(s, core.production, core.baseDemand);
  const space = clampComfort(earth * spacePriceMultiplier(s));
  const total = core.earthDemand + core.spaceDemand;
  if (total <= 0) return earth;
  return (
    Math.round(
      ((earth * core.earthDemand + space * core.spaceDemand) / total) * 2,
    ) / 2
  );
}
/** Conseils de l’équipe des ventes pour le panneau prix. */
export function priceAdvice(s: State): string[] {
  const w = willingnessToPay(s);
  const earth = earthWillingnessToPay(s);
  const spaceW = spaceWillingnessToPay(s);
  const opt = optimalPrice(s);
  const space = spacePriceMultiplier(s);
  const tips: string[] = [];
  const traders = s.counts.trader ?? 0;
  if (traders <= 0)
    tips.push(
      "Sans directeur des ventes, tu règles le ticket à l’œil. Embauche-en pour un réglage auto.",
    );
  else
    tips.push(
      `L’équipe (×${traders}) recommande ~${opt.toLocaleString("fr-FR")} € — précision ~${Math.round(traderSkill(traders) * 100)} %.`,
    );
  if (space > 1)
    tips.push(
      `Terre ~${earth.toLocaleString("fr-FR")} € · spatial ~${spaceW.toLocaleString("fr-FR")} € (un seul prix pour tout le réseau).`,
    );
  else
    tips.push(`Confort clients ~${w.toLocaleString("fr-FR")} €.`);
  if (s.price > EARTH_PRICE_SOFT_CAP && space <= 1)
    tips.push(
      "Au-delà de 30 € sur Terre, la demande s’écroule. Ouvre la Lune puis Mars pour un ticket spatial.",
    );
  else if (s.price > earth * 1.5 && space > 1)
    tips.push(
      "Ticket élevé : la Terre décroche, seuls les marchés spatiaux suivent encore.",
    );
  else if (s.price > w * 1.4)
    tips.push("Trop au-dessus du confort : tu vends peu malgré le ticket élevé.");
  else if (s.price < w * 0.55)
    tips.push("Prix bas : tu écoulés le stock, mais le CA net reste faible.");
  else tips.push("Tu es dans une zone saine autour du confort.");
  if (s.price > PRICE_COMFORT_CAP)
    tips.push(
      `Au-delà de ${PRICE_COMFORT_CAP.toLocaleString("fr-FR")} €, même en fin de partie, tu ne vends quasiment plus. Tu peux saisir jusqu’à ${fmt(PRICE_MAX)} € — ça ne partira pas.`,
    );
  else if (space >= 100)
    tips.push(
      "Marchés martiens : un burger peut valoir ~100× le prix terrestre et partir quand même — mais le volume reste celui des colonies.",
    );
  else if (space > 1)
    tips.push(
      "Premiers marchés spatiaux : volume encore faible ; le ticket monte, le CA suit surtout si tu ouvres plus d’adresses.",
    );
  return tips;
}
export function rates(s: State) {
  const core = coreRates(s);
  const earthW = earthComfortPrice(s, core.production, core.baseDemand);
  const spaceW = clampComfort(earthW * spacePriceMultiplier(s));
  return {
    production: core.production,
    demand:
      core.earthDemand * priceVolumeFactor(s.price, earthW) +
      core.spaceDemand * priceVolumeFactor(s.price, spaceW),
    ingredientCost: core.ingredientCost,
    harvest: core.harvest,
    era: core.era,
  };
}
/** Skill asymptote < 1 : même une armée de traders reste sous l’optimum manuel. */
export function traderSkill(count: number) {
  if (count <= 0) return 0;
  return 0.88 * (1 - 1 / (1 + count * 0.35));
}
/** CA net / s en régime stable (ventes − ingrédients des burgers produits). */
export function incomeAtPrice(s: State, price: number) {
  const probe = { ...s, price };
  const r = rates(probe);
  const flow = Math.min(r.production, r.demand);
  return flow * (price - r.ingredientCost);
}
export function optimalPrice(s: State) {
  const w = willingnessToPay(s);
  let best = w,
    bestIncome = -1;
  // L’optimum réel reste près du confort : au-delà le volume s’écroule.
  const lo = Math.max(PRICE_MIN, Math.floor(w * 0.45 * 2) / 2);
  const hi = Math.min(PRICE_MAX, Math.ceil(w * 1.35 * 2) / 2);
  const step = w > 200 ? 5 : w > 50 ? 1 : 0.5;
  for (let p = lo; p <= hi; p += step) {
    const income = incomeAtPrice(s, p);
    if (income > bestIncome) {
      bestIncome = income;
      best = p;
    }
  }
  return Math.round(best * 2) / 2;
}
/** Prix ciblé : se rapproche de l’optimum depuis un ancrage prudent, sans l’atteindre. */
export function traderTargetPrice(s: State) {
  const n = s.counts.trader ?? 0;
  if (n <= 0) return s.price;
  const skill = traderSkill(n);
  const optimal = optimalPrice(s);
  const anchor = willingnessToPay(s);
  // Junior : sous-tarif prudent ; senior : rapprochement de l’optimum.
  const naive = Math.max(
    PRICE_MIN,
    Math.round(anchor * (0.72 + skill * 0.1) * 2) / 2,
  );
  let target = Math.min(
    PRICE_MAX,
    Math.max(
      PRICE_MIN,
      Math.round((naive + (optimal - naive) * skill) * 2) / 2,
    ),
  );
  if (target === optimal && skill < 1) {
    const step = skill < 0.55 ? 1 : 0.5;
    const lo = Math.max(PRICE_MIN, optimal - step);
    const hi = Math.min(PRICE_MAX, optimal + step);
    target =
      incomeAtPrice(s, lo) >= incomeAtPrice(s, hi) ? lo : hi;
  }
  return target;
}
export function tick(s: State, seconds: number): State {
  const n = structuredClone(s);
  const steps = Math.floor(Math.min(Math.max(0, seconds), 28800));
  for (let i = 0; i < steps; i++) {
    if ((n.counts.trader ?? 0) > 0 && n.elapsed >= n.priceHoldUntil)
      n.price = traderTargetPrice(n);
    tickMarket(n);
    const r = rates(n);
    n.elapsed++;
    n.ingredients = Math.min(1e100, n.ingredients + r.harvest);
    // Tampon ≈ 30 s de demande (pas de production) : évite de payer des
    // ingrédients pour un stock invendable quand le prix est trop haut.
    const stockCap = Math.max(r.demand * 30, Math.min(r.production, 1));
    const room = Math.max(0, stockCap - n.stock);
    const fromCash =
      n.price > r.ingredientCost
        ? Math.max(0, D(n.money).div(r.ingredientCost).toNumber())
        : 0;
    const can = Math.max(
      0,
      Math.min(r.production, room, n.ingredients + fromCash),
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
/**
 * Inflation de la timeline : +0 % → ~+25 % sur ~40 ans de jeu
 * (1 s réelle = 1 jour). Pas d’exponentielle liée au nombre d’unités.
 */
export function timelineInflation(s: State) {
  const years = Math.max(0, s.elapsed) / 365;
  const t = years / 40;
  return 1 + 0.25 * (1 - Math.exp(-1.8 * t));
}
/** Prix catalogue × inflation timeline. */
export function inflatedCost(s: State, base: Decimal.Value) {
  return D(base).mul(timelineInflation(s)).ceil();
}
/** Coût d’achat : prix unitaire (quasi) fixe × quantité. */
export function cost(s: State, id: string, quantity = 1) {
  const g = GENERATORS.find((g) => g.id === id);
  if (!g || quantity < 1) return D(0);
  return inflatedCost(s, g.base).mul(quantity);
}
export function affordable(s: State, id: string, requested: number | "max") {
  const room = Math.max(0, OWNERSHIP_CAP - (s.counts[id] ?? 0));
  let lo = 0,
    hi = Math.min(
      room,
      requested === "max" ? room : Math.max(0, Math.floor(requested)),
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
    // Après une grosse liquidation, le clic théorique peut dépasser la caisse :
    // on prépare autant que les stocks + la trésorerie le permettent.
    const wanted = burgersPerClick(s);
    const unit = rates(n).ingredientCost;
    const cashRoom =
      unit > 0 ? Math.max(0, D(n.money).div(unit).toNumber()) : wanted;
    const amount = Math.min(wanted, n.ingredients + cashRoom);
    if (amount <= 0) return s;
    const fromStock = Math.min(n.ingredients, amount);
    const extra = Math.max(0, amount - fromStock);
    if (extra > 0 && !pay(D(extra).mul(unit))) return s;
    n.ingredients = Math.max(0, n.ingredients - fromStock);
    n.stock += amount;
    n.manual++;
  }
  if (a.type === "price" && Number.isFinite(a.value)) {
    n.price = Math.min(
      PRICE_MAX,
      Math.max(PRICE_MIN, Math.round(a.value * 2) / 2),
    );
    if ((n.counts.trader ?? 0) > 0)
      n.priceHoldUntil = n.elapsed + PRICE_HOLD_SECONDS;
  }
  if (a.type === "buy") {
    const g = GENERATORS.find((g) => g.id === a.id);
    if (!g || g.era > era(s)) return s;
    if (
      (a.id === "restaurant" || a.id === "trader" || a.id === "farm") &&
      n.level < 3
    )
      return s;
    if (a.id === "trader" && (n.counts.restaurant ?? 0) < 2) return s;
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
      !pay(inflatedCost(n, r.cost))
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
      !pay(inflatedCost(n, p.money))
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
    if (
      !m ||
      restaurantCount(n) <= 0 ||
      n.markets.length >= restaurantCount(n) ||
      m.era > era(n) ||
      n.markets.includes(m.id) ||
      !pay(inflatedCost(n, m.cost))
    )
      return s;
    n.markets.push(m.id);
    note(n, `${m.name} a désormais une nouvelle raison de commander.`);
  }
  if (a.type === "acquire") {
    const r = RIVALS.find((r) => r.id === a.id);
    if (
      !r ||
      n.level < 3 ||
      era(n) < 2 ||
      n.rivals.includes(r.id) ||
      !pay(inflatedCost(n, r.cost))
    )
      return s;
    n.rivals.push(r.id);
    const crew = Math.max(0, Math.floor(r.crew));
    const room = Math.max(0, OWNERSHIP_CAP - (n.counts.cook ?? 0));
    const hired = Math.min(crew, room);
    if (hired > 0) n.counts.cook = (n.counts.cook ?? 0) + hired;
    note(
      n,
      hired > 0
        ? `${r.name} rejoint votre empire · +${hired} employés.`
        : `${r.name} rejoint votre empire. La concurrence applaudit peu.`,
    );
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
    if (
      !p ||
      p.level >= 4 ||
      !pay(inflatedCost(n, 2500 * p.level))
    )
      return s;
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
        `${ev.title} : demande ×${ev.multiplier} pendant ${ev.duration} j.`,
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
  // Petit filet de redémarrage proportionnel au capital (sans casser l’early).
  n.ingredients = Math.max(
    20,
    Math.min(120, 20 + Math.floor(Math.sqrt(n.capital))),
  );
  n.log = [
    "Votre entreprise vient de faire faillite. Les actionnaires sont ravis.",
  ];
  return n;
}
/**
 * Échelle longue française : k · M · Md (10⁹) · B (10¹²) · Bdr (10¹⁵) ·
 * T (10¹⁸) · Tdr (10²¹). Au-delà : notation scientifique.
 */
export function fmt(v: Decimal.Value, digits = 1) {
  const n = D(v);
  if (n.abs().lt(1000))
    return n
      .toNumber()
      .toLocaleString("fr-FR", { maximumFractionDigits: digits });
  // Au-delà du trilliard (10²¹…10²⁴), notation scientifique.
  if (n.abs().gte("1e24")) return n.toExponential(2);
  for (const [power, suffix] of [
    [21, "Tdr"],
    [18, "T"],
    [15, "Bdr"],
    [12, "B"],
    [9, "Md"],
    [6, "M"],
    [3, "k"],
  ] as const) {
    if (n.abs().gte(D(10).pow(power)))
      return `${n.div(D(10).pow(power)).toFixed(digits).replace(".", ",")} ${suffix}`;
  }
  return n.toExponential(2);
}
