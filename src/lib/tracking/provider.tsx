"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { startTracking, track } from "./client";
export function TrackingProvider() {
  const path = usePathname();
  useEffect(startTracking, []);
  useEffect(() => {
    if (path !== window.location.pathname) return;
    track.page(path);
  }, [path]);
  return null;
}
