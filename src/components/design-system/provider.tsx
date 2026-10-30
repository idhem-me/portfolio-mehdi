"use client";

import {
  createContext,
  useCallback,
  useId,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { PortalContext, registerPortalRoot } from "@primer/react";
import { ThemeProvider as PrimerThemeProvider } from "@primer/react/next";
import {
  Provider as SpectrumProvider,
  defaultTheme,
} from "@adobe/react-spectrum";
import { useTheme } from "next-themes";
import { adobeDesignSystemEnabled } from "./flags";

export type DesignSystem = "mehdi" | "github" | "adobe";

/** Single source of truth for installed design systems (switcher + compare page). */
export const DESIGN_SYSTEMS = [
  {
    id: "mehdi" as const,
    label: "Mehdi",
    subtitle: "Shadcn / Radix + tokens locaux",
  },
  {
    id: "github" as const,
    label: "GitHub",
    subtitle: "Primer React + tokens Primer",
  },
  {
    id: "adobe" as const,
    label: "Adobe",
    subtitle: "React Spectrum 1 + tokens Spectrum",
  },
] as const satisfies ReadonlyArray<{
  id: DesignSystem;
  label: string;
  subtitle: string;
}>;

/** Design systems exposed in the UI (respects feature flags). */
export const ENABLED_DESIGN_SYSTEMS = DESIGN_SYSTEMS.filter(
  (system) => system.id !== "adobe" || adobeDesignSystemEnabled,
);

const Context = createContext<{
  designSystem: DesignSystem;
  setDesignSystem: (value: DesignSystem) => void;
}>({ designSystem: "mehdi", setDesignSystem: () => {} });

const SPECTRUM_LOCALES: Record<string, string> = {
  fr: "fr-FR",
  en: "en-US",
  de: "de-DE",
  es: "es-ES",
  it: "it-IT",
  ar: "ar",
  zh: "zh-CN",
};

/** Deliberately memory-only, above locale layouts so language navigation preserves it. */
export function DesignSystemProvider({ children }: { children: ReactNode }) {
  const [designSystem, setDesignSystemState] = useState<DesignSystem>("mehdi");
  const [locale, setLocale] = useState("fr-FR");
  const [colorScheme, setColorScheme] = useState<"light" | "dark">("light");
  const { resolvedTheme } = useTheme();
  const setDesignSystem = useCallback((value: DesignSystem) => {
    if (value === "adobe" && !adobeDesignSystemEnabled) return;
    setDesignSystemState(value);
  }, []);
  useEffect(() => {
    if (designSystem === "adobe" && !adobeDesignSystemEnabled) {
      setDesignSystemState("mehdi");
    }
  }, [designSystem]);
  useEffect(() => {
    const lang = document.documentElement.lang?.split("-")[0] || "fr";
    setLocale(SPECTRUM_LOCALES[lang] ?? "fr-FR");
  }, []);
  useEffect(() => {
    setColorScheme(resolvedTheme === "dark" ? "dark" : "light");
  }, [resolvedTheme]);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.designSystem = designSystem;
    if (designSystem === "github") {
      root.dataset.colorMode = resolvedTheme === "dark" ? "dark" : "light";
      root.dataset.lightTheme = "light";
      root.dataset.darkTheme = "dark";
    } else {
      delete root.dataset.colorMode;
      delete root.dataset.lightTheme;
      delete root.dataset.darkTheme;
    }
  }, [designSystem, resolvedTheme]);
  const tree = adobeDesignSystemEnabled ? (
    <SpectrumProvider
      theme={defaultTheme}
      colorScheme={colorScheme}
      locale={locale}
      UNSAFE_className={
        designSystem === "adobe"
          ? "spectrum-ds-root spectrum-ds-active"
          : "spectrum-ds-root"
      }
      UNSAFE_style={{ display: "contents" }}
    >
      {children}
    </SpectrumProvider>
  ) : (
    children
  );
  return (
    <Context.Provider value={{ designSystem, setDesignSystem }}>
      <PrimerThemeProvider
        contextOnly
        colorMode={colorScheme === "dark" ? "night" : "day"}
      >
        {tree}
      </PrimerThemeProvider>
    </Context.Provider>
  );
}

export const useDesignSystem = () => useContext(Context);

/** Force a design system for an isolated subtree (compare playground). */
export function DesignSystemForce({
  value,
  children,
}: {
  value: DesignSystem;
  children: ReactNode;
}) {
  const { setDesignSystem } = useDesignSystem();
  return (
    <Context.Provider value={{ designSystem: value, setDesignSystem }}>
      {children}
    </Context.Provider>
  );
}

/** Apply design-system tokens to just this region, including regions inside mobile portals. */
export function useDesignSystemAttributes() {
  const { designSystem } = useDesignSystem();
  const { resolvedTheme } = useTheme();
  return {
    "data-design-system": designSystem,
    "data-color-mode":
      designSystem === "github"
        ? resolvedTheme === "dark"
          ? "dark"
          : "light"
        : undefined,
    "data-light-theme": designSystem === "github" ? "light" : undefined,
    "data-dark-theme": designSystem === "github" ? "dark" : undefined,
  } as const;
}

export function DesignSystemScope({
  children,
  className = "contents",
  portalRoot = false,
}: {
  children: ReactNode;
  className?: string;
  portalRoot?: boolean;
}) {
  const attributes = useDesignSystemAttributes();
  const portalId = useId();
  const registerHost = useCallback(
    (node: HTMLDivElement | null) => {
      // Primer has no unregister API; release references to the old navigation tree.
      registerPortalRoot(node ?? document.createElement("div"), portalId);
    },
    [portalId],
  );
  const content = (
    <div {...attributes} className={`ds-scope ${className}`}>
      {children}
      {portalRoot && <div ref={registerHost} className="ds-portal-host" />}
    </div>
  );
  // A host per navigation instance avoids portals targeting a hidden locale tree
  // retained by Next.js Activity, and keeps mobile menus inside the focus trap.
  return portalRoot ? (
    <PortalContext.Provider value={{ portalContainerName: portalId }}>
      {content}
    </PortalContext.Provider>
  ) : (
    content
  );
}
