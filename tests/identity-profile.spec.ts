import { test, expect } from "@playwright/test";
import { identityEnvironment, endGame, profiles } from "./helpers/identity";
import { recoverDraft } from "../src/features/tetris/auth/draft";
for (const kind of ["anonymous", "local", "google"] as const)
  for (const screen of ["games", "lobby", "gameover"] as const) {
    test(`${kind} identity uses the same selector on ${screen}`, async ({
      page,
    }, info) => {
      if (info.project.name.includes("iphone"))
        await page.setViewportSize({ width: 375, height: 812 });
      const env = await identityEnvironment(
        page,
        kind === "anonymous" ? null : profiles[kind],
      );
      await page.goto(screen === "games" ? "/en/jeux" : "/en/jeux/tetris");
      if (screen === "gameover") await endGame(page);
      const selector = page
        .locator(`.identity-selector[data-identity="${kind}"]`)
        .filter({ visible: true })
        .first();
      await expect(selector).toBeVisible();
      await expect(
        selector.getByRole("status").filter({ hasText: "Chargement" }),
      ).toHaveCount(0);
      if (kind === "google") {
        await expect(selector).toContainText("Alice Google");
        await expect(
          selector.getByRole("button", { name: "Se déconnecter", exact: true }),
        ).toBeVisible();
        await expect(
          selector.getByRole("button", { name: /Créer|Modifier|Se connecter/ }),
        ).toHaveCount(0);
        await expect(
          selector.locator('[data-slot="avatar-fallback"]'),
        ).toContainText("AG");
      } else {
        await expect(
          selector.getByRole("button", {
            name: "Se connecter avec Google",
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          selector.getByRole("button", {
            name: kind === "local" ? "Modifier" : "Créer un profil local",
            exact: true,
          }),
        ).toBeVisible();
        if (kind === "anonymous")
          await expect(
            selector.getByRole("button", {
              name: "Continuer sans enregistrer",
              exact: true,
            }),
          ).toBeVisible();
        else
          await expect(
            selector.getByRole("button", {
              name: "Créer un profil local",
              exact: true,
            }),
          ).toHaveCount(0);
      }
      if (screen === "gameover") {
        await expect(
          page.getByRole("button", { name: "Rejouer", exact: true }),
        ).toHaveAttribute("data-variant", "accent");
        if (kind !== "anonymous")
          await expect.poll(() => env.saved.length).toBe(1);
      }
      const actions = await selector.locator("button").evaluateAll((buttons) =>
        buttons.map((b) => ({
          height: b.getBoundingClientRect().height,
          width: b.getBoundingClientRect().width,
        })),
      );
      expect(actions.every((b) => b.height >= 44 && b.width >= 44)).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `/private/tmp/tetris-release/${info.project.name}-${kind}-${screen}.png`,
      });
    });
  }

test("creating a local profile at game over attaches the current score, photo and later runs", async ({
  page,
}) => {
  const env = await identityEnvironment(page);
  await page.goto("/en/jeux/tetris");
  await endGame(page);
  const score = await page.locator(".lava-end-stats dd").nth(2).innerText();
  await page
    .getByRole("button", { name: "Créer un profil local", exact: true })
    .click();
  await page.getByLabel("Pseudo", { exact: true }).fill("Nouvelle Alice");
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 800;
    c.height = 800;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, 800, 800);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("Photo du profil").setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await page
    .getByRole("button", { name: "Enregistrer le profil", exact: true })
    .click();
  await expect.poll(() => env.saved.length).toBe(1);
  await expect(page.locator(".lava-end-stats dd").nth(2)).toHaveText(score);
  expect(env.profile()?.avatar).toMatch(/^data:image\/(webp|png|jpeg)/);
  const size = await page.evaluate(async (avatar) => {
    const image = await createImageBitmap(await (await fetch(avatar!)).blob());
    const size = [image.width, image.height];
    image.close();
    return size;
  }, env.profile()?.avatar);
  expect(Math.max(...size)).toBeLessThanOrEqual(256);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("tetris.local-scores.v2")!).length,
    ),
  ).toBe(1);
  expect(
    await page.evaluate(() => sessionStorage.getItem("lava-pending-score-v1")),
  ).toBeNull();
  await page.goto("/en/jeux");
  await expect(page.locator(".identity-profile")).toContainText(
    "Nouvelle Alice",
  );
  await page.reload();
  await expect(page.locator(".identity-profile")).toContainText(
    "Nouvelle Alice",
  );
});

