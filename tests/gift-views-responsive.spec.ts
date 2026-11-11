import { expect, test, type Locator } from "@playwright/test";
import type {
  GiftItem,
  GiftList,
  PublicItem,
} from "../src/features/gift-lists/types";
import { identityEnvironment, profiles } from "./helpers/identity";

const list: GiftList = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "1234567890abcdef1234",
  title: "Une liste de cadeaux",
  description: null,
  occasion_type: "birthday",
  occasion_label: null,
  cover_image: null,
  is_surprise_mode: true,
  reservations_revealed_at: null,
  payment_info: null,
};
const longTitle = `Un livre ${"exceptionnel".repeat(30)}`;
const gift: GiftItem = {
  id: "book",
  title: longTitle,
  comment: "Une édition illustrée",
  url: "https://example.com/livre",
  image_url: null,
  price: 25,
  is_group_gift: false,
  priority: "high",
};
const publicGift: PublicItem = {
  ...gift,
  reserved: false,
  amount_contributed: 0,
  guest_names: [],
};
const visitorPath = `/l/${list.slug}`;
const creatorPath = `/outils/listes-cadeaux/${list.id}`;

async function expectMobileTarget(control: Locator) {
  const box = await control.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
}

test("gift views persist per role and keep actions accessible on desktop and mobile", async ({
  page,
  isMobile,
}) => {
  await identityEnvironment(page, { ...profiles.google, avatar: null });
  let ownerItems = [gift];
  let visitorItems: PublicItem[] = [
    publicGift,
    {
      ...publicGift,
      id: "reserved",
      title: "Cadeau réservé",
      url: null,
      reserved: true,
      guest_names: ["Camille"],
    },
    {
      ...publicGift,
      id: "complete",
      title: "Cagnotte complète",
      url: null,
      is_group_gift: true,
      amount_contributed: 25,
    },
    {
      ...publicGift,
      id: "group",
      title: "Cadeau à plusieurs",
      url: null,
      is_group_gift: true,
      amount_contributed: 5,
    },
  ];
  await page.route(/\/api\/tetris\/gifts(?:\?|$)/, async (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toMatchObject({
        action: "delete_item",
        item_id: gift.id,
      });
      ownerItems = [];
      await route.fulfill({ json: { ok: true } });
      return;
    }
    await route.fulfill({
      json: {
        list,
        items: ownerItems,
        activity: {
          hidden: true,
          reservations: [
            {
              id: "private",
              item_id: gift.id,
              guest_name: "Nom secret",
              message: "Message secret",
            },
          ],
        },
      },
    });
  });
  await page.route(`**/api/gifts/${list.slug}`, (route) =>
    route.fulfill({ json: { ...list, items: visitorItems } }),
  );

  const grid = page.getByRole("button", { name: "Grille", exact: true });
  const table = page.getByRole("button", { name: "Tableau", exact: true });
  const actions = page.getByRole("button", {
    name: `Actions pour ${longTitle}`,
    exact: true,
  });
  const surface = () =>
    isMobile
      ? page.getByRole("list", { name: "Cadeaux", exact: true })
      : page.getByRole("table", { name: "Cadeaux", exact: true });

  await page.goto(creatorPath);
  await expect(grid).toHaveAttribute("aria-pressed", "true");
  await table.focus();
  await table.press("Enter");
  await expect(surface()).toBeVisible();
  await expect(surface().getByText("Réservations masquées")).toBeVisible();
  await expect(page.getByText("Nom secret")).toHaveCount(0);
  if (isMobile) {
    await expectMobileTarget(grid);
    await expectMobileTarget(table);
    await expectMobileTarget(actions);
  } else {
    await expect(surface().getByRole("columnheader")).toHaveText([
      "Cadeau",
      "Prix",
      "Statut",
      "Actions",
    ]);
  }

  await actions.focus();
  await actions.press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { name: /Voir la boutique/ }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(actions).toBeFocused();
  await actions.click();
  await page.getByRole("menuitem", { name: "Modifier" }).click();
  await expect(
    page.getByRole("dialog", { name: "Modifier le cadeau" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(actions).toBeFocused();

  await page.reload();
  await expect(table).toHaveAttribute("aria-pressed", "true");
  await page.goto(visitorPath);
  await expect(grid).toHaveAttribute("aria-pressed", "true");
  await table.click();
  await expect(surface()).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /Actions pour (Cadeau réservé|Cagnotte complète)/,
    }),
  ).toHaveCount(0);
  await expect(surface().getByText("Déjà réservé par Camille")).toBeVisible();
  await expect(
    surface().getByRole("progressbar", {
      name: "Participation pour Cagnotte complète",
    }),
  ).toHaveAttribute("aria-valuenow", "100");
  await actions.click();
  await expect(
    page.getByRole("menuitem", { name: /Voir la boutique/ }),
  ).toHaveAttribute("href", gift.url!);
  await page.getByRole("menuitem", { name: "Réserver", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Réserver ce cadeau" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(actions).toBeFocused();

  const groupActions = page.getByRole("button", {
    name: "Actions pour Cadeau à plusieurs",
  });
  await groupActions.click();
  await page.getByRole("menuitem", { name: "Participer", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Participer à ce cadeau" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(groupActions).toBeFocused();
  await page.reload();
  await expect(table).toHaveAttribute("aria-pressed", "true");

  await page.goto(`/ar${visitorPath}`);
  await expect(
    page.getByRole("button", { name: "جدول", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const arabicGifts = page.getByRole(isMobile ? "list" : "table", {
    name: "الهدايا",
    exact: true,
  });
  await expect(arabicGifts).toHaveCSS("direction", "rtl");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth),
  );

  await page.context().clearCookies({ name: "NEXT_LOCALE" });
  visitorItems = [];
  await page.goto(visitorPath);
  await expect(
    page.getByText("Cette liste ne contient pas encore de cadeau."),
  ).toBeVisible();
  await expect(table).toHaveCount(0);

  await page.goto(creatorPath);
  await expect(table).toHaveAttribute("aria-pressed", "true");
  await actions.click();
  await page.getByRole("menuitem", { name: "Supprimer", exact: true }).click();
  const confirmation = page.getByRole("dialog", {
    name: "Supprimer ce cadeau ?",
  });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "Retour" }).click();
  await expect(actions).toBeFocused();
  await actions.click();
  await page.getByRole("menuitem", { name: "Supprimer", exact: true }).click();
  await confirmation
    .getByRole("button", { name: "Supprimer le cadeau" })
    .click();
  await expect(table).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Ajouter un cadeau" }),
  ).toBeFocused();
});
