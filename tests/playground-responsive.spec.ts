import { expect, test, type Locator } from "@playwright/test";
import { demoAnchors } from "../src/app/[locale]/(site)/playground/coverage";

async function expectTouchTarget(target: Locator) {
  await expect(target).toBeVisible();
  await expect.poll(async () => {
    const box = await target.boundingBox();
    return box ? Math.min(box.width, box.height) : 0;
  }).toBeGreaterThanOrEqual(44);
}

test("Playground shows all demos and applies density across portal boundaries", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/playground");
  await expect(page.getByRole("button", { name: "Auto", exact: true })).toHaveAttribute("aria-pressed", "true");

  for (const anchor of Object.values(demoAnchors)) {
    await expect(page.locator(`section[id="${anchor}"]`)).toBeAttached();
  }

  const icon = page.locator("section#button").getByRole("button", { name: "Bouton icône icon-xs", exact: true });
  await expect(icon).toHaveCSS("height", "24px");

  await page.setViewportSize({ width: 767, height: 900 });
  await expectTouchTarget(icon);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectTouchTarget(page.locator("#paint-color button").first());
  await expectTouchTarget(page.locator("#switch [role=switch]"));
  await expectTouchTarget(page.locator("#slider [data-slot=slider]"));
  await expectTouchTarget(page.locator("#color-picker button").first());

  await page.getByRole("button", { name: "Ordinateur", exact: true }).click();
  await expect(icon).toHaveCSS("height", "24px");

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await expectTouchTarget(icon);
  const menuTrigger = page.locator("#dropdown-menu").getByRole("button", { name: "Items", exact: true });
  await menuTrigger.click();
  await expectTouchTarget(page.getByRole("menuitem", { name: "Profil", exact: true }));
  await page.keyboard.press("Escape");
  await expect(menuTrigger).toBeFocused();

  const themeTrigger = page.locator("#scoped-theme").getByRole("button", { name: "Thème local" });
  await themeTrigger.click();
  await expectTouchTarget(page.getByRole("dialog", { name: "Thème local" }).getByRole("button", { name: "Fermer" }));
  await page.keyboard.press("Escape");
  await expect(themeTrigger).toBeFocused();
});

test("the local components page works in every locale", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 750 });
  for (const locale of ["fr", "de", "en", "es", "it", "ar", "zh"]) {
    const prefix = locale === "fr" ? "" : `/${locale}`;
    await page.goto(`${prefix}/playground/local-components`);
    await expect(page.locator("#LOCAL-01")).toBeVisible();
    await expect(page.locator("#LOCAL-09")).toBeVisible();
    await expect(page.locator("#LOCAL-08, #LOCAL-10")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
    await expect(page.locator("#LOCAL-01 a")).toHaveAttribute("href", `${prefix}/playground#paint-color`);
    if (locale === "ar") await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  }
});

test("Primer keeps mobile targets in the dark Playground", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/playground");
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  const switcher = page.locator("#sidebar").getByRole("button", { name: "Design system", exact: true });
  await switcher.click();
  await page.getByRole("menuitemradio", { name: "GitHub", exact: true }).click();
  await expect(page.locator("[aria-labelledby=playground-title] > .ds-scope")).toHaveAttribute("data-color-mode", "dark");
  await expectTouchTarget(page.locator("section#button").getByRole("button", { name: "Bouton icône icon-xs", exact: true }));
  const menuTrigger = page.locator("#dropdown-menu").getByRole("button", { name: "Items", exact: true });
  await menuTrigger.click();
  await expectTouchTarget(page.getByRole("menuitem", { name: "Profil", exact: true }));
});

