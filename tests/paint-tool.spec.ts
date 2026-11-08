import { test, expect } from "@playwright/test";
test("brush cursor moves freely, draws with left click and exits with right click", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Refuser", exact: true }).click();
  await page.getByRole("button", { name: "Pinceau", exact: true }).click();
  await page.getByRole("button", { name: "Succès", exact: true }).click();
  await page.screenshot({ path: "/private/tmp/portfolio-toolbar-desktop.png" });
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
  await expect(page.locator("[data-paint-cursor]")).toHaveCSS(
    "left",
    "0.325px",
  );
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
  await page.locator("[data-paint-mode]")
    .getByRole("button", { name: "Quitter le pinceau", exact: true })
    .tap();
  await expect(page.locator("[data-paint-mode]")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");
  await context.close();
});

test("fast release and interrupted gestures preserve painted pixels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Refuser", exact: true }).click();
  await page.getByRole("button", { name: "Pinceau", exact: true }).click();
  const mode = page.locator("[data-paint-mode]");
  const strokes = page.locator("[data-paint-stroke]");

  for (const end of [
    "pointerup",
    "pointercancel",
    "lostpointercapture",
    "blur",
    "Escape",
  ]) {
    await page.mouse.move(700, 320);
    await page.mouse.down();
    await page.mouse.move(850, 390);
    const before = await strokes.last().locator("path").getAttribute("d");
    const count = await strokes.count();
    if (end === "Escape") {
      await page.keyboard.press("Escape");
    } else if (end === "blur") {
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    } else {
      await mode.dispatchEvent(end, {
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        clientX: 900,
        clientY: 410,
        button: 0,
        buttons: 0,
      });
    }
    await page.mouse.up();
    await expect(strokes).toHaveCount(count);
    if (end === "pointerup") {
      await expect(strokes.last().locator("path")).toHaveAttribute(
        "d",
        /L900,410$/,
      );
    } else {
      await expect(strokes.last().locator("path")).toHaveAttribute(
        "d",
        before!,
      );
    }
    await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");
    if (end === "blur" || end === "Escape") {
      await page.getByRole("button", { name: "Pinceau", exact: true }).click();
    }
  }
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(strokes).toHaveCount(4);
});

for (const touch of [false, true]) {
  test(`active brush switches tokens without drawing on the palette (${touch ? "touch" : "mouse"})`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: touch
        ? { width: 390, height: 844 }
        : { width: 1280, height: 900 },
      hasTouch: touch,
      isMobile: touch,
    });
    const page = await context.newPage();
    const activate = async (name: string) => {
      const button = page.getByRole("button", { name, exact: true });
      if (touch) await button.tap();
      else await button.click();
    };
    await page.goto("/");
    await activate("Refuser");
    await activate("Pinceau");
    const draw = async () => {
      if (touch) {
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
        await client.detach();
      } else {
        await page.mouse.move(700, 320);
        await page.mouse.down();
        await page.mouse.move(850, 390, { steps: 5 });
        await page.mouse.up();
      }
    };
    const strokes = page.locator("[data-paint-stroke] path");
    await draw();
    await expect(strokes).toHaveCount(1);
    for (const [index, name, token] of [
      [2, "Succès", "success"],
      [3, "Danger", "destructive"],
    ] as const) {
      await activate(name);
      await expect(page.locator("[data-paint-mode]")).toBeVisible();
      await expect(
        page.getByRole("button", { name, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(strokes).toHaveCount(index - 1);
      await expect(
        page.locator("[data-paint-cursor] [data-paint-bristles]"),
      ).toHaveAttribute("fill", `var(--${token})`);
      await draw();
      await expect(strokes).toHaveCount(index);
      await expect(strokes.last()).toHaveAttribute("stroke", `var(--${token})`);
      await expect(strokes.first()).toHaveAttribute("stroke", "var(--primary)");
    }
    await page.setViewportSize(
      touch ? { width: 430, height: 900 } : { width: 1000, height: 800 },
    );
    await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
    await activate("Succès");
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await expect(
      page.locator("[data-paint-cursor] [data-paint-bristles]"),
    ).toHaveAttribute("fill", "var(--success)");
    const exit = page.locator("[data-paint-mode]")
      .getByRole("button", { name: "Quitter le pinceau", exact: true });
    if (touch) await exit.tap();
    else await exit.click();
    await expect(page.locator("[data-paint-mode]")).toHaveCount(0);
    const brush = page.getByRole("button", { name: "Pinceau", exact: true });
    await expect(brush.locator("svg.lucide-brush")).toBeVisible();
    if (touch) await brush.tap();
    else await brush.click();
    await expect(
      page.locator("[data-paint-cursor] [data-paint-bristles]"),
    ).toHaveAttribute("fill", "var(--success)");
    await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");
    await context.close();
  });
}

test("Fun uses the accent for the brush and keeps the exit aligned on mobile", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("analytics_consent", "denied");
    localStorage.setItem("theme", "light");
  });
  await page.goto("/");
  await page.locator('[data-analytics-action="design_system_open"]:visible').click();
  await page.getByRole("menuitemradio", { name: "Fun", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const toolbar = page.locator("[data-paint-toolbar]");
  const brush = toolbar.getByRole("button", { name: "Pinceau", exact: true });
  await expect(brush).toHaveAttribute("data-variant", "accent");
  await expect(brush).toHaveCSS("height", "44px");
  await expect(brush).toHaveCSS("background-color", "rgb(99, 52, 198)");
  await brush.click();

  const exit = page.locator("[data-paint-mode]").getByRole("button", {
    name: "Quitter le pinceau",
    exact: true,
  });
  const exitBox = (await exit.boundingBox())!;
  const brushBox = (await toolbar.getByRole("button", {
    name: "Quitter le pinceau",
    exact: true,
  }).boundingBox())!;
  expect(brushBox.x - (exitBox.x + exitBox.width)).toBeCloseTo(8, 0);
  expect(exitBox.y + exitBox.height / 2).toBeCloseTo(brushBox.y + brushBox.height / 2, 0);
  await exit.click();
  await expect(brush).toBeVisible();
  await expect(page.locator("[data-paint-stroke]")).toHaveCount(0);
});
