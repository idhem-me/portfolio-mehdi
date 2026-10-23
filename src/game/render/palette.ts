/** Palette pastel low-poly — indépendante du thème portfolio. */

export const GRASS = ["#9BC97A", "#8DBE6C", "#A3D085"] as const;
export const GRASS_DARK = ["#6B8F4E", "#5A7A40", "#4E6B38"] as const;
export const GRASS_EDGE = "#6F9A52";
export const CLIFF = "#B89A72";
export const CLIFF_DARK = "#9A7E5A";
export const BEACH = "#EAD9A8";
export const ROAD = "#9A9AA0";
export const ROAD_EDGE = "#C8C8CC";
export const ROAD_MARK = "#E8E8EA";
export const HIGHWAY = "#7A7A82";
export const WATER_CSS_TOP = "#7FD3E0";
export const WATER_CSS_BOTTOM = "#3BA7C4";
export const WATER_FOAM = "#E8F7FA";
export const MOUNTAIN = ["#8FA3B0", "#7A8F9C", "#A8B8C2", "#6B7F8A"] as const;
export const MOUNTAIN_SNOW = "#F2F6F8";
export const WALL = "#F2E6D0";
export const LOCKED_MUL = 0.55;
export const BUYABLE_OUTLINE = "#F5F0D8";

export const ROOF: Record<string, string> = {
  townhall: "#D9785B",
  house_0: "#E8A65D",
  house_1: "#7FA7C9",
  house_2: "#C97F9B",
  shop: "#D4A056",
  sawmill: "#A0764F",
  quarry: "#A9A9A0",
  factory: "#8A7A6A",
  school: "#6E9BC4",
  market: "#E3C25B",
  warehouse: "#A0764F",
  library: "#7C6BA8",
  fountain: "#7EC4CF",
  coal_plant: "#5A5A58",
  solar_plant: "#3A7AB8",
  nuclear_plant: "#7A9A8A",
  monument: "#A9A9A0",
  tree: "#5B8F3C",
  pine: "#3D6B3A",
  rock: "#8A8A82",
};

export function facetColors(baseHex: string): {
  top: number;
  left: number;
  right: number;
} {
  const base = hexToNum(baseHex);
  return {
    top: shade(base, 1.25),
    left: shade(base, 1.0),
    right: shade(base, 0.72),
  };
}

export function hexToNum(hex: string): number {
  const h = hex.replace("#", "");
  return parseInt(
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h,
    16
  );
}

export function shade(color: number, factor: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

export function desaturateDark(color: number, mul: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const gray = 0.3 * r + 0.59 * g + 0.11 * b;
  const nr = Math.round((r * 0.35 + gray * 0.65) * mul);
  const ng = Math.round((g * 0.35 + gray * 0.65) * mul);
  const nb = Math.round((b * 0.35 + gray * 0.65) * mul);
  return (nr << 16) | (ng << 8) | nb;
}
