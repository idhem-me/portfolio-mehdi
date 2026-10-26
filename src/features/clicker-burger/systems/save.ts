import { MISSIONS } from "../data/missions";
import { initial, tick, D, type State } from "../engine/game";
import { GENERATORS, MARKETS, RESEARCH, RIVALS } from "../data/content";
export const SAVE_KEY = "food-empire.save.v1";
const numeric = (v: unknown, max = 1e100) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
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
    if (
      typeof v[key] !== "string" ||
      v[key].length > 1000 ||
      !D(v[key]).isFinite() ||
      D(v[key]).lt(0) ||
      D(v[key]).gt("1e300")
    )
      throw Error("Montant invalide.");
    s[key] = D(v[key]).toString();
  }
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
  if (
    s.price < 1 ||
    s.price > 20 ||
    s.boost > 10 ||
    s.lastSaved > Date.now() + 60000
  )
    throw Error("Valeur hors limites.");
  if (
    !v.counts ||
    GENERATORS.some(
      (g) =>
        !Number.isInteger(v.counts[g.id]) || !numeric(v.counts[g.id], 10000),
    )
  )
    throw Error("Catalogue invalide.");
  s.counts = Object.fromEntries(GENERATORS.map((g) => [g.id, v.counts[g.id]]));
  for (const [key, ids] of [
    ["research", RESEARCH.map((r) => r.id)],
    ["markets", MARKETS.map((m) => m.id)],
    ["rivals", RIVALS.map((r) => r.id)],
  ] as const) {
    if (
      !Array.isArray(v[key]) ||
      v[key].length > ids.length ||
      new Set(v[key]).size !== v[key].length ||
      v[key].some((id: string) => !ids.includes(id))
    )
      throw Error("Déblocages invalides.");
    s[key] = v[key];
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
  if (!Number.isInteger(v.event) || v.event < -1 || v.event > 2)
    throw Error("Événement invalide.");
  s.event = v.event;
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
