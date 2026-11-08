"use client";

import {
  createContext,
  useCallback,
  useId,
  useContext,
  useState,
  useSyncExternalStore,
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

export type DesignSystem = "mehdi" | "fun" | "github" | "adobe";

/** Single source of truth for installed design systems (switcher + compare page). */
export const DESIGN_SYSTEMS = [
  {
    id: "mehdi" as const,
    label: "Sobre",
  },
  {
    id: "fun" as const,
    label: "Fun",
  },
  {
    id: "github" as const,
    label: "GitHub",
  },
  {
    id: "adobe" as const,
    label: "Adobe",
  },
] as const satisfies ReadonlyArray<{
  id: DesignSystem;
  label: string;
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

function subscribeDocumentLanguage(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  return () => observer.disconnect();
}

function readSpectrumLocale() {
  const language = document.documentElement.lang.split("-")[0];
  return SPECTRUM_LOCALES[language] ?? "fr-FR";
}

/** Deliberately memory-only, above locale layouts so language navigation preserves it. */
export function DesignSystemProvider({ children }: { children: ReactNode }) {
  const [designSystem, setDesignSystemState] = useState<DesignSystem>("mehdi");
  const locale = useSyncExternalStore(subscribeDocumentLanguage, readSpectrumLocale, () => "fr-FR");
  const { resolvedTheme } = useTheme();
  const colorScheme = resolvedTheme === "dark" ? "dark" : "light";
  const setDesignSystem = useCallback((value: DesignSystem) => {
    if (value === "adobe" && !adobeDesignSystemEnabled) return;
    setDesignSystemState(value);
  }, []);
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

const DesignSystemPortalHost = createContext<HTMLDivElement | undefined>(undefined);

export function useDesignSystemPortalHost() {
  return useContext(DesignSystemPortalHost);
}

export function DesignSystemScope({
  children,
  className = "contents",
  portalRoot = false,
  scopeRadixPortals = false,
}: {
  children: ReactNode;
  className?: string;
  portalRoot?: boolean;
  scopeRadixPortals?: boolean;
}) {
  const attributes = useDesignSystemAttributes();
  const portalId = useId();
  const [portalHost, setPortalHost] = useState<HTMLDivElement>();
  const registerHost = useCallback(
    (node: HTMLDivElement | null) => {
      // Primer has no unregister API; release references to the old navigation tree.
      registerPortalRoot(node ?? document.createElement("div"), portalId);
      if (scopeRadixPortals) setPortalHost(node ?? undefined);
    },
    [portalId, scopeRadixPortals],
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
      {scopeRadixPortals ? (
        <DesignSystemPortalHost.Provider value={portalHost}>
          {content}
        </DesignSystemPortalHost.Provider>
      ) : content}
    </PortalContext.Provider>
  ) : (
    content
  );
}
