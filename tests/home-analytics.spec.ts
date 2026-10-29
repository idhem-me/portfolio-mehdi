import { test, expect, type Page } from "@playwright/test";
import { gunzipSync } from "node:zlib";
// Run the dev server with NEXT_PUBLIC_POSTHOG_TEST_CAPTURE=true. Requests are intercepted.
type Captured = { event: string; properties: Record<string, unknown> };
async function interceptAnalytics(page: Page) {
  const events: Captured[] = [];
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!url.hostname.endsWith("posthog.com")) return route.continue();
    const body = request.postDataBuffer();
    if (body && /\/e\/?$/.test(url.pathname)) {
      let raw = body;
      if (raw[0] === 0x1f && raw[1] === 0x8b) raw = gunzipSync(raw);
      let payload: unknown;
      try {
        payload = JSON.parse(raw.toString());
      } catch {
        const data = new URLSearchParams(raw.toString()).get("data");
        if (data) payload = JSON.parse(Buffer.from(data, "base64").toString());
      }
      if (Array.isArray(payload)) events.push(...payload);
      else if (payload && typeof payload === "object" && "batch" in payload)
        events.push(...(payload as { batch: Captured[] }).batch);
      else if (payload) events.push(payload as Captured);
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        analytics: { endpoint: "https://eu.i.posthog.com/i/v0/e/" },
        autocapture_opt_out: false,
        defaultIdentifiedOnly: false,
        status: 1,
        featureFlags: {},
        errorsWhileComputingFlags: false,
      }),
    });
  });
  return events;
}
test("homepage sends named interactions to PostHog once per action", async ({
  page,
}) => {
  const events = await interceptAnalytics(page);
  await page.addInitScript(() =>
    localStorage.setItem("analytics_consent", "granted"),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Succès", exact: true }).click();
  const brush = page.getByRole("button", { name: "Pinceau", exact: true });
  await brush.click();
  await page.mouse.move(700, 340);
  await page.mouse.down({ button: "left" });
  await page.mouse.move(850, 370, { steps: 10 });
  await page.mouse.up({ button: "left" });
  await page.mouse.click(900, 370, { button: "right" });
  await page.getByRole("button", { name: "Touche-moi", exact: true }).click();
  await page.getByRole("button", { name: "Config", exact: true }).click();
  const range = page.locator('input[data-analytics-value="gravity"]');
  await range.focus();
  await range.press("ArrowRight");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page
    .locator('a[data-analytics-action="home_cta"][href="/realisations"]')
    .click();
  const interactions = () =>
    events.filter((e) => e.event === "home_interaction");
  await expect
    .poll(() => interactions().map((e) => e.properties.action), {
      timeout: 15000,
    })
    .toEqual(
      expect.arrayContaining([
        "paint_color",
        "paint_grab",
        "paint_stroke",
        "gravity_play",
        "gravity_config",
        "gravity_tune",
        "gravity_reset",
        "home_cta",
      ]),
    );
  for (const action of [
    "paint_color",
    "paint_grab",
    "paint_stroke",
    "gravity_play",
    "gravity_config",
    "gravity_reset",
    "home_cta",
  ]) {
    expect(
      interactions().filter((e) => e.properties.action === action),
    ).toHaveLength(1);
  }
  const color = interactions().find(
    (e) => e.properties.action === "paint_color",
  )!;
  expect(color.properties).toMatchObject({
    value: "success",
    page: "home",
    locale: "fr",
  });
  const tuning = interactions().find(
    (e) => e.properties.action === "gravity_tune",
  )!;
  expect(tuning.properties.control).toBe("gravity");
  expect(typeof tuning.properties.value).toBe("number");
  expect(
    interactions().find((e) => e.properties.action === "paint_stroke")!
      .properties,
  ).not.toHaveProperty("points");
  const count = interactions().length;
  await page.getByRole("link", { name: "Jeux", exact: true }).first().click();
  await page.waitForTimeout(1000);
  expect(interactions()).toHaveLength(count);
});
test("no PostHog events are sent without consent", async ({ page }) => {
  const events = await interceptAnalytics(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Succès", exact: true }).click();
  await page.getByRole("button", { name: "Refuser", exact: true }).click();
  await page.getByRole("button", { name: "Touche-moi", exact: true }).click();
  await page.waitForTimeout(1000);
  expect(events).toEqual([]);
});
