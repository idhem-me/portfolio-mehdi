import { test, expect } from "@playwright/test";
const disabled = process.env.TETRIS_TEST_DISABLED === "true";
for (const theme of ["light", "dark"])
  test(`Game over, guest score and glass material · ${theme}`, async ({
    page,
  }, info) => {
    test.skip(disabled);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript((t) => {
      localStorage.setItem("analytics_consent", "denied");
      localStorage.setItem("theme", t);
      localStorage.setItem("tetris.onboardingDone", "true");
    }, theme);
    await page.goto("/jeux/tetris");
    await page.getByRole("button", { name: "Jouer", exact: true }).click();
    await expect(page.locator(".lava-canvas")).toHaveCSS(
      "visibility",
      "visible",
    );
    await expect(page.locator(".lava-board")).toHaveCSS("box-shadow", "none");
    if (
      page.viewportSize()!.width >= 768 &&
      page.viewportSize()!.height > 500
    ) {
      const title = await page
          .locator(".lava-top .lava-wordmark")
          .boundingBox(),
        left = await page.locator(".lava-side-left").boundingBox(),
        board = await page.locator(".lava-board").boundingBox();
      expect(Math.abs(title!.x - left!.x)).toBeLessThan(2);
      expect(Math.abs(title!.y - board!.y)).toBeLessThan(3);
    }
    await page.getByRole("button", { name: "Lâcher", exact: true }).click();
    await page.screenshot({
      path: `docs/tetris/v5/${info.project.name}-${theme}-glass.png`,
    });
    for (
      let i = 0;
      i < 30 &&
      (await page.locator(".lava-game").getAttribute("data-state")) ===
        "playing";
      i++
    )
      await page.getByRole("button", { name: "Lâcher", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Game over", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", {
        name: "Pseudo",
        exact: true,
      }),
    ).toBeVisible();
    const panel = page.locator(".lava-end-panel");
    expect(
      await panel.evaluate((e) => e.scrollWidth - e.clientWidth),
    ).toBeLessThanOrEqual(1);
    await page
      .getByRole("textbox", { name: "Pseudo", exact: true })
      .fill("Lava V5");
    await page
      .getByRole("button", {
        name: "Valider",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Score enregistré" }),
    ).toHaveCount(1);
    await page.screenshot({
      path: `docs/tetris/v5/${info.project.name}-${theme}-gameover.png`,
    });
    await page.getByRole("button", { name: "Rejouer", exact: true }).focus();
    await page.keyboard.press("Space");
    await expect(page.locator(".lava-game")).toHaveAttribute(
      "data-state",
      "playing",
    );
    expect(errors).toEqual([]);
  });
