import fs from "node:fs";
const css = fs.readFileSync(
  new URL("../../src/features/cards/ui/tokens.css", import.meta.url),
  "utf8",
);
const luminance = (hex) => {
  const rgb = hex
    .slice(1)
    .match(/../g)
    .map((x) => parseInt(x, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};
const ratio = (a, b) => {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
let report =
  "| Thème / mode | Texte | Texte secondaire | Primary | Accent | Focus | Bordure |\n|---|---:|---:|---:|---:|---:|---:|\n";
for (const theme of ["default", "blue", "red"])
  for (const dark of [false, true]) {
    const selector = `${dark ? ".dark " : ""}[data-cards-theme="${theme}"]`;
    const start = css.indexOf(selector + " {");
    if (start < 0) throw Error(selector);
    const block = css.slice(start, css.indexOf("}", start));
    const vars = Object.fromEntries(
      [...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/g)].map((m) => [
        m[1],
        m[2],
      ]),
    );
    const pairs = [
      ["foreground", "background", 4.5],
      ["muted-foreground", "muted", 4.5],
      ["primary-foreground", "primary", 4.5],
      ["accent-foreground", "accent", 4.5],
      ["ring", "background", 3],
      ["border", "background", 3],
    ];
    const values = pairs.map(([a, b, min]) => {
      const value = ratio(vars[a], vars[b]);
      if (value < min) throw Error(`${selector} ${a}/${b}: ${value}`);
      return value.toFixed(2) + ":1";
    });
    report += `| ${theme} / ${dark ? "dark" : "light"} | ${values.join(" | ")} |\n`;
  }
console.log(report);
fs.writeFileSync(
  new URL("../../docs/cards/CONTRAST.md", import.meta.url),
  "# Contrastes des palettes Cartes\n\nCalcul sRGB WCAG, script `node scripts/cards/contrast.mjs`. Seuil texte 4,5:1, focus/bordure 3:1.\n\n" +
    report,
);
