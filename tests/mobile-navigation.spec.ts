import { test, expect } from "@playwright/test";

for (const [designSystem, theme] of [
  ["mehdi", "light"],
  ["mehdi", "dark"],
  ["fun", "light"],
  ["fun", "dark"],
  ["frutiger-aero", "light"],
  ["frutiger-aero", "dark"],
  ["liquid-glass", "light"],
  ["liquid-glass", "dark"],
]) {
  test(`mobile navigation geometry and controls (${designSystem}, ${theme})`, async ({ page }) => {
    await page.addInitScript(({ theme, designSystem }) => {
      localStorage.setItem("analytics_consent", "denied");
      localStorage.setItem("theme", theme);
      localStorage.setItem("portfolio-design-system", designSystem);
    }, { theme, designSystem });
    for (const width of [320, 390, 767]) {
      await page.setViewportSize({ width, height: 740 });
      await page.goto("/fr/a-propos");
      const trigger = page.getByRole("button", { name: "Ouvrir le menu", exact: true });
      await expect(trigger).toBeVisible();
      await expect(page.locator('[data-slot="sidebar-inset"] > header')).toHaveCSS("height", "76px");
      if (designSystem !== "mehdi") {
        await expect(page.locator("html")).toHaveAttribute("data-design-system", designSystem);
      }
      const content = page.locator('[data-slot="sidebar-inset"] main');
      await expect(content.first()).toHaveCSS("padding-top", "16px");
      await expect(content.first()).toHaveCSS("padding-inline-start", "16px");
      await page.evaluate(() => window.scrollTo(0, 250));
      await page.mouse.move(width / 2, 1);
      const before = await trigger.boundingBox();
      await trigger.click();
      await page.mouse.move(width / 2, 1);
      const dialog = page.locator("#mobile-navigation");
      await expect(dialog).toBeVisible();
      const close = dialog.getByRole("button", { name: "Fermer le menu" });
      await expect.poll(async () => {
        const position = await close.boundingBox();
        return position && { ...position, x: Math.round(position.x), y: Math.round(position.y) };
      }).toEqual(before);
      const panel = await dialog.boundingBox();
      expect(panel).toMatchObject({ x: 0, y: 0, width, height: 740 });
      const tiles = dialog.locator("nav a");
      const boxes = await tiles.evaluateAll((links) => links.map((link) => {
        const { x, y, width, height } = link.getBoundingClientRect();
        return { x, y, width, height };
      }));
      expect(boxes.length).toBeGreaterThanOrEqual(4);
      for (let i = 0; i < boxes.length; i++) {
        expect(boxes[i].width).toBeCloseTo(Math.min(width - 32, 448), 0);
        expect(boxes[i].height).toBeGreaterThanOrEqual(52);
        if (i) expect(boxes[i].y - boxes[i - 1].y - boxes[i - 1].height).toBe(8);
      }
      const toolbar = dialog.locator(".mobile-navigation-toolbar");
      const actions = toolbar.getByRole("button");
      await expect(actions).toHaveCount(4);
      const actionBoxes = await actions.evaluateAll((buttons) => buttons.map((button) => {
        const { x, y, width, height } = button.getBoundingClientRect();
        return { x, y, width, height, text: button.textContent };
      }));
      expect(actionBoxes.map(({ y }) => Math.round(y))).toEqual(Array(4).fill(before?.y));
      for (const [index, box] of actionBoxes.entries()) {
        expect(box).toMatchObject({ width: 44, height: 44, text: "" });
        if (index) expect(box.x).toBeGreaterThan(actionBoxes[index - 1].x);
      }
      await expect(dialog.locator('nav [aria-current="page"]')).toHaveAttribute("data-active", "true");
      const themeToggle = dialog.getByRole("button", { name: /Activer le mode/ });
      const wasDark = await page.locator("html").evaluate((element) => element.classList.contains("dark"));
      await themeToggle.click();
      await expect(page.locator("html")).toHaveClass(wasDark ? /\blight\b/ : /\bdark\b/);
      await close.click();
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
      await trigger.click();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await trigger.click();
      await dialog.getByRole("link", { name: "Accueil", exact: true }).click();
      await expect(dialog).toBeHidden();
    }
    await page.setViewportSize({ width: 768, height: 740 });
    await expect(page.getByRole("button", { name: "Ouvrir le menu" })).toHaveCount(0);
    await expect(page.locator('[data-slot="sidebar-container"]')).toBeVisible();
  });
}

test("short mobile menu keeps settings and close accessible", async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 320 });
  await page.goto("/fr/a-propos");
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  const dialog = page.locator("#mobile-navigation");
  const language = dialog.getByRole("button", { name: "Langue", exact: true });
  const close = dialog.getByRole("button", { name: "Fermer le menu" });
  const top = await close.boundingBox();
  await dialog.locator("nav a").last().scrollIntoViewIfNeeded();
  expect(await close.boundingBox()).toEqual(top);
  await language.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitemradio", { name: "English", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(language).toBeFocused();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("Arabic mobile navigation mirrors the toolbar and keeps choice menus on screen", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("analytics_consent", "denied"));
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/ar/a-propos");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const open = page.locator("#mobile-menu-trigger");
  const position = await open.boundingBox();
  await open.click();
  const dialog = page.locator("#mobile-navigation");
  const close = dialog.locator('[data-analytics-action="menu_close"]');
  expect(await close.boundingBox()).toEqual(position);
  expect(position?.x).toBe(260);
  const language = dialog.locator('[data-analytics-action="language_open"]');
  expect((await language.boundingBox())?.x).toBe(16);
  await language.click();
  const choices = page.getByRole("menu");
  await expect(choices).toBeVisible();
  const bounds = await choices.boundingBox();
  expect(bounds?.x).toBeGreaterThanOrEqual(0);
  expect(bounds && bounds.x + bounds.width).toBeLessThanOrEqual(320);
  expect(bounds?.y).toBeGreaterThanOrEqual(60);
});
