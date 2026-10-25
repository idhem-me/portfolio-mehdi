import { test, expect } from "@playwright/test";
const disabled = process.env.TETRIS_TEST_DISABLED === "true";
async function playToEnd(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await expect(page.locator(".lava-game")).toHaveAttribute(
    "data-state",
    "playing",
  );
  for (
    let i = 0;
    i < 30 &&
    (await page.locator(".lava-game").getAttribute("data-state")) === "playing";
    i++
  )
    await page.getByRole("button", { name: "Lâcher", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Game over", exact: true }),
  ).toBeVisible();
}
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
      page.getByRole("button", { name: "Avec un pseudo", exact: true }),
    ).toBeVisible();
    const panel = page.locator(".lava-end-panel");
    expect(
      await panel.evaluate((e) => e.scrollWidth - e.clientWidth),
    ).toBeLessThanOrEqual(1);
    await page.getByLabel("Votre pseudonyme public").fill("Lava V5");
    await page.getByRole("button", { name: "Valider", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Score enregistré" }),
    ).toHaveCount(1);
    await expect(panel.locator(".lava-end-stats dd").nth(1)).toHaveText(
      /^(1er|[0-9]+e|Hors du top 20)$/,
    );
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
test("Google redirect restores an ended game and editable public nickname", async ({
  page,
}, info) => {
  test.skip(disabled);
  let loggedIn = false;
  await page.addInitScript(() => {
    localStorage.setItem("analytics_consent", "denied");
    localStorage.setItem("tetris.onboardingDone", "true");
  });
  await page.route("**/api/tetris/auth", (route) =>
    route.fulfill({
      json: {
        googleAvailable: true,
        user: loggedIn ? { displayName: "Alex" } : null,
      },
    }),
  );
  await page.route("**/api/tetris/auth/google?**", (route) => {
    loggedIn = true;
    return route.fulfill({
      status: 200,
      contentType: "text/html",
      body: '<meta http-equiv="refresh" content="0;url=/jeux/tetris?auth=success">',
    });
  });
  await page.goto("/jeux/tetris");
  await playToEnd(page);
  await page.getByLabel("Votre pseudonyme public").fill("Mon pseudo");
  const score = await page.locator(".lava-end-stats dd").nth(2).innerText();
  await page.getByRole("button", { name: "Avec Google", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Game over", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Nom affiché au classement")).toHaveValue(
    "Mon pseudo",
  );
  await expect(page.locator(".lava-end-stats dd").nth(2)).toHaveText(score);
  await expect(page.getByText("Google connecté · Alex")).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("lava-pending-score-v1")),
  ).toBeNull();
  await page.screenshot({
    path: `docs/tetris/v5/${info.project.name}-google-return.png`,
  });
  const body = await page.request.post("/api/tetris/leaderboard", {
    headers: { origin: "http://localhost:3000" },
    data: {
      id: "a".repeat(64),
      name: "Fake",
      identity: "google",
      userId: "spoofed",
      steps: ["hard"],
    },
  });
  expect(body.status()).toBe(401);
});
