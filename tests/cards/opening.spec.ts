import { test, expect, type Page } from "@playwright/test";

const front = (page: Page) => page.locator(".cards-stack-front");
async function ready(page: Page, index: number) {
  await expect(page.getByRole("status")).toContainText(
    `Carte ${index + 1} sur 5`,
  );
  await expect(front(page)).toHaveAttribute("aria-disabled", "false");
}
async function finish(page: Page, from = 0) {
  for (let i = from; i < 5; i++) {
    await ready(page, i);
    await front(page).press("Enter");
  }
  await expect(
    page.getByRole("heading", { name: "Récapitulatif" }),
  ).toBeVisible();
}

test("cards: mobile successive packs, modal, resume, summary ratio and touch detail", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/jeux/cards");
  await page
    .getByRole("button", { name: "Ouvrir un booster", exact: true })
    .dblclick();
  await expect(page.getByRole("dialog")).toBeVisible();
  const scene = await page.getByRole("dialog").boundingBox();
  expect(scene?.width).toBe(390);
  expect(scene?.height).toBe(844);
  await expect(page.locator(".cards-header").locator("..")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await page
    .getByRole("button", { name: "Découper le booster", exact: true })
    .press("Enter");
  await ready(page, 0);
  await expect(
    page.getByRole("button", { name: /Carte suivante|Tout révéler|Terminer/ }),
  ).toHaveCount(0);
  // Pointer release owns the gesture; browser click from the same action cannot advance twice.
  await front(page).dblclick();
  await ready(page, 1);
  await expect(
    page.locator(".cards-stack-cover, .cards-card-back-mark"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Défiler les cartes automatiquement" }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cards.save.v1")!),
  );
  await page.reload();
  await ready(page, 1);
  const resumed = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cards.save.v1")!),
  );
  expect(resumed.activeOpen.openId).toBe(saved.activeOpen.openId);
  expect(resumed.activeOpen.cards).toEqual(saved.activeOpen.cards);
  await finish(page, 1);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Ouvrir", exact: true }),
  ).toHaveCount(0);
  const cards = await page
    .locator(".cards-summary-item .cards-card")
    .evaluateAll((nodes) =>
      nodes.map((n) => {
        const r = n.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }),
    );
  expect(cards).toHaveLength(5);
  for (const card of cards)
    expect(card.width / card.height).toBeCloseTo(5 / 7, 2);
  expect(cards[0].y).toBe(cards[1].y);
  expect(cards[2].y).toBe(cards[3].y);
  expect(cards[2].y).toBeGreaterThan(cards[0].y);
  expect(cards[4].y).toBeGreaterThan(cards[2].y);
  await page.screenshot({ path: "/tmp/cards-summary-mobile.png" });
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Ouvrir un booster", exact: true })
    .dblclick();
  await page
    .getByRole("button", { name: "Découper le booster", exact: true })
    .press("Enter");
  await finish(page);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("cards.save.v1")!).stats.boostersOpened,
    ),
  ).toBe(2);
  await page.getByRole("tab", { name: "Collection", exact: true }).click();
  await page.getByRole("button", { name: "Possédées", exact: true }).click();
  const collectionCard = page.locator(".cards-grid-hit").first();
  const ratio = await collectionCard.locator(".cards-card").evaluate((n) => {
    const r = n.getBoundingClientRect();
    return r.width / r.height;
  });
  expect(ratio).toBeCloseTo(5 / 7, 2);
  await collectionCard.click();
  const detail = page.locator(".cards-card-interactive");
  const rect = (await detail.boundingBox())!;
  expect(rect.width / rect.height).toBeCloseTo(5 / 7, 2);
  expect(rect.height).toBeGreaterThan(500);
  await page.mouse.move(rect.x + rect.width * 0.8, rect.y + rect.height * 0.3);
  await expect(detail).toHaveAttribute("data-touching", "true");
  await page.screenshot({ path: "/tmp/cards-detail-mobile.png" });
  await page.getByRole("button", { name: "Fermer la fiche" }).click();
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await expect(
    page.locator(".cards-profile .player-profile-button"),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("cards: swipe directions, cancellation, special previews, reduced motion and interruption cleanup", async ({
  page,
}) => {
  await page.goto("/jeux/cards");
  await page.getByRole("button", { name: "5ᵉ God", exact: true }).click();
  await page
    .getByRole("button", { name: "Découper le booster", exact: true })
    .press("Enter");
  await ready(page, 0);
  await expect(page.locator(".cards-special-reveal")).toHaveCount(0);
  const rect = (await front(page).boundingBox())!;
  const x = rect.x + rect.width / 2,
    y = rect.y + rect.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 20, y, { steps: 10 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await ready(page, 0);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 150, y, { steps: 10 });
  await page.mouse.up();
  await ready(page, 1);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 150, y, { steps: 10 });
  await page.mouse.up();
  await ready(page, 2);
  await front(page).press("Space");
  await ready(page, 3);
  await front(page).press("Enter");
  await ready(page, 4);
  await expect(
    page.locator('.cards-stack-front [data-rarity="diamond"]'),
  ).toBeVisible();
  await expect(page.locator(".cards-special-diamond")).toHaveCount(1);
  await finish(page, 4);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("cards.save.v1")!).stats.boostersOpened,
    ),
  ).toBe(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Ouvrir", exact: true }).click();
  await page
    .getByRole("button", { name: "Découper le booster", exact: true })
    .press("Enter");
  await ready(page, 0);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Récapitulatif" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await expect(page.locator(".cards-special-reveal")).toHaveCount(0);
});

