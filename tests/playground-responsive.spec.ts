import { expect, test, type Locator } from "@playwright/test";
import { demoAnchors } from "../src/app/[locale]/(site)/playground/coverage";
import { locales } from "../src/i18n/routing";

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

test("local components are available only in development in every locale", async ({ page, request }) => {
  if (process.env.PLAYGROUND_TEST_MODE === "production") {
    for (const prefix of ["", ...locales.map((locale) => `/${locale}`)]) {
      const destination = `${prefix === "/fr" ? "" : prefix}/playground`;
      const url = `${prefix}/playground/local-components`;
      const response = await request.get(url, { maxRedirects: 0 });
      expect(response.status()).toBe(307);
      expect(response.headers().location).toBe(destination);
      const prefetch = await request.get(url, {
        headers: { RSC: "1", "Next-Router-Prefetch": "1" },
        maxRedirects: 0,
      });
      expect(prefetch.status()).toBe(307);
      await page.goto(url);
      expect(new URL(page.url()).pathname).toBe(destination);
      await expect(page.locator('a[href$="/playground/local-components"], #LOCAL-01')).toHaveCount(0);
    }
    return;
  }

  await page.setViewportSize({ width: 320, height: 750 });
  for (const locale of locales) {
    const prefix = locale === "fr" ? "" : `/${locale}`;
    const url = `${prefix}/playground/local-components`;
    await page.goto(url);
    await expect(page.locator(`a[href="${url}"][aria-current="page"]`)).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator("#LOCAL-01")).toBeVisible();
    await expect(page.locator("#LOCAL-09")).toBeVisible();
    await expect(page.locator("#LOCAL-08, #LOCAL-10")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
    await expect(page.locator("#LOCAL-01 a")).toHaveAttribute("href", `${prefix}/playground#paint-color`);
    if (locale === "ar") await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  }
});

