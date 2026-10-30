import { test, expect } from "@playwright/test";

async function choose(
  page: import("@playwright/test").Page,
  name: "GitHub" | "Mehdi",
) {
  await page
    .getByRole("button", { name: "Design system", exact: true })
    .click();
  await page.getByRole("menuitemradio", { name, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("analytics_consent", "denied");
    localStorage.setItem("theme", "light");
  });
});

test("pilot uses real Primer components, retains navigation choice and resets on reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const cta = page.locator(".home-paper-ctas").getByRole("link").first();
  await expect(cta).not.toHaveAttribute("data-component", "Button");
  const original = await cta.evaluate((el) => ({
    color: getComputedStyle(el).color,
    background: getComputedStyle(el).backgroundColor,
  }));
  await choose(page, "GitHub");
  await expect(cta).toHaveAttribute("data-component", "Button");
  await expect(
    page.locator(".home-paper-status [data-component=Label]"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Design system", exact: true }),
  ).toBeFocused();
  await page.screenshot({ path: "/tmp/design-system-github-desktop.png" });
  await cta.click();
  await expect(page).toHaveURL(/realisations$/);
  await expect(
    page.getByRole("button", { name: "Design system", exact: true }),
  ).toContainText("GitHub");
  await page.getByRole("link", { name: "Accueil", exact: true }).click();
  await expect(cta).toHaveAttribute("data-component", "Button");
  await page
    .getByRole("button", { name: "Design system", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Design system", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Activer le mode sombre", exact: true })
    .click();
  await expect(
    page.locator(".ds-scope[data-design-system=github]").first(),
  ).toHaveAttribute("data-color-mode", "dark");
  await page.screenshot({ path: "/tmp/design-system-github-dark.png" });
  await page
    .getByRole("button", { name: "Activer le mode clair", exact: true })
    .click();
  await choose(page, "Mehdi");
  await expect(cta).not.toHaveAttribute("data-component", "Button");
  expect(
    await cta.evaluate((el) => ({
      color: getComputedStyle(el).color,
      background: getComputedStyle(el).backgroundColor,
    })),
  ).toEqual(original);
  await choose(page, "GitHub");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Design system", exact: true }),
  ).toContainText("Mehdi");
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) =>
        /design.?system|primer/i.test(key),
      ),
    ),
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test("Primer language menu retains choice and collapsed sidebar stays usable", async ({
  page,
}) => {
  await page.goto("/");
  await choose(page, "GitHub");
  await page.locator("[data-analytics-action=language_open]").click();
  await page
    .getByRole("menuitemradio", { name: "English", exact: true })
    .click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(
    page.getByRole("button", { name: "Design system", exact: true }),
  ).toContainText("GitHub");
  await page
    .getByRole("button", {
      name: /Close.*panel|Collapse.*sidebar|Fermer le panel/i,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Design system", exact: true }),
  ).toBeVisible();
  await choose(page, "Mehdi");
});

test("mobile pilot menus work inside the navigation dialog", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ouvrir le menu", exact: true })
    .click();
  await choose(page, "GitHub");
  await expect(page.locator("#mobile-navigation")).toBeVisible();
  await page.screenshot({ path: "/tmp/design-system-github-mobile.png" });
  await page.locator("[data-analytics-action=language_open]").click();
  await page
    .getByRole("menuitemradio", { name: "Français", exact: true })
    .click();
  await choose(page, "Mehdi");
  await choose(page, "GitHub");
  await page
    .locator("#mobile-navigation")
    .getByRole("link", { name: "Accueil", exact: true })
    .click();
  await expect(page.locator("#mobile-navigation")).toBeHidden();
  await expect(
    page.locator(".home-paper-ctas [data-component=Button]"),
  ).toHaveCount(3);
});

test("other pages retain their content styles", async ({ page }) => {
  await page.goto("/contact");
  const content = page.locator('[data-slot="sidebar-inset"]');
  const styles = () =>
    content.evaluate((el) => {
      const heading = el.querySelector("h1")!;
      return {
        color: getComputedStyle(heading).color,
        font: getComputedStyle(heading).fontFamily,
        background: getComputedStyle(el).backgroundColor,
      };
    });
  const before = await styles();
  await choose(page, "GitHub");
  expect(await styles()).toEqual(before);
  await expect(content.locator('[data-component="Button"]')).toHaveCount(0);
});

test("Primer keeps avatar and gravity controls working", async ({ page }) => {
  await page.goto("/");
  await choose(page, "GitHub");
  const play = page.locator('[data-analytics-action="gravity_play"]');
  await expect(play).toHaveAttribute("data-component", "Button");
  await play.click();
  const config = page.locator('[data-analytics-action="gravity_config"]');
  await expect(config).toBeVisible();
  await config.click();
  await expect(page.locator("#gravity-tune-panel")).toBeVisible();
  await page.locator('[data-analytics-action="gravity_reset"]').click();
  await expect(play).toBeVisible({ timeout: 10000 });
  await expect(
    page.getByRole("button", { name: "Design system", exact: true }),
  ).toContainText("GitHub");
});
