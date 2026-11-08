import { test, expect, type Locator, type Page } from "@playwright/test";

async function choose(
  page: Page,
  name: "Sobre" | "Fun" | "Frutiger Aero" | "Liquid Glass",
) {
  const trigger = page.locator(
    '[data-analytics-action="design_system_open"]:visible',
  );
  if ((await trigger.count()) === 0)
    await page.locator('[data-analytics-action="menu_open"]').click();
  await trigger.click();
  await page.getByRole("menuitemradio", { name, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("analytics_consent", "denied");
    localStorage.setItem("theme", "light");
  });
});

const themeOptions = [
  ["Frutiger Aero", "frutiger-aero"],
  ["Liquid Glass", "liquid-glass"],
] as const;

function token(locator: Locator, name: string) {
  return locator.evaluate(
    (element, property) => getComputedStyle(element).getPropertyValue(property).trim(),
    name,
  );
}

test("the switcher offers the four active themes and falls back for retired choices", async ({ page }) => {
  for (const retired of ["github", "adobe"]) {
    await page.goto("/");
    await page.evaluate((value) => localStorage.setItem("portfolio-design-system", value), retired);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-design-system", "mehdi");
    const trigger = page.locator('[data-analytics-action="design_system_open"]:visible');
    await trigger.click();
    await expect(page.getByRole("menuitemradio")).toHaveText([
      "Sobre", "Fun", "Frutiger Aero", "Liquid Glass",
    ]);
    await expect(page.getByRole("menuitemradio", { name: "Sobre" })).toBeChecked();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  }
});

for (const [name, id] of themeOptions) {
  test(`${name} recolors the site, survives reload and opens on standalone routes`, async ({ page, context }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    const root = page.locator("html");
    const body = page.locator("body");
    const initial = await token(body, "--background");
    const cta = page.locator(".home-paper-ctas").getByRole("link").first();
    const originalButton = await token(cta, "box-shadow");
    await choose(page, name);
    await expect(root).toHaveAttribute("data-design-system", id);
    await expect.poll(() => token(body, "--background")).not.toBe(initial);
    await expect.poll(() => token(cta, "box-shadow")).not.toBe(originalButton);
    const light = await token(body, "--background");

    await page.getByRole("button", { name: "Activer le mode sombre", exact: true }).click();
    await expect(root).toHaveClass(/dark/);
    await expect.poll(() => token(body, "--background")).not.toBe(light);
    await page.getByRole("button", { name: "Activer le mode clair", exact: true }).click();
    await expect.poll(() => token(body, "--background")).toBe(light);

    await cta.click();
    await expect(page).toHaveURL(/realisations$/);
    await expect(root).toHaveAttribute("data-design-system", id);
    await page.reload();
    await expect(root).toHaveAttribute("data-design-system", id);
    await expect.poll(() => token(body, "--background")).toBe(light);

    const standalone = await context.newPage();
    await standalone.goto("/dashboard/login");
    await expect(standalone.getByRole("button", { name: "Se connecter" })).toBeVisible();
    await expect(standalone.locator("html")).toHaveAttribute("data-design-system", id);
    await expect.poll(() => token(standalone.locator("body"), "--background")).toBe(light);
    await standalone.close();

    await choose(page, "Sobre");
    await expect.poll(() => token(body, "--background")).toBe(initial);
    expect(errors).toEqual([]);
  });
}

