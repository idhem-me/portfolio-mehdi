import {
  clampChroma,
  converter,
  formatHex,
  wcagContrast,
  type Oklch,
} from "culori";
import namer from "color-namer";

export const algorithms = [
  "Tailwind CSS",
  "Radix UI",
  "Ant Design",
  "Lightness Scale",
  "Saturation Scale",
  "Hue Shift Scale",
  "Monochromatic",
  "Analogous",
  "Complementary",
] as const;
export type Algorithm = (typeof algorithms)[number];
export type InputMode = "RGB" | "HSL" | "OKLCH";
export type InputFormat = "HEX" | InputMode;
export type ColorSpace = "HEX" | "RGBA" | "HSL" | "OKLCH";
export type ExportFormat = "CSS" | "Tailwind" | "Tailwind 4" | "Tokens";
export type NamingPattern = "tailwind" | "sequential" | "tens";
export type Settings = {
  hex: string;
  algorithm: Algorithm;
  contrast: number;
  count: number;
  naming: NamingPattern;
};
export type Swatch = {
  label: string;
  hex: string;
  color: Oklch;
  text: "#000000" | "#ffffff";
  isBase: boolean;
};
const rgb = converter("rgb");
const hsl = converter("hsl");
const oklch = converter("oklch");
const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(v) ? v : min));
const round = (v: number, places = 3) => Number(v.toFixed(places));
export function normalizeHex(value: string): string | null {
  const hex = value.trim().replace(/^#/, "");
  if (!/^([a-f\d]{3}|[a-f\d]{6})$/i.test(hex)) return null;
  return (
    "#" +
    (hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex).toLowerCase()
  );
}
export function toHex(color: Oklch): string {
  // Conversion noise at an sRGB boundary must not move a saturated color.
  const c = rgb(color)!;
  if ([c.r, c.g, c.b].every((v) => v >= -1e-6 && v <= 1 + 1e-6))
    return formatHex(c)!;
  return formatHex(clampChroma(color, "oklch"))!;
}
export function channels(hex: string, mode: InputMode): number[] {
  if (mode === "RGB") {
    const c = rgb(hex)!;
    return [c.r, c.g, c.b].map((v) => round(v * 255, 0));
  }
  if (mode === "HSL") {
    const c = hsl(hex)!;
    return [round(c.h ?? 0, 1), round(c.s * 100, 1), round(c.l * 100, 1)];
  }
  const c = oklch(hex)!;
  return [round(c.l * 100, 6), round(c.c, 8), round(c.h ?? 0, 6)];
}
export function fromChannels(values: number[], mode: InputMode): string {
  const [a, b, c] = values;
  if (mode === "RGB")
    return formatHex({
      mode: "rgb",
      r: clamp(a, 0, 255) / 255,
      g: clamp(b, 0, 255) / 255,
      b: clamp(c, 0, 255) / 255,
    })!;
  if (mode === "HSL")
    return formatHex({
      mode: "hsl",
      h: clamp(a, 0, 360),
      s: clamp(b, 0, 100) / 100,
      l: clamp(c, 0, 100) / 100,
    })!;
  return toHex({
    mode: "oklch",
    l: clamp(a, 0, 100) / 100,
    c: clamp(b, 0, 0.4),
    h: clamp(c, 0, 360),
  });
}
export function colorName(hex: string): string {
  return namer(hex, { pick: ["ntc"] }).ntc[0].name;
}
export function slugify(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "palette"
  );
}
export function shadeLabel(index: number, naming: NamingPattern): string {
  return String(
    naming === "sequential"
      ? index + 1
      : naming === "tens"
        ? (index + 1) * 10
        : index === 0
          ? 50
          : index < 10
            ? index * 100
            : index === 10
              ? 950
              : (index - 1) * 100,
  );
}
// All profiles share a monotone lightness axis; hue/chroma define their character.
const profiles: Record<
  Algorithm,
  (
    t: number,
    offset: number,
    base: Oklch,
  ) => { curve: number; chroma: number; hue: number }
