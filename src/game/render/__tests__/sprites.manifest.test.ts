import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../assets.manifest.json";

const ROOT = path.resolve(__dirname, "../../../../");
const PNG = path.join(ROOT, "public/game/sprites/png");
const WEBP = path.join(ROOT, "public/game/sprites/webp");

/** Ids top-down intégrés (étape 1). */
const DONE_IDS = [
  "bld_townhall_t1",
  "bld_townhall_t2",
  "bld_house_t1",
  "bld_house_t2_a",
  "bld_house_t3_a",
  "bld_house_t3_b",
  "bld_house_t4",
  "bld_apartment_t1",
  "bld_apartment_t2",
  "bld_apartment_t3",
  "bld_skyscraper_t1",
  "bld_shop_t1",
  "bld_factory_t1",
  "bld_sawmill_t1",
  "bld_quarry_t1",
  "bld_carpenter_t1",
  "bld_coal_plant_t1",
  "bld_solar_plant_t1",
  "bld_school_t1",
  "bld_pharmacy_t1",
  "bld_police_t1",
  "bld_fire_station_t1",
  "bld_church_t1",
  "bld_park_t1",
  "bld_tennis_t1",
  "site_build_1x1",
  "site_upgrade_1x1",
] as const;

describe("sprites top-down + manifeste", () => {
  it("tous les fichiers png/webp existent", () => {
    for (const id of DONE_IDS) {
      expect(existsSync(path.join(PNG, `${id}.png`)), `${id}.png`).toBe(true);
      expect(existsSync(path.join(WEBP, `${id}.webp`)), `${id}.webp`).toBe(
        true
      );
    }
  });

  it("pas de variante house t2_b ni coal t2", () => {
    expect(existsSync(path.join(PNG, "bld_house_t2_b.png"))).toBe(false);
    expect(existsSync(path.join(PNG, "bld_coal_plant_t2.png"))).toBe(false);
  });

  it("manifeste status done + footprint + anchor", () => {
    const byId = new Map(
      (manifest.assets as { id: string }[]).map((a) => [a.id, a])
    );
    for (const id of DONE_IDS) {
      const a = byId.get(id) as {
        status: string;
        footprint: string;
        anchor: number[];
        w: number;
        h: number;
        file: string;
      };
      expect(a, id).toBeTruthy();
      expect(a.status).toBe("done");
      expect(a.anchor).toEqual([0, 0]);
      expect(a.file).toBe(`png/${id}.png`);
      if (id === "bld_coal_plant_t1") {
        expect(a.footprint).toBe("2x1");
        expect(a.w).toBe(256);
        expect(a.h).toBe(128);
      } else {
        expect(a.footprint).toBe("1x1");
        expect(a.w).toBe(128);
        expect(a.h).toBe(128);
      }
    }
  });

  it("charbon fusionné présent dans asset-village (runtime)", () => {
    expect(
      existsSync(
        path.join(
          ROOT,
          "public/game/asset-village/batiments/central-charbon2x1-merged.png"
        )
      )
    ).toBe(true);
  });
});
