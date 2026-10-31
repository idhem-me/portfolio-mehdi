import { test, expect } from "@playwright/test";

test("backoffice requires administrator authentication even after analytics consent", async ({
  page,
  request,
}) => {
  await page.goto("/backoffice");
  await expect(page).toHaveURL(/\/dashboard\/login/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.evaluate(() => {
    document.cookie = "analytics_consent=granted;path=/";
  });
  await page.goto("/en/backoffice/sessions");
  await expect(page).toHaveURL(/\/dashboard\/login/);
  for (const path of [
    "/api/backoffice/stats",
    "/api/backoffice/sessions",
    "/api/backoffice/sessions/11111111-1111-4111-8111-111111111111",
    "/api/analytics/summary",
  ]) {
    const response = await request.get(path, {
      headers: { cookie: "analytics_consent=granted" },
    });
    expect(response.status()).toBe(401);
  }
});

test("visitor deletion and dashboard login reject cross-site requests", async ({
  request,
}) => {
  for (const [path, method] of [
    ["/api/backoffice/me", "DELETE"],
    ["/api/dashboard/login", "POST"],
    ["/api/dashboard/logout", "POST"],
  ]) {
    const response = await request.fetch(path, {
      method,
      headers: {
        origin: "https://attacker.example",
        "content-type": "application/json",
      },
      data: "{}",
    });
    expect(response.status()).toBe(403);
  }
});

test("security headers protect public pages and SVG assets", async ({
  request,
}) => {
  const response = await request.get("/");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(response.headers()["content-security-policy"]).toContain(
    "object-src 'none'",
  );
});

test("a server-issued visitor identity cannot reuse the previous visitor session", async ({
  page,
}) => {
  const previous = "11111111-1111-4111-8111-111111111111";
  const oldSession = "22222222-2222-4222-8222-222222222222";
  const current = "33333333-3333-4333-8333-333333333333";
  const batches: { visitor_id: string; session_id: string }[] = [];
  await page.route("https://**", (route) => route.abort());
  await page.route("**/api/backoffice/me", (route) =>
    route.fulfill({ json: { visitor_id: current } }),
  );
  await page.route("**/api/track", (route) => {
    batches.push(JSON.parse(route.request().postData()!));
    return route.fulfill({ json: { ok: true } });
  });
  await page.addInitScript(
    ({ previous, oldSession }) => {
      localStorage.setItem("analytics_consent", "granted");
      localStorage.setItem("backoffice_visitor", previous);
      document.cookie = "analytics_consent=granted;path=/";
      sessionStorage.setItem("backoffice_session", oldSession);
      sessionStorage.setItem("backoffice_activity", String(Date.now()));
    },
    { previous, oldSession },
  );
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("backoffice_visitor")))
    .toBe(current);
  expect(
    await page.evaluate(() => sessionStorage.getItem("backoffice_session")),
  ).not.toBe(oldSession);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expect.poll(() => batches.length).toBeGreaterThan(0);
  expect(batches[0].visitor_id).toBe(current);
  expect(batches[0].session_id).not.toBe(oldSession);
});
