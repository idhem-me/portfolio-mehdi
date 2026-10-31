import { test, expect, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { giftFixture } from "./helpers/gift-live";
import sharp from "sharp";

test.skip(
  process.env.GIFT_LISTS_LIVE_TEST !== "1",
  "Requires temporary Supabase test accounts and local server.",
);

async function account(
  page: Page,
  cookies: Awaited<ReturnType<typeof giftFixture>>["cookies"],
  base: string,
) {
  await page.context().addCookies(
    cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: new URL(base).hostname,
      path: "/api/tetris",
      httpOnly: true,
      sameSite: "Lax" as const,
    })),
  );
  await page.addInitScript(() => {
    localStorage.setItem("analytics_consent", "granted");
    document.cookie = "analytics_consent=granted;path=/";
  });
}
const listData = {
  title: "Liste de vérification navigateur",
  description: "Des idées pour une belle occasion.",
  occasion_type: "birthday",
  is_surprise_mode: true,
  payment_info: "Contacte-moi pour le virement.",
};

test("creator and guest: create, extract, reserve, reveal, contribute, cancel and delete", async ({
  page,
  browser,
  baseURL,
}, info) => {
  test.setTimeout(120000);
  const fixture = await giftFixture(baseURL);
  const guestContext = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
  });
  const guest = await guestContext.newPage();
  const errors: string[] = [];
  const analytics: string[] = [];
  for (const surface of [page, guest]) {
    surface.on("pageerror", (error) => errors.push(error.message));
    surface.on("request", (request) => {
      if (
        !new URL(request.url()).pathname.startsWith("/_next/") &&
        /posthog|clarity\.ms|\/api\/track|_vercel\/insights/.test(request.url())
      )
        analytics.push(request.url());
    });
  }
  try {
    await account(page, fixture.cookies, baseURL!);
    await guest.addInitScript(() => {
      localStorage.setItem("analytics_consent", "granted");
    });
    await page.goto("/outils/listes-cadeaux");
    await expect(
      page.getByRole("button", { name: "Créer une liste", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Créer ma première liste", exact: true })
      .click();
    await page
      .getByLabel("Titre de la liste", { exact: true })
      .fill("L’anniversaire de Camille");
    await page
      .getByLabel("Description (facultatif)", { exact: true })
      .fill("Quelques idées pour mes 30 ans.");
    await page
      .getByLabel("Instructions de participation (facultatif)", { exact: true })
      .fill("Contactez-moi pour mon IBAN.");
    await page.getByRole("switch", { name: "Mode Surprise" }).click();
    await expect(
      page.getByLabel("Précise l’occasion (facultatif)", { exact: true }),
    ).toBeVisible();
    await page.getByRole("combobox", { name: "Occasion", exact: true }).click();
    await page
      .getByRole("option", { name: "Anniversaire", exact: true })
      .click();
    await expect(
      page.getByLabel("Précise l’occasion (facultatif)", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Créer ma liste", exact: true }),
    ).toHaveAttribute("data-variant", "primary");
    await page
      .getByRole("button", { name: "Créer ma liste", exact: true })
      .click();
    await expect(page).toHaveURL(/listes-cadeaux\/[a-f0-9-]+$/);
    await expect(
      page.getByRole("heading", { name: "L’anniversaire de Camille" }),
    ).toBeVisible();
    await expect(
      page
        .locator('[data-slot="badge"]')
        .getByText("Anniversaire", { exact: true })
        .filter({ visible: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Réglages de la liste", exact: true })
      .click();
    await page.getByRole("combobox", { name: "Occasion", exact: true }).click();
    await page
      .getByRole("option", { name: "Autre occasion", exact: true })
      .click();
    await page
      .getByLabel("Précise l’occasion (facultatif)", { exact: true })
      .fill("Crémaillère");
    const cover = await sharp({
      create: { width: 96, height: 64, channels: 3, background: "#c4b7a8" },
    })
      .png()
      .toBuffer();
    await page
      .getByLabel("Image de la liste (facultatif)", { exact: true })
      .setInputFiles({
        name: "image-liste.png",
        mimeType: "image/png",
        buffer: cover,
      });
    await expect(
      page
        .getByRole("dialog")
        .getByRole("button", { name: "Enregistrer", exact: true }),
    ).toHaveAttribute("data-variant", "primary");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click();
    await expect(
      page
        .locator('[data-slot="badge"]')
        .getByText("Crémaillère", { exact: true })
        .filter({ visible: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Ajouter un cadeau", exact: true })
      .click();
    await page.route("**/api/tetris/gifts/extract", (route) =>
      route.fulfill({
        json: {
          status: "partial",
          title: "Un beau livre",
          image_url: null,
          price: 25,
          currency: "EUR",
          message: "Complète les informations.",
        },
      }),
    );
    await page
      .getByLabel("Lien du produit (facultatif)", { exact: true })
      .fill("https://boutique.example.com/livre");
    await page.getByRole("button", { name: "Remplir automatiquement" }).click();
    await expect(page.getByLabel("Nom du cadeau", { exact: true })).toHaveValue(
      "Un beau livre",
    );
    await page.getByLabel("C’est un coup de cœur", { exact: true }).check();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Ajouter le cadeau", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Un beau livre", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Ajouter un cadeau", exact: true })
      .click();
    await page
      .getByLabel("Nom du cadeau", { exact: true })
      .fill("Un vélo à plusieurs");
    await page.getByLabel("Prix estimé (€)", { exact: true }).fill("100");
    await page
      .getByLabel("Autoriser la participation à plusieurs", { exact: true })
      .check();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Ajouter le cadeau", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Un vélo à plusieurs", exact: true }),
    ).toBeVisible();
    const share = await page
      .getByRole("link", { name: /Voir la liste publique/ })
      .getAttribute("href");
    const response = await guest.goto(share!);
    await expect(
      guest.getByAltText("Image de L’anniversaire de Camille", { exact: true }),
    ).toBeVisible();
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
    await expect(
      guest.getByText("Des envies à partager", { exact: true }),
    ).toHaveCount(0);
    await expect(
      guest
        .locator('[data-slot="badge"]')
        .getByText("Crémaillère", { exact: true })
        .filter({ visible: true }),
    ).toBeVisible();
    const whatsapp = await guest
      .getByRole("link", { name: /Partager sur WhatsApp/ })
      .getAttribute("href");
    expect(new URL(whatsapp!).origin).toBe("https://wa.me");
    expect(new URL(whatsapp!).searchParams.get("text")).toContain(share!);
    await guest.evaluate(() =>
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async (data: ShareData) => {
          (window as Window & { giftShare?: ShareData }).giftShare = data;
        },
      }),
    );
    await guest
      .getByRole("button", { name: "Partager par iMessage", exact: true })
      .click();
    expect(
      await guest.evaluate(
        () => (window as Window & { giftShare?: ShareData }).giftShare?.url,
      ),
    ).toContain(share!);
    await expect(
      guest.getByRole("button", { name: "Je réserve ce cadeau", exact: true }),
    ).toHaveAttribute("data-variant", "primary");
    await expect(guest.locator('[data-variant="accent"]')).toHaveCount(0);
    await guest
      .getByRole("button", { name: "Je réserve ce cadeau", exact: true })
      .click();
    await guest
      .getByLabel("Prénom et nom", { exact: true })
      .fill("Alex Martin");
    await guest
      .getByLabel("Petit mot (facultatif)", { exact: true })
      .fill("Un message à garder secret.");
    await guest
      .getByRole("button", { name: "Confirmer ma réservation", exact: true })
      .click();
    await expect(
      guest.getByText("Déjà réservé par Alex Martin", { exact: true }),
    ).toBeVisible();
    await expect(
      guest.getByRole("button", { name: "Déjà réservé", exact: true }),
    ).toBeDisabled();
    await page.reload();
    await expect(
      page.getByText("Mode Surprise", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Un message à garder secret.", { exact: false }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Révéler les réservations", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Révéler les réservations", exact: true })
      .click();
    await expect(page.getByText(/Un message à garder secret/)).toBeVisible();
    await page.screenshot({
      path: `/private/tmp/gifts-${info.project.name}-creator.png`,
      fullPage: true,
    });
    await guest
      .getByRole("button", { name: "Participer", exact: true })
      .click();
    await expect(
      guest.getByText("Contactez-moi pour mon IBAN.", { exact: true }),
    ).toBeVisible();
    await guest.getByLabel("Prénom et nom", { exact: true }).fill("Sam Dupont");
    await guest
      .getByLabel("Montant de ta participation (€)", { exact: true })
      .fill("40");
    await guest
      .getByRole("button", { name: "Confirmer ma participation", exact: true })
      .click();
    await expect(guest.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "40",
    );
    await expect(
      guest.getByText("Avec Sam Dupont", { exact: true }),
    ).toBeVisible();
    expect(
      await guest.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await guest.screenshot({
      path: `/private/tmp/gifts-${info.project.name}-guest-mobile.png`,
      fullPage: true,
    });
    await guest
      .locator("summary")
      .filter({ hasText: "Mes réservations" })
      .click();
    await guest
      .getByRole("link", { name: "Annuler ma réservation", exact: true })
      .first()
      .click();
    await expect(
      guest.getByRole("heading", {
        name: "Annuler ma réservation",
        exact: true,
      }),
    ).toBeVisible();
    expect(new URL(guest.url()).hash).toBe("");
    await guest
      .getByRole("button", { name: "Confirmer l’annulation", exact: true })
      .click();
    await expect(guest.getByText(/Ta réservation est annulée/)).toBeVisible();
    await guest.goto(share!);
    await expect(
      guest.getByRole("button", { name: "Je réserve ce cadeau", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Supprimer la liste", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Réglages de la liste", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Supprimer la liste", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Supprimer la liste", exact: true })
      .click();
    await expect(page).toHaveURL(/\/outils\/listes-cadeaux$/);
    expect(errors).toEqual([]);
    expect(analytics).toEqual([]);
  } finally {
    await guestContext.close();
    await fixture.cleanup();
  }
});

test("lost reservation response survives reload and retry without duplicate", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(90000);
  const fixture = await giftFixture(baseURL);
  try {
    const list = (
      await (
        await fixture.request("/api/tetris/gifts", {
          action: "create_list",
          data: listData,
        })
      ).json()
    ).list;
    const item = (
      await (
        await fixture.request("/api/tetris/gifts", {
          action: "add_item",
          list_id: list.id,
          data: {
            title: "Livre à réserver",
            url: null,
            image_url: null,
            price: 20,
            is_group_gift: false,
            priority: "normal",
          },
        })
      ).json()
    ).item;
    let loseResponse = true;
    await page.route(`**/api/gifts/${list.slug}`, async (route) => {
      if (route.request().method() === "POST" && loseResponse) {
        loseResponse = false;
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        await route.abort("failed");
      } else await route.continue();
    });
    await page.goto(`/l/${list.slug}`);
    await page
      .getByRole("button", { name: "Je réserve ce cadeau", exact: true })
      .click();
    await page
      .getByLabel("Prénom et nom", { exact: true })
      .fill("Morgan Petit");
    await page
      .getByRole("button", { name: "Confirmer ma réservation", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("connexion");
    await page.reload();
    await page
      .getByRole("button", { name: "Reprendre ma réservation", exact: true })
      .click();
    await expect(page.getByLabel("Prénom et nom", { exact: true })).toHaveValue(
      "Morgan Petit",
    );
    await expect(
      page.getByLabel("Prénom et nom", { exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: "Réessayer la confirmation", exact: true })
      .click();
    await expect(
      page.getByText("Déjà réservé par Morgan Petit", { exact: true }),
    ).toBeVisible();
    const rows = await fixture.admin
      .from("gift_reservations")
      .select("id")
      .eq("item_id", item.id);
    expect(rows.data).toHaveLength(1);
  } finally {
    await fixture.cleanup();
  }
});

test("anonymous creator and unavailable public list have usable empty states", async ({
  page,
}) => {
  await page.goto("/outils/listes-cadeaux");
  await expect(
    page.getByRole("heading", {
      name: "Connecte-toi pour créer une liste",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Se connecter avec Google", exact: true }),
  ).toBeVisible();
  await page.goto(`/l/${randomBytes(10).toString("hex")}`);
  await expect(
    page.getByRole("heading", { name: "Liste introuvable", exact: true }),
  ).toBeVisible();
});
