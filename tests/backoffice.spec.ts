import { test, expect } from "@playwright/test";

test("demo dashboard restores periods and charts without loading visitor data", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  const dataRequests: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/\/api\/(backoffice|analytics)/.test(r.url()))
      dataRequests.push(r.url());
  });
  await page.addInitScript(() =>
    localStorage.setItem("analytics_consent", "denied"),
  );
  await page.goto("/backoffice");
  await expect(
    page.getByRole("heading", { name: "Tableau de bord" }),
  ).toBeVisible();
  await expect(
    page
      .getByText(
        "Démonstration : toutes les valeurs affichées ci-dessous sont fictives.",
      )
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Sessions", exact: true }),
  ).toBeVisible();
  for (const option of ["24 heures", "30 jours", "90 jours", "7 jours"]) {
    await page.getByRole("combobox", { name: "Période" }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
    await page.getByRole("img", { name: "Sessions", exact: true }).hover();
  }
  await page.getByRole("link", { name: "Sessions", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sessions", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Tableau de bord", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Appareils", exact: true }),
  ).toBeVisible();
  expect(dataRequests).toEqual([]);
  expect(errors).toEqual([]);
  for (const path of [
    "/api/backoffice/stats",
    "/api/backoffice/sessions",
    "/api/backoffice/sessions/11111111-1111-4111-8111-111111111111",
    "/api/analytics/summary",
  ]) {
    expect(
      (
        await request.get(path, {
          headers: { cookie: "analytics_consent=granted" },
        })
      ).status(),
    ).toBe(401);
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

test("demo sessions restore flags, filters, details and infinite scroll", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem("analytics_consent", "denied"),
  );
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/backoffice/sessions");
  const table = page.getByRole("table");
  await expect(table).toBeVisible();
  await expect(table.locator("tbody tr")).toHaveCount(15);
  await expect(
    table.getByRole("img", { name: "France", exact: true }).first(),
  ).toBeVisible();
  await expect(
    table.getByText("Ordinateur", { exact: true }).first(),
  ).toBeAttached();
  await table.getByRole("button", { name: /#A10000/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByTestId("session-load-more").scrollIntoViewIfNeeded();
  await expect
    .poll(() => table.locator("tbody tr").count())
    .toBeGreaterThan(15);
  await page.getByRole("combobox", { name: "Appareil", exact: true }).click();
  await page.getByRole("option", { name: "Mobile", exact: true }).click();
  await expect(table.locator("tbody tr")).toHaveCount(15);
  await expect(table.getByText("Ordinateur", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Réinitialiser les filtres", exact: true })
    .click();
  await expect(
    table.getByText("Ordinateur", { exact: true }).first(),
  ).toBeAttached();
  await page.screenshot({
    path: "/tmp/backoffice-demo-sessions-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("demo session details work in the mobile drawer", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/backoffice/sessions");
  await page
    .getByRole("button", { name: /#A10000/ })
    .filter({ visible: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Session suivante", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toContainText("#A10000");
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/backoffice-demo-sessions-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
