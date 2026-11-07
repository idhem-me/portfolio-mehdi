import { test } from "node:test";
import assert from "node:assert/strict";
import { wcagContrast, converter } from "culori";
import {
  algorithms,
  generatePalette,
  normalizeHex,
  channels,
  fromChannels,
  shadeLabel,
  exportCode,
  generateSvg,
  slugify,
  colorName,
  type Settings,
  type ExportFormat,
  type ColorSpace,
} from "./color-generator";
const defaults: Settings = {
  hex: "#8f6dea",
  algorithm: "Tailwind CSS",
  count: 11,
  contrast: 0,
  naming: "tailwind",
};
test("HEX parsing and channel conversions", () => {
  assert.equal(normalizeHex(" #AbC "), "#aabbcc");
  for (const s of ["", "#12", "#gggggg", "#12345678"])
    assert.equal(normalizeHex(s), null);
  for (const hex of [
    "#000000",
    "#ffffff",
    "#808080",
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#8f6dea",
  ])
    for (const mode of ["RGB", "HSL", "OKLCH"] as const) {
      assert.ok(channels(hex, mode).every(Number.isFinite));
      const result = fromChannels(channels(hex, mode), mode);
      assert.match(result, /^#[\da-f]{6}$/);
      const a = channels(hex, "RGB");
      const b = channels(result, "RGB");
      a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) <= 1));
    }
  assert.ok(colorName("#8f6dea").length > 0);
});
test("all profiles keep base, finite in-gamut colors, monotone lightness, contrast and unique labels", () => {
  for (const algorithm of algorithms)
    for (const hex of ["#8f6dea", "#000000", "#ffffff", "#808080", "#00ff00"])
      for (const count of [3, 11, 20])
        for (const contrast of [-1, 0, 1]) {
          const p = generatePalette({
            ...defaults,
            algorithm,
            hex,
            count,
            contrast,
          });
          assert.equal(p.length, count);
          assert.equal(p.filter((s) => s.isBase).length, 1);
          assert.equal(p.find((s) => s.isBase)!.hex, hex);
          assert.equal(new Set(p.map((s) => s.label)).size, count);
          p.forEach((s, i) => {
            assert.match(s.hex, /^#[\da-f]{6}$/);
            assert.ok(Number.isFinite(s.color.l) && Number.isFinite(s.color.c));
            assert.ok(wcagContrast(s.hex, s.text) >= 4.5);
            if (i) assert.ok(p[i - 1].color.l >= s.color.l - 0.004);
          });
        }
  assert.equal(generatePalette({ ...defaults, count: 2 }).length, 3);
  assert.equal(generatePalette({ ...defaults, count: 40 }).length, 20);
  assert.throws(() => generatePalette({ ...defaults, hex: "bad-color" }));
});
test("labels and all sixteen export combinations", () => {
  assert.equal(shadeLabel(10, "tailwind"), "950");
  assert.equal(shadeLabel(11, "tailwind"), "1000");
  assert.equal(shadeLabel(19, "tailwind"), "1800");
  const p = generatePalette(defaults);
  for (const format of [
    "CSS",
    "Tailwind",
    "Tailwind 4",
    "Tokens",
  ] as ExportFormat[])
    for (const space of ["HEX", "RGBA", "HSL", "OKLCH"] as ColorSpace[]) {
      const code = exportCode(p, "Medium Purple", format, space);
      assert.ok(!code.includes("NaN"));
      assert.ok(code.includes("medium-purple"));
      if (format === "Tokens") {
        const tokens = JSON.parse(code)["medium-purple"];
        assert.equal(Object.keys(tokens).length, 11);
        for (const token of Object.values(tokens) as {
          $type: string;
          $value: { colorSpace: string; components: number[] };
        }[]) {
          assert.equal(token.$type, "color");
          assert.equal(token.$value.components.length, 3);
          if (space === "HSL") {
            const [h, s, l] = token.$value.components;
            const c = converter("rgb")({
              mode: "hsl",
              h,
              s: s / 100,
              l: l / 100,
            })!;
            assert.ok(Number.isFinite(c.r));
          }
        }
      }
      if (format === "Tailwind 4")
        assert.match(code, /@theme \{\n  --color-medium-purple-50:/);
      if (format === "Tailwind")
        assert.match(code, /extend: \{\n      colors:/);
    }
  const svg = generateSvg(p, '<script>"&');
  assert.equal((svg.match(/<rect /g) || []).length, 11);
  assert.ok(svg.includes("&lt;script&gt;&quot;&amp;"));
  assert.equal(slugify("Été bleu !"), "ete-bleu");
  assert.equal(slugify("紫色"), "palette");
});