for (const direction of [-1, 1]) {
  test(`cards: cut direction ${direction}, cancel and safe interruption`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/jeux/cards");
    await page
      .getByRole("button", { name: "Ouvrir un booster", exact: true })
      .click();
    const assembly = page.locator(".cards-booster-assembly");
    const box = (await assembly.boundingBox())!;
    const x = box.x + box.width / 2,
      y = box.y + 15;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 20, y, { steps: 5 });
    await page.mouse.up();
    await expect(assembly).toHaveAttribute("style", /--cut-progress: 0/);
    await expect(
      page.getByRole("button", { name: "Découper le booster", exact: true }),
    ).toBeVisible();
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + direction * 120, y, { steps: 8 });
    await page.mouse.up();
    await ready(page, 0);
    expect(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("cards.save.v1")!).activeOpen
            .cutDirection,
      ),
    ).toBe(direction < 0 ? "left" : "right");
    await finish(page);
    const button = (await page
      .getByRole("button", { name: "Ouvrir", exact: true })
      .boundingBox())!;
    expect(button.y + button.height).toBeLessThanOrEqual(667);
    await page.getByRole("tab", { name: "Collection", exact: true }).click();
    await page.getByRole("button", { name: "Possédées", exact: true }).click();
    await page.locator(".cards-grid-hit").first().click();
    const card = page.locator(".cards-card-interactive");
    const bounds = (await card.boundingBox())!;
    const touch = await page.context().newCDPSession(page);
    const touchPoint = {
      x: bounds.x + bounds.width * 0.5,
      y: bounds.y + bounds.height * 0.4,
    };
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [touchPoint],
    });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: touchPoint.x + 30, y: touchPoint.y + 20 }],
    });
    await expect(card).toHaveAttribute("data-touching", "true");
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchCancel",
      touchPoints: [],
    });
    await expect(card).not.toHaveAttribute("data-touching");
    await expect(card).toHaveAttribute("style", /--tilt-x: 0deg/);
  });
}

for (const [label, rarity] of [
  ["5ᵉ Épique", "legendary"],
  ["5ᵉ Légendaire", "gold"],
] as const) {
  test(`cards: exceptional preview ${rarity} stays hidden until active`, async ({
    page,
  }) => {
    await page.goto("/jeux/cards");
    await page.getByRole("button", { name: label, exact: true }).click();
    await page
      .getByRole("button", { name: "Découper le booster", exact: true })
      .press("Enter");
    for (let i = 0; i < 4; i++) {
      await ready(page, i);
      await expect(page.locator(".cards-special-reveal")).toHaveCount(0);
      await front(page).press("Enter");
    }
    await ready(page, 4);
    await expect(page.locator(`.cards-special-${rarity}`)).toBeVisible();
    await finish(page, 4);
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("cards.save.v1")!),
    );
    expect(saved.stats.boostersOpened).toBe(0);
    expect(saved.collection).toEqual({});
  });
}

test("cards: an accepted eject persists before its animation ends", async ({
  page,
}) => {
  await page.goto("/jeux/cards");
  await page
    .getByRole("button", { name: "Ouvrir un booster", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Découper le booster", exact: true })
    .press("Enter");
  await ready(page, 0);
  await front(page).press("Enter");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("cards.save.v1")!).activeOpen
          .currentIndex,
    ),
  ).toBe(1);
  await page.reload();
  await ready(page, 1);
});

test("cards: all five faces stay mounted and the next face appears during ejection", async ({
  page,
}) => {
  await page.goto("/jeux/cards");
  await page
    .getByRole("button", { name: "Ouvrir un booster", exact: true })
    .click();
  await expect(page.locator(".cards-stack-loaded-face")).toHaveCount(5);
  await page
    .getByRole("button", { name: "Découper le booster", exact: true })
    .press("Enter");
  await ready(page, 0);
  await expect(page.locator(".cards-stack-loaded-face:visible")).toHaveCount(5);
  await front(page).press("Enter");
  await expect(page.locator(".cards-stack-outgoing")).toHaveCount(1);
  await expect(
    page.locator(".cards-stack-front .cards-stack-loaded-face"),
  ).toBeVisible();
  await ready(page, 1);
  await expect(page.locator(".cards-stack-loaded-face")).toHaveCount(5);
});

