import { expect, test, type Page } from "@playwright/test";

async function openHome(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Refuser", exact: true }).click();
}

async function draw(page: Page) {
  await page.getByRole("button", { name: "Pinceau", exact: true }).click();
  await page.mouse.move(220, 330);
  await page.mouse.down();
  await page.mouse.move(310, 370, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.press("Escape");
  await expect(page.locator("body > [data-paint-stroke]")).toHaveCount(1);
}

for (const trigger of ["Reset", "Tout effacer"] as const) {
  test(`${trigger}: torn snapshot retains drawings while the original is restored`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await openHome(page);
    await draw(page);
    await page.getByRole("button", { name: "Touche-moi", exact: true }).click();
    await expect(page.locator("body > [data-paint-stroke]")).toHaveCSS("transform", /matrix/);
    await page.getByRole("button", { name: trigger, exact: true }).click();
    const tear = page.locator("[data-page-tear]");
    await expect(tear).toHaveAttribute("data-motion", "full");
    await expect(tear).toHaveCSS("position", "fixed");
    await page.evaluate(() => {
      for (const animation of document.querySelector("[data-page-tear]")!.getAnimations({ subtree: true })) {
        animation.pause();
        animation.currentTime = 450;
      }
    });
    await expect.poll(async () =>
      Number(await tear.locator("feDisplacementMap").getAttribute("scale")),
    ).toBeGreaterThan(0);
    await expect(tear.locator("[data-paint-stroke]")).toHaveCount(1);
    await expect(page.locator("body > [data-paint-stroke]")).toHaveCount(0);
    await expect(page.locator("body > [inert]")).not.toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("tear-midpoint.png") });
    // Native clicks and keyboard activation cannot reach the restored page.
    await page.mouse.click(220, 330);
    await page.keyboard.press("Enter");
    await expect(tear).toHaveCount(1);
    await page.evaluate(() => {
      for (const animation of document.querySelector("[data-page-tear]")!.getAnimations({ subtree: true })) animation.finish();
    });
    await expect(tear).toHaveCount(0);
    await expect(page.locator('filter[id^="page-tear-bend-"]')).toHaveCount(0);
    await expect(page.locator("body > [inert]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reset", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Touche-moi", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Touche-moi", exact: true }).click();
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(tear).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test("Clean resets drawings alone and reduced motion fades without moving the sheet", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await openHome(page);
  await draw(page);
  await page.getByRole("button", { name: "Tout effacer", exact: true }).click();
  const tear = page.locator("[data-page-tear]");
  await expect(tear).toHaveAttribute("data-motion", "reduced");
  await expect(tear).toHaveCount(0);
  await expect(page.locator("[data-paint-stroke]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Touche-moi", exact: true })).toBeVisible();
  await draw(page);
});

test("scroll position survives reset and navigation cancels the overlay immediately", async ({ page }) => {
  await openHome(page);
  await page.getByRole("button", { name: "Touche-moi", exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 120));
  const scrollY = await page.evaluate(() => window.scrollY);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator("[data-page-tear]")).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollY);
  await expect(page.locator("[data-page-tear]")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollY);

  // Use the router through an existing link to unmount during the animation.
  await page.getByRole("button", { name: "Touche-moi", exact: true }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.evaluate(() => {
    const link = document.querySelector<HTMLAnchorElement>('a[data-analytics-action="home_cta"][href$="/realisations"]');
    if (!link) throw new Error("Missing projects navigation link");
    link.click();
  });
  await expect(page).toHaveURL(/realisations/);
  await expect(page.locator("[data-page-tear]")).toHaveCount(0);
  await expect(page.locator("body > [inert]")).toHaveCount(0);
});

test("Clean also restores physics without drawings and resize releases the interaction lock", async ({ page }) => {
  await openHome(page);
  await page.getByRole("button", { name: "Touche-moi", exact: true }).click();
  await page.getByRole("button", { name: "Tout effacer", exact: true }).click();
  await expect(page.locator("[data-page-tear]")).toHaveCount(1);
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await expect(page.locator("[data-page-tear]")).toHaveCount(0);
  await expect(page.locator("body > [inert]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reset", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tout effacer", exact: true })).toBeDisabled();
  await draw(page);
});
