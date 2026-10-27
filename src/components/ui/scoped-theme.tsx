"use client";
import { createContext, useContext, type ReactNode } from "react";
const Scope = createContext<string | undefined>(undefined);
/** Carries a section's palette through Radix portals without recoloring other pages. */
export function ScopedTheme({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  return <Scope.Provider value={value}>{children}</Scope.Provider>;
}
export function useScopedTheme() {
  return useContext(Scope);
}
