import { expect, test, type Locator, type Page } from "@playwright/test";
import sharp from "sharp";
import type { GiftItem, GiftList } from "../src/features/gift-lists/types";
import { identityEnvironment, profiles } from "./helpers/identity";

const listId = "11111111-1111-4111-8111-111111111111";
const jpegMime = "image/jpeg";
const listPath = "/outils/listes-cadeaux";

async function owner(page: Page) {
  await identityEnvironment(page, { ...profiles.google, avatar: null });
  let list: GiftList | undefined;
  const items: GiftItem[] = [];
  const sentImages: string[] = [];
  await page.route(/\/api\/tetris\/gifts(?:\?|$)/, async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      return route.fulfill({
        json: request.url().includes("?id=")
          ? { list, items, activity: { hidden: false, reservations: [] } }
          : { lists: list ? [list] : [] },
      });
    }

    const { action, data, item_id: itemId } = request.postDataJSON();
    if (action === "create_list" || action === "update_list") {
      list = {
        ...data,
        id: listId,
        slug: "0".repeat(20),
        description: data.description || null,
        reservations_revealed_at: null,
      };
      return route.fulfill({ json: { list } });
    }

    const item: GiftItem = { ...data, id: itemId ?? String(items.length + 1) };
    if (item.image_url) {
      sentImages.push(item.image_url);
      if (item.image_url.startsWith("data:image/jpeg;base64,")) {
        const input = Buffer.from(item.image_url.split(",")[1], "base64");
        const webp = await sharp(input).webp().toBuffer();
        item.image_url = `data:image/webp;base64,${webp.toString("base64")}`;
      }
    }
    if (action === "update_item") {
      items[items.findIndex(({ id }) => id === itemId)] = item;
    } else {
      items.push(item);
    }
    return route.fulfill({ json: { item } });
  });
  return sentImages;
}

async function expectFixedActions(dialog: Locator, action: string) {
  const submit = dialog.getByRole("button", { name: action, exact: true });
  const body = dialog.locator('[data-slot="gift-form-body"]');
  // WebKit rounds intersection bounds at fractional device pixels.
  await expect(submit).toBeInViewport({ ratio: 0.99 });
  const before = await submit.boundingBox();
  await body.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect
    .poll(() => body.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  await expect(submit).toBeInViewport({ ratio: 0.99 });
  const bounds = await submit.boundingBox();
  expect(Math.abs(bounds!.y - before!.y)).toBeLessThan(1);
  const isMobile = await dialog.page().evaluate(() => innerWidth < 768);
  if (isMobile) {
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
  }
}

test("all four forms keep their actions visible and optional list fields can be added and cleared", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 460 });
  await owner(page);
  await page.goto(listPath);
  const dialog = page.getByRole("dialog");
  const title = dialog.getByLabel("Nom de la liste");
  const description = dialog.getByLabel("Description (facultatif)");
  await page.getByRole("button", { name: "Créer ma première liste" }).click();
  await expect(dialog.getByRole("heading")).toBeFocused();
  await expectFixedActions(dialog, "Créer ma liste");
  await dialog.getByRole("button", { name: "Créer ma liste" }).click();
  await expect(title).toBeFocused();
  await expect(title).toBeInViewport();
  await title.fill("Liste de fête");
  await expect(description).toHaveCount(0);
  const reveal = dialog.getByRole("button", {
    name: "Ajouter une description",
  });
  const instructions = dialog.getByLabel(
    "Instructions de participation (facultatif)",
  );
  const revealInstructions = dialog.getByRole("button", {
    name: "Ajouter des instructions de participation",
  });
  await expect(instructions).toHaveCount(0);
  for (const action of [reveal, revealInstructions]) {
    await expect(action).toHaveAttribute("data-variant", "ghost");
    expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await revealInstructions.click();
  await expect(instructions).toBeFocused();
  await instructions.fill("Lien de participation");
  await reveal.focus();
  await page.keyboard.press("Enter");
  await expect(description).toBeFocused();
  await description.fill("Une description facultative");
  await dialog.getByRole("button", { name: "Créer ma liste" }).click();
  await expect(page).toHaveURL(`${listPath}/${listId}`);

  const settings = page.getByRole("button", { name: "Réglages de la liste" });
  await settings.click();
  await expectFixedActions(dialog, "Enregistrer");
  await expect(description).toHaveValue("Une description facultative");
  await expect(instructions).toHaveValue("Lien de participation");
  await instructions.fill("");
  await description.fill("");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(dialog).toHaveCount(0);
  await settings.click();
  await expect(reveal).toBeVisible();
  await expect(revealInstructions).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(settings).toBeFocused();

  await page
    .getByRole("button", { name: "Ajouter un cadeau", exact: true })
    .click();
  await expectFixedActions(dialog, "Ajouter le cadeau");
  await dialog.getByLabel("Nom du cadeau").fill("Un livre");
  await dialog.getByRole("button", { name: "Ajouter le cadeau" }).click();
  await page.getByRole("button", { name: "Modifier Un livre" }).click();
  await expectFixedActions(dialog, "Enregistrer");
  await expect(description).toHaveCount(0);
  await dialog.getByRole("button", { name: "Annuler" }).click();
});

test("HEIC and JPEG preview, invalid file retry and JPEG fallback", async ({
  page,
}) => {
  const sentImages = await owner(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      return original.call(
        this,
        callback,
        type === "image/webp" ? "image/png" : type,
        quality,
      );
    };
  });
  await page.goto(listPath);
  await page.getByRole("button", { name: "Créer ma première liste" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom de la liste").fill("Liste photo");
  const chooseImage = dialog.getByRole("button", { name: "Choisir une image" });
  await expect(chooseImage).toHaveAttribute("data-variant", "secondary");
  const chooser = page.waitForEvent("filechooser");
  await chooseImage.click();
  await (await chooser).setFiles("tests/fixtures/gift-photo.heic");
  await expect(dialog.getByAltText("Image de Liste photo")).toBeVisible();
  await dialog.getByRole("button", { name: "Créer ma liste" }).click();
  await expect(page).toHaveURL(`${listPath}/${listId}`);
  await page
    .getByRole("button", { name: "Ajouter un cadeau", exact: true })
    .click();
  await dialog.getByLabel("Nom du cadeau").fill("Un cadeau avec photo");
  const photo = dialog.locator('input[type="file"]');
  const preview = dialog.getByAltText("Aperçu de la photo du cadeau");
  const buffer = await sharp({
    create: { width: 120, height: 80, channels: 3, background: "#c4b7a8" },
  })
    .jpeg()
    .toBuffer();
  const validFile = { name: "photo.jpg", mimeType: jpegMime, buffer };
  await photo.setInputFiles(validFile);
  await expect(preview).toHaveAttribute("src", /^data:image\/jpeg;base64,/);
  const original = await preview.getAttribute("src");
  await photo.setInputFiles({
    ...validFile,
    buffer: Buffer.from("unreadable"),
  });
  await expect(dialog.getByRole("alert")).toContainText(
    "Impossible de préparer cette photo",
  );
  await expect(preview).toHaveAttribute("src", original!);
  await photo.setInputFiles(validFile);
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Ajouter le cadeau" }).click();
  await expect(dialog).toHaveCount(0);
  expect(sentImages).toHaveLength(1);
  expect(sentImages[0]).toMatch(/^data:image\/jpeg;base64,/);
  await page.reload();
  await expect(page.getByAltText("Un cadeau avec photo")).toHaveAttribute(
    "src",
    /^data:image\/webp;base64,/,
  );
});
