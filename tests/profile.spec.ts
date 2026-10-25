import { test, expect } from "@playwright/test";
import { identityEnvironment, profiles } from "./helpers/identity";
test("local profile is edited once and shared between Games, lobby and the playing toolbar", async ({
  page,
}) => {
  await identityEnvironment(page, profiles.local);
  await page.goto("/en/jeux");
  await page.getByRole("button", { name: "Modifier", exact: true }).click();
  await page.getByLabel("Pseudo", { exact: true }).fill("Alice Modifiée");
  await page
    .getByRole("button", { name: "Enregistrer le profil", exact: true })
    .click();
  await page.goto("/en/jeux/tetris");
  await expect(page.locator(".identity-profile")).toContainText(
    "Alice Modifiée",
  );
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  const profile = page.getByRole("button", {
      name: "Profil joueur : Alice Modifiée",
      exact: true,
    }),
    settings = page.getByRole("button", { name: "Réglages", exact: true });
  await expect(profile).toBeVisible();
  const p = await profile.boundingBox(),
    s = await settings.boundingBox();
  expect(p!.x + p!.width).toBeLessThanOrEqual(s!.x);
  expect(Math.abs(p!.y + p!.height / 2 - s!.y - s!.height / 2)).toBeLessThan(2);
  await profile.click();
  await expect(
    page.getByRole("dialog").locator(".identity-profile"),
  ).toContainText("Alice Modifiée");
});
test("cover blocks are large and the background uses a fixed reduced-motion-aware pool", async ({
  page,
}) => {
  await identityEnvironment(page);
  await page.goto("/en/jeux");
  const cover = page.locator(".tetris-cover"),
    block = cover.locator(":scope > span .lava-mini").first();
  const c = await cover.boundingBox(),
    b = await block.boundingBox();
  expect(b!.width / c!.width).toBeGreaterThan(0.3);
  await page.goto("/en/jeux/tetris");
  const bricks = page.locator(".lava-background > div");
  await expect(bricks).toHaveCount(14);
  expect(
    await bricks.first().evaluate((e) => parseFloat(getComputedStyle(e).width)),
  ).toBeGreaterThanOrEqual(192);
  const frames = await bricks
    .first()
    .evaluate((e) =>
      (e.getAnimations()[0].effect as KeyframeEffect).getKeyframes(),
    );
  expect(
    frames.every((f) =>
      Object.keys(f).every((k) =>
        [
          "offset",
          "easing",
          "composite",
          "computedOffset",
          "transform",
        ].includes(k),
      ),
    ),
  ).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(bricks.first()).toHaveCSS("animation-name", "none");
  await expect(bricks).toHaveCount(14);
});
