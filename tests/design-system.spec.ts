import { test, expect } from "@playwright/test";

async function choose(
  page: import("@playwright/test").Page,
  name: "GitHub" | "Mehdi",
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

test("site uses real Primer components, retains navigation choice and resets on reload", async ({
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

test("mobile design system menus work inside the navigation dialog", async ({
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

test("contact uses Primer throughout and switching back restores Mehdi", async ({
  page,
}) => {
  await page.goto("/contact");
  const content = page.locator('[data-slot="sidebar-inset"]');
  const heading = content.getByRole("heading", { level: 1 });
  const originalFont = await heading.evaluate(
    (el) => getComputedStyle(el).fontFamily,
  );
  await choose(page, "GitHub");
  await expect(page.locator("html")).toHaveAttribute(
    "data-design-system",
    "github",
  );
  await expect(
    content.locator('[data-component="Button"]').first(),
  ).toBeVisible();
  expect(
    await heading.evaluate((el) => getComputedStyle(el).fontFamily),
  ).not.toBe(originalFont);
  await choose(page, "Mehdi");
  await expect(content.locator('[data-component="Button"]')).toHaveCount(0);
  expect(await heading.evaluate((el) => getComputedStyle(el).fontFamily)).toBe(
    originalFont,
  );
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
  test(`Primer applies to ${path} without overflowing or throwing`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(path);
    await choose(page, "GitHub");
    await expect(page.locator("html")).toHaveAttribute(
      "data-design-system",
      "github",
    );
    expect(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--background")
          .trim(),
      ),
    ).not.toBe("");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/tmp/design-system-${path.replaceAll("/", "-")}.png`,
    });
    expect(errors).toEqual([]);
  });
}

test("Primer QR fields, select, sliders, switch and download remain functional", async ({
  page,
}) => {
  await page.goto("/outils/qrcode");
  await choose(page, "GitHub");
  await page.locator("#qr-content").fill("https://example.com/primer");
  await expect(page.locator("#qr-content")).toHaveValue(
    "https://example.com/primer",
  );
  await expect(
    page.locator('[data-component="TextInput"]').first(),
  ).toBeVisible();
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
  const toggle = page.getByRole("button", {
    name: "Effacer les points sous le logo",
  });
  await expect(toggle).toBeVisible();
  const checked = await toggle.getAttribute("aria-pressed");
  await toggle.click();
  await expect(toggle).toHaveAttribute(
    "aria-pressed",
    checked === "true" ? "false" : "true",
  );

  const slider = page.getByRole("slider").first();
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /SVG/, exact: false }).first().click();
  expect((await download).suggestedFilename()).toBe("qrcode.svg");
  await choose(page, "Mehdi");
  await expect(page.locator("#qr-content")).toHaveValue(
    "https://example.com/primer",
  );
});

test("Primer tabs preserve keyboard selection and export content", async ({
  page,
}) => {
  await page.goto("/outils/color-generator");
  await choose(page, "GitHub");
  const css = page.getByRole("tab", { name: "CSS", exact: true });
  await css.focus();
  await page.keyboard.press("ArrowRight");
  const tailwind = page.getByRole("tab", { name: "Tailwind", exact: true });
  await expect(tailwind).toHaveAttribute("aria-selected", "true");
  await expect(tailwind).toHaveAttribute("data-component", "Button");
  await expect(page.getByRole("tabpanel")).toContainText("colors");
  await page.screenshot({ path: "/tmp/design-system-primer-tabs.png" });
});

test("Primer choice survives navigation into the standalone burger game", async ({
  page,
}) => {
  await page.goto("/jeux");
  await choose(page, "GitHub");
  await page.locator('a[href="/jeux/clicker-burger"]').first().click();
  await expect(page).toHaveURL(/clicker-burger$/);
  await expect(page.locator("html")).toHaveAttribute(
    "data-design-system",
    "github",
  );
  await expect(page.locator('[data-component="Button"]').first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/design-system-primer-burger.png" });
});

test("Primer game settings and feedback dialog keep focus and dismiss correctly", async ({
  page,
}) => {
  await page.goto("/jeux");
  await choose(page, "GitHub");
  await page.locator('a[href="/jeux/clicker-burger"]').first().click();
  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  const settings = page.getByRole("dialog");
  await expect(settings).toBeVisible();
  await settings.getByRole("button", { name: "Retour", exact: true }).click();
  const feedback = page.getByRole("dialog", { name: /Retour :/ });
  await expect(
    feedback.locator('[data-component="Dialog.Body"]'),
  ).toBeVisible();
  await feedback
    .locator("textarea")
    .fill("Un essai local du formulaire Primer.");
  await expect(feedback.locator("textarea")).toHaveValue(
    "Un essai local du formulaire Primer.",
  );
  await page.screenshot({ path: "/tmp/design-system-primer-feedback.png" });
  await page.keyboard.press("Escape");
  await expect(feedback).toBeHidden();
  await expect(settings).toBeVisible();
});

for (const path of [
  "/outils/qrcode",
  "/outils/color-generator",
  "/ar/outils/qrcode",
]) {
  test(`mobile Primer layout and controls at ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await choose(page, "GitHub");
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
    await page.screenshot({
      path: `/tmp/design-system-mobile-${path.replaceAll("/", "-")}.png`,
      fullPage: true,
    });
  });
}
