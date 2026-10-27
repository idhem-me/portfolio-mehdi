import { test, expect } from "@playwright/test";

test("cards: mobile browser smoke, reduced motion, ratio and profile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/jeux/cards");
  await page
    .getByRole("button", { name: "Ouvrir un booster", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Découper le booster", exact: true })
    .press("Enter");
  for (let i = 1; i <= 5; i++) {
    await expect(page.getByRole("status")).toContainText(`Carte ${i} sur 5`);
    const card = page.locator(".cards-stack-front");
    await expect(card).toHaveAttribute("aria-disabled", "false");
    await card.press("Enter");
  }
  await expect(
    page.getByRole("heading", { name: "Récapitulatif" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".cards-summary-item")).toHaveCount(5);
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Statistiques locales" }),
  ).toBeVisible();
  await expect(
    page.locator('.cards-profile button[aria-haspopup="dialog"]'),
  ).toHaveCount(0);
});
