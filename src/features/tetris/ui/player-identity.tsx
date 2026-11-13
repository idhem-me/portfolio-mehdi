"use client";
import { SiteAccountProvider } from "@/features/account/provider";
import {
  loadProfile,
  useIdentityState,
  login,
  logout,
} from "../profile/client-store";
export function PlayerIdentityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteAccountProvider>{children}</SiteAccountProvider>;
}
export function usePlayerIdentity() {
  const state = useIdentityState();
  return {
    ...state,
    auth: {
      loading: state.loading,
      googleAvailable: state.googleAvailable,
      appleAvailable: state.appleAvailable,
      user:
        state.kind === "google" || state.kind === "apple"
          ? { displayName: state.profile.name }
          : null,
    },
    login,
    logout,
    refresh: () => loadProfile(true),
    message: state.error,
  };
}
export { IdentitySelector as IdentityChoices } from "./identity-selector";
