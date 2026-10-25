import { expect, type Page } from "@playwright/test";
export type Profile = {
  name: string;
  avatar: string | null;
  kind: "local" | "google";
  key: string;
};
export const profiles = {
  local: {
    name: "Alice Locale",
    avatar: null,
    kind: "local",
    key: "a".repeat(64),
  } as Profile,
  google: {
    name: "Alice Google",
    avatar: "https://lh3.googleusercontent.com/missing-avatar",
    kind: "google",
    key: "b".repeat(64),
  } as Profile,
};
export async function identityEnvironment(
  page: Page,
  initial: Profile | null = null,
) {
  let profile = initial,
    local = initial?.kind === "local" ? initial : null;
  let failSave = false,
    failProfile = false,
    duplicate = false,
    popup: "success" | "cancel" | "failure" = "success",
    session = 0;
  const saved: Record<string, unknown>[] = [];
  await page.addInitScript(() => {
    localStorage.setItem("analytics_consent", "denied");
    localStorage.setItem("tetris.onboardingDone", "true");
    localStorage.setItem("lava-settings", JSON.stringify({ sound: false }));
  });
  await page.route("https://*.googleusercontent.com/**", (route) =>
    route.abort(),
  );
  await page.route("**/api/tetris/profile", async (route) => {
    if (failProfile)
      return route.fulfill({
        status: 503,
        json: { error: "raw backend error" },
      });
    if (route.request().method() === "POST") {
      if (duplicate)
        return route.fulfill({ status: 409, json: { error: "duplicate" } });
      const body = route.request().postDataJSON();
      profile = local = {
        name: body.name,
        avatar: body.avatar,
        key: "a".repeat(64),
        kind: "local",
      };
    }
    return route.fulfill({ json: profile });
  });
  await page.route("**/api/tetris/auth", (route) => {
    if (route.request().method() === "POST") profile = local;
    return route.fulfill({
      json: {
        googleAvailable: true,
        user: profile?.kind === "google" ? { displayName: profile.name } : null,
      },
    });
  });
  await page.context().route("**/api/tetris/auth/google?**", async (route) => {
    if (popup === "success") profile = profiles.google;
    return route.fulfill({
      contentType: "text/html",
      body: `<script>${popup === "success" ? 'window.opener.postMessage({type:"tetris-google-auth",ok:true},location.origin);' : popup === "failure" ? 'window.opener.postMessage({type:"tetris-google-auth",ok:false},location.origin);' : ""}window.close()</script>`,
    });
  });
  await page.route("**/api/tetris/sessions", (route) =>
    route.fulfill({
      json: { id: (++session).toString(16).padStart(64, "0"), seed: 123 },
    }),
  );
  for (const endpoint of ["local-scores", "leaderboard"])
    await page.route(`**/api/tetris/${endpoint}`, async (route) => {
      if (route.request().method() !== "POST")
        return route.fulfill({
          json: [
            {
              rank: 1,
              score: 100,
              lines: 4,
              name: "Alice Google",
              avatar: profiles.google.avatar,
            },
          ],
        });
      if (failSave)
        return route.fulfill({ status: 503, json: { error: "SQL failure" } });
      const body = route.request().postDataJSON();
      if (body.recipient && body.recipient !== profile?.key)
        return route.fulfill({
          status: 401,
          json: { error: "Identité modifiée" },
        });
      if (!saved.some((s) => s.id === body.id)) saved.push(body);
      return route.fulfill({ json: { rank: 1 } });
    });
  return {
    saved,
    profile: () => profile,
    failSave: (v: boolean) => {
      failSave = v;
    },
    failProfile: (v: boolean) => {
      failProfile = v;
    },
    duplicate: (v: boolean) => {
      duplicate = v;
    },
    popup: (v: typeof popup) => {
      popup = v;
    },
    setProfile: (p: Profile | null) => {
      profile = p;
    },
  };
}
export async function endGame(page: Page) {
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await expect(page.locator(".lava-game")).toHaveAttribute(
    "data-state",
    "playing",
  );
  for (
    let i = 0;
    i < 40 &&
    (await page.locator(".lava-game").getAttribute("data-state")) === "playing";
    i++
  )
    await page.getByRole("button", { name: "Lâcher", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Game over", exact: true }),
  ).toBeVisible();
}

export async function openIdentityMenu(page: Page) {
  await page
    .getByRole("button", { name: /Choisir mon identité|Profil joueur :/ })
    .filter({ visible: true })
    .last()
    .click();
}
export async function openPseudo(page: Page) {
  await openIdentityMenu(page);
  await page
    .getByRole("menuitem", { name: /Ajouter un pseudo|Modifier mon pseudo/ })
    .click();
}
export async function connectGoogle(page: Page) {
  const connect = page.getByRole("button", {
    name: "Se connecter",
    exact: true,
  });
  if (await connect.isVisible()) await connect.click();
  else {
    await openIdentityMenu(page);
    await page
      .getByRole("menuitem", { name: "Se connecter avec Google", exact: true })
      .click();
  }
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Se connecter avec Google", exact: true })
    .click();
}