for (const outcome of ["success", "cancel", "failure"] as const)
  test(`Google popup ${outcome} preserves the pending score`, async ({
    page,
  }) => {
    const env = await identityEnvironment(page);
    env.popup(outcome);
    await page.goto("/en/jeux/tetris");
    await endGame(page);
    const score = await page.locator(".lava-end-stats dd").nth(2).innerText();
    await page
      .getByRole("button", { name: "Se connecter avec Google", exact: true })
      .click();
    if (outcome === "success") {
      await expect.poll(() => env.saved.length).toBe(1);
      expect(env.saved[0].identity).toBe("google");
      await expect(
        page.getByRole("button", {
          name: "Créer un profil local",
          exact: true,
        }),
      ).toHaveCount(0);
    } else {
      await expect(page.locator(".identity-error")).toContainText(
        "Connexion Google impossible ou annulée",
      );
      expect(env.saved).toHaveLength(0);
      expect(
        await page.evaluate(() =>
          sessionStorage.getItem("lava-pending-score-v1"),
        ),
      ).not.toBeNull();
      env.popup("success");
      await page
        .getByRole("button", { name: "Réessayer", exact: true })
        .click();
      await expect.poll(() => env.saved.length).toBe(1);
    }
    await expect(page.locator(".lava-end-stats dd").nth(2)).toHaveText(score);
  });

test("blocked Google popup has a readable retry action", async ({ page }) => {
  await identityEnvironment(page);
  await page.addInitScript(() => {
    window.open = () => null;
  });
  await page.goto("/en/jeux");
  await page
    .getByRole("button", { name: "Se connecter avec Google", exact: true })
    .click();
  await expect(page.locator(".identity-error")).toContainText("bloquée");
  await expect(
    page.getByRole("button", { name: "Réessayer", exact: true }),
  ).toBeVisible();
});

test("profile validation handles empty/invalid/duplicate names and invalid/heavy photos", async ({
  page,
}) => {
  const env = await identityEnvironment(page);
  await page.goto("/en/jeux");
  await page
    .getByRole("button", { name: "Créer un profil local", exact: true })
    .click();
  const save = page.getByRole("button", {
      name: "Enregistrer le profil",
      exact: true,
    }),
    name = page.getByLabel("Pseudo", { exact: true });
  await save.click();
  await expect(page.locator(".identity-error")).toContainText(
    "Choisis un pseudo",
  );
  await name.fill("!");
  await save.click();
  await expect(page.locator(".identity-error")).toContainText("2 à 20");
  await name.fill("Alice");
  env.duplicate(true);
  await save.click();
  await expect(page.locator(".identity-error")).toContainText("déjà utilisé");
  await page.getByLabel("Photo du profil").setInputFiles({
    name: "bad.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(page.locator(".identity-error")).toContainText(
    "JPEG, PNG ou WebP",
  );
  await page.getByLabel("Photo du profil").setInputFiles({
    name: "heavy.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(5_000_001),
  });
  await expect(page.locator(".identity-error")).toContainText("trop lourde");
});

test("network failure keeps local identity and scores available in this browser", async ({
  page,
}) => {
  const env = await identityEnvironment(page, profiles.local);
  await page.goto("/en/jeux");
  await expect(page.locator(".identity-profile")).toContainText("Alice Locale");
  env.failProfile(true);
  env.failSave(true);
  await page.reload();
  await expect(page.locator(".identity-profile")).toContainText("Alice Locale");
  await expect(page.locator(".identity-error")).toContainText(
    "Connexion indisponible",
  );
  await page.goto("/en/jeux/tetris");
  await endGame(page);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Score enregistré sur cet appareil" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("tetris.local-scores.v2")!).length,
    ),
  ).toBe(1);
});

