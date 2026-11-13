import { expect, test } from "@playwright/test";
import { setup } from "../helpers/v3";

test("the public leaderboard renders multiple results from the same player", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/api/tetris/leaderboard", async (route) => {
    await route.fulfill({
      json: [
        {
          id: "run-one",
          name: "Joueur",
          score: 2400,
          lines: 18,
          rank: 1,
          avatar: null,
        },
        {
          id: "run-two",
          name: "Joueur",
          score: 1200,
          lines: 10,
          rank: 2,
          avatar: null,
        },
      ],
    });
  });
  await page.goto("/jeux/tetris");
  await page.getByRole("button", { name: /^Classement/ }).click();
  await expect(
    page.getByRole("heading", { name: "Classement général" }),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await expect(page.locator("tbody tr").nth(0)).toContainText("Joueur");
  await expect(page.locator("tbody tr").nth(0)).toContainText("2 400");
  await expect(page.locator("tbody tr").nth(1)).toContainText("Joueur");
  await expect(page.locator("tbody tr").nth(1)).toContainText("1 200");
});