test("mobile theme and language menus work inside the navigation dialog", async ({ page, hasTouch }) => {
  await page.addInitScript(() => localStorage.setItem("analytics_consent", "denied"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const activate = (target: Locator) => hasTouch ? target.tap() : target.click();
  const open = page.getByRole("button", { name: "Ouvrir le menu", exact: true });
  await activate(open);
  const mobile = page.locator("#mobile-navigation");
  const choose = async (name: string) => {
    if (!await mobile.isVisible()) await activate(open);
    await activate(mobile.locator('[data-analytics-action="design_system_open"]'));
    const option = page.getByRole("menuitemradio", { name, exact: true });
    await expect(option).toBeVisible();
    await activate(option);
    await expect(option).toBeHidden();
  };
  await choose("Frutiger Aero");
  await expect(mobile).toBeVisible();
  await activate(mobile.locator('[data-analytics-action="language_open"]'));
  const french = page.getByRole("menuitemradio", { name: "Français", exact: true });
  await activate(french);
  await expect(french).toBeHidden();
  await choose("Sobre");
  await choose("Liquid Glass");
  await activate(mobile.getByRole("link", { name: "Accueil", exact: true }));
  await expect(mobile).toBeHidden();
  await expect(page.locator("html")).toHaveAttribute("data-design-system", "liquid-glass");
});

for (const [name, id] of [
  ["Frutiger Aero", "frutiger-aero"],
  ["Liquid Glass", "liquid-glass"],
] as const) {
  test(`${name} keeps mobile targets and focus in the dark Playground`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.addInitScript(() => localStorage.setItem("analytics_consent", "denied"));
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/playground");
    await page.getByRole("button", { name: "Mobile", exact: true }).click();
    const switcher = page.locator("#sidebar").getByRole("button", { name: "Design system", exact: true });
    await switcher.click();
    await page.getByRole("menuitemradio", { name, exact: true }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("html")).toHaveAttribute("data-design-system", id);

    const iconButton = page.locator("section#button").getByRole("button", { name: "Bouton icône icon-xs", exact: true });
    await expectTouchTarget(iconButton);
    const menuTrigger = page.locator("#dropdown-menu").getByRole("button", { name: "Items", exact: true });
    await menuTrigger.click();
    await expectTouchTarget(page.getByRole("menuitem", { name: "Profil", exact: true }));
    await page.keyboard.press("Escape");
    await expect(menuTrigger).toBeFocused();

    const demo = page.locator(`section#${id}`);
    const preview = demo.getByRole("button", { name: "Aperçu" });
    await expectTouchTarget(preview);
    await expect(preview).toHaveCSS("transition-duration", "0s");
    await demo.getByRole("textbox").fill("Projet de démonstration");
    await preview.click();
    const dialog = demo.getByRole("dialog");
    await expect(dialog).toContainText("Projet de démonstration");
    await expectTouchTarget(dialog.getByRole("button", { name: "Fermer" }));
    await page.keyboard.press("Escape");
    await expect(preview).toBeFocused();
  });
}

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
  await expectTouchTarget(toggle);
  await expectTouchTarget(modal.getByRole("slider"));
  await expect(modal.getByRole("switch", { name: "Alertes" })).toBeDisabled();
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

  const mobileRow = page.locator("#table").getByRole("button", { name: "Ada 1200" });
  await expectTouchTarget(mobileRow);
  await mobileRow.press("Enter");
  await expect(page.getByRole("dialog", { name: "Ada" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(mobileRow).toBeFocused();
});

test("local component demos retain touch targets, keyboard controls and feedback", async ({ page }) => {
  await page.addInitScript(() => {
    let copies = 0;
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async () => { if (++copies === 2) throw new Error("Clipboard unavailable"); } },
    });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/playground");
  await page.getByRole("button", { name: "Mobile", exact: true }).click();

  const fields = page.locator("#textarea");
  const checkbox = fields.getByRole("checkbox");
  await expectTouchTarget(fields.locator('label:has(input[type="checkbox"])'));
  await checkbox.press("Space");
  await expect(checkbox).not.toBeChecked();
  await expect(fields.getByRole("textbox").first()).toHaveAccessibleDescription("Ajoutez un message sur plusieurs lignes.");
  await expect(fields.getByRole("textbox").last()).toHaveAttribute("aria-invalid", "true");

  const actions = page.locator("#gift-actions");
  const avatar = actions.getByRole("button", { name: "Compte de démonstration" });
  await expectTouchTarget(avatar);
  await expectTouchTarget(actions.getByRole("link"));
  await avatar.press("Enter");
  await expect(page.getByRole("menuitem", { name: "Réglages" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(avatar).toBeFocused();

  const swatches = page.locator("#swatches");
  const swatch = swatches.getByRole("button", { name: /^Copier [\d]+/ }).first();
  await expectTouchTarget(swatch);
  await swatch.press("Enter");
  const copied = swatches.getByRole("button", { name: /^Copié ! [\d]+/ });
  await expect(copied).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(swatches.getByRole("button", { name: /^Copie impossible/ })).toBeFocused();

  const study = page.locator("#case-study");
  await study.getByRole("button", { name: "design system" }).focus();
  await expect(page.getByRole("tooltip")).toHaveText("Un ensemble de composants et de règles partagés.");
  await page.keyboard.press("Escape");
  const secondSlide = study.getByRole("button", { name: /^Écran 2 ·/ });
  await expectTouchTarget(secondSlide);
  await secondSlide.press("Enter");
  await expect(secondSlide).toHaveAttribute("aria-current", "true");
  const enlarge = study.getByRole("button", { name: "Agrandir Écran de démonstration 2" });
  await enlarge.press("Enter");
  const lightbox = page.getByRole("dialog", { name: "Écran de démonstration 2" });
  const close = lightbox.getByRole("button", { name: "Fermer" });
  await expectTouchTarget(close);
  await expect(close).toBeFocused();
  await page.keyboard.press("+");
  await page.keyboard.press("ArrowRight");
  await expect(lightbox.getByRole("img")).toHaveAttribute("style", /32px.*scale\(1\.25\)/);
  await page.keyboard.press("Escape");
  await expect(enlarge).toBeFocused();
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

test("the catalog index stays fixed while the page scrolls", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("analytics_consent", "denied"));
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/playground");

  const catalog = page.locator('[aria-labelledby="playground-title"]');
  const index = catalog.getByRole("navigation");
  const toolbar = catalog.getByRole("group", { name: "Densité", exact: true });
  const heading = catalog.locator("#table h2");

  await expect(index).toBeInViewport();
  expect((await index.boundingBox())!.x).toBeGreaterThan(
    (await heading.boundingBox())!.x + (await heading.boundingBox())!.width,
  );
  const headings = await catalog.locator("section h2").allTextContents();
  expect(headings).toEqual([...headings].sort((a, b) => a.localeCompare(b, "en")));
  expect(await index.getByRole("link").allTextContents()).toEqual(headings);
  await expect(index).toHaveCSS("position", "fixed");
  await expect(index).toHaveCSS("overflow-y", "auto");
  expect(await index.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);

  const initialBounds = (await index.boundingBox())!;
  expect(initialBounds.x + initialBounds.width).toBeCloseTo(1600 - 24, 0);
  expect(initialBounds.width).toBeGreaterThanOrEqual(256);
  const lastLink = index.getByRole("link").last();
  await page.evaluate(() => window.scrollBy(0, 320));
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const scrolledBounds = (await index.boundingBox())!;
  expect(scrolledBounds.x).toBeCloseTo(initialBounds.x, 0);
  expect(scrolledBounds.y).toBeCloseTo(initialBounds.y, 0);
  await index.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await expect(lastLink).toBeInViewport();

  await index.evaluate((el) => { el.scrollTop = 0; });
  await index.getByRole("link", { name: "Table", exact: true }).click();
  await expect(page).toHaveURL(/#table$/);
  await expect(heading).toBeInViewport();
  expect((await heading.boundingBox())!.y).toBeGreaterThan(
    (await toolbar.boundingBox())!.y + (await toolbar.boundingBox())!.height,
  );

  await page.goto("/ar/playground#table");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(index).toBeVisible();
  expect((await index.boundingBox())!.x).toBeCloseTo(24, 0);
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
