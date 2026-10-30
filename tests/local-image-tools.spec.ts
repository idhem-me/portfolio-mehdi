import { test, expect, type Page, type Download } from "@playwright/test";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import sharp from "sharp";

async function visit(page: Page, tool: string, locale = "fr") {
  await page.goto(`${locale === "fr" ? "" : `/${locale}`}/outils/${tool}`);
  const decline = page.getByRole("button", {
    name: locale === "ar" ? "رفض" : "Refuser",
    exact: true,
  });
  await decline
    .waitFor({ state: "visible", timeout: 5000 })
    .catch(() => undefined);
  if (await decline.isVisible()) await decline.click();
}

async function images(page: Page) {
  const encoded = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    // Leave the left half transparent, so JPEG flattening is observable.
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(128, 0, 128, 128);
    return ["image/png", "image/jpeg", "image/webp"].map((mimeType) => ({
      mimeType,
      data: canvas.toDataURL(mimeType).split(",")[1],
    }));
  });
  return encoded.map((entry, index) => ({
    name: `sample.${["png", "jpg", "webp"][index]}`,
    mimeType: entry.mimeType,
    buffer: Buffer.from(entry.data, "base64"),
  }));
}

async function downloadedBytes(download: Download) {
  const path = await download.path();
  expect(path).not.toBeNull();
  return readFile(path!);
}