test("Frutiger Aero language menu retains choice and collapsed sidebar stays usable", async ({
  page,
}) => {
  await page.goto("/");
  await choose(page, "Frutiger Aero");
  await page.locator("[data-analytics-action=language_open]").click();
  await page
    .getByRole("menuitemradio", { name: "English", exact: true })
    .click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(
    page.getByRole("button", { name: "Design system", exact: true }),
  ).toContainText("Frutiger Aero");
  await page
    .getByRole("button", {
      name: /Close.*panel|Collapse.*sidebar|Fermer le panel/i,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Design system", exact: true }),
  ).toBeVisible();
  await choose(page, "Sobre");
});

test("Frutiger Aero keeps avatar and gravity controls working", async ({ page }) => {
  await page.goto("/");
  await choose(page, "Frutiger Aero");
  const play = page.locator('[data-analytics-action="gravity_play"]');
  await play.click();
  const config = page.locator('[data-analytics-action="gravity_config"]');
  await expect(config).toBeVisible();
  await config.click();
  await expect(page.locator("#gravity-tune-panel")).toBeVisible();
  await page.locator('[data-analytics-action="gravity_reset"]').click();
  await expect(play).toBeVisible({ timeout: 10000 });
  await expect(
    page.getByRole("button", { name: "Design system", exact: true }),
  ).toContainText("Frutiger Aero");
});

for (const path of [
  "/a-propos",
  "/outils",
  "/outils/qrcode",
  "/outils/color-generator",
  "/outils/compression-image",
  "/outils/conversion-image",
  "/outils/fusion-pdf",
  "/realisations",
  "/realisations/onewallet",
  "/realisations/trusted-interactions",
]) {
  test(`Frutiger Aero applies to ${path} without overflowing or throwing`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(path);
    const body = page.locator("body");
    const original = await token(body, "--background");
    await choose(page, "Frutiger Aero");
    await expect(page.locator("html")).toHaveAttribute(
      "data-design-system",
      "frutiger-aero",
    );
    await expect.poll(() => token(body, "--background")).not.toBe(original);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("Frutiger Aero QR fields, select, sliders, switch and download remain functional", async ({
  page,
}) => {
  await page.goto("/outils/qrcode");
  await choose(page, "Frutiger Aero");
  await page.locator("#qr-content").fill("https://example.com/themed");
  await expect(page.locator("#qr-content")).toHaveValue(
    "https://example.com/themed",
  );
  await page.locator("#qr-level").click();
  await page.getByRole("option", { name: "H", exact: true }).click();
  await page.locator("#qr-logo").setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/nP0AAAAASUVORK5CYII=",
      "base64",
    ),
  });
  const toggle = page.getByRole("switch", {
    name: "Effacer les points sous le logo",
  });
  await expect(toggle).toBeVisible();
  const checked = await toggle.getAttribute("aria-checked");
  await toggle.click();
  await expect(toggle).toHaveAttribute(
    "aria-checked",
    checked === "true" ? "false" : "true",
  );

  const slider = page.getByRole("slider").first();
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /SVG/, exact: false }).first().click();
  expect((await download).suggestedFilename()).toBe("qrcode.svg");
  await choose(page, "Sobre");
  await expect(page.locator("#qr-content")).toHaveValue(
    "https://example.com/themed",
  );
});

test("Frutiger Aero tabs preserve keyboard selection and export content", async ({
  page,
}) => {
  await page.goto("/outils/color-generator");
  await choose(page, "Frutiger Aero");
  const css = page.getByRole("tab", { name: "CSS", exact: true });
  await css.focus();
  await page.keyboard.press("ArrowRight");
  const tailwind = page.getByRole("tab", { name: "Tailwind", exact: true });
  await expect(tailwind).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("colors");
});

