import { MISSIONS } from "../data/missions";
import {
  initial,
  tick,
  D,
  legacyBuildingLevel,
  calendarStartISO,
  PRICE_MAX,
  PRICE_MIN,
  OWNERSHIP_CAP,
  type State,
} from "../engine/game";
import {
  EVENTS,
  GENERATORS,
  MARKETS,
  MARKET_ID_MIGRATE,
  RESEARCH,
  RIVALS,
} from "../data/content";
import { PROJECTS } from "../data/projects";
function migrateMarketIds(ids: unknown): string[] | null {
  if (!Array.isArray(ids)) return null;
  const allowed = new Set(MARKETS.map((m) => m.id));
  const next: string[] = [];
  for (const id of ids) {
    if (typeof id !== "string") return null;
    const mapped = MARKET_ID_MIGRATE[id] ?? id;
    if (!allowed.has(mapped)) return null;
    if (!next.includes(mapped)) next.push(mapped);
  }
  return next;
}
export const SAVE_KEY = "food-empire.save.v1";
const numeric = (v: unknown, max = 1e100) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
const moneyField = (v: unknown, label: string) => {
  if (
    typeof v !== "string" ||
    v.length > 1000 ||
    !D(v).isFinite() ||
    D(v).lt(0) ||
    D(v).gt("1e300")
  )
    throw Error(label);
  return D(v).toString();
};
export function parseSave(raw: string): State {
  if (raw.length > 2000000)
    throw Error("Fichier trop volumineux (2 Mo maximum).");
  const v = JSON.parse(raw);
  if (!v || v.version !== 1)
    throw Error("Version de sauvegarde non prise en charge.");
  const s = initial();
  const missionIds = MISSIONS.map((m) => m.id);
  if (
    v.missionClaims !== undefined &&
    (!Array.isArray(v.missionClaims) ||
      v.missionClaims.length > missionIds.length ||
      v.missionClaims.some(
        (id: unknown) => typeof id !== "string" || !missionIds.includes(id),
      ) ||
      new Set(v.missionClaims).size !== v.missionClaims.length)
  )
    throw Error("Missions invalides.");
  s.missionClaims = v.missionClaims ?? [];
  for (const key of ["money", "earned"] as const) {
    s[key] = moneyField(v[key], "Montant invalide.");
  }
  s.marketFund =
    v.marketFund === undefined
      ? "0"
      : moneyField(v.marketFund, "Fonds boursiers invalides.");
  if (v.marketIndex === undefined) s.marketIndex = 100;
  else if (!numeric(v.marketIndex, 500) || v.marketIndex < 20)
    throw Error("Indice boursier invalide.");
  else s.marketIndex = v.marketIndex;
  for (const k of [
    "stock",
    "ingredients",
    "price",
    "sold",
    "manual",
    "capital",
    "elapsed",
    "eventSeen",
    "boost",
    "boostUntil",
    "lastSaved",
  ] as const) {
    if (!numeric(v[k], k === "capital" ? 1e9 : 1e100))
      throw Error(`Donnée invalide : ${k}`);
    s[k] = v[k];
  }
  if (v.priceHoldUntil === undefined) s.priceHoldUntil = 0;
  else if (!numeric(v.priceHoldUntil))
    throw Error("Donnée invalide : priceHoldUntil");
  else s.priceHoldUntil = v.priceHoldUntil;
  if (v.calendarStart === undefined) {
    // Anciennes saves : reculer depuis aujourd’hui du nombre de jours joués.
    const back = new Date();
    back.setUTCDate(back.getUTCDate() - Math.floor(s.elapsed));
    s.calendarStart = calendarStartISO(back.getTime());
  } else if (
    typeof v.calendarStart !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v.calendarStart)
  )
    throw Error("Calendrier invalide.");
  else s.calendarStart = v.calendarStart;
  if (s.boost > 10 || s.lastSaved > Date.now() + 60000)
    throw Error("Valeur hors limites.");
  if (!Number.isFinite(s.price) || s.price < PRICE_MIN)
    throw Error("Valeur hors limites.");
  s.price = Math.min(PRICE_MAX, s.price);
  if (!v.counts || typeof v.counts !== "object")
    throw Error("Catalogue invalide.");
  s.counts = Object.fromEntries(
    GENERATORS.map((g) => {
      const n = v.counts[g.id];
      if (n === undefined) return [g.id, 0];
      if (!Number.isInteger(n) || !numeric(n, OWNERSHIP_CAP))
        throw Error("Catalogue invalide.");
      return [g.id, n];
    }),
  );
  for (const [key, ids] of [
    ["research", RESEARCH.map((r) => r.id)],
    ["rivals", RIVALS.map((r) => r.id)],
    ["projects", PROJECTS.map((p) => p.id)],
  ] as const) {
    if (key === "projects" && v.projects === undefined) {
      s.projects = [];
      continue;
    }
    if (
      !Array.isArray(v[key]) ||
      v[key].length > ids.length ||
      new Set(v[key]).size !== v[key].length ||
      v[key].some((id: string) => !ids.includes(id))
    )
      throw Error("Déblocages invalides.");
    s[key] = v[key];
  }
  {
    const markets = migrateMarketIds(v.markets);
    if (!markets || markets.length > MARKETS.length)
      throw Error("Déblocages invalides.");
    s.markets = markets;
  }
  if (!Array.isArray(v.plots) || v.plots.length < 1 || v.plots.length > 25)
    throw Error("Carte invalide.");
  const positions = new Set();
  for (const p of v.plots) {
    if (
      !p ||
      !Number.isInteger(p.x) ||
      !Number.isInteger(p.y) ||
      p.x < 0 ||
      p.x > 4 ||
      p.y < 0 ||
      p.y > 4 ||
      !Number.isInteger(p.level) ||
      p.level < 1 ||
      p.level > 4 ||
      !["stand", ...GENERATORS.map((g) => g.asset)].includes(p.type)
    )
      throw Error("Bâtiment invalide.");
    const pos = `${p.x},${p.y}`;
    if (positions.has(pos)) throw Error("Terrain dupliqué.");
    positions.add(pos);
  }
  s.plots = v.plots.map((p: State["plots"][number]) => ({
    x: p.x,
    y: p.y,
    type: p.type,
    level: p.level,
  }));
  if (
    !Number.isInteger(v.event) ||
    v.event < -1 ||
    v.event >= EVENTS.length
  )
    throw Error("Événement invalide.");
  s.event = v.event;
  if (
    v.level !== undefined &&
    (!Number.isInteger(v.level) || v.level < 1 || v.level > 10)
  )
    throw Error("Niveau invalide.");
  s.level = v.level ?? legacyBuildingLevel(s);
  if (v.nextEventAt !== undefined && !numeric(v.nextEventAt))
    throw Error("Événement invalide.");
  s.nextEventAt = v.nextEventAt ?? s.elapsed + 180;
  if (v.eventTerms !== undefined && v.eventTerms !== null) {
    for (const k of ["cost", "reward"])
      if (
        typeof v.eventTerms[k] !== "string" ||
        v.eventTerms[k].length > 1000 ||
        !D(v.eventTerms[k]).isFinite() ||
        D(v.eventTerms[k]).lt(0) ||
        D(v.eventTerms[k]).gt("1e300")
      )
        throw Error("Offre invalide.");
    s.eventTerms = { cost: v.eventTerms.cost, reward: v.eventTerms.reward };
  }

  s.log = Array.isArray(v.log)
    ? v.log
        .filter((x: unknown) => typeof x === "string")
        .slice(0, 25)
        .map((x: string) => x.slice(0, 300))
    : s.log;
  return s;
}
export function resume(s: State, now = Date.now()) {
  const seconds = Math.min(
    28800,
    Math.max(0, Math.floor((now - s.lastSaved) / 1000)),
  );
  const next = tick(s, seconds);
  next.lastSaved = now;
  return {
    state: next,
    seconds,
    gain: D(next.money).minus(s.money).toString(),
  };
}
export function load(key = SAVE_KEY) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...resume(parseSave(raw)), error: "" };
  } catch {
    return {
      state: initial(),
      seconds: 0,
      gain: "0",
      error:
        "Sauvegarde illisible. L’original reste conservé tant que vous ne choisissez pas de le remplacer dans les réglages.",
    };
  }
  return { state: initial(), seconds: 0, gain: "0", error: "" };
}
