import { test, expect } from "@playwright/test";
const enabled = process.env.TETRIS_TEST_DISABLED !== "true";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("analytics_consent", "denied"),
  );
});
test("feature gate, metadata and sitemap", async ({ page, request }) => {
  await page.goto("/realisations");
  const card = page.getByRole("link", { name: /Lava/ });
  if (enabled) {
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expect(
      page.getByRole("button", { name: "Jouer", exact: true }),
    ).toBeVisible();
  } else {
    await expect(card).toHaveCount(0);
    for (const locale of ["", "/fr", "/en", "/ar"]) {
      const response = await request.get(`${locale}/realisations/tetris`);
      expect(response.status()).toBe(404);
      expect(response.headers()["x-robots-tag"]).toContain("noindex");
    }
  }
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).not.toContain("/realisations/tetris");
});
for (const device of ["mobile", "desktop"] as const)
  for (const theme of ["light", "dark"] as const)
    test(`${device} ${theme}: controls, pause, settings and screenshot`, async ({
      page,
    }) => {
      test.skip(!enabled);
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error" && !m.text().includes("404"))
          errors.push(m.text());
      });
      await page.setViewportSize(
        device === "mobile"
          ? { width: 390, height: 844 }
          : { width: 1440, height: 1100 },
      );
      await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
      await page.goto("/realisations/tetris");
      await page.getByRole("button", { name: "Jouer", exact: true }).click();
      const board = page.locator(".lava-board");
      const game = page.locator(".lava-game");
      await expect(game).toHaveAttribute("data-playing", "true");
      await page.waitForTimeout(1100);
      // Real controls, including repeated movement and both rotations.
      await page.keyboard.down("ArrowLeft");
      await page.waitForTimeout(220);
      await page.keyboard.up("ArrowLeft");
      await page.keyboard.press("x");
      await page.keyboard.press("z");
      await page.keyboard.press("Space");
      for (const n of [2, -3, 4, -1, 1, -4, 3]) {
        for (let i = 0; i < Math.abs(n); i++)
          await page.keyboard.press(n > 0 ? "ArrowRight" : "ArrowLeft");
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Space");
      }
      await page.keyboard.press("c");
      await page.keyboard.press("Shift");
      await expect(page.locator(".lava-canvas")).toHaveCSS(
        "visibility",
        "visible",
      );
      if (device === "mobile") {
        const box = await board.boundingBox();
        const controls = await page.locator(".lava-controls").boundingBox();
        expect(box!.y + box!.height).toBeLessThan(controls!.y + 1);
        expect(controls!.y + controls!.height).toBeLessThanOrEqual(844);
        const left = page.getByRole("button", { name: "Gauche", exact: true });
        await left.dispatchEvent("pointerdown", {
          pointerId: 1,
          clientX: 30,
          clientY: 770,
        });
        await left.dispatchEvent("pointerup", { pointerId: 1 });
      }
      await game.screenshot({ path: `docs/tetris/${device}-${theme}.png` });
      await page.keyboard.press("p");
      await expect(
        page.getByRole("button", { name: "Reprendre", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Reprendre", exact: true })
        .click();
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
      await expect(game).toHaveAttribute("data-playing", "false");
      await page.getByRole("button", { name: "Réglages", exact: true }).click();
      await page.getByRole("switch", { name: /Effets réduits/ }).click();
      await expect(
        page.getByRole("switch", { name: /Effets réduits/ }),
      ).toHaveAttribute("aria-checked", "true");
      await page.keyboard.press("Escape");
      expect(
        await page.evaluate(
          () => JSON.parse(localStorage.getItem("lava-settings")!).reduced,
        ),
      ).toBe(true);
      await page.getByRole("button", { name: "Quitter le jeu" }).click();
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
        "hidden",
      );
      expect(errors).toEqual([]);
    });
test("fallback SVG, reduced motion, game over and persisted record", async ({
  page,
}) => {
  test.skip(!enabled);
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
  await page.goto("/realisations/tetris");
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
  await page
    .locator(".lava-game")
    .screenshot({ path: "docs/tetris/fallback-game-over.png" });
});
test("mobile landscape stays inside viewport", async ({ page }) => {
  test.skip(!enabled);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/realisations/tetris");
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  const box = await page.locator(".lava-board").boundingBox();
  const controls = await page.locator(".lava-controls").boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(390);
  expect(controls!.x).toBeGreaterThanOrEqual(box!.x + box!.width);
  await page.screenshot({ path: "docs/tetris/mobile-landscape.png" });
});
