import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("analytics_consent", "denied"));
});

async function pdf(width: number, height: number) {
  const doc = await PDFDocument.create();
  doc.addPage([width, height]);
  return Buffer.from(await doc.save());
}

test("PDF journey: add, reject, reorder, download, remove and reset locally", async ({ page }) => {
  await page.goto("/outils");
  await page.getByRole("link", { name: /Fusionner des PDF/ }).click();
  const requests: string[] = [];
  page.on("request", request => { if (["POST", "PUT", "PATCH"].includes(request.method())) requests.push(request.url()); });
  const input = page.locator('input[type="file"]');
  const merge = page.getByRole("button", { name: "Fusionner et télécharger" });
  await expect(merge).toBeDisabled();
  await input.setInputFiles([{ name: "first.pdf", mimeType: "application/pdf", buffer: await pdf(200, 300) }, { name: "broken.pdf", mimeType: "application/pdf", buffer: Buffer.from("broken") }]);
  await expect(page.getByRole("region", { name: "Fusionner des PDF" }).getByRole("alert")).toContainText("PDF valide");
  await expect(page.getByText("first.pdf", { exact: true })).toBeVisible();
  await input.setInputFiles({ name: "second.pdf", mimeType: "application/pdf", buffer: await pdf(500, 400) });
  await expect(merge).toBeEnabled();
  await page.getByRole("button", { name: "Monter second.pdf" }).click();
  await expect(page.locator("ol li").first()).toContainText("second.pdf");
  const downloaded = page.waitForEvent("download");
  await merge.click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe("documents-fusionnes.pdf");
  const output = await PDFDocument.load(await readFile((await download.path())!));
  expect(output.getPages().map(p => [p.getWidth(), p.getHeight()])).toEqual([[500, 400], [200, 300]]);
  expect(requests).toEqual([]);
  await page.getByRole("button", { name: "Retirer first.pdf" }).click();
  await expect(merge).toBeDisabled();
  await page.getByRole("button", { name: "Tout effacer" }).click();
  await expect(page.locator("ol")).toHaveCount(0);
});

test("responsive PDF layout supports themes, keyboard and RTL", async ({ page }) => {
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/outils/fusion-pdf");
    await page.getByRole("button", { name: "Ajouter des PDF" }).focus();
    await expect(page.getByRole("button", { name: "Ajouter des PDF" })).toBeFocused();
    await page.locator('input[type="file"]').setInputFiles({ name: "a-very-long-document-name-".repeat(8) + ".pdf", mimeType: "application/pdf", buffer: await pdf(200, 300) });
    await expect(page.locator("ol li")).toHaveCount(1);
    for (const dark of [false, true]) {
      await page.evaluate(value => document.documentElement.classList.toggle("dark", value), dark);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `/tmp/pdf-${width}-${dark ? "dark" : "light"}.png`, fullPage: true });
    }
  }
  await page.goto("/ar/outils/fusion-pdf");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("دمج ملفات PDF");
});
