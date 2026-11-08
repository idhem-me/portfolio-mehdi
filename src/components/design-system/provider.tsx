"use client";

import {
  createContext,
  useContext,
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

function setDesignSystem(value: DesignSystem) {
  if (!isDesignSystem(value)) return;
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
  return (
    <ForcedDesignSystem.Provider value={isDesignSystem(value) ? value : undefined}>
      {children}
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