test("compression processes PNG/JPEG/WEBP locally and exports every result in a ZIP", async ({
  page,
}) => {
  await visit(page, "compression-image");
  const files = await images(page);
  const uploads: string[] = [];
  page.on("request", (request) => {
    if (
      ["POST", "PUT", "PATCH"].includes(request.method()) &&
      !new URL(request.url()).pathname.startsWith("/__nextjs")
    )
      uploads.push(request.url());
  });
  await page.locator('input[type="file"]').setInputFiles(files);
  await expect(page.locator("ol > li")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Compresser les images", exact: true })
    .click();
  await expect(page.locator("ol a[download]")).toHaveCount(3, {
    timeout: 30_000,
  });
  await expect(page.getByText("Terminé", { exact: true })).toHaveCount(3);
  const individual = page.waitForEvent("download");
  await page.locator("ol a[download]").first().click();
  expect((await individual).suggestedFilename()).toMatch(/-compressed\.png$/);
  const zipDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Tout télécharger en ZIP", exact: true })
    .click();
  const zip = await JSZip.loadAsync(await downloadedBytes(await zipDownload));
  expect(Object.keys(zip.files)).toHaveLength(3);
  expect(Object.keys(zip.files)).toEqual(
    expect.arrayContaining([
      "sample-compressed.png",
      "sample-compressed.jpg",
      "sample-compressed.webp",
    ]),
  );
  expect(uploads).toEqual([]);
  const previousPreview = await page
    .locator("ol img")
    .first()
    .getAttribute("src");
  await page.getByLabel("Dimension maximale (px)").fill("64");
  await page
    .getByRole("button", { name: "Compresser les images", exact: true })
    .click();
  await expect(page.locator("ol a[download]")).toHaveCount(3);
  await expect(page.locator("ol img").first()).not.toHaveAttribute(
    "src",
    previousPreview!,
  );
  const resized = await page
    .locator("ol img")
    .first()
    .evaluate(async (image: HTMLImageElement) =>
      Array.from(new Uint8Array(await (await fetch(image.src)).arrayBuffer())),
    );
  expect((await sharp(Buffer.from(resized)).metadata()).width).toBe(64);
  await page
    .getByRole("button", { name: "Tout supprimer", exact: true })
    .click();
  await expect(page.locator("ol")).toHaveCount(0);
});

test("conversion flattens transparency to white, preserves duplicate names in ZIP and clears its batch", async ({
  page,
}) => {
  await visit(page, "conversion-image");
  const files = await images(page);
  await page.getByRole("combobox", { name: "Format de sortie" }).click();
  await page.getByRole("option", { name: "JPEG", exact: true }).click();
  await page
    .locator('input[type="file"]')
    .setInputFiles([files[0], files[0], files[1], files[2]]);
  await page
    .getByRole("button", { name: "Tout convertir", exact: true })
    .click();
  await expect(page.getByText("Terminé", { exact: true })).toHaveCount(4, {
    timeout: 30_000,
  });
  const jpegDownload = page.waitForEvent("download");
  await page
    .locator("ol > li")
    .first()
    .getByRole("button", { name: "Télécharger sample.jpg", exact: true })
    .click();
  const jpeg = await downloadedBytes(await jpegDownload);
  expect((await sharp(jpeg).metadata()).format).toBe("jpeg");
  const { data } = await sharp(jpeg)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect(
    Array.from(data.subarray(0, 3)).every((channel) => channel >= 250),
  ).toBe(true);
  const zipDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Tout télécharger en .ZIP", exact: true })
    .click();
  const zip = await JSZip.loadAsync(await downloadedBytes(await zipDownload));
  expect(Object.keys(zip.files).sort()).toEqual([
    "sample-2.jpg",
    "sample-3.jpg",
    "sample-4.jpg",
    "sample.jpg",
  ]);
  await page
    .getByRole("button", { name: "Tout supprimer", exact: true })
    .click();
  await expect(page.locator("ol")).toHaveCount(0);
  await page.getByRole("combobox", { name: "Format de sortie" }).click();
  await page.getByRole("option", { name: "PNG", exact: true }).click();
  await expect(page.getByRole("slider")).toHaveCount(0);
});

test("conversion rejects SVG external resources without requesting them", async ({
  page,
}) => {
  await visit(page, "conversion-image");
  const requests: string[] = [];
  await page.route("https://example.invalid/**", (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  await page.locator('input[type="file"]').setInputFiles({
    name: "external.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><image href="https://example.invalid/tracker.png" width="100" height="100"/></svg>',
    ),
  });
  await page
    .getByRole("button", { name: "Tout convertir", exact: true })
    .click();
  await expect(
    page.getByText(/Ce SVG contient des styles ou ressources externes/),
  ).toBeVisible();
  await expect(page.locator("ol > li").getByRole("button")).toHaveCount(0);
  expect(requests).toEqual([]);
});

test("conversion isolates corrupt files and accepts standalone viewBox SVG", async ({
  page,
}) => {
  await visit(page, "conversion-image");
  const [png] = await images(page);
  await page.locator('input[type="file"]').setInputFiles([
    png,
    {
      name: "broken.png",
      mimeType: "image/png",
      buffer: Buffer.from("invalid image bytes"),
    },
    {
      name: "vector.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><rect width="120" height="60" fill="red"/></svg>',
      ),
    },
  ]);
  await page
    .getByRole("button", { name: "Tout convertir", exact: true })
    .click();
  await expect(page.getByText("Terminé", { exact: true })).toHaveCount(2);
  const broken = page.locator("ol > li").filter({ hasText: "broken.png" });
  await expect(broken).toContainText(
    "Image illisible ou codec non pris en charge.",
  );
  await expect(broken.getByRole("button")).toHaveCount(0);
  const svgDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Télécharger vector.webp", exact: true })
    .click();
  const metadata = await sharp(
    await downloadedBytes(await svgDownload),
  ).metadata();
  expect(metadata.format).toBe("webp");
  expect(metadata.width).toBeGreaterThan(0);
  expect(metadata.height).toBeGreaterThan(0);
});

test("clearing a running conversion ignores its late canvas result", async ({
  page,
}) => {
  await visit(page, "conversion-image");
  const [png] = await images(page);
  await page.evaluate(() => {
    const state = window as typeof window & {
      releaseConversion?: () => void;
      conversionBlocked?: boolean;
      conversionFinished?: boolean;
    };
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      state.conversionBlocked = true;
      state.releaseConversion = () =>
        original.call(
          this,
          (blob) => {
            callback(blob);
            state.conversionFinished = true;
          },
          type,
          quality,
        );
    };
  });
  await page.locator('input[type="file"]').setInputFiles(png);
  await page
    .getByRole("button", { name: "Tout convertir", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      (window as typeof window & { conversionBlocked?: boolean })
        .conversionBlocked,
  );
  await page
    .getByRole("button", { name: "Tout supprimer", exact: true })
    .click();
  await page.evaluate(() =>
    (
      window as typeof window & { releaseConversion?: () => void }
    ).releaseConversion?.(),
  );
  await page.waitForFunction(
    () =>
      (window as typeof window & { conversionFinished?: boolean })
        .conversionFinished,
  );
  await expect(page.locator("ol")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Tout télécharger en .ZIP", exact: true }),
  ).toHaveCount(0);
});

test("QR generator embeds its local logo in PNG and SVG and copies raw SVG", async ({
  page,
  context,
}, testInfo) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await visit(page, "qrcode");
  const [logo] = await images(page);
  await expect(page.locator("svg[role=img]")).toBeVisible();
  await page.locator("#qr-logo").setInputFiles(logo);
  await expect(page.locator("svg image")).toHaveAttribute(
    "href",
    /^data:image\/png;base64,/,
  );
  await expect(page.locator("#qr-level")).toHaveValue("H");
  await page.screenshot({
    path: testInfo.outputPath("qr-desktop.png"),
    fullPage: true,
  });
  const pngDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Télécharger PNG", exact: true })
    .click();
  const png = await downloadedBytes(await pngDownload);
  const metadata = await sharp(png).metadata();
  expect(metadata.format).toBe("png");
  expect(metadata.width).toBeGreaterThanOrEqual(256);
  // The red logo pixels prove export waited for the image to be drawn.
  const raw = await sharp(png).removeAlpha().raw().toBuffer();
  let redPixels = 0;
  for (let index = 0; index < raw.length; index += 3)
    if (raw[index] > 180 && raw[index + 1] < 120 && raw[index + 2] < 120)
      redPixels++;
  expect(redPixels).toBeGreaterThan(100);
  const svgDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Télécharger SVG", exact: true })
    .click();
  const svg = (await downloadedBytes(await svgDownload)).toString();
  expect(svg).toContain("data:image/png;base64,");
  expect(svg).toContain("<svg");
  await page
    .getByRole("button", { name: "Copier le SVG", exact: true })
    .click();
  await expect(
    page.getByText("Code SVG copié dans le presse-papier.", { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "<svg",
  );
  await page.locator("#qr-content").fill("");
  await expect(
    page.getByRole("button", { name: "Télécharger PNG", exact: true }),
  ).toHaveCount(0);
  await page.locator("#qr-content").fill("a".repeat(5000));
  await expect(
    page.getByRole("alert").filter({ hasText: "Ce contenu est trop long" }),
  ).toBeVisible();
  await page.locator("#qr-content").fill("https://example.com");
  await expect(
    page.getByRole("button", { name: "Télécharger PNG", exact: true }),
  ).toBeEnabled();
});

for (const tool of ["compression-image", "conversion-image", "qrcode"]) {
  test(`${tool} renders in Arabic with RTL and no untranslated tool keys`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await visit(page, tool, "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("main").last()).not.toContainText(
      /(?:imageCompressor|imageConverter|qrGenerator)\./,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (tool === "qrcode")
      await page.screenshot({
        path: testInfo.outputPath("qr-ar-mobile.png"),
        fullPage: true,
      });
  });
}
