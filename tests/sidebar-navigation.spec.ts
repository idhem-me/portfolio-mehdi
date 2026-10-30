import { test, expect } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`sidebar home, contact and toggle (${theme})`, async ({ page }) => {
    await page.addInitScript((value) => {
      localStorage.setItem("analytics_consent", "denied");
      localStorage.setItem("theme", value);
    }, theme);
    await page.goto("/fr/contact");
    const sidebar = page.locator('[data-slot="sidebar-container"]');
    const home = sidebar.getByRole("link", { name: "Accueil", exact: true });
    const contact = sidebar.getByRole("link", { name: "Me contacter", exact: true });
    await expect(contact).toHaveAttribute("aria-current", "page");
    await expect(sidebar.locator('[data-slot="sidebar-footer"] a')).toHaveCount(0);
    await expect(sidebar.getByText("Mehdi Design", { exact: true })).toHaveCount(0);
    await home.click();
    await expect(home).toHaveAttribute("aria-current", "page");
    await sidebar.getByRole("button", { name: "Fermer le panel", exact: true }).click();
    const open = sidebar.getByRole("button", { name: "Ouvrir le panel", exact: true });
    await page.mouse.move(800, 300);
    await open.blur();
    await expect(open.locator("svg")).toHaveCSS("opacity", "0");
    await open.hover();
    await expect(open.locator("svg")).toHaveCSS("opacity", "1");
    await page.mouse.move(800, 300);
    await open.focus();
    await expect(open.locator("svg")).toHaveCSS("opacity", "1");
    await page.keyboard.press("Enter");
    await expect(home).toBeVisible();
    await contact.click();
    await expect(contact).toHaveAttribute("aria-current", "page");
    await page.screenshot({ path: `/tmp/sidebar-${theme}.png` });
  });
}

test("mobile keeps home and contact and closes after navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 740 });
  await page.goto("/fr/a-propos");
  await page.getByRole("button", { name: "Ouvrir le menu", exact: true }).click();
  const dialog = page.locator("#mobile-navigation");
  await expect(dialog.getByRole("link", { name: "Accueil", exact: true })).toBeVisible();
  await dialog.getByRole("link", { name: "Me contacter", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/contact$/);
});

test("desktop touch can reopen the sidebar without hover", async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 1024, height: 768 } });
  const page = await context.newPage();
  await page.goto("/fr/contact");
  await page.getByRole("button", { name: "Fermer le panel", exact: true }).tap();
  const open = page.getByRole("button", { name: "Ouvrir le panel", exact: true });
  await expect(open.locator("svg")).toHaveCSS("opacity", "1");
  await open.tap();
  await expect(page.getByRole("button", { name: "Fermer le panel", exact: true })).toBeVisible();
  await context.close();
});
