"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_DESIGN_SYSTEM,
  DESIGN_SYSTEM_STORAGE_KEY,
  isDesignSystem,
  type DesignSystem,
} from "./registry";

export { DESIGN_SYSTEMS, type DesignSystem } from "./registry";

const subscribers = new Set<() => void>();

function subscribe(onChange: () => void) {
  subscribers.add(onChange);
  return () => {
    subscribers.delete(onChange);
  };
}

function getDesignSystem() {
  const value = document.documentElement.dataset.designSystem;
  return isDesignSystem(value) ? value : DEFAULT_DESIGN_SYSTEM;
}

const loadStyles = {
  mehdi: async () => {},
  fun: () => import("./fun.css"),
  "frutiger-aero": () => import("./frutiger-aero.css"),
  "liquid-glass": () => import("./liquid-glass.css"),
} satisfies Record<DesignSystem, () => Promise<unknown>>;

let selection = 0;

async function setDesignSystem(value: DesignSystem) {
  if (!isDesignSystem(value)) return;
  const request = ++selection;
  try {
    if (value !== DEFAULT_DESIGN_SYSTEM) await loadStyles[value]();
  } catch {
    return;
  }
  if (request !== selection) return;
  document.documentElement.dataset.designSystem = value;
  try {
    localStorage.setItem(DESIGN_SYSTEM_STORAGE_KEY, value);
  } catch {
    // The theme still works for this page when browser storage is unavailable.
  }
  subscribers.forEach((onChange) => onChange());
}

const Context = createContext<{
  designSystem: DesignSystem;
  setDesignSystem: (value: DesignSystem) => void;
}>({ designSystem: DEFAULT_DESIGN_SYSTEM, setDesignSystem: () => {} });

export function DesignSystemProvider({ children }: { children: ReactNode }) {
  const designSystem = useSyncExternalStore(
    subscribe,
    getDesignSystem,
    () => DEFAULT_DESIGN_SYSTEM,
  );

  useEffect(() => {
    if (selection !== 0) return;
    try {
      const saved = localStorage.getItem(DESIGN_SYSTEM_STORAGE_KEY);
      if (isDesignSystem(saved) && saved !== DEFAULT_DESIGN_SYSTEM) {
        void setDesignSystem(saved);
      }
    } catch {
      // The default remains usable when storage is unavailable.
    }
  }, []);

  return (
    <Context.Provider value={{ designSystem, setDesignSystem }}>
      {children}
    </Context.Provider>
  );
}

export const useDesignSystem = () => useContext(Context);

const ForcedDesignSystem = createContext<DesignSystem | undefined>(undefined);

/** Force a design system for an isolated Playground preview. */
export function DesignSystemForce({
  value,
  children,
}: {
  value: DesignSystem;
  children: ReactNode;
}) {
  const theme = isDesignSystem(value) ? value : DEFAULT_DESIGN_SYSTEM;
  const [readyTheme, setReadyTheme] = useState<{ requested: DesignSystem; active: DesignSystem }>();

  useEffect(() => {
    let active = true;
    void loadStyles[theme]().then(
      () => { if (active) setReadyTheme({ requested: theme, active: theme }); },
      () => { if (active) setReadyTheme({ requested: theme, active: DEFAULT_DESIGN_SYSTEM }); },
    );
    return () => { active = false; };
  }, [theme]);

  const applied = theme === DEFAULT_DESIGN_SYSTEM ? theme :
    readyTheme?.requested === theme ? readyTheme.active : undefined;

  return (
    <ForcedDesignSystem.Provider value={applied}>
      {applied ? children : null}
    </ForcedDesignSystem.Provider>
  );
}

export function useDesignSystemAttributes() {
  const forced = useContext(ForcedDesignSystem);
  return { "data-design-system": forced } as const;
}

const DesignSystemPortalHost = createContext<HTMLDivElement | undefined>(undefined);

export function useDesignSystemPortalHost() {
  return useContext(DesignSystemPortalHost);
}

export function DesignSystemScope({
  children,
  className = "contents",
  scopeRadixPortals = false,
}: {
  children: ReactNode;
  className?: string;
  scopeRadixPortals?: boolean;
}) {
  const attributes = useDesignSystemAttributes();
  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);
  const content = (
    <div {...attributes} className={`ds-scope ${className}`}>
      {children}
      {scopeRadixPortals && (
        <div ref={setPortalHost} className="ds-portal-host" />
      )}
    </div>
  );

  // A local host keeps forced previews and their portals in the same theme scope.
  return scopeRadixPortals ? (
    <DesignSystemPortalHost.Provider value={portalHost ?? undefined}>
      {content}
    </DesignSystemPortalHost.Provider>
  ) : content;
}
