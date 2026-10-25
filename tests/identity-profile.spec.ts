import { test, expect, type Page } from "@playwright/test";
type Profile = {
  name: string;
  avatar: string | null;
  kind: "local" | "google";
  key: string;
};
async function environment(page: Page, initial: Profile | null = null) {
  let profile = initial;
  let google = initial?.kind === "google";
  let failSave = false,
    failGoogle = false;
  const saved: Array<Record<string, unknown>> = [];
  await page.addInitScript(() => {
    localStorage.setItem("analytics_consent", "denied");
    localStorage.setItem("tetris.onboardingDone", "true");
  });
  await page.route("**/api/tetris/profile", async (route) => {
    if (route.request().method() === "POST")
      profile = {
        ...route.request().postDataJSON(),
        kind: google ? "google" : "local",
        key: (google ? "b" : "a").repeat(64),
      };
    await route.fulfill({ json: profile });
  });
  await page.route("**/api/tetris/auth", (route) =>
    route.fulfill({
      json: {
        googleAvailable: true,
        user: google ? { displayName: "Google Alice" } : null,
      },
    }),
  );
  await page.route("**/api/tetris/auth/credential", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({
        json: {
          available: true,
          clientId: "existing-client.apps.googleusercontent.com",
          nonce: "c".repeat(64),
        },
      });
    if (failGoogle)
      return route.fulfill({
        status: 401,
        json: { error: "Connexion Google annulée ou impossible." },
      });
    google = true;
    profile = {
      name: "Google Alice",
      avatar: "https://lh3.googleusercontent.com/test",
      kind: "google",
      key: "b".repeat(64),
    };
    await route.fulfill({ json: { ok: true } });
  });
  // Emulate only the third-party SDK boundary; app credential exchange remains exercised.
  await page.route("https://accounts.google.com/gsi/client", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `window.google={accounts:{id:{initialize(o){this.options=o},renderButton(el,o){const b=document.createElement('button');b.type='button';b.textContent='Continuer avec Google';b.onclick=()=>{o.click_listener();if(!window.cancelGoogle)this.options.callback({credential:'signed-google-test-token'})};el.appendChild(b)}}}};`,
    }),
  );
  for (const endpoint of ["local-scores", "leaderboard"])
    await page.route(`**/api/tetris/${endpoint}`, async (route) => {
      if (route.request().method() !== "POST")
        return route.fulfill({ json: [] });
      const run = route.request().postDataJSON();
      if (failSave)
        return route.fulfill({ status: 503, json: { error: "Indisponible" } });
      if (!saved.some((item) => item.id === run.id)) saved.push(run);
      return route.fulfill({ json: { score: 10, lines: 0, rank: 1 } });
    });
  return {
    saved,
    profile: () => profile,
    setProfile: (value: Profile | null) => {
      profile = value;
      google = value?.kind === "google";
    },
    failSave: (value: boolean) => {
      failSave = value;
    },
    failGoogle: (value: boolean) => {
      failGoogle = value;
    },
  };
}
async function end(page: Page, replay = false) {
  await page
    .getByRole("button", { name: replay ? "Rejouer" : "Jouer", exact: true })
    .click();
  await expect(page.locator(".lava-game")).toHaveAttribute(
    "data-state",
    "playing",
  );
  for (
    let i = 0;
    i < 35 &&
    (await page.locator(".lava-game").getAttribute("data-state")) === "playing";
    i++
  )
    await page.getByRole("button", { name: "Lâcher", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Game over", exact: true }),
  ).toBeVisible();
}
test("anonymous local profile saves this and next run automatically, synchronizes sidebar", async ({
  page,
}) => {
  const env = await environment(page);
  await page.goto("/jeux/tetris");
  await end(page);
  await expect(
    page.getByRole("button", { name: "Continuer avec Google", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Pseudo", { exact: true }).fill("Alice Locale");
  await page
    .getByRole("button", { name: "Enregistrer avec un pseudo" })
    .click();
  await expect.poll(() => env.saved.length).toBe(1);
  await expect(page.getByLabel("Pseudo", { exact: true })).toHaveCount(0);
  await end(page, true);
  await expect.poll(() => env.saved.length).toBe(2);
  await expect(
    page.getByRole("button", { name: "Continuer avec Google", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.goto("/jeux");
  await page
    .getByRole("button", { name: "Profil joueur : Alice Locale" })
    .click();
  await expect(page.getByLabel("Pseudo", { exact: true })).toHaveValue(
    "Alice Locale",
  );
});
test("Google after game over preserves score on cancellation and failure, then saves without confirmation", async ({
  page,
}) => {
  const env = await environment(page);
  await page.goto("/jeux/tetris");
  await end(page);
  const score = await page.locator(".lava-end-stats dd").nth(2).innerText();
  await page.evaluate(() => Object.assign(window, { cancelGoogle: true }));
  await page
    .getByRole("button", { name: "Continuer avec Google", exact: true })
    .click();
  await expect(page.locator(".lava-end-stats dd").nth(2)).toHaveText(score);
  expect(env.saved).toHaveLength(0);
  await page.evaluate(() => Object.assign(window, { cancelGoogle: false }));
  env.failGoogle(true);
  await page
    .getByRole("button", { name: "Continuer avec Google", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "impossible" }),
  ).toContainText("impossible");
  await expect(page.getByLabel("Pseudo", { exact: true })).toBeEnabled();
  env.failGoogle(false);
  await page.getByRole("button", { name: "Réessayer Google" }).click();
  await page
    .getByRole("button", { name: "Continuer avec Google", exact: true })
    .click();
  await expect.poll(() => env.saved.length).toBe(1);
  expect(env.saved[0].identity).toBe("google");
  await expect(page.locator(".lava-end-stats dd").nth(2)).toHaveText(score);
  await expect(page.getByLabel("Pseudo", { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(() => sessionStorage.getItem("lava-pending-score-v1")),
  ).toBeNull();
});
for (const kind of ["local", "google"] as const)
  test(`${kind} profile auto saves, retains failed run and retries once`, async ({
    page,
  }) => {
    const env = await environment(page, {
      name: "Alice",
      avatar: null,
      kind,
      key: "a".repeat(64),
    });
    env.failSave(true);
    await page.goto("/jeux/tetris");
    await end(page);
    await expect(
      page.getByRole("status").filter({ hasText: "Sauvegarde en attente" }),
    ).toBeVisible();
    await expect(page.getByLabel("Pseudo", { exact: true })).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        sessionStorage.getItem("lava-pending-score-v1"),
      ),
    ).not.toBeNull();
    env.failSave(false);
    await page.getByRole("button", { name: "Réessayer la sauvegarde" }).click();
    await expect.poll(() => env.saved.length).toBe(1);
    await expect(
      page.getByRole("status").filter({ hasText: "Score enregistré" }),
    ).toBeVisible();
  });
test("sidebar creates Google profile, supports application customization and compact primary controls", async ({
  page,
}, info) => {
  const env = await environment(page);
  await page.goto("/jeux");
  await page.getByRole("button", { name: "Créer mon profil joueur" }).click();
  await page
    .getByRole("button", { name: "Continuer avec Google", exact: true })
    .click();
  await expect(page.getByLabel("Pseudo", { exact: true })).toHaveValue(
    "Google Alice",
  );
  await expect(
    page.getByRole("button", { name: "Continuer avec Google", exact: true }),
  ).toHaveCount(0);
  const photo = page.getByRole("button", {
    name: "Modifier ma photo de profil",
  });
  const box = await photo.boundingBox();
  expect(box!.height).toBeLessThan(64);
  await page.getByLabel("Pseudo", { exact: true }).fill("Alice App");
  const save = page.getByRole("button", { name: "Enregistrer", exact: true });
  await expect(save).toHaveAttribute("data-variant", "primary");
  await save.click();
  expect(env.profile()?.name).toBe("Alice App");
  await page.getByRole("button", { name: "Profil joueur : Alice App" }).click();
  await page.getByRole("button", { name: "Supprimer la photo" }).click();
  await expect(
    page.getByRole("button", { name: "Ajouter une photo de profil" }),
  ).toBeVisible();
  await page.screenshot({
    path: `/tmp/tetris-profile-${info.project.name}.png`,
  });
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  expect(
    await page
      .locator('[role="dialog"]')
      .evaluate((el) => el.scrollWidth - el.clientWidth),
  ).toBeLessThanOrEqual(1);
});

test("pending score cannot move to a different identity after reload", async ({
  page,
}) => {
  const original: Profile = {
    name: "Alice",
    avatar: null,
    kind: "local",
    key: "a".repeat(64),
  };
  const env = await environment(page, original);
  env.failSave(true);
  await page.goto("/jeux/tetris");
  await end(page);
  await expect(
    page.getByRole("status").filter({ hasText: "Sauvegarde en attente" }),
  ).toBeVisible();
  env.setProfile({
    name: "Autre compte",
    avatar: null,
    kind: "google",
    key: "b".repeat(64),
  });
  env.failSave(false);
  await page.reload();
  await expect(
    page.getByRole("status").filter({ hasText: "identité d’origine" }),
  ).toBeVisible();
  expect(env.saved).toHaveLength(0);
  env.setProfile(original);
  await page.reload();
  await expect.poll(() => env.saved.length).toBe(1);
  expect(env.saved[0].recipient).toBe(original.key);
});
test("local sidebar photo upload persists with nickname and primary save", async ({
  page,
}) => {
  const env = await environment(page);
  await page.goto("/jeux");
  await page.getByRole("button", { name: "Créer mon profil joueur" }).click();
  await page.getByLabel("Pseudo", { exact: true }).fill("Photo Alice");
  const data = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, 16, 16);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: Buffer.from(data, "base64"),
    });
  await expect(
    page.getByRole("button", { name: "Modifier ma photo de profil" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  expect(env.profile()?.avatar).toMatch(/^data:image\/webp;base64,/);
  await page.reload();
  await page
    .getByRole("button", { name: "Profil joueur : Photo Alice" })
    .click();
  await expect(
    page.getByRole("button", { name: "Modifier ma photo de profil" }),
  ).toBeVisible();
});
