import { test, expect } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`mobile navigation geometry and controls (${theme})`, async ({ page }) => {
    await page.addInitScript((value) => {
      localStorage.setItem("analytics_consent", "denied");
      localStorage.setItem("theme", value);
    }, theme);
    for (const width of [320, 390, 767]) {
      await page.setViewportSize({ width, height: 740 });
      await page.goto("/fr/a-propos");
      const trigger = page.getByRole("button", { name: "Ouvrir le menu", exact: true });
      await expect(trigger).toBeVisible();
      await expect(page.locator('[data-slot="sidebar-inset"] > header')).toHaveCount(0);
      await page.evaluate(() => window.scrollTo(0, 250));
      const before = await trigger.boundingBox();
      await trigger.click();
      const dialog = page.locator("#mobile-navigation");
      await expect(dialog).toBeVisible();
      const close = dialog.getByRole("button", { name: "Fermer le menu" });
      expect(await close.boundingBox()).toEqual(before);
      const panel = await dialog.boundingBox();
      expect(panel).toMatchObject({ x: 0, y: 0, width, height: 740 });
      const tiles = dialog.locator("nav a");
      const boxes = await tiles.evaluateAll((links) => links.map((link) => {
        const { x, y, width, height } = link.getBoundingClientRect();
        return { x, y, width, height };
      }));
      expect(boxes.length).toBeGreaterThanOrEqual(4);
      for (let i = 0; i < boxes.length; i++) {
        expect(boxes[i].width).toBeCloseTo(Math.min(width * .9, 400) - 48, 0);
        expect(boxes[i].height).toBeGreaterThanOrEqual(48);
        if (i) expect(boxes[i].y - boxes[i - 1].y - boxes[i - 1].height).toBe(16);
      }
      await expect(dialog.getByRole("button", { name: "Langue", exact: true })).toBeVisible();
      await dialog.getByRole("button", { name: /Activer le mode/ }).click();
      await close.click();
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
      await trigger.click();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await trigger.click();
      await dialog.getByRole("link", { name: "Accueil", exact: true }).click();
      await expect(dialog).toBeHidden();
    }
    await page.setViewportSize({ width: 768, height: 740 });
    await expect(page.getByRole("button", { name: "Ouvrir le menu" })).toHaveCount(0);
    await expect(page.locator('[data-slot="sidebar-container"]')).toBeVisible();
  });
}

test("short mobile menu keeps settings and close accessible", async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 320 });
  await page.goto("/fr/a-propos");
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  const dialog = page.locator("#mobile-navigation");
  const language = dialog.getByRole("button", { name: "Langue", exact: true });
  await language.scrollIntoViewIfNeeded();
  await language.click();
  await expect(page.getByRole("menuitemradio", { name: "English", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  const close = dialog.getByRole("button", { name: "Fermer le menu" });
  expect((await close.boundingBox())?.y).toBe(16);
  await close.click();
  await expect(dialog).toBeHidden();
});
