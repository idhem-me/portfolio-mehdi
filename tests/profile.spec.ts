import { test, expect } from "@playwright/test";
import {
  identityEnvironment,
  profiles,
  openPseudo,
  openIdentityMenu,
  endGame,
} from "./helpers/identity";
test("local profile is edited once and shared between Games, lobby and the playing toolbar", async ({
  page,
}) => {
  await identityEnvironment(page, profiles.local);
  await page.goto("/en/jeux");
  await openPseudo(page);
  await page
    .getByRole("textbox", { name: "Pseudo", exact: true })
    .fill("Alice Modifiée");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.goto("/en/jeux/tetris");
  await expect(
    page.getByRole("button", {
      name: "Profil joueur : Alice Modifiée",
      exact: true,
    }),
  ).toBeVisible();
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
  await expect(page.getByRole("menu")).toContainText("Alice Modifiée");
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

for (const width of [375, 1280])
  test(`identity choices open one bottom sheet and the photo delete button stays square at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await identityEnvironment(page);
    await page.goto("/en/jeux");
    await openPseudo(page);
    const sheet = page.getByRole("dialog");
    await expect(sheet).toHaveAttribute("data-side", "bottom");
    await expect(
      sheet.getByRole("textbox", { name: "Pseudo", exact: true }),
    ).toBeVisible();
    const image = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 16;
      c.height = 16;
      return c.toDataURL("image/png").split(",")[1];
    });
    await sheet.getByLabel("Photo du profil").setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    });
    const remove = sheet.getByRole("button", {
      name: "Supprimer la photo",
      exact: true,
    });
    await expect(remove).toBeVisible();
    const box = await remove.boundingBox();
    expect(box!.width).toBe(44);
    expect(box!.height).toBe(44);
    expect(await remove.innerText()).toBe("");
    await remove.click();
    await expect(remove).toHaveCount(0);
    await expect(
      sheet.getByRole("button", { name: "Ajouter une photo", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await openIdentityMenu(page);
    await page
      .getByRole("menuitem", { name: "Se connecter avec Google", exact: true })
      .click();
    await expect(sheet).toHaveAttribute("data-side", "bottom");
    await expect(
      sheet.getByRole("button", {
        name: "Se connecter avec Google",
        exact: true,
      }),
    ).toHaveAttribute("data-variant", "secondary");
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await sheet
      .getByRole("button", { name: "Se connecter avec Google", exact: true })
      .hover();
    await page.screenshot({
      path: `/private/tmp/tetris-bottom-sheet-${width}.png`,
    });
  });

for (const width of [375, 1280])
  test(`avatar alignment and menu hierarchy at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await identityEnvironment(page);
    await page.goto("/en/jeux");
    const title = await page.locator("main h1").boundingBox();
    const avatar = await page
      .getByRole("button", { name: "Choisir mon identité", exact: true })
      .boundingBox();
    expect(avatar!.x).toBeGreaterThan(title!.x + title!.width);
    expect(
      Math.abs(avatar!.y + avatar!.height / 2 - title!.y - title!.height / 2),
    ).toBeLessThan(2);
    await page.goto("/en/jeux/tetris");
    const back = await page
      .getByRole("link", { name: "Retour aux jeux" })
      .boundingBox();
    const lobbyAvatar = await page
      .getByRole("button", { name: "Choisir mon identité", exact: true })
      .boundingBox();
    expect(lobbyAvatar!.x).toBeGreaterThan(back!.x + back!.width);
    expect(
      Math.abs(
        lobbyAvatar!.y + lobbyAvatar!.height / 2 - back!.y - back!.height / 2,
      ),
    ).toBeLessThan(2);
    await expect(page.locator(".lava-lobby-panel button")).toHaveText([
      "Jouer",
      "Classement",
      "Règles",
      "Réglages",
    ]);
    await page.getByRole("button", { name: "Jouer", exact: true }).hover();
    await page.screenshot({
      path: `/private/tmp/tetris-menu-${width}.png`,
      animations: "disabled",
    });
    await endGame(page);
    const panel = page.locator(".lava-end-panel");
    await expect(panel.locator(".lava-end-actions button")).toHaveText([
      "Rejouer",
      "Classement",
      "Menu",
      "Se connecter",
    ]);
    await expect(
      panel.getByRole("button", { name: "Valider", exact: true }),
    ).toHaveAttribute("data-variant", "primary");
    const inputBox = await panel
      .getByRole("textbox", { name: "Pseudo", exact: true })
      .boundingBox();
    const validateBox = await panel
      .getByRole("button", { name: "Valider", exact: true })
      .boundingBox();
    expect(validateBox!.height).toBe(inputBox!.height);
    expect(inputBox!.height).toBeGreaterThanOrEqual(44);
    const font = await page
      .locator(".lava-game")
      .evaluate((e) =>
        getComputedStyle(e).getPropertyValue("--font-sans").trim(),
      );
    for (const selector of [
      ".lava-end-score",
      ".lava-top .lava-wordmark",
      ".lava-score",
      ".lava-controls kbd",
    ]) {
      for (const element of await page.locator(selector).all())
        expect(
          await element.evaluate((e) => getComputedStyle(e).fontFamily),
        ).toContain(font.split(",")[0].replaceAll('"', "").trim());
    }
    await expect(panel.getByRole("status")).toHaveText(
      "Score enregistré sur cet appareil",
    );
    expect(
      await page
        .locator(".lava-end-score")
        .evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
    ).toBeGreaterThanOrEqual(36);
    await page.getByRole("button", { name: "Rejouer", exact: true }).hover();
    await page.screenshot({
      path: `/private/tmp/tetris-gameover-${width}.png`,
      animations: "disabled",
    });
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await expect(
      panel.getByRole("button", { name: "Se connecter", exact: true }),
    ).toBeDisabled();
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(
      panel.getByRole("button", { name: "Se connecter", exact: true }),
    ).toBeEnabled();
    await panel
      .getByRole("button", { name: "Classement", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText("Classement");
    await expect(
      page.getByRole("dialog").locator(".identity-selector"),
    ).toHaveCount(0);
    await expect(
      page
        .getByRole("dialog")
        .getByRole("button", { name: /Pseudo|Se connecter/ }),
    ).toHaveCount(0);
    const scoreFont = await page
      .getByRole("dialog")
      .locator("ol span")
      .last()
      .evaluate((e) => getComputedStyle(e).fontFamily);
    expect(scoreFont).toContain(font.split(",")[0].replaceAll('"', "").trim());
  });

for (const width of [375, 1280])
  test(`saved pseudo is text and edited from the Game Over footer at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await identityEnvironment(page, profiles.local);
    await page.goto("/en/jeux/tetris");
    await endGame(page);
    const panel = page.locator(".lava-end-panel");
    await expect(panel.locator(".lava-end-identity")).toContainText(
      "Alice Locale",
    );
    await expect(panel.getByRole("textbox")).toHaveCount(0);
    await expect(
      panel.getByRole("button", { name: "Valider", exact: true }),
    ).toHaveCount(0);
    await expect(
      panel.getByRole("button", { name: "Se connecter", exact: true }),
    ).toHaveCount(0);
    const edit = panel.getByRole("button", {
      name: "Modifier le pseudo",
      exact: true,
    });
    await expect(edit).toBeEnabled();
    await edit.click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toHaveAttribute("data-side", "bottom");
    await sheet
      .getByRole("textbox", { name: "Pseudo", exact: true })
      .fill("Alice Renommée");
    await sheet
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click();
    await expect(panel.locator(".lava-end-identity")).toContainText(
      "Alice Renommée",
    );
    await expect(panel.getByRole("textbox")).toHaveCount(0);
    await page.getByRole("button", { name: "Rejouer", exact: true }).hover();
    await page.screenshot({
      path: `/private/tmp/tetris-pseudo-saved-${width}.png`,
      animations: "disabled",
    });
  });
