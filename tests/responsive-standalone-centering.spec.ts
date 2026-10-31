import { expect, test } from "@playwright/test";

test("home-screen controls follow the visible viewport on launch and resume", async ({ page }) => {
  // Reproduce a restored wide layout with a narrower visible iOS viewport.
  await page.setViewportSize({ width: 980, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { value: true });
    Object.defineProperty(window.visualViewport!, "width", {
      configurable: true,
      value: 390,
    });
    localStorage.setItem("analytics_consent", "denied");
  });
  await page.goto("/");
  const toolbar = page.locator("[data-paint-toolbar]");
  const play = page.locator('[data-analytics-action="gravity_play"]');
  async function expectCentered(width: number) {
    for (const element of [toolbar, play]) {
      await expect.poll(async () => {
        const rect = await element.boundingBox();
        return rect ? Math.abs(rect.x + rect.width / 2 - width / 2) : Infinity;
      }).toBeLessThan(1);
    }
  }
  await expectCentered(390);
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, "width", { configurable: true, value: 375 });
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expectCentered(375);
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, "width", { configurable: true, value: 414 });
    window.dispatchEvent(new Event("pageshow"));
  });
  await expectCentered(414);
});
