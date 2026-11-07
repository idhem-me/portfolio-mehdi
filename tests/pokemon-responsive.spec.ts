import { expect, test } from "@playwright/test";

test("selects and moves a local Pokémon with PokéAPI blocked", async ({
  page,
  isMobile,
  browserName,
}) => {
  await page.route(/pokeapi\.co|raw\.githubusercontent\.com/, (route) =>
    route.abort(),
  );
  await page.goto("/jeux");
  await page.getByRole("button", { name: "Refuser", exact: true }).click();
  await page.getByRole("link", { name: /Pokémon/ }).click();
  await expect(page).toHaveURL(/\/jeux\/pokemon$/);
  await expect(page.getByRole("heading", { name: "Pokédex" })).toBeVisible();
  await expect(
    page.getByText("Filtre le catalogue", { exact: false }),
  ).toHaveCount(0);

  const search = page.getByRole("searchbox", { name: "Nom ou numéro Pokédex" });
  const results = page.getByRole("table", { name: "Pokémon" });
  const type = page.getByRole("combobox", { name: "Type", exact: true });
  const generation = page.getByRole("combobox", {
    name: "Génération",
    exact: true,
  });
  const navigation = isMobile
    ? page.getByRole("button", { name: "Ouvrir le menu" })
    : page.getByRole("link", { name: "Réalisations" });
  await expect(navigation).toBeVisible();
  await expect(results.getByRole("row")).toHaveCount(25);
  const nextBatch = page.waitForResponse(
    (response) =>
      response.url().includes("/api/pokemon?") &&
      new URL(response.url()).searchParams.get("offset") === "24",
  );
  await page.getByTestId("pokemon-load-more").scrollIntoViewIfNeeded();
  expect((await nextBatch).ok()).toBe(true);
  await expect(results.getByRole("row")).toHaveCount(49);
  await expect(
    results.getByRole("link", { name: "Jouer avec Bulbizarre" }),
  ).toHaveCount(1);
  await expect(
    results.getByRole("link", { name: "Jouer avec Pikachu" }),
  ).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Suivant" })).toHaveCount(0);
  await search.fill("dracaufeu");
  await type.selectOption({ label: "Eau" });
  await expect(page.getByText("Aucun Pokémon trouvé")).toBeVisible();
  await type.selectOption({ label: "Feu" });
  await generation.selectOption({ label: "Génération 2" });
  await expect(page.getByText("Aucun Pokémon trouvé")).toBeVisible();
  await generation.selectOption({ label: "Génération 1" });
  await expect(results.getByRole("row")).toHaveCount(2);
  await expect(results.locator("img")).toHaveAttribute(
    "src",
    "/pokemon/sprites/6.png",
  );
  await page.getByRole("switch", { name: "Version shiny" }).click();
  await expect(results.locator("img")).toHaveAttribute(
    "src",
    "/pokemon/shiny/6.png",
  );
  await results.getByRole("link", { name: "Jouer avec Dracaufeu" }).click();
  await expect(page).toHaveURL(/\/jeux\/pokemon\/6\?shiny=1$/);
  await expect(navigation).toBeVisible();

  const stage = page.getByRole("region", { name: "Scène Pokémon" });
  const sprite = stage.getByRole("group", { name: "Dracaufeu" });
  await expect(sprite.locator("img")).toHaveJSProperty("complete", true);
  expect(
    await sprite
      .locator("img")
      .evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0);
  await expect(sprite).toHaveAttribute("style", /left:\s*50%;\s*top:\s*50%/);
  await sprite.press("ArrowRight");
  await expect
    .poll(() => sprite.evaluate((node) => node.style.left))
    .not.toBe("50%");

  const bounds = (await sprite.boundingBox())!;
  const x = Math.round(bounds.x + bounds.width / 2);
  const y = Math.round(bounds.y + bounds.height / 2);
  if (isMobile && browserName === "chromium") {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 0, y }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } else if (!isMobile) {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(0, y, { steps: 4 });
    await page.mouse.up();
  }
  if (!isMobile || browserName === "chromium") {
    await expect(sprite).toHaveAttribute("style", /left:\s*0%/);
    const sceneBounds = (await stage.boundingBox())!;
    expect((await sprite.boundingBox())!.x).toBeGreaterThanOrEqual(
      sceneBounds.x,
    );
  }

  const position = await sprite.getAttribute("style");
  await expect(sprite.locator("img")).toHaveAttribute(
    "src",
    "/pokemon/shiny/6.png",
  );
  await expect(page.getByRole("switch", { name: "Version shiny" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("heading", { name: "#006 Dracaufeu" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Plein écran", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Scène Pokémon" }),
  ).toBeVisible();
  expect(await sprite.getAttribute("style")).toBe(position);
  const exit = page.getByRole("button", { name: "Quitter le plein écran" });
  await expect(exit).toBeFocused();
  await exit.press("Shift+Tab");
  await expect(sprite).toBeFocused();
  if (isMobile) await exit.click();
  else await exit.press("Escape");
  await expect(page.getByRole("dialog", { name: "Scène Pokémon" })).toHaveCount(
    0,
  );
  await expect(navigation).toBeVisible();
  expect(await sprite.getAttribute("style")).toBe(position);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(sprite).toHaveAttribute("style", /left:\s*50%;\s*top:\s*50%/);
  await expect(sprite.locator("img")).toHaveAttribute(
    "src",
    "/pokemon/shiny/6.png",
  );
  await page.getByRole("link", { name: "Pokédex", exact: true }).click();
  await search.fill("#0004");
  await expect(
    results.getByRole("link", { name: "Jouer avec Salamèche" }),
  ).toBeVisible();
  await type.selectOption({ label: "Feu" });
  await generation.selectOption({ label: "Génération 1" });
  const reset = page.getByRole("button", { name: "Réinitialiser les filtres" });
  await reset.click();
  await expect(search).toHaveValue("");
  await expect(type).toHaveValue("all");
  await expect(generation).toHaveValue("all");
  await expect(reset).toBeDisabled();
  await expect(results.getByRole("row")).toHaveCount(25);
});
