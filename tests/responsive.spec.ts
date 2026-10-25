import { test, expect } from "@playwright/test";
import sharp from "sharp";
const widths = [
  { width: 320, height: 568 },
  { width: 360, height: 740 },
  { width: 384, height: 832 },
  { width: 412, height: 915 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 844, height: 390 },
];
for (const theme of ["light", "dark"])
  test(`responsive home and Tetris in ${theme}`, async ({ page }, info) => {
    test.setTimeout(120000);
    await page.addInitScript((t) => {
      localStorage.setItem("analytics_consent", "denied");
      localStorage.setItem("theme", t);
    }, theme);
    for (const viewport of widths) {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      await expect(
        page.getByRole("button", { name: "Touche-moi", exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(viewport.width + 1);
      const heading = page.locator("h1").first();
      const rect = await heading.boundingBox();
      expect(rect!.x).toBeGreaterThanOrEqual(0);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(viewport.width + 1);
      await page.screenshot({
        path: `docs/tetris/responsive/${info.project.name}-${theme}-${viewport.width}-home.png`,
      });
      if (process.env.TETRIS_TEST_DISABLED === "true") continue;
      await page.goto("/jeux/tetris");
      await page.getByRole("button", { name: "Jouer", exact: true }).click();
      await expect(page.locator(".lava-game")).toHaveAttribute(
        "data-state",
        "playing",
      );
      const board = await page.locator(".lava-board").boundingBox(),
        controls = await page.locator(".lava-controls").boundingBox();
      expect(board!.x).toBeGreaterThanOrEqual(0);
      expect(board!.x + board!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(board!.y).toBeGreaterThanOrEqual(0);
      expect(board!.y + board!.height).toBeLessThanOrEqual(viewport.height + 1);
      expect(controls!.y + controls!.height).toBeLessThanOrEqual(
        viewport.height + 1,
      );
      if (viewport.height > 500)
        expect(board!.y + board!.height).toBeLessThanOrEqual(controls!.y + 1);
      else expect(board!.x + board!.width).toBeLessThanOrEqual(controls!.x + 1);
      await page.screenshot({
        path: `docs/tetris/responsive/${info.project.name}-${theme}-${viewport.width}-game.png`,
      });
      await page
        .getByRole("button", { name: "Mettre en pause", exact: true })
        .click();
      await page.getByRole("button", { name: "Quitter", exact: true }).click();
    }
  });
test("home translations wrap rather than expanding the viewport", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 360, height: 740 });
  await page.addInitScript(() =>
    localStorage.setItem("analytics_consent", "denied"),
  );
  for (const locale of ["fr", "en", "es", "de", "it", "zh", "ar"]) {
    await page.goto(`/${locale}`);
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      locale,
    ).toBeLessThanOrEqual(361);
  }
});
test("avatar preserves original colors under Android auto darkening", async ({
  page,
  browserName,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.addInitScript(() => {
    localStorage.setItem("theme", "dark");
    localStorage.setItem("analytics_consent", "denied");
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Touche-moi", exact: true }),
  ).toHaveCount(0);
  const avatar = page.locator("[data-avatar]").first();
  await expect(avatar).toHaveCSS("color-scheme", "light only");
  await expect(avatar.locator("img").first()).toHaveJSProperty(
    "complete",
    true,
  );
  const before = await avatar.screenshot({
    path: `docs/tetris/responsive/${info.project.name}-avatar-dark.png`,
  });
  if (browserName === "chromium") {
    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setAutoDarkModeOverride", { enabled: true });
    const after = await avatar.screenshot({
      path: `docs/tetris/responsive/${info.project.name}-avatar-forced-dark.png`,
    });
    const a = await sharp(before).raw().toBuffer(),
      b = await sharp(after).raw().toBuffer();
    expect(a.length).toBe(b.length);
    let difference = 0;
    for (let i = 0; i < a.length; i++) difference += Math.abs(a[i] - b[i]);
    expect(difference / a.length).toBeLessThan(3);
  }
});

test("long leaderboard pseudonyms stay inside a narrow sheet", async ({
  page,
}) => {
  test.skip(process.env.TETRIS_TEST_DISABLED === "true");
  await page.setViewportSize({ width: 320, height: 568 });
  await page.route("**/api/tetris/leaderboard", (route) =>
    route.fulfill({
      json: [
        { name: "WWWWWWWWWWWWWWWWWWWW", score: 123456789, lines: 500, rank: 1 },
      ],
    }),
  );
  await page.goto("/jeux/tetris");
  await page.getByRole("button", { name: "Classement", exact: true }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toContainText("WWWWWWWWWWWWWWWWWWWW");
  expect(
    await sheet.evaluate(
      (element) => element.scrollWidth - element.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
});
