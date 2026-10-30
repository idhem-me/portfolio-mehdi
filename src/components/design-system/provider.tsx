"use client";

import {
  createContext,
  useCallback,
  useId,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { PortalContext, registerPortalRoot } from "@primer/react";
import { ThemeProvider as PrimerThemeProvider } from "@primer/react/next";
import { useTheme } from "next-themes";

export type DesignSystem = "mehdi" | "github";
const Context = createContext<{
  designSystem: DesignSystem;
  setDesignSystem: (value: DesignSystem) => void;
}>({ designSystem: "mehdi", setDesignSystem: () => {} });

/** Deliberately memory-only, above locale layouts so language navigation preserves it. */
export function DesignSystemProvider({ children }: { children: ReactNode }) {
  const [designSystem, setDesignSystem] = useState<DesignSystem>("mehdi");
  const { resolvedTheme } = useTheme();
  return (
    <Context.Provider value={{ designSystem, setDesignSystem }}>
      <PrimerThemeProvider
        contextOnly
        colorMode={resolvedTheme === "dark" ? "night" : "day"}
      >
        {children}
      </PrimerThemeProvider>
    </Context.Provider>
  );
}

export const useDesignSystem = () => useContext(Context);

/** Apply Primer tokens to just this region, including regions inside mobile portals. */
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
