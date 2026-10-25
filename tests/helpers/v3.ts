import { expect, type Page } from "@playwright/test";
import { onboardingConfig } from "../../src/features/tetris/engine/opening";
export async function setup(page: Page, theme = "light") {
  await page.addInitScript((t) => {
    localStorage.setItem("analytics_consent", "denied");
    localStorage.setItem("theme", t);
  }, theme);
}
export async function captureFlow(page: Page, theme: string, device: string) {
  const capture = (name: string) =>
    page.screenshot({ path: `docs/tetris/v4/${device}-${theme}-${name}.png` });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await setup(page, theme);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Touche-moi", exact: true }),
  ).toBeVisible();
  await capture("accueil");
  await page.goto("/jeux");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(page.getByRole("link", { name: /Tetris/ })).toBeVisible();
  await capture("jeux");
  await page.getByRole("link", { name: /Tetris/ }).click();
  const ranking = page.getByRole("button", { name: /^Classement/ });
  if ((await ranking.textContent())?.includes("Bientôt"))
    await expect(ranking).toBeDisabled();
  else await expect(ranking).toBeEnabled();
  await expect(
    page.getByRole("heading", { name: "Tetris", exact: true }),
  ).toHaveText("Tetris");
  await capture("menu");
  await page.getByRole("button", { name: "Règles", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("MIT");
  const dialog = page.getByRole("dialog");
  await dialog.evaluate(async (element) => {
    await Promise.allSettled(
      element.getAnimations().map((animation) => animation.finished),
    );
  });
  const inset = await dialog.evaluate((element) => {
    const paragraph = element.querySelector(".lava-settings p")!;
    return (
      paragraph.getBoundingClientRect().left -
      element.getBoundingClientRect().left
    );
  });
  expect(inset).toBeGreaterThanOrEqual(20);
  await capture("regles");
  await page.keyboard.press("Escape");
  async function start() {
    await page.getByRole("button", { name: "Jouer", exact: true }).click();
    await expect(page.locator(".lava-game")).toHaveAttribute(
      "data-state",
      "playing",
    );
    expect(
      await page
        .locator(".lava-top button")
        .evaluateAll((buttons) =>
          buttons.map((button) => button.getAttribute("aria-label")),
        ),
    ).toEqual(["Créer mon profil joueur", "Réglages", "Mettre en pause"]);
    await expect(page.locator(".lava-side-right svg").first()).toHaveAttribute(
      "aria-label",
      "O",
    );
  }
  async function place(i: number, two = false) {
    const { x } = onboardingConfig.reference[i];
    let { rot } = onboardingConfig.reference[i];
    if (two && i === 5) rot = 1;
    for (let r = 0; r < rot; r++) await page.keyboard.press("x");
    for (let m = 0; m < Math.abs(x - 3); m++)
      await page.keyboard.press(x < 3 ? "ArrowLeft" : "ArrowRight");
    await page.keyboard.press("Space");
  }
  await page.evaluate(() => localStorage.removeItem("tetris.onboardingDone"));
  await start();
  expect(
    await page.evaluate(() => localStorage.getItem("tetris.onboardingDone")),
  ).toBe("true");
  await expect(page.locator(".lava-canvas")).toHaveCSS("visibility", "visible");
  for (let i = 0; i < 5; i++) await place(i, true);
  await page.waitForTimeout(150);
  await capture("partie");
  const board = await page.locator(".lava-board").boundingBox(),
    controls = await page.locator(".lava-controls").boundingBox();
  expect(board!.y + board!.height).toBeLessThan(controls!.y + 1);
  expect(controls!.y + controls!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height,
  );
  await page.keyboard.press("p");
  await expect(page.locator(".lava-pause")).toHaveText("PauseReprendreQuitter");
  await page.waitForTimeout(500);
  await capture("pause");
  await page.getByRole("button", { name: "Reprendre", exact: true }).click();
  for (let i = 5; i < 10; i++) await place(i, true);
  await expect(page.locator(".lava-reward-type")).toHaveText("2 lignes");
  await page.waitForTimeout(250);
  await capture("2-lignes");
  await page
    .getByRole("button", { name: "Mettre en pause", exact: true })
    .click();
  await page.getByRole("button", { name: "Quitter", exact: true }).click();
  await page.evaluate(() => localStorage.removeItem("tetris.onboardingDone"));
  await start();
  for (let i = 0; i < 10; i++) await place(i);
  await expect(page.locator(".lava-reward-type")).toHaveText("Tetris");
  await page.waitForTimeout(350);
  await capture("tetris");
  await page.waitForTimeout(2200);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.locator(".lava-game")).toHaveAttribute(
    "data-state",
    "paused",
  );
  await page.getByRole("button", { name: "Quitter", exact: true }).click();
  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  await page.getByRole("switch", { name: /Effets réduits/ }).click();
  await expect(
    page.getByRole("switch", { name: /Effets réduits/ }),
  ).toHaveAttribute("aria-checked", "true");
  await page.getByRole("dialog").evaluate(async (element) => {
    await Promise.allSettled(
      element.getAnimations().map((animation) => animation.finished),
    );
  });
  await capture("reglages");
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("lava-settings")!).reduced,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
}
