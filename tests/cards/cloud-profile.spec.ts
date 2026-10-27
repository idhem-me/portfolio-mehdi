import { test, expect, type Page } from "@playwright/test";
import { identityEnvironment, profiles } from "../helpers/identity";
import {
  emptySave,
  type CardsSave,
} from "../../src/features/cards/persistence/types";
const ACCOUNT = profiles.google.key;
function progress(count: number): CardsSave {
  const save = emptySave();
  save.stats.boostersOpened = 3;
  save.collection["card-001"] = {
    qty: count,
    shinyQty: 0,
    firstAcquiredAt: 1,
    lastAcquiredAt: 1,
  };
  return save;
}
async function seed(page: Page, save: CardsSave) {
  await page.addInitScript((save) => {
    if (!localStorage.getItem("cards.save.v1"))
      localStorage.setItem("cards.save.v1", JSON.stringify(save));
  }, save);
}
async function remote(page: Page, initial: CardsSave | null) {
  let save = initial,
    revision = initial ? 1 : 0;
  let writes = 0,
    fail = false;
  await page.route("**/api/tetris/cards", async (route) => {
    if (fail)
      return route.fulfill({ status: 503, json: { error: "unavailable" } });
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON();
      if (body.accountKey !== ACCOUNT || body.revision !== revision)
        return route.fulfill({ status: 409, json: { error: "conflict" } });
      save = body.save;
      revision++;
      writes++;
    }
    return route.fulfill({ json: { accountKey: ACCOUNT, revision, save } });
  });
  return {
    save: () => save,
    revision: () => revision,
    writes: () => writes,
    fail: (value: boolean) => {
      fail = value;
    },
  };
}
test("cards: notice appears after three packs, is dismissible, and offers shared Google login", async ({
  page,
}) => {
  await identityEnvironment(page);
  await seed(page, progress(15));
  await page.goto("/jeux/cards");
  const notice = page.getByRole("region", {
    name: "Ta collection est sauvegardée sur cet appareil",
  });
  await expect(notice).toBeVisible();
  await expect(
    notice.getByRole("button", {
      name: "Se connecter avec Google",
      exact: true,
    }),
  ).toBeVisible();
  await notice
    .getByRole("button", { name: "Continuer sur cet appareil", exact: true })
    .click();
  await expect(notice).toHaveCount(0);
  await page.reload();
  await expect(notice).toHaveCount(0);
});
test("cards: notice stays hidden before three completed boosters", async ({
  page,
}) => {
  await identityEnvironment(page);
  const save = progress(10);
  save.stats.boostersOpened = 2;
  await seed(page, save);
  await page.goto("/jeux/cards");
  await expect(
    page.getByRole("heading", { name: "Cartes", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".cards-local-save-notice")).toHaveCount(0);
});
test("cards: first Google sync imports local progression once and restores it on another device", async ({
  page,
}) => {
  await identityEnvironment(page, profiles.google);
  await seed(page, progress(15));
  const cloud = await remote(page, null);
  await page.goto("/jeux/cards");
  await expect(
    page.getByText("Progression sauvegardée avec Google", { exact: true }),
  ).toBeVisible();
  expect(cloud.writes()).toBe(1);
  expect(cloud.save()!.collection["card-001"]!.qty).toBe(15);
  await page.reload();
  await expect(
    page.getByText("Progression sauvegardée avec Google", { exact: true }),
  ).toBeVisible();
  expect(cloud.writes()).toBe(1);
  await page.evaluate(() => {
    localStorage.removeItem("cards.save.v1");
    localStorage.removeItem("cards.cloud-binding.v1");
  });
  await page.reload();
  await expect(
    page.getByText("Progression sauvegardée avec Google", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("cards.save.v1")!).collection[
          "card-001"
        ].qty,
    ),
  ).toBe(15);
  expect(cloud.writes()).toBe(1);
});
test("cards: conflicting saves require a choice and preserve a local backup without adding copies", async ({
  page,
}) => {
  await identityEnvironment(page, profiles.google);
  await seed(page, progress(15));
  const cloud = await remote(page, progress(25));
  await page.goto("/jeux/cards");
  await expect(
    page.getByRole("dialog", {
      name: "Quelle progression veux-tu conserver ?",
    }),
  ).toBeVisible();
  expect(cloud.writes()).toBe(0);
  await page
    .getByRole("button", {
      name: "Utiliser la progression de ce compte",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Progression sauvegardée avec Google", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("cards.save.v1")!).collection[
          "card-001"
        ].qty,
    ),
  ).toBe(25);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("cards.backup.local.guest")!)
          .collection["card-001"].qty,
    ),
  ).toBe(15);
  expect(cloud.writes()).toBe(0);
});
test("cards: an unavailable cloud keeps local data and can retry without falsely reporting saved", async ({
  page,
}) => {
  await identityEnvironment(page, profiles.google);
  await seed(page, progress(15));
  const cloud = await remote(page, null);
  cloud.fail(true);
  await page.goto("/jeux/cards");
  await expect(
    page.getByRole("button", {
      name: "Réessayer la synchronisation",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Progression sauvegardée avec Google", { exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("cards.save.v1")!).collection[
          "card-001"
        ].qty,
    ),
  ).toBe(15);
  cloud.fail(false);
  await page
    .getByRole("button", { name: "Réessayer la synchronisation", exact: true })
    .click();
  await expect(
    page.getByText("Progression sauvegardée avec Google", { exact: true }),
  ).toBeVisible();
});
test("cards: cloud endpoint rejects anonymous reads and foreign-origin writes", async ({
  request,
}) => {
  expect((await request.get("/api/tetris/cards")).status()).toBe(401);
  expect(
    (
      await request.put("/api/tetris/cards", {
        headers: { Origin: "https://external.invalid" },
        data: {},
      })
    ).status(),
  ).toBe(403);
});

