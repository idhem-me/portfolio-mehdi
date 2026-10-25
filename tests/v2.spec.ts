import { test, expect } from "@playwright/test";
const disabled = process.env.TETRIS_TEST_DISABLED === "true";
test("V2 API obeys primary flag and rejects cross-origin writes", async ({
  request,
}) => {
  const response = await request.get("/api/tetris/leaderboard");
  expect(response.status()).toBe(disabled ? 404 : 200);
  expect(
    (
      await request.post("/api/tetris/sessions", {
        headers: { origin: "https://example.org" },
      })
    ).status(),
  ).toBe(disabled ? 404 : 403);
});
for (const theme of ["light", "dark"])
  test(`V2 sound opt-in and real general leaderboard · ${theme}`, async ({
    page,
  }, info) => {
    test.skip(disabled, "Feature disabled");
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript((t) => {
      localStorage.setItem("analytics_consent", "denied");
      localStorage.setItem("theme", t);
      localStorage.setItem("tetris.onboardingDone", "true");
      const Original = window.AudioContext;
      const contexts: AudioContext[] = [];
      Object.assign(window, { __lavaAudio: contexts });
      window.AudioContext = new Proxy(Original, {
        construct(target, args) {
          const context = new target(...args);
          contexts.push(context);
          return context;
        },
      });
    }, theme);
    await page.goto("/jeux/tetris");
    await page.getByRole("button", { name: "Réglages", exact: true }).click();
    const sound = page.getByRole("switch", { name: "Son", exact: true });
    await expect(sound).toHaveAttribute("aria-checked", "false");
    await expect(sound).toHaveText("Son Off");
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __lavaAudio: unknown[] }).__lavaAudio.length,
      ),
    ).toBe(0);
    await sound.click();
    await expect(sound).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("slider")).toHaveCount(0);
    await page.screenshot({
      path: `docs/tetris/v2/${info.project.name}-${theme}-son.png`,
    });
    await sound.click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close" })
      .click();
    await page.getByRole("button", { name: "Jouer", exact: true }).click();
    await expect(page.locator(".lava-game")).toHaveAttribute(
      "data-state",
      "playing",
    );
    const title = page.locator(".lava-game");
    for (
      let i = 0;
      i < 24 && (await title.getAttribute("data-state")) === "playing";
      i++
    )
      await page.getByRole("button", { name: "Lâcher", exact: false }).click();
    await expect(title).toHaveAttribute("data-state", "over");
    await page
      .getByLabel("Pseudo", { exact: true })
      .fill(`Lava ${info.project.name === "chromium" ? "Chrome" : "Safari"}`);
    await page
      .getByRole("button", { name: "Enregistrer avec un pseudo", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Score enregistré" }),
    ).toHaveCount(1);
    await page.screenshot({
      path: `docs/tetris/v2/${info.project.name}-${theme}-score.png`,
    });
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page.getByRole("button", { name: "Classement", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Classement général");
    await page.screenshot({
      path: `docs/tetris/v2/${info.project.name}-${theme}-classement.png`,
    });
    expect(errors).toEqual([]);
  });