test("failed Google score is retained, retried once and cannot move to a different account", async ({
  page,
}) => {
  const env = await identityEnvironment(page, profiles.google);
  env.failSave(true);
  await page.goto("/en/jeux/tetris");
  await endGame(page);
  await expect(page.locator(".identity-error")).toContainText(
    "n’a pas pu être envoyé",
  );
  expect(
    await page.evaluate(() => sessionStorage.getItem("lava-pending-score-v1")),
  ).not.toBeNull();
  env.setProfile({
    ...profiles.google,
    key: "c".repeat(64),
    name: "Autre compte",
  });
  const pending = await page.evaluate(() =>
    sessionStorage.getItem("lava-pending-score-v1"),
  );
  expect(
    recoverDraft({
      getItem: () => pending,
      setItem: () => {},
      removeItem: () => {},
    }),
  ).not.toBeNull();
  await page.reload();
  await expect(page.locator(".identity-error")).toContainText(
    "identité d’origine",
  );
  expect(env.saved).toHaveLength(0);
  env.failSave(false);
  env.setProfile(profiles.google);
  await page.reload();
  await expect.poll(() => env.saved.length).toBe(1);
});

test("anonymous nickname saves a score without creating a local profile", async ({
  page,
}) => {
  const env = await identityEnvironment(page);
  await page.goto("/en/jeux/tetris");
  await endGame(page);
  await page
    .getByRole("button", {
      name: "Enregistrer avec un pseudo anonyme",
      exact: true,
    })
    .click();
  await page.getByLabel("Pseudo anonyme").fill("Mystère");
  await page
    .getByRole("button", { name: "Enregistrer le score", exact: true })
    .click();
  await expect.poll(() => env.saved.length).toBe(1);
  expect(env.saved[0].identity).toBe("guest");
  expect(env.profile()).toBeNull();
  expect(
    await page.evaluate(() => localStorage.getItem("tetris.local-profile.v2")),
  ).toBeNull();
});

test("a local score survives a game started with no network session", async ({
  page,
}) => {
  await identityEnvironment(page, profiles.local);
  await page.route("**/api/tetris/sessions", (route) => route.abort());
  await page.goto("/en/jeux/tetris");
  await endGame(page);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Score enregistré sur cet appareil" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("tetris.local-scores.v2")!).length,
    ),
  ).toBe(1);
});

test("logout restores the saved local profile and errors have AA contrast", async ({
  page,
}) => {
  const env = await identityEnvironment(page, profiles.local);
  await page.goto("/en/jeux");
  await expect(page.locator(".identity-profile")).toContainText("Alice Locale");
  await page
    .getByRole("button", { name: "Se connecter avec Google", exact: true })
    .click();
  await expect(page.locator(".identity-profile")).toContainText("Alice Google");
  await page
    .getByRole("button", { name: "Se déconnecter", exact: true })
    .click();
  await expect(page.locator(".identity-profile")).toContainText("Alice Locale");
  env.failProfile(true);
  await page.reload();
  await expect(page.locator(".identity-error")).toBeVisible();
  const contrast = await page.locator(".identity-error").evaluate((element) => {
    const style = getComputedStyle(element),
      canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const c = canvas.getContext("2d")!;
    const luminance = (color: string) => {
      c.clearRect(0, 0, 1, 1);
      c.fillStyle = color;
      c.fillRect(0, 0, 1, 1);
      const p = c.getImageData(0, 0, 1, 1).data;
      const v = [p[0], p[1], p[2]].map((n) => {
        const s = n / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722;
    };
    const a = luminance(style.color),
      b = luminance(style.backgroundColor);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});
