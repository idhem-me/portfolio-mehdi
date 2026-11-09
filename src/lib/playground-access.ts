import type fr from "../../messages/fr.json";

export const pendingLocalComponents: readonly {
  id: string;
  key: keyof typeof fr.playground;
  demo?: string;
}[] = [];

export const showLocalComponents =
  process.env.NODE_ENV === "development" &&
  !process.env.VERCEL &&
  pendingLocalComponents.length > 0;
