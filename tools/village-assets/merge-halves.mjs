#!/usr/bin/env node
/**
 * Jointure horizontale de 2 PNG carrés (moitiés 1×1) → sprite 2×1.
 *
 * Usage:
 *   node tools/village-assets/merge-halves.mjs <left.png> <right.png> <out.png> [outW] [outH]
 *
 * Défaut sortie : 256×128 (canon sprites/). Passe outW/outH pour full-res runtime.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const [leftPath, rightPath, outPath, outWArg, outHArg] = process.argv.slice(2);
if (!leftPath || !rightPath || !outPath) {
  console.error(
    "Usage: merge-halves.mjs <left.png> <right.png> <out.png> [outW=256] [outH=128]"
  );
  process.exit(1);
}

const outW = Number(outWArg ?? 256);
const outH = Number(outHArg ?? 128);

async function loadHalf(file) {
  const meta = await sharp(file).metadata();
  const size = Math.min(meta.width ?? 0, meta.height ?? 0);
  if (size < 1) throw new Error(`Invalid image: ${file}`);
  return sharp(file)
    .extract({
      left: 0,
      top: 0,
      width: size,
      height: size,
    })
    .resize(outW / 2, outH, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

const left = await loadHalf(leftPath);
const right = await loadHalf(rightPath);

const halfW = outW / 2;
const channels = 4;
const out = Buffer.alloc(outW * outH * channels);

for (let y = 0; y < outH; y++) {
  const rowL = left.data.subarray(
    y * halfW * channels,
    (y + 1) * halfW * channels
  );
  const rowR = right.data.subarray(
    y * halfW * channels,
    (y + 1) * halfW * channels
  );
  rowL.copy(out, y * outW * channels);
  rowR.copy(out, y * outW * channels + halfW * channels);
}

await mkdir(path.dirname(outPath), { recursive: true });
await sharp(out, { raw: { width: outW, height: outH, channels } })
  .png()
  .toFile(outPath);

console.log(`Wrote ${outPath} (${outW}×${outH})`);
