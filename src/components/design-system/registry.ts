export const EXPERIMENTAL_THEMES_ENABLED = process.env.NODE_ENV === "development";

const allDesignSystems = [
  { id: "mehdi", label: "Sobre" },
  { id: "fun", label: "Fun" },
  { id: "frutiger-aero", label: "Frutiger Aero" },
  { id: "liquid-glass", label: "Liquid Glass" },
] as const;

export type DesignSystem = (typeof allDesignSystems)[number]["id"];

export const DESIGN_SYSTEMS = allDesignSystems.filter(
  ({ id }) => EXPERIMENTAL_THEMES_ENABLED || id !== "liquid-glass",
);
export const DEFAULT_DESIGN_SYSTEM: DesignSystem = "mehdi";
export const DESIGN_SYSTEM_STORAGE_KEY = "portfolio-design-system";

export function isDesignSystem(value: unknown): value is DesignSystem {
  return DESIGN_SYSTEMS.some(({ id }) => id === value);
}

export const initialDesignSystemScript = `
  (() => {
    try {
      const saved = localStorage.getItem(${JSON.stringify(DESIGN_SYSTEM_STORAGE_KEY)});
      const supported = ${JSON.stringify(DESIGN_SYSTEMS.map(({ id }) => id))};
      if (supported.includes(saved)) document.documentElement.dataset.designSystem = saved;
    } catch {}
  })();
`;
