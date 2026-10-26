"use client";
import { useEffect } from "react";
import { loadProfile, syncLocalScores, setNetworkOnline } from "./client-store";
export function SiteAccountProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    void loadProfile();
    const reload = () => void loadProfile(true).then(syncLocalScores);
    const offline = () => setNetworkOnline(false);
    const storage = (event: StorageEvent) => {
      if (event.key?.startsWith("tetris.")) reload();
    };
    window.addEventListener("online", reload);
    window.addEventListener("offline", offline);
    window.addEventListener("focus", reload);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("online", reload);
      window.removeEventListener("offline", offline);
      window.removeEventListener("focus", reload);
      window.removeEventListener("storage", storage);
    };
  }, []);
  return children;
}
