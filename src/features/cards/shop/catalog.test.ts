import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CREDIT_PACKS, BOOSTER_PACKS, COSMETICS } from "./catalog";
test("shop catalogue matches the versioned server price list", () => {
  const migration = readFileSync(
    new URL(
      "../../../../supabase/migrations/20261027174543_cards_shop_economy.sql",
      import.meta.url,
    ),
    "utf8",
  );
  for (const pack of CREDIT_PACKS)
    assert(migration.includes(`('${pack.id}','credits',${pack.amount},0)`));
  for (const pack of BOOSTER_PACKS)
    assert(
      migration.includes(
        `('${pack.id}','boosters',${pack.amount},${pack.price})`,
      ),
    );
  for (const cosmetic of COSMETICS)
    assert(
      migration.includes(`('${cosmetic.id}','cosmetic',1,${cosmetic.price})`),
    );
});
