#!/usr/bin/env node
/**
 * Copie asset-village/batiments → sprites/{png,webp} avec ids canoniques,
 * merge charbon 2×1, met à jour assets.manifest.json (status done).
 */
import sharp from "sharp";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = path.join(ROOT, "public/game/asset-village/batiments");
const PNG_OUT = path.join(ROOT, "public/game/sprites/png");
const WEBP_OUT = path.join(ROOT, "public/game/sprites/webp");
const MANIFEST = path.join(ROOT, "src/game/render/assets.manifest.json");
const MERGE = path.join(ROOT, "tools/village-assets/merge-halves.mjs");

/** source filename → { id, footprint } */
const COPIES = [
  ["mairie1x1.png", "bld_townhall_t1", "1x1"],
  ["mairie1x1n2.png", "bld_townhall_t2", "1x1"],
  ["maison1x1(2p).png", "bld_house_t1", "1x1"],
  ["maison1x1(4p).png", "bld_house_t2_a", "1x1"],
  ["maison1x1(6p).png", "bld_house_t3_a", "1x1"],
  ["maison1x1(4)n2.png", "bld_house_t3_b", "1x1"],
  ["maison1x1(8p).png", "bld_house_t4", "1x1"],
  ["immeuble1x1(6p).png", "bld_apartment_t1", "1x1"],
  ["immeuble1x1(12p).png", "bld_apartment_t2", "1x1"],
  ["immeuble1x1(18p).png", "bld_apartment_t3", "1x1"],
  ["skyscrapper1x1.png", "bld_skyscraper_t1", "1x1"],
  ["commerce1x1.png", "bld_shop_t1", "1x1"],
  ["usine1x1.png", "bld_factory_t1", "1x1"],
  ["scierie1x1.png", "bld_sawmill_t1", "1x1"],
  ["carriere1x1.png", "bld_quarry_t1", "1x1"],
  ["charpentier1x1.png", "bld_carpenter_t1", "1x1"],
  ["solaire-carport1x1.png", "bld_solar_plant_t1", "1x1"],
  ["ecole1x1.png", "bld_school_t1", "1x1"],
  ["pharmacie1x1.png", "bld_pharmacy_t1", "1x1"],
  ["police1x1.png", "bld_police_t1", "1x1"],
  ["pompiers1x1.png", "bld_fire_station_t1", "1x1"],
  ["eglise1x1.png", "bld_church_t1", "1x1"],
  ["parc1x1.png", "bld_park_t1", "1x1"],
  ["tennis1x1.png", "bld_tennis_t1", "1x1"],
  ["chantier1x1.png", "site_build_1x1", "1x1"],
  ["chantier1x1n2.png", "site_upgrade_1x1", "1x1"],
];

const FP_SIZE = {
  "1x1": [128, 128],
  "2x1": [256, 128],
};

async function writeSprite(id, footprint, sourcePng) {
  const [w, h] = FP_SIZE[footprint];
  const pngPath = path.join(PNG_OUT, `${id}.png`);
  const webpPath = path.join(WEBP_OUT, `${id}.webp`);
  await sharp(sourcePng)
    .resize(w, h, { fit: "fill" })
    .png()
    .toFile(pngPath);
  await sharp(pngPath).webp({ quality: 85 }).toFile(webpPath);
  return { w, h, pngPath, webpPath };
}

await mkdir(PNG_OUT, { recursive: true });
await mkdir(WEBP_OUT, { recursive: true });

const done = [];

for (const [srcName, id, fp] of COPIES) {
  const src = path.join(SRC, srcName);
  const { w, h } = await writeSprite(id, fp, src);
  done.push({ id, footprint: fp, w, h });
  console.log(`OK ${id} ← ${srcName}`);
}

// Charbon : merge full-res pour asset-village + 256×128 pour sprites
const left = path.join(SRC, "central-charbon2x1(1).png");
const right = path.join(SRC, "central-charbon2x1(2).png");
const mergedRuntime = path.join(SRC, "central-charbon2x1-merged.png");
const mergedTmp = path.join(PNG_OUT, "_coal_merge_tmp.png");

function merge(out, w, h) {
  const r = spawnSync(
    process.execPath,
    [MERGE, left, right, out, String(w), String(h)],
    { stdio: "inherit" }
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// Full-res runtime (2×1254 × 1254)
merge(mergedRuntime, 2508, 1254);

// Canon sprites 256×128
merge(mergedTmp, 256, 128);
const coalId = "bld_coal_plant_t1";
await copyFile(mergedTmp, path.join(PNG_OUT, `${coalId}.png`));
await sharp(path.join(PNG_OUT, `${coalId}.png`))
  .webp({ quality: 85 })
  .toFile(path.join(WEBP_OUT, `${coalId}.webp`));
done.push({ id: coalId, footprint: "2x1", w: 256, h: 128 });
console.log(`OK ${coalId} ← merge (1)+(2)`);

// Update manifest
const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const byId = new Map(manifest.assets.map((a) => [a.id, a]));

for (const entry of done) {
  const existing = byId.get(entry.id);
  const patch = {
    id: entry.id,
    lot: existing?.lot ?? "T",
    footprint: entry.footprint,
    accent: existing?.accent ?? "—",
    subject: existing?.subject ?? entry.id,
    file: `png/${entry.id}.png`,
    w: entry.w,
    h: entry.h,
    anchor: [0, 0],
    status: "done",
    note:
      existing?.note?.includes("top-down")
        ? existing.note
        : `Top-down DA intégré depuis asset-village. ${existing?.note ?? ""}`.trim(),
  };
  if (existing) {
    Object.assign(existing, patch);
  } else {
    manifest.assets.push(patch);
  }
}

manifest.note_topdown =
  "Top-down convention: 128px per world tile (TILE=64), anchor [0,0]. Runtime temporaire: asset-village/ + villageAssets.ts. À terme: une seule source = manifest + sprites/.";

await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Manifest updated (${done.length} done entries)`);
