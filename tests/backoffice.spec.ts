import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.route("**/api/track", (r) => r.fulfill({ json: { ok: true } }));
});

test("consent gates pages, tracking and APIs", async ({ page, request }) => {
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/track")) calls.push(r.url());
  });
  await page.goto("/backoffice");
  await expect(
    page.getByRole("heading", { name: "Ici, c'est vous la data." }),
  ).toBeVisible();
  expect((await request.get("/api/backoffice/stats")).status()).toBe(403);
  expect((await request.get("/api/backoffice/me")).status()).toBe(403);
  expect((await request.get("/api/backoffice/sessions")).status()).toBe(403);
  expect(calls).toHaveLength(0);
  await page.route("**/api/backoffice/**", (route) =>
    route.fulfill({
      json: route.request().url().includes("/stats")
        ? {
            current: {},
            previous: {},
            online: 0,
            series: [],
            pages: [],
            devices: [],
            countries: [],
          }
        : {},
    }),
  );
  await page
    .getByRole("button", { name: "Accepter les cookies", exact: true })
    .first()
    .click();
  await expect(page.getByText("Vos stats", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("backoffice_visitor")),
  ).toBeTruthy();
  await page
    .locator('[data-sidebar="sidebar"]')
    .getByRole("button", { name: "Cookies", exact: true })
    .click();
  await page.locator('[data-analytics-action="consent_deny"]').click();
  await expect(
    page.getByRole("heading", { name: "Ici, c'est vous la data." }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("backoffice_visitor")),
  ).toBeNull();
});
test("English empty state and mobile navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/backoffice/sessions");
  await expect(
    page.getByRole("heading", { name: "Here, you are the data." }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Backoffice" }),
  ).toBeVisible();
});

test("sessions detail opens on desktop and mobile", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("analytics_consent", "granted");
    document.cookie = "analytics_consent=granted;path=/";
  });
  const row = {
    id: "22222222-2222-4222-8222-222222222222",
    short_label: "Visiteur #ABC123",
    started_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    active_ms: 12000,
    clicks: 4,
    mouse_px: 1000,
    games_played: 1,
    pages: { "/": 2 },
    games: [{ game: "tetris", score: 10 }],
    country: "FR",
    device: "desktop",
    isMe: true,
  };
  await page.route("**/api/backoffice/sessions?**", (r) =>
    r.fulfill({
      json: {
        rows: [row],
        total: 1,
        options: { countries: ["FR"], paths: ["/"] },
      },
    }),
  );
  await page.goto("/backoffice/sessions");
  await page
    .getByRole("button", { name: /Visiteur #ABC123/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Session précédente" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: /Visiteur #ABC123/ })
    .last()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: "/tmp/backoffice-mobile.png" });
});
