import { test, expect } from "@playwright/test";
import { identityEnvironment, profiles } from "./helpers/identity";

test("gift sign-in stays usable when the game profile is unavailable", async ({
  page,
}) => {
  const identity = await identityEnvironment(page);
  identity.failProfile(true);
  identity.popup("failure");
  await page.route("**/api/tetris/gifts", (route) =>
    route.fulfill({ status: 401, json: { error: "Connexion requise" } }),
  );
  await page.goto("/outils/listes-cadeaux");
  const signIn = page.getByRole("button", {
    name: "Continuer avec Google",
    exact: true,
  });
  await expect(signIn).toBeEnabled();
  await expect(signIn).toHaveAttribute("data-variant", "primary");
  await expect(page.getByText(/Serveur injoignable/)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Actualiser ma connexion" }),
  ).toHaveCount(0);
  await signIn.click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Connexion interrompue" }),
  ).toHaveText("Connexion interrompue. Réessaie pour continuer.");
  await expect(signIn).toBeEnabled();
});

test("gift account menu only switches accounts or signs out", async ({
  page,
}) => {
  await identityEnvironment(page, profiles.google);
  let signedOut = false;
  page.on("request", (request) => {
    if (
      request.url().endsWith("/api/tetris/auth") &&
      request.method() === "POST"
    )
      signedOut = true;
  });
  await page.route("**/api/tetris/gifts", (route) =>
    route.fulfill(
      signedOut
        ? { status: 401, json: { error: "Connexion requise" } }
        : { json: { lists: [] } },
    ),
  );
  await page.goto("/outils/listes-cadeaux");
  const avatar = page.getByRole("button", {
    name: "Compte Google de Alice Google",
    exact: true,
  });
  await expect(avatar).toBeVisible();
  await avatar.click();
  await expect(page.getByRole("menuitem")).toHaveCount(2);
  const popupRequest = page
    .context()
    .waitForEvent(
      "request",
      (request) =>
        request.url().includes("/api/tetris/auth/google?") &&
        request.url().includes("switchAccount=1"),
    );
  await page
    .getByRole("menuitem", { name: "Changer de compte Google", exact: true })
    .click();
  await popupRequest;
  await expect(avatar).toBeEnabled();
  await avatar.click();
  await page
    .getByRole("menuitem", { name: "Se déconnecter", exact: true })
    .click();
  await expect(avatar).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Continuer avec Google", exact: true }),
  ).toBeVisible();
});

test("gift tool opens with a collapsed sidebar and shares the tool link", async ({
  page,
}) => {
  await identityEnvironment(page);
  await page.route("**/api/tetris/gifts", (route) =>
    route.fulfill({ status: 401, json: { error: "Connexion requise" } }),
  );
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        (window as unknown as { sharedTool: ShareData }).sharedTool = data;
      },
    });
  });
  await page.goto("/outils/listes-cadeaux?creer=1");
  await expect(
    page.locator('[data-slot="sidebar"][data-state="collapsed"]'),
  ).toBeVisible();
  const share = page
    .locator("main footer")
    .getByRole("button", { name: "Partager", exact: true });
  await share.click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { sharedTool?: ShareData }).sharedTool?.url,
      ),
    )
    .toBe("http://localhost:3000/outils/listes-cadeaux");
});

test("mobile gift landing fits the viewport and uses secondary sharing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await identityEnvironment(page);
  await page.route("**/api/tetris/gifts", (route) =>
    route.fulfill({ status: 401, json: { error: "Connexion requise" } }),
  );
  await page.goto("/outils/listes-cadeaux");
  const share = page
    .locator("main footer")
    .getByRole("button", { name: "Partager", exact: true });
  await expect(share).toHaveAttribute("data-variant", "secondary");
  await expect(
    page.getByRole("button", { name: "Continuer avec Google", exact: true }),
  ).toBeEnabled();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollHeight - window.innerHeight,
      ),
    )
    .toBeLessThanOrEqual(1);
});
