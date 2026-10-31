import { test } from "node:test";
import assert from "node:assert/strict";
import {
  demoSessions,
  filterDemoSessions,
  getDemoStats,
} from "../src/components/backoffice/demo";
test("synthetic session filters, ordering and dashboard totals share one dataset", () => {
  assert.equal(demoSessions.length, 1080);
  assert.equal(new Set(demoSessions.map((r) => r.id)).size, 1080);
  const result = filterDemoSessions(
    new URLSearchParams("country=FR&device=desktop&sort=clicks&order=asc"),
  );
  assert.ok(result.rows.length > 0);
  assert.ok(
    result.rows.every((r) => r.country === "FR" && r.device === "desktop"),
  );
  assert.ok(
    result.rows.every(
      (r, i) =>
        i === 0 || Number(r.clicks) >= Number(result.rows[i - 1].clicks),
    ),
  );
  assert.equal(filterDemoSessions(new URLSearchParams("country=ZZ")).total, 0);
  for (const range of ["24h", "7d", "30d", "90d"]) {
    const stats = getDemoStats(range);
    assert.ok(stats.current.sessions > 0);
    assert.equal(
      stats.series.reduce((n, p) => n + p.value, 0),
      stats.current.sessions,
    );
    assert.equal(
      stats.devices.reduce((n, p) => n + p.value, 0),
      stats.current.sessions,
    );
    assert.ok(stats.previous.sessions > 0);
  }
});
