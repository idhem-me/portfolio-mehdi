import type { Row } from "./data";

/** Fixed, wholly synthetic dataset. Never derived from analytics or visitor activity. */
export const DEMO_NOW = Date.UTC(2026, 9, 31, 16);
const countries = ["FR", "US", "DE", "GB", "CA", "JP", "ES", "IT"];
const devices = ["desktop", "mobile", "desktop", "tablet", "mobile"];
const paths = [
  "/",
  "/realisations",
  "/contact",
  "/jeux/tetris",
  "/outils",
  "/backoffice",
];
export const demoSessions: Row[] = Array.from({ length: 1080 }, (_, i) => {
  const started = DEMO_NOW - (i * 4 * 3600000 + (i % 7) * 60000);
  const plays = i % 3 === 0 ? 1 + (i % 4) : 0;
  return {
    id: `demo-session-${i + 1}`,
    short_label: `Visiteur #${(0xa10000 + i * 137).toString(16).toUpperCase()}`,
    started_at: new Date(started).toISOString(),
    last_seen_at: new Date(
      i < 3 ? DEMO_NOW - i * 30000 : started + 60000,
    ).toISOString(),
    isMe: false,
    isCurrent: false,
    country: countries[i % countries.length],
    device: devices[i % devices.length],
    browser: ["Chrome", "Safari", "Firefox"][i % 3],
    active_ms: 45000 + ((i * 7919) % 900000),
    mouse_px: 1500 + ((i * 15473) % 250000),
    clicks: 8 + ((i * 7) % 100),
    key_presses: (i * 3) % 60,
    brush_strokes: i % 5 === 0 ? 12 + (i % 40) : 0,
    colors_used: 1 + (i % 6),
    games_played: plays,
    cta_clicks: i % 4,
    theme_toggles: i % 3,
    lang_changes: i % 2,
    pages: Object.fromEntries([
      ["/", 1 + (i % 3)],
      [paths[1 + (i % (paths.length - 1))], 1 + (i % 4)],
    ]),
    games: plays ? [{ game: "tetris", score: 1500 + i * 123 }] : [],
  };
});
export function filterDemoSessions(params: URLSearchParams) {
  const from = Date.parse(params.get("from") || "");
  const to = Date.parse(params.get("to") || "");
  const rows = demoSessions.filter((row) => {
    const started = Date.parse(row.started_at);
    return (
      (!Number.isFinite(from) || started >= from) &&
      (!Number.isFinite(to) || started <= to) &&
      (!params.get("country") || row.country === params.get("country")) &&
      (!params.get("device") || row.device === params.get("device")) &&
      (!params.get("visitedPath") || !!row.pages[params.get("visitedPath")!])
    );
  });
  const sort = ["started_at", "active_ms", "clicks", "mouse_px"].includes(
    params.get("sort") || "",
  )
    ? params.get("sort")!
    : "started_at";
  const direction = params.get("order") === "asc" ? 1 : -1;
  rows.sort(
    (a, b) =>
      direction *
      (sort === "started_at"
        ? Date.parse(a.started_at) - Date.parse(b.started_at)
        : Number(a[sort]) - Number(b[sort])),
  );
  return { rows, total: rows.length, options: { countries, paths } };
}
const aggregate = (rows: Row[]) => ({
  visitors: Math.round(rows.length * 0.8),
  sessions: rows.length,
  active_ms: rows.length
    ? rows.reduce((n, r) => n + Number(r.active_ms), 0) / rows.length
    : 0,
  mouse_px: rows.reduce((n, r) => n + Number(r.mouse_px), 0),
  clicks: rows.reduce((n, r) => n + Number(r.clicks), 0),
  games_played: rows.reduce((n, r) => n + Number(r.games_played), 0),
});
export function getDemoStats(range: string) {
  const days =
    ({ "24h": 1, "7d": 7, "30d": 30, "90d": 90 } as Record<string, number>)[
      range
    ] || 7;
  const from = DEMO_NOW - days * 86400000;
  const rows = demoSessions.filter((r) => Date.parse(r.started_at) >= from);
  const previous = demoSessions.filter(
    (r) =>
      Date.parse(r.started_at) < from &&
      Date.parse(r.started_at) >= from - days * 86400000,
  );
  const bucket = days === 1 ? 3600000 : 86400000;
  const start = Math.floor(from / bucket) * bucket;
  const series = Array.from({ length: days === 1 ? 25 : days + 1 }, (_, i) => {
    const time = start + i * bucket;
    return {
      label: new Date(time).toISOString(),
      value: rows.filter(
        (r) =>
          Date.parse(r.started_at) >= time &&
          Date.parse(r.started_at) < time + bucket,
      ).length,
    };
  });
  return {
    current: aggregate(rows),
    previous: aggregate(previous),
    online: 3,
    series,
    devices: devices
      .filter((v, i, a) => a.indexOf(v) === i)
      .map((label) => ({
        label,
        value: rows.filter((r) => r.device === label).length,
      })),
    countries: countries.map((label) => ({
      label,
      value: rows.filter((r) => r.country === label).length,
    })),
    pages: paths
      .map((label) => ({
        label,
        value: rows.reduce((n, r) => n + (r.pages[label] || 0), 0),
      }))
      .sort((a, b) => b.value - a.value),
  };
}
