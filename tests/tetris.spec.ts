import { test, expect } from "@playwright/test";
import { captureFlow, setup } from "./helpers/v3";
const enabled = process.env.TETRIS_TEST_DISABLED !== "true";
test("games feature gate, legacy redirect, metadata and sitemap", async ({
  page,
  request,
}) => {
  await setup(page);
  await page.goto("/realisations");
  await expect(page.getByRole("link", { name: /Lava/ })).toHaveCount(0);
  if (enabled) {
    await page.goto("/jeux");
    await expect(page.getByRole("link", { name: /Lava/ })).toBeVisible();
    await page.goto("/realisations/tetris");
    await expect(page).toHaveURL(/\/jeux\/tetris$/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    const legacy = await request.get("/realisations/tetris", {
      maxRedirects: 0,
    });
    expect(legacy.status()).toBe(308);
  } else {
    for (const locale of ["", "/fr", "/en", "/ar"])
      for (const path of ["/jeux", "/jeux/tetris", "/realisations/tetris"]) {
        const r = await request.get(locale + path);
        expect(r.status()).toBe(404);
      }
    await expect(
      page.getByRole("link", { name: "Jeux", exact: true }),
    ).toHaveCount(0);
  }
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
    "/jeux/tetris",
  );
});
for (const theme of ["light", "dark"])
  test(`desktop ${theme}: complete V3 capture flow`, async ({ page }) => {
    test.skip(!enabled);
    await page.setViewportSize({ width: 1440, height: 1100 });
    await captureFlow(page, theme, "chromium-desktop");
  });
test("SVG fallback and reduced motion remain playable", async ({ page }) => {
  test.skip(!enabled);
  await setup(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type === "webgl") return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("/jeux/tetris");
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await expect(page.locator(".lava-canvas")).toHaveCSS("visibility", "hidden");
  await expect(page.locator(".lava-game")).toHaveAttribute(
    "data-reduced",
    "true",
  );
  for (let i = 0; i < 35; i++) {
    if (
      await page
        .getByRole("button", { name: "Rejouer", exact: true })
        .isVisible()
    )
      break;
    await page.keyboard.press("Space");
  }
  await expect(
    page.getByRole("button", { name: "Rejouer", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => Number(localStorage.getItem("lava-best"))),
  ).toBeGreaterThan(0);
});
test("landscape and small portrait fit the viewport", async ({ page }) => {
  test.skip(!enabled);
  await setup(page);
  for (const viewport of [
    { width: 844, height: 390 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/jeux/tetris");
    await page.getByRole("button", { name: "Jouer", exact: true }).click();
    const board = await page.locator(".lava-board").boundingBox(),
      controls = await page.locator(".lava-controls").boundingBox();
    expect(board!.y).toBeGreaterThanOrEqual(0);
    expect(board!.y + board!.height).toBeLessThanOrEqual(viewport.height);
    expect(controls!.y + controls!.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({
      path: `docs/tetris/v3/geometry-${viewport.width}x${viewport.height}.png`,
    });
  }
});

test("development onboarding reset is consumed before play", async ({
  page,
}) => {
  test.skip(!enabled);
  await setup(page);
  await page.addInitScript(() =>
    localStorage.setItem("tetris.onboardingDone", "true"),
  );
  await page.goto("/jeux/tetris?resetOnboarding");
  await expect(page).toHaveURL(/\/jeux\/tetris$/);
  expect(
    await page.evaluate(() => localStorage.getItem("tetris.onboardingDone")),
  ).toBeNull();
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("tetris.onboardingDone")),
  ).toBe("true");
});