> = {
  "Tailwind CSS": (t, d, b) => ({
    curve: 1,
    chroma: b.c * (0.12 + 0.88 * Math.pow(Math.sin(Math.PI * t), 0.65)),
    hue: (b.h ?? 0) + d * 8,
  }),
  "Radix UI": (t, d, b) => ({
    curve: 1.35,
    chroma: b.c * (0.25 + 0.75 * Math.sin(Math.PI * t)),
    hue: (b.h ?? 0) - d * 5,
  }),
  "Ant Design": (t, d, b) => ({
    curve: 0.8,
    chroma: b.c * (0.4 + 0.6 * Math.sin(Math.PI * t)),
    hue: (b.h ?? 0) + d * 20,
  }),
  "Lightness Scale": (_t, _d, b) => ({ curve: 1, chroma: b.c, hue: b.h ?? 0 }),
  "Saturation Scale": (t, _d, b) => ({
    curve: 1,
    chroma: b.c * (0.1 + 1.8 * t),
    hue: b.h ?? 0,
  }),
  "Hue Shift Scale": (_t, d, b) => ({
    curve: 1,
    chroma: b.c,
    hue: (b.h ?? 0) + d * 100,
  }),
  Monochromatic: (t, _d, b) => ({
    curve: 1.15,
    chroma: b.c * (0.45 + 0.55 * Math.sin(Math.PI * t)),
    hue: b.h ?? 0,
  }),
  Analogous: (_t, d, b) => ({
    curve: 1,
    chroma: b.c,
    hue: (b.h ?? 0) + d * 60,
  }),
  Complementary: (_t, d, b) => ({
    curve: 1,
    chroma: b.c,
    hue: (b.h ?? 0) + (d > 0 ? 180 : 0),
  }),
};
export function generatePalette(settings: Settings): Swatch[] {
  const hex = normalizeHex(settings.hex);
  if (!hex) throw new Error("Invalid HEX");
  const count = Math.round(clamp(settings.count, 3, 20));
  const base = oklch(hex)!;
  const anchor = Math.round((count - 1) * 0.5);
  return Array.from({ length: count }, (_, i) => {
    const d =
      i <= anchor ? (i - anchor) / anchor : (i - anchor) / (count - 1 - anchor);
    const profile = profiles[settings.algorithm](i / (count - 1), d, base);
    const distance = Math.pow(
      Math.abs(d),
      profile.curve * Math.pow(2, -clamp(settings.contrast, -1, 1)),
    );
    const l =
      d <= 0
        ? base.l + (Math.max(0.98, base.l) - base.l) * distance
        : base.l - (base.l - Math.min(0.12, base.l)) * distance;
    const generated = toHex({
      mode: "oklch",
      l,
      c: profile.chroma,
      h: ((profile.hue % 360) + 360) % 360,
    });
    const value = i === anchor ? hex : generated;
    return {
      label: shadeLabel(i, settings.naming),
      hex: value,
      color: oklch(value)!,
      text:
        wcagContrast(value, "#000") >= wcagContrast(value, "#fff")
          ? "#000000"
          : "#ffffff",
      isBase: i === anchor,
    };
  });
}
export function formatColor(hex: string, space: ColorSpace): string {
  const [r, g, b] = channels(hex, "RGB");
  if (space === "HEX") return hex;
  if (space === "RGBA") return `rgba(${r}, ${g}, ${b}, 1)`;
  if (space === "HSL") {
    const [h, s, l] = channels(hex, "HSL");
    return `hsl(${h} ${s}% ${l}%)`;
  }
  const c = oklch(hex)!;
  return `oklch(${round(c.l * 100, 2)}% ${round(c.c, 4)} ${round(c.h ?? 0, 2)})`;
}
export function exportCode(
  palette: Swatch[],
  name: string,
  format: ExportFormat,
  space: ColorSpace,
): string {
  const slug = slugify(name);
  if (format === "Tokens") {
    return JSON.stringify(
      {
        [slug]: Object.fromEntries(
          palette.map((s) => {
            const r = rgb(s.hex)!;
            const h = hsl(s.hex)!;
            const c = oklch(s.hex)!;
            const colorSpace =
              space === "HSL" ? "hsl" : space === "OKLCH" ? "oklch" : "srgb";
            const components =
              space === "HSL"
                ? [h.h ?? 0, h.s * 100, h.l * 100]
                : space === "OKLCH"
                  ? [c.l, c.c, c.h ?? 0]
                  : [r.r, r.g, r.b];
            return [
              s.label,
              {
                $type: "color",
                $value: {
                  colorSpace,
                  components,
                  alpha: 1,
                  ...(space === "HEX" ? { hex: s.hex } : {}),
                },
              },
            ];
          }),
        ),
      },
      null,
      2,
    );
  }
  if (format === "Tailwind")
    return `export default {\n  theme: {\n    extend: {\n      colors: {\n        '${slug}': {\n${palette.map((s) => `          '${s.label}': '${formatColor(s.hex, space)}',`).join("\n")}\n        },\n      },\n    },\n  },\n};`;
  return `${format === "CSS" ? ":root" : "@theme"} {\n${palette.map((s) => `  --${format === "Tailwind 4" ? "color-" : ""}${slug}-${s.label}: ${formatColor(s.hex, space)};`).join("\n")}\n}`;
}
const escapeXml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function generateSvg(palette: Swatch[], name: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${palette.length * 120}" height="160" viewBox="0 0 ${palette.length * 120} 160"><title>${escapeXml(name)}</title>${palette.map((s, i) => `<g transform="translate(${i * 120} 0)"><rect width="120" height="160" fill="${s.hex}"/><text x="12" y="24" fill="${s.text}" font-family="sans-serif" font-size="12">${escapeXml(s.label)}</text><text x="12" y="140" fill="${s.text}" font-family="monospace" font-size="12">${s.hex}</text></g>`).join("")}</svg>`;
}