test("Frutiger Aero choice survives navigation into the standalone burger game", async ({
  page,
}) => {
  await page.goto("/jeux");
  await choose(page, "Frutiger Aero");
  await page.locator('a[href="/jeux/clicker-burger"]').first().click();
  await expect(page).toHaveURL(/clicker-burger$/);
  await expect(page.locator("html")).toHaveAttribute(
    "data-design-system",
    "frutiger-aero",
  );
  await expect(page.getByRole("button", { name: "Réglages", exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("Frutiger Aero game settings and feedback dialog keep focus and dismiss correctly", async ({
  page,
}) => {
  await page.goto("/jeux");
  await choose(page, "Frutiger Aero");
  await page.locator('a[href="/jeux/clicker-burger"]').first().click();
  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Réglages" });
  await expect(settings).toBeVisible();
  await settings.getByRole("button", { name: "Retour", exact: true }).click();
  const feedback = page.getByRole("dialog", { name: /Retour :/ });
  await expect(feedback).toBeVisible();
  await feedback
    .locator("textarea")
    .fill("Un essai local du formulaire Frutiger Aero.");
  await expect(feedback.locator("textarea")).toHaveValue(
    "Un essai local du formulaire Frutiger Aero.",
  );
  await page.keyboard.press("Escape");
  await expect(feedback).toBeHidden();
  await expect(settings).toBeVisible();
});

test("playground navigation opens a separate comparison page with the keyboard", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Playground", exact: true }).click();
  await expect(page).toHaveURL(/\/playground$/);

  const sidebar = page.locator('[data-slot="sidebar"][data-state]');
  await page.locator('[data-sidebar="trigger"]').click();
  await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  await page.locator('[data-sidebar="trigger"]').click();
  await expect(sidebar).toHaveAttribute("data-state", "expanded");

  const nav = page.getByRole("navigation", { name: "Playground", exact: true });
  const catalogue = nav.getByRole("link", { name: "Playground" });
  const compare = nav.getByRole("link", { name: "Comparer" });
  await expect(catalogue).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("End");
  await page.waitForFunction(
    () => document.documentElement.scrollHeight - (window.scrollY + window.innerHeight) <= 1,
  );
  await expect(page.locator("[data-compare-grid]")).toHaveCount(0);
  await expect(page).toHaveURL(/\/playground$/);

  await compare.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/playground\/design-systems$/);
  await expect(compare).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("heading", { name: "Comparer", exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole("heading", { name: "Playground", exact: true }),
  ).toHaveCount(0);
  await page.goBack();
  await expect(catalogue).toHaveAttribute("aria-current", "page");
});

test("playground keeps the mobile menu and section links in Arabic", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ar/playground");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const nav = page.getByRole("navigation", { name: "مساحة التجربة" });
  await expect(nav).toHaveCSS("position", "fixed");

  await page.locator('[data-analytics-action="menu_open"]').click();
  const menu = page.locator("#mobile-navigation");
  await menu.getByRole("link", { name: "مساحة التجربة" }).click();
  await expect(menu).toBeHidden();
  await nav.getByRole("link", { name: "مقارنة" }).click();
  await expect(page).toHaveURL(/\/ar\/playground\/design-systems$/);
  await expect(
    page.getByRole("heading", { name: "مقارنة", exact: true }),
  ).toBeInViewport();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(391);
});

for (const prefix of ["", "/fr", "/ar", "/de", "/en", "/es", "/it", "/zh"]) {
  test(`legacy Playground link redirects to comparison: ${prefix || "/"}`, async ({
    page,
  }) => {
    await page.goto(`${prefix}/playground/github-vs-adobe`);
    expect(new URL(page.url()).pathname).toBe(
      `${prefix === "/fr" ? "" : prefix}/playground/design-systems`,
    );
    await expect(page.locator("#comparison-title")).toBeInViewport();
  });
}

test("playground comparison renders every enabled system", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/playground/design-systems");
  const grid = page.locator("[data-compare-grid]");
  const content = page.getByRole("main");
  const nav = page.getByRole("navigation", { name: "Playground" });
  const gridBox = (await grid.boundingBox())!;
  const contentBox = (await content.boundingBox())!;
  const navBox = (await nav.boundingBox())!;
  const availableLeft = navBox.x + navBox.width;
  const availableRight = contentBox.x + contentBox.width;
  expect(
    Math.abs(
      gridBox.x + gridBox.width / 2 - (availableLeft + availableRight) / 2,
    ),
  ).toBeLessThan(2);
  await expect(
    page.getByRole("heading", { name: "Comparer", exact: true }),
  ).toBeVisible();
  for (const id of ["mehdi", "fun", "frutiger-aero", "liquid-glass"]) {
    const column = page.locator(`[data-compare-column="${id}"]`);
    await expect(column).toBeVisible();
    await expect(column.getByText("Tokens sémantiques")).toBeVisible();
    await expect(column.getByText(/Tokens natifs/)).toBeVisible();
  }
  await expect(page.locator("[data-compare-column]")).toHaveCount(4);
  expect(errors).toEqual([]);
});

test("the new themes keep their own palettes in comparison and in its portals", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/playground/design-systems");
  const columns = page.locator("[data-compare-column]");
  const backgrounds = await Promise.all(
    (await columns.all()).map((column) => token(column, "--background")),
  );
  expect(new Set(backgrounds).size).toBe(4);

  await choose(page, "Liquid Glass");
  await expect(page.locator("html")).toHaveAttribute("data-design-system", "liquid-glass");
  for (const [index, column] of (await columns.all()).entries()) {
    await expect.poll(() => token(column, "--background")).toBe(backgrounds[index]);
  }

  for (const [, id] of themeOptions) {
    const column = page.locator(`[data-compare-column="${id}"]`);
    const scope = column.locator("..");
    const popover = await token(column, "--popover");
    const menu = column.getByRole("button", { name: "Actions" });
    await menu.click();
    await expect.poll(() => token(scope.getByRole("menu"), "--popover")).toBe(popover);
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
    const dialog = column.getByRole("button", { name: "Ouvrir dialog" });
    await dialog.click();
    await expect.poll(() => token(scope.getByRole("dialog"), "--popover")).toBe(popover);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeFocused();
  }
});

for (const path of [
  "/outils/qrcode",
  "/outils/color-generator",
  "/ar/outils/qrcode",
]) {
  test(`mobile Liquid Glass layout and controls at ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await choose(page, "Liquid Glass");
    await page.locator('[data-analytics-action="menu_close"]').click();
    await expect(page.locator("#mobile-navigation")).toBeHidden();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    if (path.includes("qrcode")) {
      await page.locator("#qr-content").fill("https://example.com/mobile");
      await expect(page.locator("#qr-content")).toHaveValue(
        "https://example.com/mobile",
      );
    }
    if (path.startsWith("/ar"))
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });
}

test("Fun keeps its palette across routes and languages and follows light and dark mode", async ({ page }) => {
  await page.goto("/");
  await choose(page, "Fun");
  const root = page.locator("html");
  const cta = page.locator(".home-paper-ctas").getByRole("link").first();
  await expect(root).toHaveAttribute("data-design-system", "fun");
  await expect(cta).toHaveCSS("border-top-width", "2px");
  const light = await cta.evaluate((element) => getComputedStyle(element).backgroundColor);

  await page.getByRole("button", { name: "Activer le mode sombre", exact: true }).click();
  await expect(root).toHaveClass(/dark/);
  await expect(cta).not.toHaveCSS("background-color", light);

  await cta.click();
  await expect(page).toHaveURL(/realisations$/);
  await page.locator("[data-analytics-action=language_open]").click();
  await page.getByRole("menuitemradio", { name: "English", exact: true }).click();
  await expect(root).toHaveAttribute("lang", "en");
  await expect(root).toHaveAttribute("data-design-system", "fun");
  await page.reload();
  await expect(root).toHaveAttribute("data-design-system", "fun");
});

test("Fun compares independently and the Playground demo keeps focus and mobile sizing", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/playground/design-systems");
  await choose(page, "Fun");
  const fun = page.locator('[data-compare-column="fun"]');
  const sobre = page.locator('[data-compare-column="mehdi"]');
  await expect(fun.getByRole("button", { name: "Primary" })).toHaveCSS("border-top-width", "2px");
  await expect(sobre.getByRole("button", { name: "Primary" })).toHaveCSS("border-top-width", "1px");
  const swatch = fun.getByText("--fun-yellow", { exact: true }).locator("..");
  await expect(swatch).toContainText(/#[a-f0-9]{6}/i);
  const lightSwatch = await swatch.innerText();
  await page.getByRole("button", { name: "Activer le mode sombre", exact: true }).click();
  await expect(swatch).not.toHaveText(lightSwatch);
  await expect(swatch).toContainText(/#[a-f0-9]{6}/i);

  for (const [column, dialogBorder, menuBorder] of [
    [fun, "3px", "3px"],
    [sobre, "1px", "0px"],
  ] as const) {
    const scope = column.locator("..");
    const trigger = column.getByRole("button", { name: "Ouvrir dialog" });
    await trigger.click();
    await expect(scope.getByRole("dialog")).toHaveCSS("border-top-width", dialogBorder);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    const menu = column.getByRole("button", { name: "Actions" });
    await menu.click();
    await expect(scope.getByRole("menu")).toHaveCSS("border-top-width", menuBorder);
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
  }

  await page.goto("/playground#fun");
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  const demo = page.locator("#fun");
  const preview = demo.getByRole("button", { name: "Aperçu" });
  await expect(preview).toHaveCSS("transition-duration", "0s");
  await expect(preview).toHaveCSS("height", "44px");
  await demo.getByRole("textbox", { name: "Nom de l’affiche" }).fill("Fête des couleurs");
  await preview.click();
  const dialog = demo.getByRole("dialog");
  await expect(dialog).toContainText("Fête des couleurs");
  await expect(dialog.getByRole("button", { name: "Fermer" })).toHaveCSS("height", "44px");
  await page.keyboard.press("Escape");
  await expect(preview).toBeFocused();
});

test("font tokens follow theme while Arabic, Chinese and monospace retain their fonts", async ({
  page,
}) => {
  await page.goto("/playground/design-systems");
  await choose(page, "Fun");
  const fun = page.locator('[data-compare-column="fun"]');
  const sobre = page.locator('[data-compare-column="mehdi"]');
  await expect(page.locator("body")).toHaveCSS("font-family", /Bricolage Grotesque/);
  await expect(fun).toHaveCSS("font-family", /Bricolage Grotesque/);
  await expect(sobre).toHaveCSS("font-family", /Google Sans/);
  await expect(fun.getByText("--font-sans", { exact: true }).locator("..")).toContainText(
    "Bricolage Grotesque",
  );
  await expect(sobre.getByText("--font-sans", { exact: true }).locator("..")).toContainText(
    "Google Sans",
  );

  await page.getByRole("button", { name: "Activer le mode sombre", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("body")).toHaveCSS("font-family", /Bricolage Grotesque/);
  await page.getByRole("button", { name: "Activer le mode clair", exact: true }).click();

  for (const [locale, expectedLocaleFont] of [
    ["ar", "notoSansArabic"],
    ["zh", "Noto Sans SC"],
  ] as const) {
    await page.goto(`/${locale}/playground/design-systems`);
    const fun = page.locator('[data-compare-column="fun"]');
    const sobre = page.locator('[data-compare-column="mehdi"]');
    await expect(page.locator("html")).toHaveAttribute("data-design-system", "fun");
    await expect(page.locator("body")).toHaveCSS("font-family", new RegExp(expectedLocaleFont));
    await expect(fun).toHaveCSS("font-family", /Bricolage Grotesque/);
    await expect(sobre).toHaveCSS("font-family", /Google Sans/);
    await expect(fun.locator("code").first()).toHaveCSS("font-family", /Geist Mono/);
  }
});

test("global menus use the active theme font token", async ({ page }) => {
  await page.goto("/");
  for (const [theme, font] of [
    ["Sobre", /Google Sans/],
    ["Fun", /Bricolage Grotesque/],
  ] as const) {
    await choose(page, theme);
    await expect(
      page.getByRole("heading", { name: /Derrière chaque écran/ }),
    ).toHaveCSS("font-family", font);
    await expect(
      page.locator('[data-slot="sidebar"] [data-slot="sidebar-menu-button"]').first(),
    ).toHaveCSS("font-family", font);
    for (const label of ["Design system", "Langue"]) {
      const trigger = page.getByRole("button", { name: label, exact: true });
      await trigger.click();
      await expect(page.locator('[data-slot="dropdown-menu-content"]')).toHaveCSS(
        "font-family",
        font,
      );
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
    }
  }
});