test("cards: faces preload on open but stay concealed until the wrapper is torn", async ({
  page,
}) => {
  await page.goto("/jeux/cards");
  await page
    .getByRole("button", { name: "Ouvrir un booster", exact: true })
    .click();
  await expect(page.locator(".cards-stack-loaded-face")).toHaveCount(5);
  await expect(page.locator(".cards-stack")).toHaveCSS("visibility", "hidden");
  await expect(page.locator(".cards-stack-loaded-face:visible")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Découper le booster", exact: true })
    .press("Enter");
  await expect(page.locator(".cards-stack")).toHaveCSS("visibility", "visible");
  await expect(
    page.locator(".cards-stack-front .cards-stack-loaded-face"),
  ).toBeVisible();
  await expect(
    page.locator(".cards-stack-cover, .cards-card-back-mark"),
  ).toHaveCount(0);
  await ready(page, 0);
});

test("cards: opening controls survive cut, resume and summary", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/jeux/cards");
  const anchor = (await page
    .getByRole("button", { name: "Ouvrir un booster", exact: true })
    .boundingBox())!;
  const assertAnchor = async (name: string) => {
    await page.mouse.move(5, 5);
    await expect
      .poll(
        async () =>
          (await page.getByRole("button", { name, exact: true }).boundingBox())!
            .y,
      )
      .toBeCloseTo(anchor.y, 0);
    const rect = (await page
      .getByRole("button", { name, exact: true })
      .boundingBox())!;
    expect(rect.y).toBeCloseTo(anchor.y, 0);
    expect(rect.x).toBeCloseTo(anchor.x, 0);
    expect(rect.width).toBeCloseTo(anchor.width, 0);
  };
  await page
    .getByRole("button", { name: "Ouvrir un booster", exact: true })
    .click();
  await expect(
    page.locator("button").filter({ hasText: "Découper le booster" }),
  ).toHaveCount(0);
  await expect(page.locator(".cards-cut-hint")).toHaveText(
    "Glisse pour ouvrir",
  );
  const pack = (await page.locator(".cards-booster-assembly").boundingBox())!;
  expect(pack.y).toBeCloseTo(844 * 0.465, 0);
  const stack = (await page.locator(".cards-stack-stage").boundingBox())!;
  expect(pack.width).toBeCloseTo(stack.width, 0);
  expect(pack.height).toBeCloseTo(stack.height, 0);
  await page
    .getByRole("button", { name: "Découper le booster", exact: true })
    .press("Enter");
  await expect(
    page.getByRole("button", { name: "Défiler les cartes automatiquement" }),
  ).toBeVisible();
  await finish(page);
  await assertAnchor("Ouvrir");
});

test("cards: detail navigation supports arrows, keyboard and swipes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/jeux/cards");
  await page.getByRole("tab", { name: "Collection", exact: true }).click();
  await page.locator(".cards-grid-hit").first().click();
  const title = page.getByRole("dialog").getByRole("heading");
  await expect(title).toHaveText("Éclat matinal");
  await expect(
    page.getByRole("button", { name: "Carte précédente", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Carte suivante", exact: true })
    .click();
  await expect(title).toHaveText("Brise légère");
  await page.keyboard.press("ArrowLeft");
  await expect(title).toHaveText("Éclat matinal");
  const card = page.locator(".cards-detail-card");
  const bounds = (await card.boundingBox())!;
  const x = bounds.x + bounds.width / 2,
    y = bounds.y + bounds.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 120, y, { steps: 10 });
  await page.mouse.up();
  await expect(title).toHaveText("Brise légère");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 120, y, { steps: 10 });
  await page.mouse.up();
  await expect(title).toHaveText("Éclat matinal");
  await expect(
    page.locator(".cards-detail .cards-card-art-label:visible"),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Fermer la fiche", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("cards: unowned detail shows a disabled back and no possession footer", async ({
  page,
}) => {
  await page.goto("/jeux/cards");
  await page.getByRole("tab", { name: "Collection", exact: true }).click();
  await page.locator(".cards-grid-hit").first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".cards-card-unowned")).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(dialog.getByText("Non obtenue", { exact: true })).toBeVisible();
  await expect(dialog.locator(".cards-card-interactive")).toHaveCount(0);
  await expect(dialog.getByText(/Possédée|Manquante/)).toHaveCount(0);
  await expect(dialog.locator(".cards-card-meta")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Carte suivante", exact: true })
    .click();
  await expect(dialog.getByRole("heading")).toHaveText("Brise légère");
});