test("the settings modal and sortable table follow the active density", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/playground");

  const trigger = page.getByRole("button", { name: "Fenêtre centrée" });
  await trigger.click();
  const modal = page.getByRole("dialog", { name: "Réglages", exact: true });
  const desktop = (await modal.boundingBox())!;
  expect(desktop.width).toBeLessThan(1280);
  expect(Math.abs(desktop.x * 2 + desktop.width - 1280)).toBeLessThan(2);
  const toggle = modal.getByRole("switch", { name: "Notifications" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  await trigger.click();
  await expect(modal).toHaveCSS("width", "390px");
  await expect(modal).toHaveCSS("height", "844px");
  await expectTouchTarget(modal.getByRole("button", { name: "Fermer" }));
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await modal.getByRole("button", { name: "Fermer" }).click();
  await expect(trigger).toBeFocused();

  const panelTrigger = page.getByRole("button", { name: "Panneau à droite" });
  await panelTrigger.click();
  await expect(modal).toHaveCSS("width", "390px");
  await expect(modal).toHaveCSS("height", "844px");
  await page.keyboard.press("Escape");
  await expect(panelTrigger).toBeFocused();

  await page.setViewportSize({ width: 1280, height: 900 });
  await panelTrigger.click();
  await expect(modal).toHaveCSS("height", "900px");
  await expect.poll(async () => {
    const box = await modal.boundingBox();
    return box ? Math.round(box.x + box.width) : 0;
  }).toBe(1280);
  expect((await modal.boundingBox())!.width).toBeLessThan(1280);
  await page.keyboard.press("Escape");
  await expect(panelTrigger).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  const table = page.getByRole("table", { name: "Classement de démonstration" });
  const score = table.getByRole("button", { name: "Score" });
  await expectTouchTarget(score);
  await score.focus();
  await page.keyboard.press("Enter");
  await expect(table.getByRole("columnheader", { name: "Score" })).toHaveAttribute("aria-sort", "ascending");
  await expect(table.getByRole("row").nth(1)).toContainText("Sam");
});

test("shared settings return focus to the game's original trigger", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/jeux/clicker-burger");
  const trigger = page.getByRole("button", { name: "Réglages", exact: true }).first();
  await trigger.click();
  const modal = page.getByRole("dialog", { name: "Réglages", exact: true });
  await expect(modal).toContainText("Clicker Burger");
  await expectTouchTarget(modal.getByRole("button", { name: "Fermer" }));
  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("the catalog index stays to the right and tracks the catalog order", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("analytics_consent", "denied"));
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/playground#settings-modal");

  const catalog = page.locator('[aria-labelledby="playground-title"]');
  const index = catalog.getByRole("navigation");
  const toolbar = catalog.getByRole("group", { name: "Densité", exact: true });
  const heading = catalog.locator("#settings-modal h2");

  await expect(index).toBeVisible();
  await expect(heading).toBeInViewport();
  expect((await heading.boundingBox())!.y).toBeGreaterThan(
    (await toolbar.boundingBox())!.y + (await toolbar.boundingBox())!.height,
  );
  expect((await index.boundingBox())!.x).toBeGreaterThan(
    (await heading.boundingBox())!.x + (await heading.boundingBox())!.width,
  );
  const headings = await catalog.locator("section h2").allTextContents();
  expect(headings).toEqual([...headings].sort((a, b) => a.localeCompare(b, "en")));
  expect(await index.getByRole("link").allTextContents()).toEqual(headings);
  expect(await index.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  await index.getByRole("link", { name: "Table", exact: true }).click();
  await expect(page).toHaveURL(/#table$/);
  await expect(index).toBeInViewport();

  await page.goto("/ar/playground#table");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(index).toBeVisible();
  expect((await index.boundingBox())!.x).toBeGreaterThan(
    (await catalog.locator("#table h2").boundingBox())!.x,
  );
});

test("narrow catalogs use the same primary-inverse surface without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/ar/playground");

  const catalog = page.locator('[aria-labelledby="playground-title"]');
  const cards = catalog.locator("section > .bg-primary-inverse");
  await expect(catalog.getByRole("navigation")).toBeHidden();
  await expect(cards).toHaveCount(Object.keys(demoAnchors).length);
  const colors = () => cards.evaluateAll((elements) =>
    Array.from(new Set(elements.map((el) => getComputedStyle(el).backgroundColor))),
  );

  await page.emulateMedia({ colorScheme: "light" });
  const light = await colors();
  expect(light).toHaveLength(1);
  expect(light[0]).not.toBe("rgba(0, 0, 0, 0)");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(colors).not.toEqual(light);
  expect(await colors()).toHaveLength(1);

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(
      () => page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
  }
});