test("cards: Google progression syncs new openings automatically after the first import", async ({
  page,
}) => {
  await identityEnvironment(page, profiles.google);
  await seed(page, progress(15));
  const cloud = await remote(page, null);
  await page.goto("/jeux/cards");
  await expect(
    page.getByText("Progression sauvegardée avec Google", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ouvrir un booster", exact: true })
    .click();
  await expect.poll(() => cloud.save()?.activeOpen?.phase).toBe("cutting");
  await page
    .getByRole("button", { name: "Découper le booster", exact: true })
    .click();
  for (let index = 1; index <= 5; index++) {
    await expect(page.locator(".cards-stack-front")).toHaveAttribute(
      "aria-disabled",
      "false",
    );
    await page.locator(".cards-stack-front").press("Enter");
    if (index < 5)
      await expect(page.locator('.cards-stack [role="status"]')).toContainText(
        `Carte ${index + 1} sur 5`,
      );
  }
  await expect.poll(() => cloud.save()?.stats.boostersOpened).toBe(4);
  expect(
    Object.values(cloud.save()!.collection).reduce((sum, c) => sum + c.qty, 0),
  ).toBe(20);
});
test("cards: a different account never receives the current collection automatically", async ({
  page,
}) => {
  await identityEnvironment(page, profiles.google);
  await seed(page, progress(15));
  await page.addInitScript(() =>
    localStorage.setItem(
      "cards.cloud-binding.v1",
      JSON.stringify({
        account: "a".repeat(64),
        revision: 1,
        signature: "other-account",
      }),
    ),
  );
  const cloud = await remote(page, null);
  await page.goto("/jeux/cards");
  await expect(
    page.getByRole("dialog", {
      name: "Quelle progression veux-tu conserver ?",
    }),
  ).toContainText("liée à un autre compte");
  expect(cloud.writes()).toBe(0);
});

test("cards: resetting local data never erases the Google backup", async ({
  page,
}) => {
  await identityEnvironment(page, profiles.google);
  await seed(page, progress(15));
  const cloud = await remote(page, null);
  await page.goto("/jeux/cards");
  await expect(
    page.getByText("Progression sauvegardée avec Google", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Réinitialiser la collection locale",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Réinitialiser", exact: true })
    .click();
  await expect(
    page.getByText(
      "Collection locale réinitialisée. Ta sauvegarde Google est conservée.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        Object.keys(
          JSON.parse(localStorage.getItem("cards.save.v1")!).collection,
        ).length,
    ),
  ).toBe(0);
  expect(cloud.save()!.collection["card-001"]!.qty).toBe(15);
  await page
    .getByRole("button", { name: "Réessayer la synchronisation", exact: true })
    .click();
  await expect(
    page.getByText("Progression sauvegardée avec Google", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("cards.save.v1")!).collection[
          "card-001"
        ].qty,
    ),
  ).toBe(15);
});

test("cards: unavailable nickname storage does not disable Google sign-in", async ({
  page,
}) => {
  const env = await identityEnvironment(page, profiles.local);
  env.failProfile(true);
  await seed(page, progress(15));
  await page.goto("/jeux/cards");
  await expect(
    page
      .getByRole("region", {
        name: "Ta collection est sauvegardée sur cet appareil",
      })
      .getByRole("button", { name: "Se connecter avec Google", exact: true }),
  ).toBeEnabled();
});
