import { test, expect, type Page } from "@playwright/test";
async function ready(page: Page, index: number) {
  await expect(page.getByRole("status")).toContainText(
    `Carte ${index + 1} sur 5`,
  );
  await expect(page.locator(".cards-stack-front")).toHaveAttribute(
    "aria-disabled",
    "false",
  );
}
async function finish(page: Page) {
  for (let index = 0; index < 5; index++) {
    await ready(page, index);
    await page.locator(".cards-stack-front").press("Enter");
  }
  await expect(
    page.getByRole("heading", { name: "Récapitulatif" }),
  ).toBeVisible();
}
test("cards: empty reserve blocks real openings; local dev bypass is explicit and resets on reload", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("cards.save.v1"))
      localStorage.setItem(
        "cards.save.v1",
        JSON.stringify({ boosters: { available: 0, updatedAt: Date.now() } }),
      );
  });
  await page.goto("/jeux/cards");
  await expect(
    page.getByRole("button", { name: "Ouvrir un booster", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("0 / 10 boosters gratuits", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Mode dev : boosters illimités/ })
    .click();
  await page
    .getByRole("button", { name: "Ouvrir un booster", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Découper le booster", exact: true })
    .press("Enter");
  await finish(page);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("cards.save.v1")!).boosters.available,
    ),
  ).toBe(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Ouvrir", exact: true }),
  ).toBeDisabled();
});
test("cards: hourly countdown unlocks a single booster and resume does not charge twice", async ({
  page,
}) => {
  await page.clock.install();
  await page.addInitScript(() => {
    if (!localStorage.getItem("cards.save.v1"))
      localStorage.setItem(
        "cards.save.v1",
        JSON.stringify({
          boosters: { available: 0, updatedAt: Date.now() - 3600000 + 2000 },
        }),
      );
  });
  await page.goto("/jeux/cards");
  await expect(
    page.getByRole("button", { name: "Ouvrir un booster", exact: true }),
  ).toBeDisabled();
  await page.clock.fastForward(3000);
  await expect(
    page.getByRole("button", { name: "Ouvrir un booster", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Ouvrir un booster", exact: true })
    .click();
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem("cards.save.v1")!).activeOpen,
  );
  await page.reload();
  await page.clock.fastForward(1000);
  const save = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cards.save.v1")!),
  );
  expect(save.activeOpen.openId).toBe(before.openId);
  expect(save.activeOpen.cards).toEqual(before.cards);
  expect(save.boosters.available).toBe(0);
});
test("cards: Shiny simulation shows stars/halo and never credits collection or spends reserve", async ({
  page,
}) => {
  await page.goto("/jeux/cards");
  await page.getByRole("button", { name: "Shiny", exact: true }).click();
  await expect(page.locator('.cards-stack [data-shiny="true"]')).toHaveCount(5);
  await page
    .getByRole("button", { name: "Découper le booster", exact: true })
    .press("Enter");
  await ready(page, 0);
  await expect(
    page.locator(".cards-stack-front .cards-special-shiny"),
  ).toBeVisible();
  await expect(
    page.locator(".cards-stack-front .cards-shiny-burst > span"),
  ).toHaveCount(8);
  await page.screenshot({ path: "/tmp/cards-shiny-reveal.png" });
  await finish(page);
  const save = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cards.save.v1")!),
  );
  expect(save.collection).toEqual({});
  expect(save.stats.boostersOpened).toBe(0);
  expect(save.boosters.available).toBe(10);
});
test("cards: owned Shiny quantities persist and classic/Shiny variants can be inspected", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "cards.save.v1",
      JSON.stringify({
        collection: {
          "card-001": {
            qty: 3,
            shinyQty: 1,
            firstAcquiredAt: 1,
            lastAcquiredAt: 1,
          },
        },
      }),
    ),
  );
  await page.goto("/jeux/cards");
  await page.getByRole("tab", { name: "Collection", exact: true }).click();
  await page
    .getByRole("button", { name: "Shiny uniquement", exact: true })
    .click();
  await expect(page.locator(".cards-grid-hit")).toHaveCount(1);
  await expect(page.locator('.cards-grid [data-shiny="true"]')).toHaveCount(1);
  await page.locator(".cards-grid-hit").click();
  await expect(page.locator('.cards-detail [data-shiny="true"]')).toHaveCount(
    1,
  );
  await page.getByRole("button", { name: "Classique", exact: true }).click();
  await expect(page.locator('.cards-detail [data-shiny="true"]')).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "✦ Shiny ×1", exact: true }).click();
  await expect(page.locator('.cards-detail [data-shiny="true"]')).toHaveCount(
    1,
  );
  await page.screenshot({ path: "/tmp/cards-shiny-detail.png" });
});
