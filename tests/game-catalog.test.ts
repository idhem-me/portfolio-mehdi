import assert from "node:assert/strict";
import { test } from "node:test";
import { cardsEnabled, cardsPublic } from "../src/features/cards/flags";
import {
  clickerBurgerEnabled,
  clickerBurgerPublic,
} from "../src/features/clicker-burger/flags";
import { tetrisEnabled } from "../src/features/tetris/flags";
import { getGames } from "../src/lib/content";
import sitemap from "../src/app/sitemap";

test("local games catalog includes unavailable games with a status", () => {
  const local = getGames("fr", { includeUnavailable: true });
  const bySlug = new Map(
    local.caseStudies.map((study) => [study.slug, study]),
  );

  assert.equal(local.caseStudies.length, 4);
  assert.equal(bySlug.get("cards")?.localAvailability, "not-deployed");
  assert.equal(
    bySlug.get("tetris")?.localAvailability,
    tetrisEnabled ? undefined : "disabled",
  );
  assert.equal(bySlug.get("clicker-burger")?.localAvailability, "disabled");
  assert.equal(clickerBurgerEnabled, false);
  assert.equal(clickerBurgerPublic, false);
  assert.equal(cardsEnabled, false);
  assert.equal(cardsPublic, false);

  const visibleOutsideLocal = getGames("fr");
  const expectedSlugs = local.caseStudies
    .filter((study) => {
      if (study.slug === "tetris") return tetrisEnabled;
      if (study.slug === "clicker-burger") return clickerBurgerEnabled;
      if (study.slug === "cards") return cardsEnabled;
      return true;
    })
    .map((study) => study.slug);

  assert.deepEqual(
    visibleOutsideLocal.caseStudies.map((study) => study.slug),
    expectedSlugs,
  );

  const sitemapUrls = sitemap().map((entry) => entry.url);
  assert.ok(sitemapUrls.some((url) => url.endsWith("/jeux/pokemon")));
  assert.ok(!sitemapUrls.some((url) => url.includes("clicker-burger")));
  assert.ok(!sitemapUrls.some((url) => url.includes("/jeux/cards")));
});
