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
    page.screenshot({ path: `docs/tetris/v3/${device}-${theme}-${name}.png` });
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
  await expect(page.getByRole("link", { name: /Lava/ })).toBeVisible();
  await capture("jeux");
  await page.getByRole("link", { name: /Lava/ }).click();
  await expect(
    page.getByRole("button", { name: "Classement Bientôt" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Lava — Tetris", exact: true }),
  ).toHaveText("Lava — Tetris");
  await capture("menu");
  await page.getByRole("button", { name: "Règles", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("MIT");
  await page.keyboard.press("Escape");
  async function start() {
    await page.getByRole("button", { name: "Jouer", exact: true }).click();
    await expect(page.locator(".lava-game")).toHaveAttribute(
      "data-state",
      "playing",
    );
    await expect(page.locator(".lava-side-right svg").first()).toHaveAttribute(
      "aria-label",
      "O",
    );
  }
  async function place(i: number, two = false) {
    const {x}=onboardingConfig.reference[i];
    let {rot}=onboardingConfig.reference[i];
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
  await expect(page.locator(".lava-pause")).toHaveText("PauseReprendre");
  await page.waitForTimeout(500);
  await capture("pause");
  await page.getByRole("button", { name: "Reprendre", exact: true }).click();
  for (let i = 5; i < 10; i++) await place(i, true);
  await expect(page.locator(".lava-reward-type")).toHaveText("2 lignes");
  await page.waitForTimeout(250);
  await capture("2-lignes");
  await page.getByRole("button", { name: "Quitter la partie" }).click();
  await page.evaluate(() => localStorage.removeItem("tetris.onboardingDone"));
  await start();
  for (let i = 0; i < 10; i++) await place(i);
  await expect(page.locator(".lava-reward-type")).toHaveText("4 lignes");
  await page.waitForTimeout(350);
  await capture("4-lignes");
  await page.waitForTimeout(2200);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.locator(".lava-game")).toHaveAttribute(
    "data-state",
    "paused",
  );
  await page.getByRole("button", { name: "Quitter la partie" }).last().click();
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
  expect(errors).toEqual([]);
}
