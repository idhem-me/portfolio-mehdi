import { test, expect } from "@playwright/test";
test("brush cursor moves freely, draws with left click and exits with right click", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Refuser", exact: true }).click();
  await page.getByRole("button", { name: "Succès", exact: true }).click();
  await page.screenshot({ path: "/private/tmp/portfolio-toolbar-desktop.png" });
  await page.getByRole("button", { name: "Pinceau", exact: true }).click();
  const mode = page.locator("[data-paint-mode]");
  await expect(mode).toBeVisible();
  await expect(mode).toHaveCSS("cursor", "none");
  await page.mouse.move(700, 320);
  await expect(page.locator("[data-paint-cursor]")).toHaveCSS(
    "left",
    "695.325px",
  );
  await expect(page.locator("[data-paint-stroke]")).toHaveCount(0);
  await page.mouse.down({ button: "left" });
  await page.mouse.move(850, 390, { steps: 20 });
  await page.mouse.up({ button: "left" });
  const stroke = page.locator("[data-paint-stroke]");
  await expect(stroke).toHaveCount(1);
  await expect(stroke.locator("path")).toHaveAttribute(
    "stroke",
    "var(--success)",
  );
  await expect(stroke.locator("path")).toHaveAttribute("d", /L850,390$/);
  await expect(stroke).toHaveCSS("transform", "none");
  await page.mouse.move(5, 5);
  await expect(page.locator("[data-paint-cursor]")).toHaveCSS("left", "0.325px");
  await expect(stroke).toHaveCount(1);
  await page.mouse.click(500, 250, { button: "right" });
  await expect(mode).toHaveCount(0);
  await page.getByRole("button", { name: "Touche-moi", exact: true }).click();
  await expect(stroke).toHaveCSS("transform", /matrix/);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(stroke).toHaveCount(0);
  await page.getByRole("button", { name: "Pinceau", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(mode).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("touch drawing remains available with an explicit exit button", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Refuser", exact: true }).tap();
  await page.screenshot({ path: "/private/tmp/portfolio-toolbar-mobile.png" });
  await page.getByRole("button", { name: "Pinceau", exact: true }).tap();
  const client = await context.newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 220, y: 330 }],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 310, y: 370 }],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator("[data-paint-stroke]")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Quitter le pinceau", exact: true })
    .tap();
  await expect(page.locator("[data-paint-mode]")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");
  await context.close();
});
