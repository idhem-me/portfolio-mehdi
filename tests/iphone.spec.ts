import { test, expect } from "@playwright/test";
import { captureFlow } from "./helpers/v3";
const enabled = process.env.TETRIS_TEST_DISABLED !== "true";
test("P0: iPhone navigation and touch interaction before and after Lava", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("analytics_consent", "denied"),
  );
  async function home(navigate = true) {
    if (navigate) await page.goto("/");
    const trigger = page.locator('[data-slot="sidebar-trigger"]').first();
    await expect(trigger).toBeVisible();
    await trigger.tap();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("link", { name: "Accueil", exact: true }).tap();
    await page.getByRole("button", { name: "Touche-moi", exact: true }).tap();
    await expect(page.getByRole("button", { name: /Reset/i })).toBeVisible();
    await expect(page.locator("[data-physics-item]").first()).toHaveCSS(
      "visibility",
      "hidden",
    );
    expect(
      await page.evaluate(() => ({
        body: document.body.style.overflow,
        html: document.documentElement.style.overscrollBehavior,
      })),
    ).toEqual({ body: "", html: "" });
  }
  await home();
  if (enabled) {
    await page.goto("/jeux/tetris");
    await page.getByRole("button", { name: "Jouer", exact: true }).tap();
    await page
      .getByRole("button", { name: /Quitter le jeu|Quitter la partie/ })
      .tap();
    await page.getByRole("link", { name: "← Jeux", exact: true }).tap();
    await page.locator('[data-slot="sidebar-trigger"]').first().tap();
    await page.getByRole("link", { name: "Accueil", exact: true }).tap();
    await home(false);
  } else {
    await page.goto("/realisations");
    await expect(page.getByRole("link", { name: /Lava/ })).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Jeux", exact: true }),
    ).toHaveCount(0);
  }
});

for (const theme of ["light", "dark"])
  test(`iPhone ${theme}: complete V3 capture flow`, async ({ page }) => {
    test.skip(!enabled);
    await captureFlow(page, theme, "webkit-iphone");
  });
