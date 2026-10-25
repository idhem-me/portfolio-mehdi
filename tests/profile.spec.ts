import { test, expect } from "@playwright/test";
const disabled = process.env.TETRIS_TEST_DISABLED === "true";

test("local player profile is shared between Games and Tetris and persists after reload", async ({
  page,
}) => {
  test.skip(disabled, "Feature disabled");
  let profile: { name: string; avatar: string | null } | null = null;
  const savedProfiles: Array<{ name: string; avatar: string | null }> = [];
  await page.route("**/api/tetris/profile", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: profile });
      return;
    }
    const posted = route.request().postDataJSON() as {
      name: string;
      avatar: string | null;
    };
    profile = posted;
    savedProfiles.push(posted);
    await route.fulfill({ json: posted });
  });
  await page.addInitScript(() =>
    localStorage.setItem("analytics_consent", "denied"),
  );
  await page.goto("/en/jeux");
  await page.getByRole("button", { name: "Créer mon profil joueur" }).click();
  await page.getByLabel("Pseudo").fill("Joueuse Test");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Profil joueur : Joueuse Test" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Profil joueur : Joueuse Test" }),
  ).toBeVisible();
  await page.goto("/en/jeux/tetris");
  const button = page.getByRole("button", {
    name: "Profil joueur : Joueuse Test",
  });
  await button.click();
  await expect(page.getByLabel("Pseudo")).toHaveValue("Joueuse Test");
  await page.getByLabel("Pseudo").fill("Joueuse Modifiée");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Profil joueur : Joueuse Modifiée" }),
  ).toBeVisible();
  expect(savedProfiles.at(-1)?.name).toBe("Joueuse Modifiée");
});
