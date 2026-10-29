import { test, expect } from "@playwright/test";
test("paint stays still until play and reset clears it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Refuser", exact: true }).click();
  const brush = page.getByRole("button", { name: "Pinceau", exact: true });
  await expect(brush).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: "Avertissement", exact: true })
      .locator("span"),
  ).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await page.screenshot({ path: "/private/tmp/portfolio-paint-initial.png" });
  const r = (await brush.boundingBox())!;
  await page.mouse.move(r.x + 40, r.y + 30);
  await page.mouse.down();
  await page.mouse.move(780, 350, { steps: 15 });
  await page.mouse.move(920, 390, { steps: 20 });
  const brushRect = (await brush.boundingBox())!;
  await expect(page.locator("[data-paint-stroke]")).toHaveCount(1);
  const path = await page.locator("[data-paint-stroke] path").getAttribute("d");
  expect(path).toContain(`L${brushRect.x + 8.5},${brushRect.y + 68.5}`);
  await page.mouse.up();
  await expect(page.locator("[data-paint-stroke]")).toHaveCSS(
    "transform",
    "none",
  );
  await expect(
    page.getByRole("button", { name: "Touche-moi", exact: true }),
  ).toBeVisible();
  const after = (await brush.boundingBox())!;
  expect(after.x).toBeCloseTo(brushRect.x, 0);
  const palette = (await page
    .getByRole("group", { name: "Couleur du trait" })
    .boundingBox())!;
  expect(palette.y).toBeLessThan(30);
  expect(palette.x + palette.width).toBeGreaterThan(1240);
  await page.getByRole("button", { name: "Touche-moi", exact: true }).click();
  await expect(page.locator("[data-paint-stroke]")).toHaveCSS(
    "transform",
    /matrix/,
  );
  let previousTransform = "";
  let quietSamples = 0;
  await expect.poll(async () => {
    const current = await page.locator("[data-paint-stroke]").evaluate(e => (e as HTMLElement).style.transform);
    quietSamples = current === previousTransform ? quietSamples + 1 : 0;
    previousTransform = current;
    return quietSamples;
  }, { timeout: 15000, intervals: [250] }).toBeGreaterThanOrEqual(3);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator("[data-paint-stroke]")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Annuler", exact: true }),
  ).toBeDisabled();
  await page.screenshot({ path: "/private/tmp/portfolio-paint.png" });
  expect(errors).toEqual([]);
});

test("touch and pen preserve scrolling, semantic colors and cleanup", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Refuser", exact: true }).click();
  const brush = page.getByRole("button", { name: "Pinceau", exact: true });
  await expect(brush).toBeVisible();
  await page.getByRole("button", { name: "Succès", exact: true }).click();
  // CDP sends actual touch input, including browser pointer capture behavior.
  const client = await context.newCDPSession(page);
  const r = (await brush.boundingBox())!;
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: r.x + 40, y: r.y + 30 }],
  });
  await expect(page.locator("html")).toHaveCSS("overflow", "hidden");
  for (let i = 1; i <= 12; i++)
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: r.x + 40 + 9 * i, y: r.y + 30 - 5 * i }],
    });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator("[data-paint-stroke]")).toHaveCount(1);
  await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");
  const path = page.locator("[data-paint-stroke] path");
  await expect(path).toHaveAttribute("stroke", "var(--success)");
  await expect(path).toHaveCSS("stroke-width", "12px");
  const light = await path.evaluate((e) => getComputedStyle(e).stroke);
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect
    .poll(() => path.evaluate((e) => getComputedStyle(e).stroke))
    .not.toBe(light);
  await page.getByRole("button", { name: "Tout effacer", exact: true }).click();
  await expect(page.locator("[data-paint-stroke]")).toHaveCount(0);
  const penRect = (await brush.boundingBox())!;
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    button: "left",
    buttons: 1,
    clickCount: 1,
    pointerType: "pen",
    x: penRect.x + 40,
    y: penRect.y + 30,
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    button: "left",
    buttons: 0,
    clickCount: 1,
    pointerType: "pen",
    x: penRect.x + 40,
    y: penRect.y + 30,
  });
  await expect(page.locator("[data-paint-stroke]")).toHaveCount(1);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: penRect.x + 40, y: penRect.y + 30 }],
  });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect(page.locator("[data-paint-stroke]")).toHaveCount(1);
  await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");
  await page.screenshot({ path: "/private/tmp/portfolio-paint-mobile.png" });
  await page.setViewportSize({ width: 360, height: 740 });
  await expect(path).toHaveCSS("stroke-width", "12px");
  await page
    .getByRole("link", { name: "Réalisations", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/realisations/);
  await expect(page.locator("[data-paint-stroke]")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");
  await context.close();
});
